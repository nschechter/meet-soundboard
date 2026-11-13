import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const browser = await chromium.launch({ headless: true });
const scripts = await Promise.all(['sounds.js', 'audio.js', 'engine.js'].map(name => fs.readFile(path.join(root, 'extension', name), 'utf8')));
const checks = [];
const failures = [];
const errors = [];

async function fixture() {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://meet.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Audio lifecycle test</title>' }));
  await page.goto('https://meet.google.com/audio-lifecycle');
  await page.evaluate(() => {
    window.review = { originals: new WeakSet(), deferMix: false, releases: [], statuses: [] };
    const replace = RTCRtpSender.prototype.replaceTrack;
    RTCRtpSender.prototype.replaceTrack = async function(track) {
      if (review.deferMix && track?.kind === 'audio' && !review.originals.has(track)) {
        await new Promise(resolve => review.releases.push(resolve));
      }
      return replace.call(this, track);
    };
    window.addEventListener('message', event => {
      if (event.data?.from === 'engine' && event.data.type === 'status') review.statuses.push(event.data);
    });
    review.command = (type, fields = {}) => window.postMessage({ channel: 'meet-soundboard-v1', from: 'panel', type, ...fields }, location.origin);
  });
  for (const content of scripts) await page.addScriptTag({ content });
  await page.evaluate(async () => {
    const context = new AudioContext();
    await context.resume();
    const destination = context.createMediaStreamDestination();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = .25;
    oscillator.connect(gain).connect(destination);
    oscillator.start();
    const input = destination.stream.getAudioTracks()[0];
    review.originals.add(input);
    const left = new RTCPeerConnection();
    const right = new RTCPeerConnection();
    left.onicecandidate = event => { if (event.candidate) right.addIceCandidate(event.candidate); };
    right.onicecandidate = event => { if (event.candidate) left.addIceCandidate(event.candidate); };
    right.ontrack = event => {
      const player = document.createElement('audio');
      player.srcObject = new MediaStream([event.track]);
      player.muted = true;
      void player.play();
      review.player = player;
      const analyser = context.createAnalyser();
      const silence = context.createGain();
      silence.gain.value = 0;
      context.createMediaStreamSource(new MediaStream([event.track])).connect(analyser).connect(silence).connect(context.destination);
      review.analyser = analyser;
    };
    const sender = left.addTrack(input, destination.stream);
    Object.assign(review, { context, destination, input, left, right, sender });
    review.negotiate = async () => {
      await left.setLocalDescription(await left.createOffer());
      await right.setRemoteDescription(left.localDescription);
      await right.setLocalDescription(await right.createAnswer());
      await left.setRemoteDescription(right.localDescription);
    };
    await review.negotiate();
  });
  await page.waitForFunction(() => review.left.connectionState === 'connected' && review.analyser);
  return page;
}

async function command(page, type, fields = {}) {
  await page.evaluate(({ type, fields }) => review.command(type, fields), { type, fields });
}

async function state(page, value) {
  await page.waitForFunction(value => review.statuses.at(-1)?.state === value, value);
}

async function level(page) {
  return page.evaluate(async () => {
    const samples = new Float32Array(review.analyser.fftSize);
    let peak = 0;
    for (let index = 0; index < 12; index++) {
      review.analyser.getFloatTimeDomainData(samples);
      peak = Math.max(peak, Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length));
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    return peak;
  });
}

async function expectAudio(page, predicate, message) {
  let measured;
  for (let attempt = 0; attempt < 10; attempt++) {
    measured = await level(page);
    if (predicate(measured)) return;
  }
  assert.fail(`${message}: ${measured}`);
}

async function check(name, run) {
  const page = await fixture();
  try {
    await expectAudio(page, value => value > .05, 'The original microphone must reach the receiver before the check');
    await run(page);
    checks.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    await page.close();
  }
}

