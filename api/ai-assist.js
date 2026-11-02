// OPEN GRAIN — Studio AI assistant (Vercel serverless function)
//
// Runs server-side only. Holds the OpenAI API key (set it in Vercel →
// Project Settings → Environment Variables → OPENAI_API_KEY) and never
// exposes it to the browser. The panel calls this endpoint with the
// admin's Supabase session token; this function verifies that token
// belongs to the site owner before spending any API budget, asks OpenAI
// to propose a structured change based on the admin's request, and
// returns it — the panel itself performs the actual database write only
// after the admin clicks "Aplicar cambios", so this endpoint never
// changes anything on its own.
//
// No npm dependencies: uses the platform's built-in fetch (Node 18+ on
// Vercel) so this stays a zero-build static project.

const SUPABASE_URL = 'https://dmegetqsiowxwiibcxmv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1FXmgEWqmmRPZZp3lCpOiA_VfJ8JyIx';
const ADMIN_EMAIL = 'adamabalde1998@gmail.com';

const { AIError, readBody, fetchWithTimeout, generateJSON, sendError } = require('./_lib/openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const token = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) { res.status(401).json({ error: 'No autenticado.' }); return; }

    // Verify the token against Supabase Auth and confirm it's the site owner.
    const userRes = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!userRes.ok) { res.status(401).json({ error: 'Sesión no válida.' }); return; }
    const user = await userRes.json();
    if (!user?.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      res.status(403).json({ error: 'No autorizado.' });
      return;
    }

    const body = readBody(req.body);
    const { prompt, defaultCopy, contentOverrides = [], projects = [] } = body;
    if (!Array.isArray(contentOverrides) || !Array.isArray(projects) ||
        contentOverrides.some(row => !row || typeof row !== 'object') ||
        projects.some(row => !row || typeof row !== 'object')) {
      throw new AIError(400, 'El contexto de contenido no es válido.');
    }
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Falta el mensaje.' });
      return;
    }

    // Merge defaults + saved overrides into the "current effective value" the
    // admin actually sees on the live site right now, per key/lang.
    const overrideMap = {};
    (contentOverrides || []).forEach(row => { overrideMap[`${row.key}|${row.lang}`] = row.value; });
    const editableKeys = Object.keys((defaultCopy && defaultCopy.en) || {}).filter(key => key !== 'studio_ai_enabled');
    const currentValues = {};
    editableKeys.forEach(key => {
      ['es', 'en'].forEach(lang => {
        const def = defaultCopy?.[lang]?.[key];
        const override = overrideMap[`${key}|${lang}`];
        currentValues[`${key}|${lang}`] = override !== undefined
          ? override
          : (Array.isArray(def) ? JSON.stringify(def) : def);
      });
    });

    const projectList = (projects || []).map(p =>
      `- id=${p.id} title="${p.title}" layout_class=${p.layout_class} is_published=${p.is_published}`
    ).join('\n') || '(sin proyectos todavía)';

    const contentList = editableKeys.map(key =>
      `- ${key}: ES="${currentValues[`${key}|es`]}" EN="${currentValues[`${key}|en`]}"`
    ).join('\n');

    const systemPrompt = `Eres el asistente del panel de administración de la web de OPEN GRAIN, un estudio de producción creativa en Mallorca. El dueño del negocio te pide cambios de texto o de tamaño de fotos en su propio idioma, normalmente español.

Tu única salida debe ser un objeto JSON, sin texto antes ni después, con esta forma exacta:
{"summary": "una frase breve en español explicando qué vas a cambiar y por qué", "changes": [ ... ]}

Cada elemento de "changes" es UNO de estos dos tipos:

1) Cambiar un texto de la web (tabla site_content):
{"table": "site_content", "key": "<una de las claves de más abajo>", "lang": "es" o "en", "old_value": "<valor actual>", "new_value": "<tu propuesta>"}
Si el usuario no especifica idioma, propone el cambio para "es" únicamente, salvo que pida claramente ambos idiomas (en ese caso incluye dos objetos, uno por idioma, con traducciones coherentes).
La clave "serviceList" guarda una LISTA de 5 servicios como JSON (ej: ["Fotografía","Vídeo y reels","UGC","Eventos","Contenido para redes"]) — si el usuario pide cambiar un servicio, new_value debe ser el array completo de 5 elementos en formato JSON válido (texto), no solo el elemento cambiado.

Claves de texto disponibles y su valor actual:
${contentList}

2) Cambiar una foto del portfolio ya existente (tabla portfolio_projects) — SOLO puedes cambiar layout_class (tamaño: "tall"=vertical, "wide"=horizontal, "square"=cuadrada), is_published (true/false), o title. NO puedes subir fotos nuevas ni cambiar la imagen en sí — eso solo lo puede hacer el dueño subiendo el archivo desde el panel.
{"table": "portfolio_projects", "id": "<id del proyecto>", "title": "<título actual, para mostrarlo>", "field": "layout_class" | "is_published" | "title", "old_value": "<valor actual>", "new_value": "<tu propuesta>"}

Proyectos del portfolio existentes:
${projectList}

Si el usuario pide algo que no puedes hacer con estas dos herramientas (por ejemplo subir una foto nueva, cambiar el diseño de forma que no sea el tamaño de una foto existente, o algo no relacionado con la web), responde con "changes": [] y explica brevemente en "summary" por qué no puedes hacerlo y qué sí puede pedir.
Si el usuario pide algo ambiguo, haz la interpretación más razonable y dilo en "summary".
Nunca inventes claves ni ids que no estén en las listas de arriba.`;

    const parsed = await generateJSON({ instructions: systemPrompt, prompt, kind: 'changes', maxOutputTokens: 2500, sessionToken: token });

    const valid = parsed.changes.length <= 100 && parsed.changes.every(c => {
      if (!c || typeof c !== 'object') return false;
      if (c.table === 'site_content') return editableKeys.includes(c.key) && ['es', 'en'].includes(c.lang) && typeof c.new_value === 'string';
      if (c.table !== 'portfolio_projects' || !projects.some(p => p.id === c.id)) return false;
      if (c.field === 'layout_class') return ['tall', 'wide', 'square'].includes(c.new_value);
      if (c.field === 'is_published') return typeof c.new_value === 'boolean';
      return c.field === 'title' && typeof c.new_value === 'string';
    });
    if (!valid) throw new AIError(502, 'La IA propuso un cambio no permitido. Reformula tu petición.');

    res.status(200).json({
      summary: parsed.summary || '',
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    });
  } catch (err) {
    sendError(res, err);
  }
};
