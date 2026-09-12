// Reads only the checked-in nonsecret worksheet, never local env or live services.
const fs = require('node:fs');
const path = require('node:path');
const { inspectLiveReadiness } = require('../offline/cad-convex/liveReadiness');
let result;
try {
  result = inspectLiveReadiness(JSON.parse(fs.readFileSync(
    path.join(__dirname, '../offline/cad-convex/liveReadiness.json'), 'utf8')));
} catch { result = inspectLiveReadiness(null); }
console.log(JSON.stringify(result));
if (!result.packetValid) process.exitCode = 1;
