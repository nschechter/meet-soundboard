import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
fs.mkdirSync(path.join(import.meta.dirname, '../test-results'), { recursive: true });

for (const name of ['verify.mjs', 'review.mjs', 'audio-lifecycle.mjs', 'security-ui.mjs', 'audio-assets.mjs', 'launcher-ui.mjs', 'clip-editor.mjs']) {
  const result = spawnSync(process.execPath, [path.join(import.meta.dirname, name)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
