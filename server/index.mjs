import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { readWazeFeed } from './waze.mjs';
import { reportStore } from './storage.mjs';

const reportSchema = z.object({
  kind: z.enum(['police', 'radar', 'construction', 'accident', 'traffic']),
  coordinate: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict(),
}).strict();
const ttl = { police: 30, radar: 60, construction: 120, accident: 45, traffic: 15 };
const send = (response, status, data) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(data));
};
async function readBody(request) {
  let body = '', size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new Error('BODY_TOO_LARGE');
    body += chunk.toString();
  }
  return JSON.parse(body);
}

// Runnable single-instance backend. Sessions remain anonymous and temporary.
export function createAlertServer({ clock = Date.now, feedUrl = '', storageFile = '' } = {}) {
  const reports = reportStore(storageFile, clock), sessions = new Map(), limits = new Map();
  let partnerAlerts = [], partnerHealthy = !feedUrl;
  function prune(now) {
    reports.prune(now);
    for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id);
    for (const [id, limit] of limits) if (limit.until <= now) limits.delete(id);
    partnerAlerts = partnerAlerts.filter(alert => alert.expiresAt > now);
  }
  function rateLimit(ip, operation, maximum, now) {
    const key = `${ip}:${operation}`;
    const entry = limits.get(key) ?? { count: 0, until: now + 60_000 };
    entry.count++; limits.set(key, entry);
    return entry.count > maximum;
  }
  const server = createServer(async (request, response) => {
    const now = clock();
    try { prune(now); } catch { return send(response, 503, { error: 'STORAGE_UNAVAILABLE' }); }
    const ip = request.socket.remoteAddress ?? 'unknown';
    // Do not trust arbitrary X-Forwarded-For headers. Configure a gateway for production.
    if (rateLimit(ip, 'all', 120, now)) return send(response, 429, { error: 'RATE_LIMIT' });
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') {
        return send(response, 200, { ok: true, storage: storageFile ? 'file' : 'memory', partnerHealthy });
      }
      if (request.method === 'POST' && url.pathname === '/session') {
        if (sessions.size >= 10_000 || rateLimit(ip, 'session', 10, now)) return send(response, 429, { error: 'RATE_LIMIT' });
        const token = randomBytes(32).toString('hex'), expiresAt = now + 3600_000;
        sessions.set(token, { expiresAt });
        return send(response, 201, { token, expiresAt });
      }
      if (request.method === 'GET' && url.pathname === '/alerts') {
        const raw = url.searchParams.get('bbox');
        const box = raw?.split(',').map(Number);
        if (!box || box.length !== 4 || raw.split(',').some(value => !value.trim()) || !box.every(Number.isFinite)
          || box[0] < -180 || box[2] > 180 || box[1] < -90 || box[3] > 90
          || box[0] >= box[2] || box[1] >= box[3] || box[2] - box[0] > 2 || box[3] - box[1] > 2) {
          return send(response, 400, { error: 'INVALID_BBOX' });
        }
        const alerts = [...reports.values(), ...partnerAlerts].filter(({ coordinate: p }) =>
          p.longitude >= box[0] && p.longitude <= box[2] && p.latitude >= box[1] && p.latitude <= box[3]).slice(-2000);
        return send(response, 200, { alerts, updatedAt: now, partnerHealthy });
      }
      if (request.method === 'POST' && url.pathname === '/alerts') {
        const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : undefined;
        if (!token || !sessions.has(token)) return send(response, 401, { error: 'UNAUTHORIZED' });
        if (rateLimit(ip, 'report', 5, now) || reports.size >= 10_000) return send(response, 429, { error: 'RATE_LIMIT' });
        if (!request.headers['content-type']?.startsWith('application/json')) return send(response, 415, { error: 'JSON_REQUIRED' });
        const result = reportSchema.safeParse(await readBody(request));
        if (!result.success) return send(response, 400, { error: 'INVALID_REPORT' });
        // All IDs, timestamps and sources are controlled by the server.
        const alert = { ...result.data, id: randomUUID(), source: 'community', createdAt: now,
          expiresAt: now + ttl[result.data.kind] * 60_000 };
        try { reports.set(alert.id, alert); } catch { return send(response, 503, { error: 'STORAGE_UNAVAILABLE' }); }
        return send(response, 201, alert);
      }
      return send(response, 404, { error: 'NOT_FOUND' });
    } catch { return send(response, 400, { error: 'BAD_REQUEST' }); }
  });
  server.requestTimeout = 15_000; server.headersTimeout = 10_000;
  const cleanup = setInterval(() => { try { prune(clock()); } catch { /* Next request returns a storage error. */ } }, 60_000); cleanup.unref();
  let feedTimer;
  let closed = false;
  if (feedUrl) {
    const pollFeed = async () => {
      try { partnerAlerts = await readWazeFeed(feedUrl); partnerHealthy = true; }
      catch { partnerHealthy = false; /* Preserve only non-expired alerts; never log the secret URL. */ }
      if (!closed) { feedTimer = setTimeout(pollFeed, 120_000); feedTimer.unref(); }
    };
    void pollFeed();
  }
  server.on('close', () => { closed = true; clearInterval(cleanup); clearTimeout(feedTimer); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 8787), host = process.env.HOST ?? '127.0.0.1';
  createAlertServer({ feedUrl: process.env.WAZE_FEED_URL ?? '', storageFile: process.env.ALERTS_STORAGE_FILE ?? '.local/alerts.json' }).listen(port, host, () => {
    console.log(`Tri9i community development server: http://${host}:${port}`);
  });
}
