import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extension = path.join(root, 'extension');
const extensionId = createHash('sha256').update(await fs.realpath(extension)).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(parseInt(digit, 16) + 97));
const context = await chromium.launchPersistentContext(path.join(root, 'test-results/security-profile'), {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
const results = [];
const errors = [];
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
await context.route('https://meet.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Soundboard review</title></head><body style="background:#202124"><h1>Local review</h1></body></html>' }));
const first = await context.newPage();
const second = await context.newPage();
const popup = await context.newPage();

function wave(seconds = 1) {
  const samples = 8000 * seconds;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) bytes.writeInt16LE(Math.round(Math.sin(i / 8000 * Math.PI * 2 * 440) * 5000), 44 + i * 2);
  return bytes;
}

async function open(page, url) {
  await page.goto(url);
  await page.locator('button.launcher').click();
  await page.getByRole('tab', { name: 'My sounds' }).click();
}

async function upload(page, name, seconds = 1) {
  await page.locator('input.file').setInputFiles({ name: `${name}.wav`, mimeType: 'audio/wav', buffer: wave(seconds) });
}

async function count(page, expected) {
  await page.waitForFunction(expected => document.querySelector('#meet-soundboard-root').shadowRoot.querySelectorAll('.custom-grid .sound').length === expected, expected);
}

async function check(name, action) {
  await action();
  results.push(name);
  console.log(`PASS ${name}`);
}