try {
  for (const method of ['addTrack', 'addTransceiver']) {
    await check(`${method} excludes voice from the first audio frame on a new sender`, async page => {
      await command(page, 'configure', { includeVoice: false });
      await command(page, 'activate');
      await state(page, 'ready');
      await page.waitForTimeout(500);
      assert.ok(await level(page) < .005);
      const rawAttached = await page.evaluate(method => {
        review.left.removeTrack(review.sender);
        review.deferMix = true;
        review.nextInput = review.input.clone();
        review.originals.add(review.nextInput);
        review.nextSender = method === 'addTrack'
          ? review.left.addTrack(review.nextInput)
          : review.left.addTransceiver(review.nextInput, { direction: 'sendonly' }).sender;
        return review.nextSender.track === review.nextInput;
      }, method);
      assert.equal(rawAttached, false, 'The raw microphone must never be attached, even before asynchronous replacement');
      await page.evaluate(() => review.negotiate());
      await page.waitForTimeout(500);
      assert.ok(await level(page) < .005, 'The receiver must remain silent with voice excluded');
      await page.evaluate(() => { review.deferMix = false; review.releases.forEach(resolve => resolve()); });
      await state(page, 'ready');
      await command(page, 'play', { id: 'ding', builtin: 'ding', preview: false });
      await expectAudio(page, value => value > .01, 'Effects must reach the new sender');
      await command(page, 'stop');
      await command(page, 'configure', { includeVoice: true });
      await page.waitForTimeout(400);
      await expectAudio(page, value => value > .05, 'Voice must return when explicitly included');
    });

    await check(`${method} never falls back to excluded voice if mixer creation fails`, async page => {
      await command(page, 'configure', { includeVoice: false });
      await command(page, 'activate');
      await state(page, 'ready');
      const result = await page.evaluate(method => {
        const original = AudioContext.prototype.createMediaStreamSource;
        const next = review.input.clone();
        const before = review.left.getSenders().length;
        AudioContext.prototype.createMediaStreamSource = () => { throw new DOMException('Injected mixer creation failure', 'InvalidStateError'); };
        let rejected = false;
        try {
          review.left[method](next);
        } catch {
          rejected = true;
        } finally {
          AudioContext.prototype.createMediaStreamSource = original;
        }
        return { rejected, before, after: review.left.getSenders().length, inputLive: next.readyState };
      }, method);
      assert.equal(result.rejected, true);
      assert.equal(result.after, result.before);
      assert.equal(result.inputLive, 'live');
      await page.waitForTimeout(500);
      assert.ok(await level(page) < .005, 'A rejected new sender must not expose the microphone');
    });
  }

  for (const reactivate of [false, true]) {
    await check(`Retired mixer tracks cannot mute, stop, or clone the live microphone${reactivate ? ' after reactivation' : ''}`, async page => {
      await command(page, 'activate');
      await state(page, 'ready');
      await page.evaluate(() => { review.retired = review.sender.track; });
      await command(page, 'deactivate');
      await state(page, 'off');
      await page.waitForFunction(() => review.sender.track === review.input);
      if (reactivate) {
        await command(page, 'activate');
        await state(page, 'ready');
      }
      const result = await page.evaluate(() => {
        const retiredState = review.retired.readyState;
        const cloned = review.retired.clone();
        const cloneState = cloned.readyState;
        cloned.stop();
        review.retired.enabled = false;
        review.retired.stop();
        return { retiredState, inputState: review.input.readyState, inputEnabled: review.input.enabled, cloneState };
      });
      assert.deepEqual(result, { retiredState: 'ended', inputState: 'live', inputEnabled: true, cloneState: 'ended' });
      await page.waitForTimeout(500);
      await expectAudio(page, value => value > .05, 'Voice must still reach the receiver after old-track cleanup');
    });
  }

  await check('Stopping an active mixer output still stops its live microphone', async page => {
    await command(page, 'activate');
    await state(page, 'ready');
    assert.equal(await page.evaluate(() => { review.sender.track.stop(); return review.input.readyState; }), 'ended');
    await page.waitForTimeout(500);
    assert.ok(await level(page) < .005);
  });

  await fs.writeFile(path.join(root, 'test-results/audio-lifecycle-results.json'), JSON.stringify({ checks, failures, errors }, null, 2));
  assert.deepEqual(errors, []);
  assert.equal(failures.length, 0, `${failures.length} audio lifecycle checks failed`);
  console.log(`${checks.length} audio lifecycle checks passed.`);
} finally {
  await browser.close();
}
