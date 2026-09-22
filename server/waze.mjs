// Only call with a feed URL explicitly granted by Waze for Cities.
// The URL often contains credentials: never return it or log it to clients.
export function normalizeWazeFeed(data, now = Date.now()) {
  const rows = Array.isArray(data?.alerts) ? data.alerts : [];
  return rows.flatMap(item => {
    const kind = item.type === 'POLICE' ? (String(item.subtype).includes('CAMERA') ? 'radar' : 'police')
      : item.type === 'ACCIDENT' ? 'accident' : item.type === 'JAM' ? 'traffic'
      : String(item.subtype).includes('CONSTRUCTION') ? 'construction' : null;
    const latitude = item.location?.y, longitude = item.location?.x;
    const createdAt = Number(item.pubMillis), expiresAt = createdAt + 30 * 60_000;
    if (!kind || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude)
      || Math.abs(longitude) > 180 || !Number.isFinite(createdAt) || createdAt > now + 60_000 || expiresAt <= now || !item.uuid) return [];
    return [{ id: `waze-${item.uuid}`, kind, coordinate: { latitude, longitude }, createdAt, expiresAt, source: 'waze' }];
  });
}
export async function readWazeFeed(url) {
  if (new URL(url).protocol !== 'https:') throw new Error('HTTPS_REQUIRED');
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'error' });
  if (!response.ok) throw new Error('PARTNER_FEED_UNAVAILABLE');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('EMPTY_FEED');
  let size = 0; const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2_000_000) { await reader.cancel(); throw new Error('FEED_TOO_LARGE'); }
    chunks.push(Buffer.from(value));
  }
  return normalizeWazeFeed(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}
