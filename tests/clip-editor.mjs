import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { importFile } from './import-file.mjs';

const root = path.resolve(import.meta.dirname, '..');
const extension = path.join(root, 'extension');
const output = path.join(root, 'test-results');
const extensionId = createHash('sha256').update(await fs.realpath(extension)).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(parseInt(digit, 16) + 97));
const context = await chromium.launchPersistentContext(path.join(output, 'editor-profile'), {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 1060 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
const checks = [];
const errors = [];
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
await context.route('https://meet.google.com/**', route => route.fulfill({ contentType: 'text/html', headers: { 'Content-Security-Policy': "require-trusted-types-for 'script'; trusted-types 'none'" }, body: '<!doctype html><html lang="en"><head><title>Local sound editor test</title></head><body style="background:#202124"></body></html>' }));
const popup = await context.newPage();
await popup.goto(`chrome-extension://${extensionId}/popup.html`);
await popup.evaluate(() => chrome.storage.local.clear());
const page = await context.newPage();

function wave(seconds = 4, amplitude = .2) {
  const rate = 32000;
  const samples = rate * seconds;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) {
    const envelope = .35 + .65 * Math.sin(index / rate * Math.PI / 2) ** 2;
    bytes.writeInt16LE(Math.round(Math.sin(index / rate * Math.PI * 2 * 440) * envelope * amplitude * 32767), 44 + index * 2);
  }
  return bytes;
}

async function upload(name = 'My reaction', seconds = 4, amplitude = .2) {
  await importFile(page, { name: `${name}.wav`, buffer: wave(seconds, amplitude) });
  await page.locator('.editor-fields').waitFor({ state: 'visible' });
}

async function boundary(key, value) {
  await page.locator(`#clip-${key}`).fill(String(value));
  await page.locator(`#clip-${key}`).press('Tab');
}

async function save() {
  await page.locator('.editor-save:enabled').click();
  await page.locator('.clip-editor').waitFor({ state: 'hidden' });
}

async function sounds() { return (await popup.evaluate(() => chrome.storage.local.get('sounds'))).sounds || []; }

function pcm(sound) {
  const data = Buffer.from(sound.data, 'base64');
  assert.equal(data.readUInt32LE(24), 32000);
  return Array.from({ length: (data.length - 44) / 2 }, (_, index) => data.readInt16LE(44 + index * 2) / 32767);
}

async function check(name, action) {
  await action();
  checks.push(name);
  console.log(`PASS ${name}`);
}

try {
  await page.goto('https://meet.google.com/editor-fixture');
  await page.locator('.launcher').click();
  await page.evaluate(() => {
    window.commands = [];
    window.addEventListener('message', event => { if (event.data?.from === 'panel') commands.push(event.data); });
  });

  await check('A trusted file drop on the effects tab opens the editor without saving or navigating', async () => {
    const file = path.join(output, 'drag-test.wav');
    await fs.writeFile(file, wave());
    const box = await page.locator('.connection').boundingBox();
    const session = await context.newCDPSession(page);
    const drag = { x: box.x + 30, y: box.y + 30, data: { items: [], files: [file], dragOperationsMask: 1 } };
    await session.send('Input.dispatchDragEvent', { type: 'dragEnter', ...drag });
    await page.locator('.drop-target').waitFor({ state: 'visible' });
    await page.locator('.panel').screenshot({ path: path.join(output, 'editor-drop.png') });
    await session.send('Input.dispatchDragEvent', { type: 'dragOver', ...drag });
    await session.send('Input.dispatchDragEvent', { type: 'drop', ...drag });
    await page.locator('.editor-fields').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#clip-name').inputValue(), 'drag-test');
    assert.equal((await sounds()).length, 0);
    assert.match(page.url(), /editor-fixture$/);
    await page.locator('.editor-cancel').click();
  });

  await check('Trim and 300% boost save the selected samples with the expected louder level', async () => {
    await upload();
    await boundary('start', .5);
    await boundary('end', 2.5);
    await page.locator('#clip-gain').press('End');
    assert.equal(await page.locator('.gain-value').textContent(), '300%');
    await page.locator('.panel').screenshot({ path: path.join(output, 'editor-desktop.png') });
    await save();
    const [sound] = await sounds();
    assert.equal(sound.name, 'My reaction');
    assert.equal(sound.duration, 2);
    const samples = pcm(sound);
    assert.equal(samples.length, 64000);
    const input = wave();
    for (const index of [1000, 15101, 40009]) {
      const expected = input.readInt16LE(44 + (16000 + index) * 2) / 32767 * 3;
      assert.ok(Math.abs(samples[index] - expected) < .0002, `${samples[index]} vs ${expected}`);
    }
    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), 0);
  });

  await check('Editing a saved clip replaces it without duplicates and survives a reload', async () => {
    const id = (await sounds())[0].id;
    await page.getByRole('button', { name: 'Edit My reaction', exact: true }).click();
    await page.locator('.editor-fields').waitFor({ state: 'visible' });
    await page.locator('#clip-name').fill('Better reaction');
    await boundary('end', 1);
    await save();
    const clips = await sounds();
    assert.equal(clips.length, 1);
    assert.equal(clips[0].id, id);
    assert.equal(clips[0].duration, 1);
    await page.reload();
    await page.locator('.launcher').click();
    await page.getByRole('tab', { name: 'My sounds' }).click();
    await page.getByRole('button', { name: 'Edit Better reaction', exact: true }).waitFor();
  });

  await check('Play selection previews only the trimmed samples with the chosen volume', async () => {
    const debug = await context.newCDPSession(page);
    const worlds = [];
    debug.on('Runtime.executionContextCreated', ({ context }) => worlds.push(context.id));
    await debug.send('Runtime.enable');
    let world;
    for (const contextId of worlds) {
      const result = await debug.send('Runtime.evaluate', { contextId, expression: 'typeof MeetSoundboardEditor !== "undefined"', returnByValue: true });
      if (result.result.value) world = contextId;
    }
    assert.ok(world, 'Editor execution context is available');
    const evaluate = async expression => {
      const result = await debug.send('Runtime.evaluate', { contextId: world, expression, returnByValue: true });
      assert.equal(result.exceptionDetails, undefined);
      return result.result.value;
    };
    await evaluate(`
      globalThis.previewTest = { start: AudioBufferSourceNode.prototype.start, buffers: [] };
      AudioBufferSourceNode.prototype.start = function(...args) {
        previewTest.buffers.push({ rate: this.buffer.sampleRate, samples: Array.from(this.buffer.getChannelData(0)) });
        return previewTest.start.apply(this, args);
      };
    `);
    try {
      await upload('Selected preview');
      await boundary('start', .5);
      await boundary('end', 1.5);
      await page.locator('#clip-gain').press('End');
      const play = page.getByRole('button', { name: '▶ Play selection', exact: true });
      await play.press('Space');
      await page.getByRole('button', { name: '■ Stop preview', exact: true }).waitFor();
      const [buffer] = await evaluate('previewTest.buffers');
      assert.equal(buffer.rate, 32000);
      assert.equal(buffer.samples.length, 32000);
      const input = wave();
      for (const index of [1000, 15101, 30009]) {
        const expected = input.readInt16LE(44 + (16000 + index) * 2) / 32767 * 3;
        assert.ok(Math.abs(buffer.samples[index] - expected) < .0002);
      }
      await play.waitFor();
      assert.equal(await page.locator('.playhead').isVisible(), false);
      await play.click();
      await page.getByRole('button', { name: '■ Stop preview', exact: true }).waitFor();
      await boundary('end', 1.25);
      assert.equal(await play.isVisible(), true);
      assert.equal(await page.locator('.playhead').isVisible(), false);
      await play.click();
      const buffers = await evaluate('previewTest.buffers');
      assert.equal(buffers.at(-1).samples.length, 24000);
      await page.getByRole('button', { name: '■ Stop preview', exact: true }).click();
      await page.locator('.editor-cancel').click();
    } finally {
      await evaluate('AudioBufferSourceNode.prototype.start = previewTest.start; delete globalThis.previewTest;');
      await debug.detach();
    }
  });

  await check('Boosting loud audio keeps every exported sample below clipping', async () => {
    await upload('Loud sound', 2, .95);
    await page.locator('#clip-gain').press('End');
    await save();
    const sound = (await sounds()).find(sound => sound.name === 'Loud sound');
    const samples = pcm(sound);
    const peak = samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);
    assert.ok(peak > .95 && peak <= .981, String(peak));
  });

  await check('A long import is trimmed to a valid maximum-size clip and cannot save an oversized selection', async () => {
    await upload('Long source', 35);
    assert.equal(await page.locator('#clip-end').inputValue(), '30.000');
    await boundary('end', 35);
    assert.equal(await page.locator('.editor-save').isDisabled(), true);
    assert.equal(await page.locator('.editor-preview').isDisabled(), true);
    await boundary('start', 5);
    await save();
    const clip = (await sounds()).find(sound => sound.name === 'Long source');
    assert.equal(clip.duration, 30);
    assert.ok(Buffer.from(clip.data, 'base64').length <= 2 * 1024 * 1024);
  });

  await check('Editor previews keep imported bytes out of Meet messages and cancel does not save', async () => {
    const before = await sounds();
    await page.evaluate(() => {
      window.commands = [];
      window.addEventListener('message', event => { if (event.data?.from === 'panel') commands.push(event.data); });
    });
    await upload('Local preview');
    await page.locator('.editor-preview').click();
    await page.getByRole('button', { name: '■ Stop preview', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.clip-editor').waitFor({ state: 'hidden' });
    assert.deepEqual(await sounds(), before);
    assert.equal(await page.evaluate(() => commands.some(command => command.bytes || command.type === 'play')), false);
    await upload('Fresh preview');
    await page.locator('.editor-preview').click();
    await page.locator('.editor-preview').click();
    await page.locator('.editor-cancel').click();
  });

  await check('Trim handles work with pointer dragging and keyboard without crossing', async () => {
    await upload('Handle test');
    const box = await page.locator('.waveform').boundingBox();
    await page.locator('.trim-start').hover();
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
    await page.mouse.up();
    assert.ok(Math.abs(Number(await page.locator('#clip-start').inputValue()) - 1) < .03);
    await page.locator('.trim-start').press('Home');
    await page.locator('.trim-end').press('Home');
    assert.equal(await page.locator('#clip-start').inputValue(), '0.000');
    assert.equal(await page.locator('#clip-end').inputValue(), '0.010');
    await page.locator('#clip-gain').press('End');
    await page.locator('#clip-fade').uncheck();
    await page.locator('.reset-clip').click();
    assert.equal(await page.locator('#clip-start').inputValue(), '0.000');
    assert.equal(await page.locator('#clip-end').inputValue(), '4.000');
    assert.equal(await page.locator('#clip-gain').inputValue(), '100');
    assert.equal(await page.locator('#clip-fade').isChecked(), true);
    await page.locator('.editor-cancel').click();
  });

  await check('The editor is accessible and its save controls remain visible in small windows', async () => {
    await upload('A little more drama');
    assert.equal(await page.getByRole('button', { name: /Cut selection|Undo cut/ }).count(), 0);
    const waveform = await page.locator('.waveform').boundingBox();
    const play = await page.locator('.editor-preview').boundingBox();
    const start = await page.locator('#clip-start').boundingBox();
    assert.ok(play.y > waveform.y + waveform.height && play.y + play.height < start.y);
    await page.locator('.panel').screenshot({ path: path.join(output, 'editor-selection-preview.png') });
    const result = await new AxeBuilder({ page }).include('#meet-soundboard-root').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), []);
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 480 }, { width: 640, height: 360 }]) {
      await page.setViewportSize(viewport);
      const save = await page.locator('.editor-save').boundingBox();
      assert.ok(save.x >= 0 && save.y >= 0 && save.x + save.width <= viewport.width && save.y + save.height <= viewport.height);
      const overflow = await page.locator('.editor-scroll').evaluate(element => element.scrollWidth > element.clientWidth);
      assert.equal(overflow, false);
      await page.locator('.panel').screenshot({ path: path.join(output, `editor-${viewport.width}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 1060 });
    await page.locator('.editor-cancel').click();
  });

  await check('Page-generated edits, previews, saves, and file drops are ignored', async () => {
    await upload('Trusted input only');
    const before = await sounds();
    await page.evaluate(() => {
      const root = document.querySelector('#meet-soundboard-root').shadowRoot;
      for (const selector of ['.editor-save', '.editor-preview', '.reset-clip', '.editor-cancel']) root.querySelector(selector).click();
    });
    assert.equal(await page.locator('.clip-editor').isVisible(), true);
    assert.equal(await page.locator('.editor-preview').textContent(), '▶ Play selection');
    assert.deepEqual(await sounds(), before);
    await page.locator('.editor-cancel').click();
    await page.evaluate(() => {
      const root = document.querySelector('#meet-soundboard-root').shadowRoot;
      root.querySelector('.edit-sound').click();
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(['not audio'], 'fake.wav', { type: 'audio/wav' }));
      root.querySelector('.panel').dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
    });
    assert.equal(await page.locator('.clip-editor').isVisible(), false);
  });

  await check('An edit cannot overwrite a sound changed in another Meet tab', async () => {
    await page.getByRole('button', { name: 'Edit Better reaction', exact: true }).click();
    await page.locator('.editor-fields').waitFor({ state: 'visible' });
    await popup.evaluate(async () => {
      const { sounds } = await chrome.storage.local.get('sounds');
      sounds[0].name = 'Changed elsewhere';
      await chrome.storage.local.set({ sounds });
    });
    await page.locator('.editor-save').click();
    await page.getByText('This sound changed in another tab. Cancel and reopen it to edit the latest version.', { exact: true }).waitFor();
    assert.equal((await sounds())[0].name, 'Changed elsewhere');
    await page.locator('.editor-cancel').click();
  });

  await check('A full library reports the error and keeps the unsaved edit available', async () => {
    const saved = await sounds();
    await popup.evaluate(() => chrome.storage.local.set({ sounds: Array.from({ length: 3 }, (_, index) => ({ id: `full-${index}`, name: `Full ${index}`, duration: 1, data: 'A'.repeat(2796000) })) }));
    await upload('No room');
    await page.locator('.editor-save').click();
    await page.getByText('Your sound library is full. Delete a clip to make room.', { exact: true }).waitFor();
    assert.equal(await page.locator('.editor-fields').isVisible(), true);
    assert.equal(await page.locator('.editor-save').isEnabled(), true);
    await page.locator('.editor-cancel').click();
    await popup.evaluate(sounds => chrome.storage.local.set({ sounds }), saved);
  });

  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'clip-editor-results.json'), JSON.stringify({ checks, errors }, null, 2));
  console.log(`${checks.length} editor checks passed.`);
} finally { await context.close(); }
