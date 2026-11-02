// Server-only OpenAI Responses adapter. No SDK, database writes or automatic retries.
const ENDPOINT = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const TIMEOUT_MS = 20000;

class AIError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Read JSON inside the same deadline as the request, not just its headers.
// No raw response body is exposed on upstream HTTP errors.
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AIError(504, 'El servicio está tardando demasiado. Inténtalo de nuevo.'));
    }, TIMEOUT_MS);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) {
        // Abort any unread error stream; callers receive only status, never its text.
        controller.abort();
        return { ok: false, status: response.status };
      }
      const payload = await response.json();
      return { ok: true, status: response.status, json: async () => payload };
    })()]);
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      throw new AIError(504, 'El servicio está tardando demasiado. Inténtalo de nuevo.');
    }
    throw new AIError(502, 'No se pudo obtener una respuesta válida del servicio. Inténtalo más tarde.');
  } finally { clearTimeout(timer); }
}

function readBody(raw) {
  let body;
  try {
    if (typeof raw === 'string' && raw.length > 120000) throw new Error();
    body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 120000) throw new Error();
  } catch { throw new AIError(400, 'El cuerpo de la solicitud no es válido.'); }
  if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 6000) {
    throw new AIError(400, 'Escribe una petición de entre 1 y 6000 caracteres.');
  }
  return body;
}

const string = { type: 'string' };
const scalar = { type: ['string', 'number', 'boolean', 'null'] };
function object(properties) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}
const schemas = {
  changes: object({ summary: string, changes: { type: 'array', items: { anyOf: [
    object({ table: { type: 'string', enum: ['site_content'] }, key: string,
      lang: { type: 'string', enum: ['es', 'en'] }, old_value: scalar, new_value: string }),
    object({ table: { type: 'string', enum: ['portfolio_projects'] }, id: string, title: string,
      field: { type: 'string', enum: ['layout_class', 'is_published', 'title'] }, old_value: scalar, new_value: scalar }),
  ] } } }),
  ideas: object({ summary: string, ideas: { type: 'array', items: object({
    platform: { type: 'string', enum: ['instagram', 'tiktok'] }, format: string,
    hook: string, caption: string, hashtags: string,
  }) } }),
};

async function requireAIEnabled(sessionToken) {
  if (!sessionToken) throw new AIError(401, 'No autenticado.');
  const state = await fetchWithTimeout('https://dmegetqsiowxwiibcxmv.supabase.co/rest/v1/site_content?key=eq.studio_ai_enabled&lang=eq.es&select=value', {
    headers: { Authorization: `Bearer ${sessionToken}`, apikey: 'sb_publishable_1FXmgEWqmmRPZZp3lCpOiA_VfJ8JyIx', 'Cache-Control': 'no-cache' },
    cache: 'no-store',
  });
  if (!state.ok) throw new AIError(503, 'No se pudo comprobar el interruptor de IA. No se ha enviado ninguna petición.');
  const rows = await state.json();
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.value !== 'true') {
    throw new AIError(403, 'La IA está apagada. Actívala en Studio antes de usarla.');
  }
}

async function generateJSON({ instructions, prompt, kind, maxOutputTokens, sessionToken }) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new AIError(503, 'Falta configurar OPENAI_API_KEY en el servidor.');
  }
  await requireAIEnabled(sessionToken);
  const response = await fetchWithTimeout(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
      instructions, input: [{ role: 'user', content: prompt }],
      max_output_tokens: maxOutputTokens, store: false,
      text: { format: { type: 'json_schema', name: `open_grain_${kind}`, strict: true, schema: schemas[kind] } },
    }),
  });
  if (!response.ok) {
    // Never return vendor bodies: they may contain request data or credentials.
    if (response.status === 429) throw new AIError(429, 'La IA ha alcanzado un límite de uso. Revisa la cuota o inténtalo más tarde.');
    throw new AIError(502, 'El servicio de IA no está disponible. Revisa su configuración o inténtalo más tarde.');
  }
  let payload;
  try { payload = await response.json(); } catch { throw new AIError(502, 'La IA devolvió una respuesta no válida.'); }
  if (payload.status !== 'completed' || payload.error) throw new AIError(502, 'La IA no pudo completar la respuesta. Prueba una petición más breve.');
  const parts = (Array.isArray(payload.output) ? payload.output : [])
    .filter(item => item.type === 'message')
    .flatMap(item => Array.isArray(item.content) ? item.content : []);
  if (parts.some(part => part.type === 'refusal')) throw new AIError(422, 'La IA no pudo responder a esa petición. Prueba a reformularla.');
  const text = parts.filter(part => part.type === 'output_text').map(part => part.text || '').join('');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new AIError(502, 'No pude interpretar la respuesta de la IA. Intenta reformular tu petición.'); }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.summary !== 'string' || !Array.isArray(parsed[kind])) {
    throw new AIError(502, 'La respuesta de la IA no tiene el formato esperado.');
  }
  return parsed;
}

function sendError(res, error) {
  const known = error instanceof AIError;
  return res.status(known ? error.status : 500).json({ error: known ? error.message : 'No se pudo completar la petición. Inténtalo de nuevo.' });
}
module.exports = { AIError, readBody, fetchWithTimeout, generateJSON, sendError };
