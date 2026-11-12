import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';

const root = path.resolve(import.meta.dirname, '..');
const extension = path.join(root, 'extension');
const extensionId = createHash('sha256').update(await fs.realpath(extension)).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(parseInt(digit, 16) + 97));
const results = [];
const context = await chromium.launchPersistentContext(path.join(root, 'test-results/browser-profile'), {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1440, height: 1060 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
});
const setup = await context.newPage();
await setup.goto(`chrome-extension://${extensionId}/popup.html`);
await setup.evaluate(() => chrome.storage.local.clear());
await setup.close();
const page = await context.newPage();
await page.addInitScript(() => {
  window.reviewContexts = [];
  const NativeAudioContext = AudioContext;
  window.AudioContext = new Proxy(NativeAudioContext, {
    construct(Target, args) {
      const context = new Target(...args);
      window.reviewContexts.push(context);
      return context;
    }
  });
});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Soundboard audio test</title></head><body style="background:#202124;color:#ddd;font-family:Arial;margin:36px"><p style="color:#9aa0a6;font-size:14px">MEET SOUNDBOARD / LOCAL AUDIO TEST</p><h1 style="font-weight:400;font-size:26px">A little more personality.</h1><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:920px;margin-top:50px"><div style="background:#303134;height:290px;border-radius:18px;display:grid;place-items:center"><div style="width:100px;height:100px;display:grid;place-items:center;background:#5f7168;border-radius:50%;font-size:36px">N</div></div><div style="background:#303134;height:290px;border-radius:18px;display:grid;place-items:center"><div style="width:100px;height:100px;display:grid;place-items:center;background:#6a6281;border-radius:50%;font-size:36px">S</div></div></div><p style="position:fixed;bottom:26px;color:#aaa;font-size:13px">Local test room · No live meeting</p></body></html>`;
await context.route('https://meet.google.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', headers: { 'Content-Security-Policy': "require-trusted-types-for 'script'; trusted-types 'none'" }, body: html }));

async function check(name, run) {
  await run();
  results.push(name);
  console.log(`PASS ${name}`);
}

