import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extension = path.resolve(process.argv[2] || path.join(root, 'extension'));
const output = path.resolve(process.argv[3] || path.join(root, 'test-results'));
await fs.mkdir(output, { recursive: true });
const scripts = await Promise.all(['sounds.js', 'audio.js', 'engine.js'].map(name => fs.readFile(path.join(extension, name), 'utf8')));
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];

async function command(page, type, payload = {}) {
  await page.evaluate(({ type, payload }) => window.postMessage({ channel: 'meet-soundboard-v1', from: 'panel', type, ...payload }, location.origin), { type, payload });
}

async function play(page, builtin) {
  await command(page, 'play', { id: typeof builtin === 'string' ? builtin : 'bad', builtin, preview: true });
}

async function check(name, run) {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://meet.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Bundled audio test</title>' }));
  await page.goto('https://meet.google.com/audio-fixture');
  await page.evaluate(() => {
    window.pack = { calls: 0, hold: false, fail: false, releases: [], starts: [], errors: [], status: null };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = async function(bytes) {
      pack.calls++;
      if (pack.fail) throw new DOMException('Injected decode failure', 'EncodingError');
      const buffer = await decode.call(this, bytes);
      if (pack.hold) await new Promise(resolve => pack.releases.push(resolve));
      return buffer;
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function(...args) {
      pack.starts.push(this.buffer.duration);
      return start.apply(this, args);
    };
    window.addEventListener('message', event => {
      if (event.data?.from !== 'engine') return;
      if (event.data.type === 'error') pack.errors.push(event.data.message);
      if (event.data.type === 'status') pack.status = event.data;
    });
  });
  for (const content of scripts) await page.addScriptTag({ content });
  await command(page, 'configure', { volume: 0 });
  await page.context().setOffline(true);
  try {
    await run(page);
    results.push(name);
    console.log(`PASS ${name}`);
  } finally { await page.close(); }
}

try {
  await check('All 15 bundled samples decode offline with correct durations, prompt starts, and no clipping', async page => {
    const measurements = await page.evaluate(async () => {
      const context = new AudioContext();
      const result = [];
      for (const sound of MeetSoundboardSounds.sounds) {
        const buffer = await context.decodeAudioData(MeetSoundboardAudio.bytes(sound.id));
        const pcm = buffer.getChannelData(0);
        let peak = 0;
        let energy = 0;
        const frames = Math.min(pcm.length, buffer.sampleRate * .2);
        for (let i = 0; i < pcm.length; i++) {
          peak = Math.max(peak, Math.abs(pcm[i]));
          if (i < frames) energy += pcm[i] ** 2;
        }
        result.push({ id: sound.id, library: sound.library, expected: sound.duration, actual: buffer.duration, peak, onset: Math.sqrt(energy/frames) });
      }
      await context.close();
      return result;
    });
    assert.equal(measurements.length, 15);
    assert.equal(measurements.filter(sound => sound.library !== 'effects').length, 0);
    for (const sound of measurements) {
      assert.ok(Math.abs(sound.expected-sound.actual) < .002, JSON.stringify(sound));
      assert.ok(sound.peak > .1 && sound.peak < .9, JSON.stringify(sound));
      assert.ok(sound.onset > .005, JSON.stringify(sound));
      assert.ok(sound.actual <= 5);
    }
  });

  await check('Repeated taps share one decode and only the latest tap starts', async page => {
    await page.evaluate(() => pack.hold = true);
    await play(page, 'trombone');
    await page.waitForFunction(() => pack.releases.length === 1);
    await play(page, 'trombone');
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => pack.calls), 1);
    await page.evaluate(() => { pack.hold = false; pack.releases.forEach(release => release()); });
    await page.waitForFunction(() => pack.starts.length === 1);
    await command(page, 'stop');
    await play(page, 'trombone');
    await page.waitForFunction(() => pack.starts.length === 2);
    assert.equal(await page.evaluate(() => pack.calls), 1);
  });

  await check('Stop cancels a sound whose sample is still decoding', async page => {
    await page.evaluate(() => pack.hold = true);
    await play(page, 'airhorn');
    await page.waitForFunction(() => pack.releases.length === 1);
    await command(page, 'stop');
    await page.waitForFunction(() => pack.status?.playing === null);
    await page.evaluate(() => pack.releases.forEach(release => release()));
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => pack.starts), []);
  });

  await check('Switching samples during a decode cannot replay the older effect', async page => {
    await page.evaluate(() => pack.hold = true);
    await play(page, 'airhorn');
    await page.waitForFunction(() => pack.releases.length === 1);
    await play(page, 'quack');
    await page.waitForFunction(() => pack.releases.length === 2);
    await page.evaluate(() => { pack.releases[1](); pack.releases[0](); });
    await page.waitForFunction(() => pack.starts.length === 1);
    await page.waitForTimeout(100);
    const expectedDuration = await page.evaluate(() => MeetSoundboardSounds.sounds.find(sound => sound.id === 'quack').duration);
    assert.ok(Math.abs((await page.evaluate(() => pack.starts[0])) - expectedDuration) < .002);
    assert.equal(await page.evaluate(() => pack.starts.length), 1);
  });

  await check('A failed sample decode is reported and can be retried', async page => {
    await page.evaluate(() => pack.fail = true);
    await play(page, 'ding');
    await page.waitForFunction(() => pack.errors.length === 1);
    assert.match(await page.evaluate(() => pack.errors[0]), /could not load/);
    await page.evaluate(() => pack.fail = false);
    await play(page, 'ding');
    await page.waitForFunction(() => pack.starts.length === 1);
    assert.equal(await page.evaluate(() => pack.calls), 2);
  });

  await check('Unknown and inherited sample keys are rejected without decoding', async page => {
    for (const key of ['__proto__', 'constructor', 'toString', 'missing', {}]) await play(page, key);
    await page.waitForFunction(() => pack.errors.length === 5);
    assert.equal(await page.evaluate(() => pack.calls), 0);
    assert.deepEqual(await page.evaluate(() => pack.starts), []);
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'audio-assets-results.json'), JSON.stringify({ checks: results, browser: browser.version(), errors }, null, 2));
  console.log(`\n${results.length} sound pack checks passed. No browser errors.`);
} finally { await browser.close(); }