try {
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.evaluate(() => chrome.storage.local.clear());
  await Promise.all([open(first, 'https://meet.google.com/review-one'), open(second, 'https://meet.google.com/review-two')]);
  await first.evaluate(() => {
    window.importMessages = [];
    window.addEventListener('message', event => {
      if (event.data?.from === 'panel') importMessages.push(event.data);
    });
  });

  await check('Two Meet tabs can add clips at the same time without losing either clip', async () => {
    await Promise.all([upload(first, 'First clip'), upload(second, 'Second clip')]);
    await Promise.all([count(first, 2), count(second, 2)]);
    assert.deepEqual((await popup.evaluate(() => chrome.storage.local.get('sounds'))).sounds.map(sound => sound.name).sort(), ['First clip', 'Second clip']);
  });

  await check('Importing a clip keeps its audio bytes out of the Meet page', async () => {
    assert.equal(await first.evaluate(() => importMessages.some(message => message.bytes instanceof ArrayBuffer || message.type === 'validate')), false);
    assert.equal(await first.locator('.custom-grid .sound').count(), 2);
  });

  await check('A simultaneous delete and upload preserve the other saved clips', async () => {
    await Promise.all([first.getByRole('button', { name: 'Delete First clip', exact: true }).click(), upload(second, 'Third clip')]);
    await first.getByRole('button', { name: 'Play Third clip to meeting', exact: true }).waitFor();
    await Promise.all([count(first, 2), count(second, 2)]);
    assert.deepEqual((await popup.evaluate(() => chrome.storage.local.get('sounds'))).sounds.map(sound => sound.name).sort(), ['Second clip', 'Third clip']);
  });

  await check('Page-generated clicks and keyboard events cannot read or play a saved clip', async () => {
    await first.evaluate(() => {
      window.playMessages = [];
      window.addEventListener('message', event => {
        if (event.data?.from === 'panel' && event.data.type === 'play') playMessages.push(event.data);
      });
      const root = document.querySelector('#meet-soundboard-root').shadowRoot;
      root.querySelector('.custom-grid .preview').click();
      root.querySelector('.custom-grid .trigger').click();
      root.querySelector('.custom-grid .trigger').dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      root.querySelector('.custom-grid .remove').click();
    });
    await first.waitForTimeout(250);
    assert.equal(await first.evaluate(() => playMessages.length), 0);
    assert.equal(await first.locator('.custom-grid .sound').count(), 2);
    await first.getByRole('button', { name: 'Preview Second clip only for me', exact: true }).click();
    await first.waitForFunction(() => playMessages.length === 1);
    assert.equal(await first.evaluate(() => playMessages[0].bytes instanceof ArrayBuffer), true);
    await first.getByRole('button', { name: '■ Stop all', exact: true }).click();
  });

  await check('Malformed bridge messages do not crash the panel or trigger playback', async () => {
    await first.evaluate(() => {
      for (const fields of [
        { type: 'status', state: {}, enabled: true },
        { type: 'status', state: 'ready', enabled: true, includeVoice: true, playing: {} },
        { type: 'error', message: { unexpected: 'object' } },
        { type: 'validated', duration: '30', requestId: 'unknown' }
      ]) window.postMessage({ channel: 'meet-soundboard-v1', from: 'engine', ...fields }, location.origin);
      window.postMessage({ channel: 'meet-soundboard-v1', from: 'panel', type: 'play', id: {}, builtin: 'ding', preview: true }, location.origin);
    });
    await first.waitForTimeout(250);
    assert.equal(await first.locator('.status-title').textContent(), 'Soundboard is off');
    assert.equal(await first.locator('.custom-grid .sound').count(), 2);
  });

  await check('A child frame cannot command the page audio engine', async () => {
    await first.evaluate(() => {
      const frame = document.createElement('iframe');
      frame.src = '/review-child';
      document.body.append(frame);
    });
    await first.locator('iframe').waitFor();
    const frame = first.frames().find(frame => frame !== first.mainFrame());
    await frame.waitForLoadState();
    await frame.evaluate(() => parent.postMessage({ channel: 'meet-soundboard-v1', from: 'panel', type: 'play', id: 'ding', builtin: 'ding', preview: true }, location.origin));
    await first.waitForTimeout(200);
    assert.equal(await first.locator('.now-playing').textContent(), 'Ready for your next cue');
  });

  await check('Long audio is rejected even when its encoded file is small', async () => {
    await upload(first, 'Too long', 31);
    await first.getByText('Choose a clip that is 30 seconds or shorter.', { exact: true }).waitFor();
    assert.equal(await first.locator('.custom-grid .sound').count(), 2);
  });

  await check('Audio filenames stay literal text and cannot inject markup', async () => {
    const name = '<img src=x onerror=alert(1)>';
    await upload(first, name);
    await first.getByRole('button', { name: `Play ${name} to meeting`, exact: true }).waitFor();
    assert.equal(await first.locator('.custom-grid img').count(), 0);
  });

  await check('Invalid saved clips and settings are ignored safely', async () => {
    await popup.evaluate(() => chrome.storage.local.set({ sounds: [null, {}, { id: 'bad', name: 'Bad clip', duration: '1', data: '!!!' }], prefs: { volume: 'broken', hearEffects: 'yes', includeVoice: 'false' } }));
    await count(first, 0);
    await first.reload();
    await first.locator('button.launcher').click();
    await first.getByRole('tab', { name: 'My sounds' }).click();
    assert.equal(await first.locator('output').textContent(), '65%');
    assert.equal(await first.getByLabel('Hear effects too', { exact: true }).isChecked(), false);
    assert.equal(await first.getByLabel('Include my voice', { exact: true }).isChecked(), true);
    assert.equal(await first.locator('.custom-grid .sound').count(), 0);
  });

  await check('The empty library and toolbar popup pass accessibility checks', async () => {
    for (const page of [first, popup]) {
      const scan = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
      if (page === first) scan.include('#meet-soundboard-root');
      const result = await scan.analyze();
      assert.deepEqual(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), []);
    }
    await first.locator('.panel').screenshot({ path: path.join(root, 'test-results/review-empty-library.png') });
    await popup.screenshot({ path: path.join(root, 'test-results/review-popup.png') });
  });

  await check('Keyboard focus stays visible and Meet does not receive panel shortcuts', async () => {
    await first.getByRole('tab', { name: 'Sound effects' }).click();
    const sound = first.getByRole('button', { name: 'Play Air horn to meeting', exact: true });
    await first.keyboard.press('Tab');
    assert.equal(await sound.evaluate(button => button.matches(':focus-visible')), true);
    assert.equal(await first.locator('.builtin-grid .sound').first().evaluate(card => getComputedStyle(card).outlineStyle), 'solid');
    await first.evaluate(() => {
      window.leakedKeys = 0;
      document.addEventListener('keydown', () => leakedKeys++);
      document.addEventListener('keyup', () => leakedKeys++);
    });
    await sound.press('6');
    assert.equal(await first.evaluate(() => leakedKeys), 0);
  });

  await check('Connection and stop controls remain visible at high zoom and short window sizes', async () => {
    for (const viewport of [{ width: 320, height: 480 }, { width: 640, height: 360 }, { width: 800, height: 600 }]) {
      await first.setViewportSize(viewport);
      await first.locator('.scroll').evaluate(element => element.scrollTop = element.scrollHeight);
      for (const selector of ['.connection', '.controls', '.stop']) {
        const box = await first.locator(selector).boundingBox();
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, `${selector} at ${viewport.width}x${viewport.height}`);
      }
      await first.locator('.panel').screenshot({ path: path.join(root, `test-results/review-panel-${viewport.width}.png`) });
    }
  });

  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(root, 'test-results/security-ui-results.json'), JSON.stringify({ checks: results, errors }, null, 2));
  console.log(`${results.length} security and UI checks passed.`);
} finally { await context.close(); }