async function sample(key = 'analyser') {
  return page.evaluate(async key => {
    const values = new Float32Array(window.test[key].fftSize);
    let total = 0;
    for (let n = 0; n < 8; n++) {
      window.test[key].getFloatTimeDomainData(values);
      total += Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    return total / 8;
  }, key);
}

async function waitState(state) {
  await page.waitForFunction(expected => document.querySelector('#meet-soundboard-root')?.shadowRoot.querySelector('.connection')?.dataset.state === expected, state);
}

async function expectAudio(predicate, description, key = 'analyser') {
  let value;
  for (let attempt = 0; attempt < 10; attempt++) {
    value = await sample(key);
    if (predicate(value)) return;
  }
  assert.fail(`${description}: measured audio level ${value}`);
}

try {
  await page.goto('https://meet.google.com/soundboard-test');
  await check('Manifest loads both extension worlds on Meet', async () => {
    await page.locator('button.launcher').waitFor();
    assert.equal(await page.evaluate(() => window.__meetSoundboardInstalled), true);
    await page.locator('button.launcher').click();
    assert.equal(await page.locator('.builtin-grid .sound').count(), 15);
    await waitState('off');
  });

  await check('Meet keeps its original audio before activation', async () => {
    await page.evaluate(async () => {
      const audio = new AudioContext();
      await audio.resume();
      const oscillator = audio.createOscillator();
      oscillator.frequency.value = 220;
      const gain = audio.createGain();
      gain.gain.value = .25;
      const destination = audio.createMediaStreamDestination();
      destination.channelCount = 1;
      oscillator.connect(gain).connect(destination);
      oscillator.start();
      const track = destination.stream.getAudioTracks()[0];
      const left = new RTCPeerConnection();
      const right = new RTCPeerConnection();
      left.onicecandidate = event => { if (event.candidate) right.addIceCandidate(event.candidate); };
      right.onicecandidate = event => { if (event.candidate) left.addIceCandidate(event.candidate); };
      const received = new Promise(resolve => {
        right.ontrack = event => {
          const player = document.createElement('audio');
          player.srcObject = new MediaStream([event.track]);
          player.muted = true;
          player.play();
          window.test.player = player;
          const analyser = audio.createAnalyser();
          analyser.fftSize = 2048;
          const silence = audio.createGain();
          silence.gain.value = 0;
          audio.createMediaStreamSource(new MediaStream([event.track])).connect(analyser).connect(silence).connect(audio.destination);
          window.test.analyser = analyser;
          resolve();
        };
      });
      const sender = left.addTrack(track, destination.stream);
      window.test = { audio, oscillator, gain, destination, track, left, right, sender };
      await left.setLocalDescription(await left.createOffer());
      await right.setRemoteDescription(left.localDescription);
      await right.setLocalDescription(await right.createAnswer());
      await left.setRemoteDescription(right.localDescription);
      await received;
    });
    await page.waitForFunction(() => window.test.left.connectionState === 'connected');
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => window.test.sender.track === window.test.track), true);
    assert.ok(await sample() > .05);
  });

  await check('Local preview does not enter outgoing meeting audio', async () => {
    await page.evaluate(() => window.test.gain.gain.value = 0);
    await page.waitForTimeout(350);
    await page.getByRole('button', { name: 'Preview Correct! only for me', exact: true }).click();
    assert.ok(await sample() < .005);
    assert.equal(await page.evaluate(() => window.test.sender.track === window.test.track), true);
    await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
    await page.evaluate(() => window.test.gain.gain.value = .25);
  });

  await check('Activation connects mixed audio to a real WebRTC receiver', async () => {
    await page.getByRole('button', { name: 'Turn on', exact: true }).click();
    await waitState('ready');
    assert.equal(await page.evaluate(() => window.test.sender.track !== window.test.track), true);
    await expectAudio(value => value > .05, 'Microphone audio reaches receiver after activation');
  });

  await check('Effects-only mode removes voice but transmits the sound effect', async () => {
    await page.getByLabel('Include my voice', { exact: true }).uncheck();
    await page.waitForTimeout(250);
    assert.ok(await sample() < .005);
    await page.getByRole('button', { name: 'Play Correct! to meeting', exact: true }).click();
    assert.ok(await sample() > .015);
    await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
    await page.waitForTimeout(200);
    assert.ok(await sample() < .005);
  });

  await check('Meet mute silences both voice and effects immediately', async () => {
    await page.getByLabel('Include my voice', { exact: true }).check();
    await page.getByRole('button', { name: 'Play Air horn to meeting', exact: true }).click();
    assert.ok(await sample() > .05);
    const muted = await page.evaluate(() => {
      window.test.track.enabled = false;
      return !window.test.sender.track.enabled;
    });
    assert.equal(muted, true);
    await waitState('muted');
    await page.waitForTimeout(250);
    assert.ok(await sample() < .005);
    await page.getByRole('button', { name: 'Play Correct! to meeting', exact: true }).click();
    assert.ok(await sample() < .005);
    await page.evaluate(() => window.test.track.enabled = true);
    await waitState('ready');
  });

  await check('Microphone changes keep the mixer connected', async () => {
    await page.evaluate(async () => {
      const next = window.test.destination.stream.getAudioTracks()[0].clone();
      await window.test.sender.replaceTrack(next);
      window.test.track = next;
    });
    await waitState('ready');
    assert.equal(await page.evaluate(() => window.test.sender.track !== window.test.track), true);
    await expectAudio(value => value > .05, 'Voice reaches receiver after changing microphone');
  });

  await check('Cloning an active mixed track preserves voice and effects', async () => {
    await page.evaluate(async () => {
      const clone = window.test.sender.track.clone();
      await window.test.sender.replaceTrack(clone);
      window.test.track = clone;
    });
    await waitState('ready');
    await expectAudio(value => value > .05, 'Cloned microphone still sends voice');
    await page.getByLabel('Include my voice', { exact: true }).uncheck();
    await expectAudio(value => value < .005, 'Voice can be disabled after cloning');
    await page.getByRole('button', { name: 'Play Correct! to meeting', exact: true }).click();
    assert.ok(await sample() > .01);
    await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
    await page.getByLabel('Include my voice', { exact: true }).check();
  });

  await check('Voice can be included or excluded while browser audio is interrupted', async () => {
    await page.evaluate(() => window.reviewContexts.find(context => context !== window.test.audio).suspend());
    await waitState('suspended');
    await page.waitForFunction(() => window.test.sender.track === window.test.track);
    await expectAudio(value => value > .05, 'Included voice survives interruption');
    await page.getByLabel('Include my voice', { exact: true }).uncheck();
    await expectAudio(value => value < .005, 'Excluding voice during interruption takes effect');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await waitState('ready');
    await page.getByLabel('Include my voice', { exact: true }).check();
  });

  await check('Connections created from a remote offer send mixed audio', async () => {
    await page.evaluate(async () => {
      const receiver = new RTCPeerConnection();
      const sender = new RTCPeerConnection();
      receiver.onicecandidate = event => { if (event.candidate) sender.addIceCandidate(event.candidate); };
      sender.onicecandidate = event => { if (event.candidate) receiver.addIceCandidate(event.candidate); };
      receiver.ontrack = event => {
        const stream = new MediaStream([event.track]);
        const player = document.createElement('audio');
        player.srcObject = stream;
        player.muted = true;
        player.play();
        const analyser = window.test.audio.createAnalyser();
        const silence = window.test.audio.createGain();
        silence.gain.value = 0;
        window.test.audio.createMediaStreamSource(stream).connect(analyser).connect(silence).connect(window.test.audio.destination);
        window.test.secondAnalyser = analyser;
        window.test.secondPlayer = player;
      };
      receiver.addTransceiver('audio', { direction: 'recvonly' });
      await receiver.setLocalDescription(await receiver.createOffer());
      await sender.setRemoteDescription(receiver.localDescription);
      const track = window.test.track.clone();
      sender.getTransceivers()[0].direction = 'sendonly';
      await sender.getSenders()[0].replaceTrack(track);
      await sender.setLocalDescription(await sender.createAnswer());
      await receiver.setRemoteDescription(sender.localDescription);
      window.test.second = { sender, receiver, track };
    });
    await page.waitForFunction(() => window.test.second.sender.connectionState === 'connected' && window.test.secondAnalyser);
    await expectAudio(value => value > .05, 'Remote-offer connection receives voice', 'secondAnalyser');
    await page.getByLabel('Include my voice', { exact: true }).uncheck();
    await expectAudio(value => value < .005, 'Remote-offer connection excludes voice', 'secondAnalyser');
    await page.getByRole('button', { name: 'Play Correct! to meeting', exact: true }).click();
    await expectAudio(value => value > .01, 'Remote-offer connection receives the effect', 'secondAnalyser');
    await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
    await page.getByLabel('Include my voice', { exact: true }).check();
    await page.evaluate(() => { window.test.second.sender.close(); window.test.second.receiver.close(); window.test.second.track.stop(); });
  });

  await check('Null replacement and reconnection are handled', async () => {
    await page.evaluate(() => window.test.sender.replaceTrack(null));
    await waitState('waiting');
    await page.evaluate(() => window.test.sender.replaceTrack(window.test.track));
    await waitState('ready');
  });

  await check('Turning off restores the exact original microphone track', async () => {
    await page.getByRole('button', { name: 'Turn off', exact: true }).click();
    await waitState('off');
    assert.equal(await page.evaluate(() => window.test.sender.track === window.test.track), true);
    assert.equal(await page.evaluate(() => window.test.track.readyState), 'live');
    await expectAudio(value => value > .05, 'Original microphone reaches receiver after turning off');
    await page.getByRole('button', { name: 'Turn on', exact: true }).click();
    await waitState('ready');
  });

  await check('Audio interruption never restores a voice that was excluded', async () => {
    await page.getByLabel('Include my voice', { exact: true }).uncheck();
    await expectAudio(value => value < .005, 'Voice excluded before interruption');
    await page.evaluate(() => window.reviewContexts.find(context => context !== window.test.audio).suspend());
    await waitState('suspended');
    await page.waitForTimeout(400);
    assert.notEqual(await page.evaluate(() => window.test.sender.track === window.test.track), true, 'Excluded voice must never be reattached');
    await expectAudio(value => value < .005, 'Voice remains excluded during interruption');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await waitState('ready');
    await page.getByRole('button', { name: 'Play Correct! to meeting', exact: true }).click();
    await expectAudio(value => value > .01, 'Effects reach receiver after audio resumes');
    await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
    await page.getByLabel('Include my voice', { exact: true }).check();
  });

  await check('Muted or stopped captured microphones gate processed outgoing audio', async () => {
    await page.evaluate(async () => {
      window.test.microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.test.microphone.getAudioTracks()[0].enabled = false;
    });
    await waitState('muted');
    assert.equal(await page.evaluate(() => window.test.sender.track.enabled), false);
    await page.evaluate(() => window.test.microphone.getAudioTracks()[0].enabled = true);
    await waitState('ready');
    await page.evaluate(() => window.test.microphone.getAudioTracks()[0].stop());
    await waitState('muted');
    assert.equal(await page.evaluate(() => window.test.sender.track.enabled), false);
    await page.evaluate(async () => window.test.microphone = await navigator.mediaDevices.getUserMedia({ audio: true }));
    await waitState('ready');
  });

  await check('Custom audio mixes with voice, works alone, and can be deleted', async () => {
    const wave = Buffer.alloc(44 + 16000 * 2);
    wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
    wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
    wave.writeUInt32LE(16000, 24); wave.writeUInt32LE(32000, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34);
    wave.write('data', 36); wave.writeUInt32LE(32000, 40);
    for (let i = 0; i < 16000; i++) wave.writeInt16LE(Math.round(Math.sin(i / 16000 * Math.PI * 2 * 880) * 10000), 44 + i * 2);
    await page.getByRole('tab', { name: 'My sounds' }).click();
    await page.locator('input.file').setInputFiles({ name: '<test clip>.wav', mimeType: 'audio/wav', buffer: wave });
    await page.getByRole('button', { name: 'Play <test clip> to meeting', exact: true }).waitFor();
    await page.getByLabel('Include my voice', { exact: true }).check();
    await page.getByRole('button', { name: 'Play <test clip> to meeting', exact: true }).click();
    const tones = await page.evaluate(async () => {
      const analyser = window.test.analyser;
      analyser.smoothingTimeConstant = 0;
      const data = new Float32Array(analyser.frequencyBinCount);
      const level = frequency => {
        const bin = Math.round(frequency * analyser.fftSize / window.test.audio.sampleRate);
        return Math.max(...data.slice(bin - 1, bin + 2));
      };
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 40));
        analyser.getFloatFrequencyData(data);
        if (level(220) > -40 && level(880) > -40) return { voice: level(220), effect: level(880) };
      }
      return { voice: level(220), effect: level(880) };
    });
    assert.ok(tones.voice > -40 && tones.effect > -40, JSON.stringify(tones));
    await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
    await page.getByLabel('Include my voice', { exact: true }).uncheck();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Play <test clip> to meeting', exact: true }).click();
    assert.ok(await sample() > .03);
    await page.getByRole('button', { name: 'Delete <test clip>', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#meet-soundboard-root').shadowRoot.querySelectorAll('.custom-grid .sound').length === 0);
    assert.equal(await page.locator('.custom-grid .sound').count(), 0);
    await page.getByLabel('Include my voice', { exact: true }).check();
    await page.getByRole('tab', { name: 'Sound effects' }).click();
  });

  await check('Invalid and oversized audio files are rejected', async () => {
    await page.getByRole('tab', { name: 'My sounds' }).click();
    await page.locator('input.file').setInputFiles({ name: 'invalid.wav', mimeType: 'audio/wav', buffer: Buffer.from('not audio') });
    await page.waitForFunction(() => !document.querySelector('#meet-soundboard-root').shadowRoot.querySelector('.upload').disabled);
    assert.equal(await page.locator('.custom-grid .sound').count(), 0);
    await page.locator('input.file').setInputFiles({ name: 'large.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
    await page.getByText('Choose an audio file smaller than 2 MB.', { exact: true }).waitFor();
    assert.equal(await page.locator('.custom-grid .sound').count(), 0);
    await page.getByRole('tab', { name: 'Sound effects' }).click();
  });

  await check('All fifteen built-in effects reach the remote receiver', async () => {
    await page.getByLabel('Include my voice', { exact: true }).uncheck();
    await expectAudio(value => value < .001, 'Voice is excluded before checking bundled samples');
    for (const name of ['Air horn', 'Applause', 'Ba dum tss', 'Correct!', 'BOOOOO!', 'Egg attack', 'Tomato splat', 'Record scratch', 'Wrong answer', 'Laugh track', 'Cha-ching!', 'Quack', 'Crickets', 'Sad trombone', 'Dramatic boom']) {
      await page.getByRole('button', { name: `Play ${name} to meeting`, exact: true }).click();
      await expectAudio(value => value > .001, `${name} reaches the receiver`);
      await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
      await expectAudio(value => value < .001, `${name} stops completely`);
    }
    await page.getByLabel('Include my voice', { exact: true }).check();
  });

  await check('Expanded sound pack keeps shortcuts accurate and key 9 reaches the receiver', async () => {
    const cards = page.locator('.builtin-grid .trigger');
    assert.deepEqual(await cards.evaluateAll(buttons => buttons.slice(0, 4).map(button => button.getAttribute('aria-label'))), ['Air horn', 'Applause', 'Ba dum tss', 'Correct!'].map(name => `Play ${name} to meeting`));
    for (let i = 0; i < 15; i++) {
      assert.equal(await cards.nth(i).getAttribute('title'), i < 9 ? `Play to meeting (key ${i + 1} while panel is focused)` : 'Play to meeting');
    }
    assert.equal(await page.locator('#effects-tab .count').textContent(), '15');
    await page.getByLabel('Include my voice', { exact: true }).uncheck();
    await expectAudio(value => value < .001, 'Voice is excluded before checking key 9');
    await cards.first().press('9');
    await page.getByText('To meeting: Wrong answer', { exact: true }).waitFor();
    await expectAudio(value => value > .001, 'Key 9 plays Wrong answer to the receiver');
    await cards.first().press('Escape');
    await expectAudio(value => value < .001, 'Escape stops the effect');
    await page.getByLabel('Include my voice', { exact: true }).check();
  });

  await check('Library tabs support arrow keys, Home, End, and a fresh scroll position', async () => {
    const effects = page.getByRole('tab', { name: 'Sound effects' });
    const custom = page.getByRole('tab', { name: 'My sounds' });
    await effects.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await custom.getAttribute('aria-selected'), 'true');
    assert.equal(await custom.evaluate(element => element === element.getRootNode().activeElement), true);
    await page.keyboard.press('End');
    assert.equal(await custom.getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await effects.getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await custom.getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await effects.getAttribute('aria-selected'), 'true');
    await page.locator('.scroll').evaluate(element => element.scrollTop = element.scrollHeight);
    await custom.click();
    assert.equal(await page.locator('.scroll').evaluate(element => element.scrollTop), 0);
    await page.locator('.notice').evaluate(element => element.hidden = true);
    await page.locator('.panel').screenshot({ path: path.join(root, 'test-results/custom-preview.png') });
    await effects.click();
  });

  await page.evaluate(() => {
    const root = document.querySelector('#meet-soundboard-root').shadowRoot;
    root.querySelector('.notice').hidden = true;
    root.querySelector('.scroll').scrollTop = 0;
  });
  await page.locator('.panel').screenshot({ path: path.join(root, 'test-results/soundboard-preview.png') });
  await check('Closing the call clears the connected state', async () => {
    await page.evaluate(() => { window.test.left.close(); window.test.right.close(); });
    await waitState('waiting');
    assert.equal(await page.evaluate(() => window.test.track.readyState), 'live');
  });

  await check('Panel fits a small browser window', async () => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 800, height: 600 }, { width: 390, height: 650 }, { width: 320, height: 480 }]) {
      await page.setViewportSize(viewport);
      const box = await page.locator('.panel').boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
      const scroll = await page.locator('.scroll').boundingBox();
      for (const selector of ['.controls', '.stop']) {
        const control = await page.locator(selector).boundingBox();
        assert.ok(control.y >= scroll.y + scroll.height - 1 && control.y + control.height <= box.y + box.height);
      }
      await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
      await page.locator('.panel').screenshot({ path: path.join(root, `test-results/panel-${viewport.width}.png`) });
      await page.getByRole('tab', { name: 'My sounds' }).click();
      for (const selector of ['.tabs', '.connection', '.controls', '.stop']) {
        const bounds = await page.locator(selector).boundingBox();
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, `${selector} at ${viewport.width}`);
      }
      await page.locator('.panel').screenshot({ path: path.join(root, `test-results/custom-${viewport.width}.png`) });
      await page.getByRole('tab', { name: 'Sound effects' }).click();
    }
  });

  await check('Panel passes automated accessibility checks', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const name of ['Sound effects', 'My sounds']) {
      await page.getByRole('tab', { name }).click();
      const result = await new AxeBuilder({ page }).include('#meet-soundboard-root').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(result.violations.map(item => ({ id: item.id, description: item.description, nodes: item.nodes.map(node => node.target) })), []);
    }
  });

  assert.deepEqual(errors, []);
  console.log(`\n${results.length} checks passed. No browser errors.`);
  await fs.writeFile(path.join(root, 'test-results/results.json'), JSON.stringify({ checks: results, browser: context.browser()?.version(), errors }, null, 2));
} finally {
  await context.close();
}
