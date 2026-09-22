import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';

const storedAlert = z.object({
  id: z.string(), kind: z.enum(['police', 'radar', 'construction', 'accident', 'traffic']),
  coordinate: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  source: z.literal('community'), createdAt: z.number().finite(), expiresAt: z.number().finite(),
});

// Atomic snapshots for a single development server. Use a shared database for multiple instances.
export function reportStore(file = '', clock = Date.now) {
  let records = new Map();
  if (file) {
    try {
      const rows = z.array(storedAlert).max(10_000).parse(JSON.parse(readFileSync(file, 'utf8')));
      records = new Map(rows.filter(row => row.expiresAt > clock()).map(row => [row.id, row]));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw new Error('Cannot read alerts storage; refusing to overwrite it.');
    }
  }
  function commit(next) {
    if (file) {
      mkdirSync(dirname(file), { recursive: true });
      // Node 22+ flushes the data before the same-volume atomic rename.
      writeFileSync(`${file}.tmp`, JSON.stringify([...next.values()]), { encoding: 'utf8', flush: true });
      renameSync(`${file}.tmp`, file);
    }
    records = next; // A failed disk write must never be acknowledged as a saved report.
  }
  return {
    get size() { return records.size; },
    values: () => records.values(),
    set(id, alert) { const next = new Map(records); next.set(id, storedAlert.parse(alert)); commit(next); },
    prune(now) {
      const next = new Map([...records].filter(([, alert]) => alert.expiresAt > now));
      if (next.size !== records.size) commit(next);
    },
  };
}
