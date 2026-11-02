// OPEN GRAIN — Studio content-idea assistant (Vercel serverless function)
//
// Runs server-side only, same pattern as api/ai-assist.js: holds the
// OpenAI API key, verifies the caller is the site owner via their
// Supabase session token, and never writes to the database itself.
//
// Unlike ai-assist.js (which proposes structured edits to site_content /
// portfolio_projects for the admin to apply), this endpoint only drafts
// Instagram/TikTok post ideas as plain text. Nothing gets saved anywhere —
// the admin copies what they like and posts it themselves, then adds the
// real published URL from Studio → Instagram & TikTok as always. This
// keeps social_posts holding only real, already-published posts.

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
    const { prompt, platform, brand } = body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Falta el tema o la idea de partida.' });
      return;
    }
    const platformLabel = platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'Instagram y TikTok';

    const services = Array.isArray(brand?.serviceList) && brand.serviceList.length
      ? brand.serviceList.join(', ')
      : 'Fotografía, Vídeo y reels, UGC, Eventos, Contenido para redes';
    const aboutBody = typeof brand?.aboutBody === 'string' && brand.aboutBody.trim() ? brand.aboutBody.trim() : 'OPEN GRAIN es un estudio creativo independiente de Mallorca. Construimos historias visuales con una mirada honesta, oficio y un poco de grano.';
    const studioTag = typeof brand?.studioTag === 'string' && brand.studioTag.trim() ? brand.studioTag.trim() : 'Visuales con algo que contar.';

    const systemPrompt = `Eres el asistente de ideas de contenido del panel de administración de OPEN GRAIN, un estudio de producción creativa (fotografía y vídeo) en Mallorca. El dueño te pide ideas de publicaciones para redes sociales; tú propones BORRADORES para que él los revise, edite y publique manualmente — nunca se publican solos ni se guardan en ningún sitio.

Datos reales del negocio (no te inventes otros):
- Servicios que ofrece: ${services}
- Sobre el estudio: "${aboutBody}"
- Tono de marca: "${studioTag}"
- Ubicación: Mallorca.

Reglas estrictas:
- NUNCA inventes precios, fechas de disponibilidad, nombres de clientes, testimonios, cifras de resultados (alcance, ventas, seguidores) ni ningún dato que no esté arriba. Si la idea necesita un dato concreto que no tienes (ej. una foto o cliente real), dilo como un hueco a rellenar entre corchetes, ej. "[nombre del cliente]" o "[foto de la sesión]", nunca lo inventes.
- Cada idea debe ser accionable con lo que un estudio de fotografía/vídeo real tiene a mano (sus propias fotos, reels, procesos de trabajo), no genérica de marketing.
- Tono cercano y honesto, coherente con la voz de marca de arriba. Nada de superlativos vacíos ("el mejor", "increíble") sin sustento.
- Plataforma objetivo: ${platformLabel}.

Tu única salida debe ser un objeto JSON, sin texto antes ni después, con esta forma exacta:
{"summary": "una frase breve en español resumiendo el enfoque de las ideas", "ideas": [ {"platform": "instagram" o "tiktok", "format": "ej. Reel, Carrusel, Story, Vídeo corto", "hook": "primera línea o primer segundo, para captar atención", "caption": "pie de foto completo, listo para copiar y ajustar", "hashtags": "5 a 8 hashtags relevantes separados por espacios"} ]}

Propón entre 3 y 6 ideas. Si piden algo para las dos plataformas, adapta el formato a cada una (Reels/Stories en Instagram, vídeo corto en TikTok) en vez de repetir la misma idea dos veces.`;

    const parsed = await generateJSON({ instructions: systemPrompt, prompt, kind: 'ideas', maxOutputTokens: 3500, sessionToken: token });

    const valid = parsed.ideas.length <= 6 && parsed.ideas.every(idea => idea &&
      ['instagram', 'tiktok'].includes(idea.platform) &&
      ['format', 'hook', 'caption', 'hashtags'].every(key => typeof idea[key] === 'string'));
    if (!valid) throw new AIError(502, 'La IA devolvió ideas con un formato no válido.');

    res.status(200).json({
      summary: parsed.summary || '',
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
    });
  } catch (err) {
    sendError(res, err);
  }
};
