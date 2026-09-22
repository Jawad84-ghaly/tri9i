// Expo SDK 55 gives ngrok only 10 seconds. Slow Windows startup can exceed that.
// Adjust this process only; never edit the shared node_modules package files.
const { createRequire } = require('node:module');
const path = require('node:path');
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliRoot = path.dirname(expoRequire.resolve('@expo/cli/package.json'));
const { AsyncNgrok } = require(path.join(cliRoot, 'build/src/start/server/AsyncNgrok.js'));
const start = AsyncNgrok.prototype.startAsync;
AsyncNgrok.prototype.startAsync = function(options = {}) {
  return start.call(this, { ...options, timeout: 60_000 });
};
const entry = expoRequire.resolve('expo/bin/cli');
process.argv[1] = entry;
require(entry);
