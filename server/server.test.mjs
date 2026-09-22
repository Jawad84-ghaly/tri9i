import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAlertServer } from './index.mjs';
import { normalizeWazeFeed } from './waze.mjs';
import { mkdtempSync, rmSync, rmdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reportStore } from './storage.mjs';

test('community: authenticate, validate, share across clients, filter and expire', async () => {
  let time = 1_800_000_000_000;
  const server = createAlertServer({ clock: () => time });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const data = { kind: 'accident', coordinate: { latitude: 33.59, longitude: -7.62 } };
    assert.equal((await fetch(`${base}/alerts`, { method: 'POST', body: JSON.stringify(data) })).status, 401);
    const auth = await (await fetch(`${base}/session`, { method: 'POST' })).json();
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };
    assert.equal((await fetch(`${base}/alerts`, { method: 'POST', headers: { ...headers, Authorization: auth.token }, body: JSON.stringify(data) })).status, 401);
    assert.equal((await fetch(`${base}/alerts?bbox=,33,1,34`)).status, 400);
    const invalid = await fetch(`${base}/alerts`, { method: 'POST', headers, body: JSON.stringify({ ...data, source: 'waze' }) });
    assert.equal(invalid.status, 400);
    const created = await fetch(`${base}/alerts`, { method: 'POST', headers, body: JSON.stringify(data) });
    assert.equal(created.status, 201);
    const alert = await created.json(); assert.equal(alert.source, 'community');
    const read = await (await fetch(`${base}/alerts?bbox=-7.8,33.4,-7.4,33.8`)).json();
    assert.equal(read.alerts.length, 1); assert.equal(read.alerts[0].id, alert.id);
    const elsewhere = await (await fetch(`${base}/alerts?bbox=-6,34,-5,35`)).json();
    assert.equal(elsewhere.alerts.length, 0);
    assert.equal((await fetch(`${base}/alerts?bbox=-180,-90,180,90`)).status, 400);
    time += 46 * 60_000;
    assert.equal((await (await fetch(`${base}/alerts?bbox=-7.8,33.4,-7.4,33.8`)).json()).alerts.length, 0);
    time += 20 * 60_000;
    assert.equal((await fetch(`${base}/alerts`, { method: 'POST', headers, body: JSON.stringify(data) })).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('persistent reports survive a restart and expired reports are removed from disk', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tri9i-storage-'));
  const file = join(directory, 'alerts.json');
  let now = Date.now();
  try {
    const store = reportStore(file, () => now);
    store.set('persisted', { id: 'persisted', kind: 'traffic', coordinate: { latitude: 33.59, longitude: -7.62 }, source: 'community', createdAt: now, expiresAt: now + 1000 });
    const restarted = reportStore(file, () => now);
    assert.equal(restarted.size, 1);
    now += 2000; restarted.prune(now);
    assert.equal(reportStore(file, () => now).size, 0);
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), []);
  } finally { rmSync(file, { force: true }); rmdirSync(directory); }
});

test('corrupt storage is not overwritten', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tri9i-storage-'));
  const file = join(directory, 'alerts.json');
  try {
    writeFileSync(file, '{broken');
    assert.throws(() => reportStore(file), /refusing to overwrite/);
    assert.equal(readFileSync(file, 'utf8'), '{broken');
  } finally { rmSync(file, { force: true }); rmdirSync(directory); }
});

test('partner mapping rejects stale and malformed Waze reports', () => {
  const now = Date.now();
  const row = { uuid: '123', type: 'POLICE', location: { x: -7.62, y: 33.59 }, pubMillis: now };
  const result = normalizeWazeFeed({ alerts: [row, { ...row, pubMillis: now - 31 * 60_000 }, { ...row, location: { x: 999, y: 33 } }] }, now);
  assert.equal(result.length, 1); assert.equal(result[0].kind, 'police'); assert.equal(result[0].source, 'waze');
});
