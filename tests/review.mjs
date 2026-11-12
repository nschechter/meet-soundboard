import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const browser = await chromium.launch({ headless: true });
const browserContext = await browser.newContext();
const results = [];
const errors = [];
const engine = await fs.readFile(path.join(root, 'extension/engine.js'), 'utf8');
const sounds = await fs.readFile(path.join(root, 'extension/sounds.js'), 'utf8');
const audio = await fs.readFile(path.join(root, 'extension/audio.js'), 'utf8');

async function fixture() {
  const page = await browserContext.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://meet.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Audio review fixture</title></head><body></body></html>' }));
  await page.goto('https://meet.google.com/review-fixture');
  await page.evaluate(() => {
    window.review = { originals: new WeakSet(), failMix: false, deferMix: false, waiting: false, statuses: [], errors: [], videoReplacements: 0 };
    const replace = RTCRtpSender.prototype.replaceTrack;
    RTCRtpSender.prototype.replaceTrack = async function(track) {
      if (track?.kind === 'video') review.videoReplacements++;
      if (track?.kind === 'audio' && !review.originals.has(track)) {
        if (review.failMix) throw new DOMException('Injected mixer rejection', 'InvalidModificationError');
        if (review.deferMix) {
          review.waiting = true;
          await new Promise(resolve => review.release = resolve);
        }
      }
      return replace.call(this, track);
    };
    navigator.mediaDevices.getDisplayMedia = async () => new MediaStream([review.screenTrack]);
    window.addEventListener('message', event => {
      if (event.data?.from !== 'engine') return;
      if (event.data.type === 'status') review.statuses.push(event.data);
      if (event.data.type === 'error') review.errors.push(event.data.message);
    });
    review.command = (type, payload = {}) => window.postMessage({ channel: 'meet-soundboard-v1', from: 'panel', type, ...payload }, location.origin);
  });
  await page.addScriptTag({ content: sounds });
  await page.addScriptTag({ content: audio });
  await page.addScriptTag({ content: engine });
  await page.evaluate(async () => {
    const context = new AudioContext();
    await context.resume();
    const destination = context.createMediaStreamDestination();
    const track = destination.stream.getAudioTracks()[0];
    review.originals.add(track);
    const left = new RTCPeerConnection();
    const sender = left.addTrack(track, destination.stream);
    Object.defineProperty(left, 'connectionState', { get: () => 'connected' });
    Object.defineProperty(left.getTransceivers()[0], 'currentDirection', { get: () => 'sendonly' });
    Object.assign(review, { context, destination, track, left, sender });
    await left.setLocalDescription(await left.createOffer());
  });
  return page;
}

async function state(page, expected) {
  await page.waitForFunction(expected => review.statuses.at(-1)?.state === expected, expected);
}

async function command(page, type, payload = {}) {
  await page.evaluate(({ type, payload }) => review.command(type, payload), { type, payload });
}

async function check(name, run) {
  const page = await fixture();
  try {
    await run(page);
    results.push(name);
    console.log(`PASS ${name}`);
  } finally {
    await page.evaluate(() => { review.left.close(); review.context.close(); });
    await page.close();
  }
}

try {
  await check('A rejected mixer keeps excluded voice disconnected and restores it only when turned off', async page => {
    await page.evaluate(() => review.failMix = true);
    await command(page, 'configure', { includeVoice: false });
    await command(page, 'activate');
    await page.waitForFunction(() => review.statuses.at(-1)?.error.includes('Audio is paused'));
    assert.equal(await page.evaluate(() => review.sender.track), null);
    await command(page, 'deactivate');
    await state(page, 'off');
    assert.equal(await page.evaluate(() => review.sender.track === review.track), true);
    assert.equal(await page.evaluate(() => review.track.readyState), 'live');
    assert.equal(await page.evaluate(() => review.statuses.at(-1).error), '');
  });

  await check('A rejected mixer preserves a voice that was included', async page => {
    await page.evaluate(() => review.failMix = true);
    await command(page, 'activate');
    await page.waitForFunction(() => review.statuses.at(-1)?.error.includes('original microphone'));
    assert.equal(await page.evaluate(() => review.sender.track === review.track), true);
    assert.equal(await page.evaluate(() => review.track.enabled), true);
  });

  await check('Meet removeTrack wins over a pending mixer operation', async page => {
    await page.evaluate(() => review.deferMix = true);
    await command(page, 'activate');
    await page.waitForFunction(() => review.waiting);
    await page.evaluate(() => {
      review.left.removeTrack(review.sender);
      review.deferMix = false;
      review.release();
    });
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => review.sender.track), null);
    await command(page, 'deactivate');
    await state(page, 'off');
    assert.equal(await page.evaluate(() => review.sender.track), null);
  });

  await check('Paused RTP audio is reported and never force-enabled', async page => {
    await command(page, 'activate');
    await state(page, 'ready');
    await page.evaluate(async () => {
      const parameters = review.sender.getParameters();
      parameters.encodings[0].active = false;
      await review.sender.setParameters(parameters);
    });
    await state(page, 'paused');
    await command(page, 'play', { id: 'ding', builtin: 'ding', preview: false });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => review.statuses.at(-1).playing), null);
    assert.equal(await page.evaluate(() => review.sender.getParameters().encodings[0].active), false);
    await page.evaluate(async () => {
      const parameters = review.sender.getParameters();
      parameters.encodings[0].active = true;
      await review.sender.setParameters(parameters);
    });
    await state(page, 'ready');
  });

  await check('Screen-share audio and its clones bypass the mixer', async page => {
    await page.evaluate(async () => {
      review.screenTrack = review.track.clone();
      review.originals.add(review.screenTrack);
      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true });
      review.screenClone = stream.getAudioTracks()[0].clone();
      review.originals.add(review.screenClone);
      await review.sender.replaceTrack(review.screenClone);
    });
    await command(page, 'activate');
    await page.waitForFunction(() => review.statuses.at(-1)?.enabled === true);
    assert.equal(await page.evaluate(() => review.sender.track === review.screenClone), true);
    assert.equal(await page.evaluate(() => review.statuses.at(-1).state), 'waiting');
  });

  await check('Activating the soundboard does not replace camera tracks', async page => {
    await command(page, 'activate');
    await state(page, 'ready');
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const track = canvas.captureStream(1).getVideoTracks()[0];
      review.videoTrack = track;
      review.videoSender = review.left.addTrack(track);
    });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => review.videoReplacements), 0);
    assert.equal(await page.evaluate(() => review.videoSender.track === review.videoTrack), true);
  });

  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(root, 'test-results/review-results.json'), JSON.stringify({ checks: results, errors }, null, 2));
  console.log(`${results.length} focused review checks passed.`);
} finally { await browser.close(); }
