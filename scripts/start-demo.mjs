import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { chooseAddress, writeConnection } from './connection.mjs';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));
if (process.argv.includes('--lan') && process.argv.includes('--tunnel')) throw new Error('Choose either LAN or tunnel.');
const network = process.argv.includes('--tunnel') ? '--tunnel' : process.argv.includes('--lan') ? '--lan' : '--localhost';
const host = network === '--lan' ? process.env.REACT_NATIVE_PACKAGER_HOSTNAME || chooseAddress(networkInterfaces()) : '127.0.0.1';
if (!host) throw new Error('No local network address found. Connect to Wi-Fi and retry.');
const port = 8081;
// Do not accidentally attach to or replace another project's development server.
try {
  await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(1200) });
  console.error(`Port ${port} is already in use. Stop the previous Expo server before restarting.`);
  process.exit(1);
} catch { /* Port is available. Expo reports any remaining bind error. */ }
const local = join(root, '.local'); mkdirSync(local, { recursive: true });
rmSync(join(local, 'qr.png'), { force: true });
writeFileSync(join(local, 'connection.json'), JSON.stringify({ status: 'starting', mode: network, generatedAt: new Date().toISOString() }, null, 2));
const environment = { ...process.env, EXPO_PUBLIC_DEMO_MODE: 'true' };
if (network === '--tunnel') delete environment.REACT_NATIVE_PACKAGER_HOSTNAME;
else environment.REACT_NATIVE_PACKAGER_HOSTNAME = host;
const entry = network === '--tunnel' ? fileURLToPath(new URL('./expo-tunnel.cjs', import.meta.url)) : cli;
const child = spawn(process.execPath, [entry, 'start', '--go', network, '--port', String(port)], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: environment,
});
let finished = false;
child.on('exit', () => { finished = true; });
void (async () => {
  for (let attempt = 0; attempt < 300 && !finished; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, { headers: { accept: 'application/expo+json', 'expo-platform': 'android' }, signal: AbortSignal.timeout(2000) });
      const manifest = await response.json();
      if (response.ok && manifest.extra?.expoClient?.slug === 'tri9i-darija') {
        const bundle = new URL(manifest.launchAsset.url);
        if (network === '--tunnel' && !/\.exp\.direct$|\.ngrok[.-]/i.test(bundle.hostname)) throw new Error('Waiting for tunnel hostname');
        const url = `exp://${bundle.host}`;
        const qr = writeConnection(root, url);
        console.log(`\nTri9i ready: ${url}\nUpdated QR: ${qr}\nKeep this process running while testing.\n`);
        return;
      }
    } catch { /* Wait for Metro and the manifest handler to become ready. */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!finished) console.error('No verified Expo manifest yet. Check the Expo output before scanning.');
})();
child.on('error', () => { console.error('Expo could not start. Install dependencies first.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
