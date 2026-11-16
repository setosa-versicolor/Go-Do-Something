// The collector for what people type into the "or say it" box. A Cloudflare
// Worker with one small table behind it. It exists so the app can learn to
// understand more of what people ask for, and it is built to know as little
// as possible about who asked:
//
//   kept:      the words typed, what the app made of them, how many picks came
//              back, the time they had, and the hour it happened
//   not kept:  IP address, location, cookies, any identifier, the exact minute
//
// POST /say      from the site (and only the site): one typed request
// GET  /export   with the export token: the rows, for the review
//
// Setting it up is in worker/README.md.

const MAX_TEXT = 200;
const MAX_PER_HOUR = 600; // a flood stops here; real use is nowhere near it

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

/** Trim what arrived to what we agreed to keep. Returns null if it isn't a typed request at all. */
export function tidy(body) {
  if (!body || typeof body !== 'object' || typeof body.text !== 'string') return null;
  const text = body.text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
  if (!text) return null;
  const heard = Array.isArray(body.heard) ? body.heard.filter((h) => typeof h === 'string').slice(0, 20).map((h) => h.slice(0, 40)) : [];
  const whole = (n, most) => (Number.isFinite(n) ? Math.max(0, Math.min(most, Math.round(n))) : null);
  return { text, heard: heard.join('|'), lost: body.lost ? 1 : 0, picks: whole(body.picks, 3), minutes: whole(body.minutes, 1440) };
}

export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin') ?? '';
  const allowed = String(env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const cors = allowed.includes(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin' } : {};

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  if (request.method === 'POST' && url.pathname === '/say') {
    // Only the site itself may write. (A browser sets Origin; this keeps out everything that isn't one, and other sites.)
    if (!allowed.includes(origin)) return json({ error: 'not from the site' }, 403);
    const raw = await request.text();
    if (raw.length > 4000) return json({ error: 'too long' }, 413, cors);
    let row;
    try {
      row = tidy(JSON.parse(raw));
    } catch {
      row = null;
    }
    if (!row) return json({ error: 'not a typed request' }, 400, cors);
    // The hour, never the minute: enough to see morning from evening, not enough to pick a person out.
    const hour = `${new Date(now).toISOString().slice(0, 13)}:00Z`;
    const busy = await env.DB.prepare('SELECT COUNT(*) AS n FROM says WHERE hour = ?').bind(hour).first();
    if ((busy?.n ?? 0) >= MAX_PER_HOUR) return new Response(null, { status: 204, headers: cors });
    await env.DB.prepare('INSERT INTO says (hour, text, heard, lost, picks, minutes) VALUES (?, ?, ?, ?, ?, ?)').bind(hour, row.text, row.heard, row.lost, row.picks, row.minutes).run();
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === 'GET' && url.pathname === '/export') {
    const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
    if (!env.EXPORT_TOKEN || token !== env.EXPORT_TOKEN) return json({ error: 'the export token is missing or wrong' }, 401);
    const since = url.searchParams.get('since') ?? '2000-01-01T00:00Z';
    const { results } = await env.DB.prepare('SELECT hour, text, heard, lost, picks, minutes FROM says WHERE hour >= ? ORDER BY id DESC LIMIT 5000').bind(since).all();
    return json({ since, rows: results });
  }

  return json({ error: 'nothing here' }, 404);
}

export default { fetch: (request, env) => handle(request, env) };
