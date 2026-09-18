// Sample the encoded deliverable, not screenshots taken before video encoding.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const qa = 'docs/qa/cad-phase-progression';
const out = '/private/tmp/cad-phase-source-frames';
fs.mkdirSync(out, { recursive: true });
const video = `${qa}/walkthrough.mp4`;
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' });
if (probe.status !== 0) throw new Error(probe.stderr);
const duration = Number(probe.stdout.trim());
const { scenes } = JSON.parse(fs.readFileSync(`${qa}/walkthrough-scenes.json`));
const samples = scenes.map(scene => ({ name: `${scene.width}-${scene.name}`, seconds: scene.mp4Seconds + 1 }));
for (let seconds = 0; seconds < duration; seconds += 10) samples.push({ name: `timeline-${seconds}`, seconds });
samples.push({ name: 'timeline-end', seconds: duration - 0.2 });
for (const sample of samples) {
  const result = spawnSync('ffmpeg', ['-y', '-ss', String(sample.seconds), '-i', video, '-frames:v', '1', `${out}/${sample.name}.png`], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
}
fs.writeFileSync(`${qa}/video-verification.json`, JSON.stringify({ video, sha256: createHash('sha256').update(fs.readFileSync(video)).digest('hex'), duration, frameDirectory: out, samples }, null, 2));
console.log(`Extracted ${samples.length} encoded-video frames across ${duration.toFixed(2)} seconds. Review them visually before marking coverage verified.`);
