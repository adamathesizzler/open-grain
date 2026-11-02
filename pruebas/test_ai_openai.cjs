// Offline tests only. All fetch calls are intercepted; no account, key or API spend.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const ai = require('../api/ai-assist');
const ideas = require('../api/market-ideas');
const { generateJSON, fetchWithTimeout } = require('../api/_lib/openai');
const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;
let calls;
let switchResponse;
const base = { prompt: 'Mejora la frase', defaultCopy: { en: { hero: 'Hello' }, es: { hero: 'Hola' } }, contentOverrides: [], projects: [{ id: 'p1', title: 'Foto', layout_class: 'square', is_published: false }] };
const owner = () => ({ ok: true, json: async () => ({ email: 'adamabalde1998@gmail.com' }) });
const completed = data => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }] }) });
function stub(next = completed({ summary: 'Listo', changes: [] }), auth = owner()) {
  global.fetch = async (url, opts) => {
    calls.push({ url, opts });
    if (url === 'https://dmegetqsiowxwiibcxmv.supabase.co/auth/v1/user') return auth;
    if (url.includes('/rest/v1/site_content?')) { if (switchResponse instanceof Error) throw switchResponse; return switchResponse; }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    if (next instanceof Error) throw next;
    return next;
  };
}
async function invoke(handler = ai, body = base, method = 'POST', token = 'session-token') {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res);
  return res;
}
beforeEach(() => { calls = []; switchResponse = { ok: true, json: async () => [{ value: 'true' }] }; process.env.OPENAI_API_KEY = 'test-only-not-a-real-secret'; delete process.env.OPENAI_MODEL; stub(); });
afterEach(() => { global.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; if (originalModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = originalModel; });
for (const [name, handler] of [['editor', ai], ['ideas', ideas]]) {
 test(`${name}: rejects method without external calls`, async () => { assert.equal((await invoke(handler, base, 'GET')).code, 405); assert.equal(calls.length, 0); });
 test(`${name}: requires session before any AI spend`, async () => { assert.equal((await invoke(handler, base, 'POST', '')).code, 401); assert.equal(calls.length, 0); });
 test(`${name}: rejects invalid Supabase session`, async () => { stub(undefined, { ok: false }); assert.equal((await invoke(handler)).code, 401); assert.equal(calls.length, 1); });
 test(`${name}: rejects other users`, async () => { stub(undefined, { ok: true, json: async () => ({ email: 'someone@example.com' }) }); assert.equal((await invoke(handler)).code, 403); assert.equal(calls.length, 1); });
 test(`${name}: handles missing OpenAI configuration`, async () => { delete process.env.OPENAI_API_KEY; assert.equal((await invoke(handler)).code, 503); assert.equal(calls.length, 1); });
 test(`${name}: rejects malformed JSON body`, async () => { assert.equal((await invoke(handler, '{bad')).code, 400); assert.equal(calls.length, 1); });
 test(`${name}: rejects empty prompt`, async () => { assert.equal((await invoke(handler, { prompt: ' ' })).code, 400); assert.equal(calls.length, 1); });
 test(`${name}: rejects oversized prompt`, async () => { assert.equal((await invoke(handler, { prompt: 'x'.repeat(6001) })).code, 400); assert.equal(calls.length, 1); });
 test(`${name}: rejects oversized context`, async () => { assert.equal((await invoke(handler, { prompt: 'Hi', context: 'x'.repeat(120001) })).code, 400); assert.equal(calls.length, 1); });
}
test('editor preserves JSON contract and only proposes changes', async () => {
 const result = { summary: 'Cambia el saludo', changes: [{ table: 'site_content', key: 'hero', lang: 'es', old_value: 'Hola', new_value: 'Bienvenido' }] };
 stub(completed(result)); const res = await invoke(); assert.equal(res.code, 200); assert.deepEqual(res.body, result);
 assert.equal(calls.length, 3); // auth GET + switch GET + generation POST; no write to Supabase
 const request = JSON.parse(calls[2].opts.body); assert.equal(request.model, 'gpt-4.1-mini'); assert.equal(request.store, false);
 assert.equal(request.text.format.type, 'json_schema'); assert.equal(request.text.format.strict, true);
 assert.equal(request.input[0].content, base.prompt); assert.ok(request.instructions.includes('Nunca inventes claves'));
 assert.equal(calls[2].opts.headers.Authorization, 'Bearer test-only-not-a-real-secret');
 assert.equal(JSON.stringify(request).includes('session-token'), false);
 assert.equal(calls.some(c => c.url.includes('anthropic')), false);
});
test('configured OpenAI model is used', async () => { process.env.OPENAI_MODEL = 'gpt-4.1'; await invoke(); assert.equal(JSON.parse(calls[2].opts.body).model, 'gpt-4.1'); });
test('ideas preserves all copy fields and does not publish/save', async () => {
 const result = { summary: 'Una idea', ideas: [{ platform: 'instagram', format: 'Reel', hook: 'Mira', caption: 'Texto', hashtags: '#Mallorca' }] };
 stub(completed(result)); const res = await invoke(ideas, { prompt: 'Ideas', platform: 'instagram', brand: { serviceList: ['Foto'] } });
 assert.equal(res.code, 200); assert.deepEqual(res.body, result); assert.equal(calls.length, 3);
 assert.ok(JSON.parse(calls[2].opts.body).instructions.includes('BORRADORES'));
});
for (const [label, change] of [
 ['unknown table', { table: 'admins', new_value: 'bad' }],
 ['unknown content key', { table: 'site_content', key: 'missing', lang: 'es', new_value: 'bad' }],
 ['invalid language', { table: 'site_content', key: 'hero', lang: 'fr', new_value: 'bad' }],
 ['unknown project', { table: 'portfolio_projects', id: 'p2', field: 'title', new_value: 'bad' }],
 ['forbidden field', { table: 'portfolio_projects', id: 'p1', field: 'image', new_value: 'bad' }],
 ['invalid layout', { table: 'portfolio_projects', id: 'p1', field: 'layout_class', new_value: 'bad' }],
 ['publication string not boolean', { table: 'portfolio_projects', id: 'p1', field: 'is_published', new_value: 'true' }],
]) test(`editor rejects ${label}`, async () => { stub(completed({ summary: 'X', changes: [change] })); assert.equal((await invoke()).code, 502); });
test('editor permits supported project changes', async () => { stub(completed({ summary: 'X', changes: [{ table: 'portfolio_projects', id: 'p1', field: 'is_published', new_value: true }] })); assert.equal((await invoke()).code, 200); });
test('editor rejects malformed content context', async () => { assert.equal((await invoke(ai, { ...base, projects: [null] })).code, 400); });
test('ideas rejects unsupported platform in output', async () => { stub(completed({ summary: 'X', ideas: [{ platform: 'other' }] })); assert.equal((await invoke(ideas)).code, 502); });
for (const [label, payload] of [
 ['incomplete', { status: 'incomplete', output: [] }],
 ['empty', { status: 'completed', output: [] }],
 ['malformed JSON', { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Not JSON' }] }] }],
 ['wrong shape', { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"summary":[],"changes":[]}' }] }] }],
]) test(`rejects ${label} provider output`, async () => { stub({ ok: true, json: async () => payload }); assert.equal((await invoke()).code, 502); });
test('refusal is handled without parsing unsafe output', async () => { stub({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }) }); assert.equal((await invoke()).code, 422); });
for (const status of [400, 401, 403, 429, 500, 503]) test(`sanitizes provider ${status} and never retries`, async () => {
 stub({ ok: false, status, text: async () => 'SECRET sent to provider' }); const res = await invoke();
 assert.equal(res.code, status === 429 ? 429 : 502); assert.equal(JSON.stringify(res.body).includes('SECRET'), false); assert.equal(calls.length, 3);
});
test('network failures sanitized', async () => { stub(new Error('SECRET URL')); const res = await invoke(); assert.equal(res.code, 502); assert.equal(JSON.stringify(res.body).includes('SECRET'), false); });
test('timeout gives 504', async () => { const err = new Error('timeout'); err.name = 'AbortError'; stub(err); assert.equal((await invoke()).code, 504); });
test('response body parse failure sanitized', async () => { stub({ ok: true, json: async () => { throw new Error('SECRET'); } }); const res = await invoke(); assert.equal(res.code, 502); assert.equal(JSON.stringify(res.body).includes('SECRET'), false); });
test('missing key helper never fetches', async () => { delete process.env.OPENAI_API_KEY; await assert.rejects(generateJSON({}), e => e.status === 503); assert.equal(calls.length, 0); });

for (const endpoint of ['https://api.openai.com/v1/responses', 'https://dmegetqsiowxwiibcxmv.supabase.co/auth/v1/user']) {
 test(`deadline covers delayed JSON body: ${endpoint}`, async t => {
   t.mock.timers.enable({ apis: ['setTimeout'] });
   let receivedSignal;
   let bodyStarted = false;
   global.fetch = async (_, options) => {
     receivedSignal = options.signal;
     return { ok: true, status: 200, json: () => { bodyStarted = true; return new Promise(() => {}); } };
   };
   const pending = fetchWithTimeout(endpoint);
   // Headers have arrived but the body never finishes, even after abort.
   await Promise.resolve();
   assert.equal(bodyStarted, true);
   const rejected = assert.rejects(pending, error => error.status === 504);
   t.mock.timers.tick(20001);
   await rejected;
   assert.equal(receivedSignal.aborted, true);
   t.mock.timers.reset();
 });
}

for (const [name, handler] of [['editor', ai], ['ideas', ideas]]) {
 for (const [label, payload] of [['OFF', [{ value: 'false' }]], ['missing', []], ['invalid', [{ value: true }]], ['duplicate', [{ value: 'true' }, { value: 'true' }]], ['malformed', {}]]) {
  test(`${name}: ${label} switch prevents provider calls`, async () => {
    switchResponse = { ok: true, json: async () => payload };
    const res = await invoke(handler);
    assert.equal(res.code, 403);
    assert.equal(calls.some(c => c.url.includes('api.openai.com')), false);
  });
 }
 test(`${name}: switch read denial prevents provider calls`, async () => {
   switchResponse = { ok: false, status: 403 };
   assert.equal((await invoke(handler)).code, 503);
   assert.equal(calls.some(c => c.url.includes('api.openai.com')), false);
 });
 test(`${name}: switch network failure prevents provider calls`, async () => {
   switchResponse = new Error('private failure');
   assert.equal((await invoke(handler)).code, 502);
   assert.equal(calls.some(c => c.url.includes('api.openai.com')), false);
 });
 test(`${name}: client cannot override OFF`, async () => {
   switchResponse = { ok: true, json: async () => [] };
   assert.equal((await invoke(handler, { ...base, enabled: true, studio_ai_enabled: true })).code, 403);
   assert.equal(calls.some(c => c.url.includes('api.openai.com')), false);
 });
}
test('switch read uses authenticated token without caching', async () => {
 await invoke();
 assert.equal(calls[1].opts.headers.Authorization, 'Bearer session-token');
 assert.equal(calls[1].opts.cache, 'no-store');
 assert.equal(calls[1].opts.method, undefined);
});
test('reserved switch cannot be included in proposed edits even by client context', async () => {
 stub(completed({ summary: 'No', changes: [{ table: 'site_content', key: 'studio_ai_enabled', lang: 'es', old_value: 'false', new_value: 'true' }] }));
 assert.equal((await invoke(ai, { ...base, defaultCopy: { en: { studio_ai_enabled: 'false' } } })).code, 502);
});

// Exercise actual UI controller code without browser/network dependencies.
function uiFixture({ value = null, readError = null, saveError = null } = {}) {
 const fs = require('node:fs');
 const vm = require('node:vm');
 const source = fs.readFileSync(require.resolve('../studio/studio.js'), 'utf8');
 const controlSource = source.slice(source.indexOf('// ---------- Persistent AI spending switch'), source.indexOf('// ---------- AI assistant'));
 const listeners = {};
 const nodes = {
   'studio-ai-enabled': { checked: false, disabled: true, addEventListener: (event, fn) => { listeners[event] = fn; } },
   'studio-ai-control-status': { textContent: '' },
 };
 const writes = [];
 const chain = { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: value === null ? null : { value }, error: readError }),
   upsert(row) { writes.push(row); return { select: () => ({ single: async () => ({ data: { value: row.value }, error: saveError }) }) }; } };
 const context = vm.createContext({ document: { getElementById: id => nodes[id] }, window: { addEventListener() {} }, dashboard: { hidden: false }, supabaseClient: { from: () => chain } });
 vm.runInContext(controlSource, context);
 return { context, nodes, writes, load: () => context.loadAIControl(), change: () => listeners.change() };
}
test('UI missing switch defaults OFF without a database write', async () => {
 const u = uiFixture(); await u.load(); assert.equal(u.nodes['studio-ai-enabled'].checked, false); assert.equal(u.writes.length, 0);
});
test('UI restores persisted ON without invoking provider', async () => {
 const u = uiFixture({ value: 'true' }); await u.load(); assert.equal(u.nodes['studio-ai-enabled'].checked, true); assert.equal(calls.length, 0);
});
test('UI persists explicit enable then disable', async () => {
 const u = uiFixture(); await u.load(); u.nodes['studio-ai-enabled'].checked = true; await u.change();
 assert.equal(u.writes[0].value, 'true'); assert.equal(u.nodes['studio-ai-enabled'].checked, true);
 u.nodes['studio-ai-enabled'].checked = false; await u.change(); assert.equal(u.writes[1].value, 'false'); assert.equal(u.nodes['studio-ai-enabled'].checked, false);
});
test('UI save error fails closed and reports unconfirmed outcome', async () => {
 const u = uiFixture({ value: 'true', saveError: new Error('secret detail') }); await u.load(); u.nodes['studio-ai-enabled'].checked = false; await u.change();
 assert.equal(u.nodes['studio-ai-enabled'].checked, false); assert.match(u.nodes['studio-ai-control-status'].textContent, /confirmar/); assert.equal(u.nodes['studio-ai-control-status'].textContent.includes('secret'), false);
});
test('UI read error blocks usage and does not write', async () => {
 const u = uiFixture({ readError: new Error('read') }); await u.load(); assert.equal(u.nodes['studio-ai-enabled'].checked, false); assert.equal(u.writes.length, 0);
});
test('UI repeated toggles while saving issue only one write', async () => {
 const u = uiFixture(); await u.load(); u.nodes['studio-ai-enabled'].checked = true; const first = u.change(); await u.change(); await first; assert.equal(u.writes.length, 1);
});
