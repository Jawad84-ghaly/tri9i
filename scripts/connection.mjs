import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

export function chooseAddress(interfaces) {
  const entries = Object.entries(interfaces).flatMap(([name, rows]) => (rows ?? [])
    .filter(row => row.family === 'IPv4' && !row.internal && !row.address.startsWith('169.254.'))
    .map(row => ({ name, address: row.address })));
  return entries.find(row => /wi-?fi|wlan|wireless/i.test(row.name))?.address
    ?? entries.find(row => !/virtual|vmware|vbox|bluetooth|loopback|\*/i.test(row.name))?.address;
}

export function writeConnection(root, url) {
  // Resolve the same encoder Expo uses, independent of the package manager's paths.
  const require = createRequire(join(root, 'package.json'));
  const expoRequire = createRequire(require.resolve('expo/package.json'));
  const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
  const { toQR } = cliRequire('toqr');
  const matrix = toQR(url, 0), size = Math.sqrt(matrix.length), scale = 10, width = (size + 8) * scale;
  const raster = Buffer.alloc((width + 1) * width, 255);
  for (let y = 0; y < width; y++) {
    raster[y * (width + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const r = Math.floor(y / scale) - 4, c = Math.floor(x / scale) - 4;
      if (r >= 0 && c >= 0 && r < size && c < size && matrix[r * size + c]) raster[y * (width + 1) + x + 1] = 0;
    }
  }
  function chunk(type, data) {
    const content = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of content) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, content, checksum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(width, 4); header[8] = 8;
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raster)), chunk('IEND', Buffer.alloc(0))]);
  const directory = join(root, '.local'); mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'qr.png'), png);
  writeFileSync(join(directory, 'connection.json'), JSON.stringify({ status: 'ready', url, generatedAt: new Date().toISOString(), sdk: '55', note: 'Valid only while this server is running.' }, null, 2));
  return join(directory, 'qr.png');
}
