import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { importFile } from './import-file.mjs';

const root = path.resolve(import.meta.dirname, '..');
const extension = path.join(root, 'extension');
const output = path.join(root, 'test-results/browser-platforms');
await fs.mkdir(output, { recursive: true });
const extensionId = createHash('sha256').update(await fs.realpath(extension)).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(parseInt(digit, 16) + 97));
const context = await chromium.launchPersistentContext(path.join(output, 'profile'), {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
});
const checks = [];
const errors = [];
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
function fixture(teams) {
  return `<!doctype html><html lang="en"><head><title>Browser meeting fixture</title><style>
body { background: #202124; color: white; font: 16px system-ui; margin: 24px; }
main { margin-top: 180px; }
.toolbar { position: fixed; ${teams ? 'top: 64px' : 'bottom: 16px'}; right: 24px; display: flex; gap: 8px; }
button { width: 56px; height: 48px; padding: 0; }
@media(max-width:600px) { .optional { display:none; } }
</style></head><body><main><h1>Local browser meeting fixture</h1><p>No live meeting or real microphone.</p></main><div class="toolbar" role="toolbar" aria-label="Meeting controls">
<button class="optional" aria-label="Mute mic">Mic</button><button class="optional" aria-label="Turn camera on">Camera</button><button aria-label="Chat">Chat</button><button aria-label="People">People</button><button aria-label="More">More</button><button aria-label="Leave">Leave</button></div></body></html>`;
}
await context.route('https://**/*', route => route.fulfill({ contentType: 'text/html', body: fixture(new URL(route.request().url()).hostname.startsWith('teams.')) }));
async function check(name, run) { await run(); checks.push(name); console.log(`PASS ${name}`); }
async function count(page, expected) {
  await page.waitForFunction(expected => document.querySelector('#meet-soundboard-root')?.shadowRoot.querySelectorAll('.custom-grid .sound').length === expected, expected);
}
function wave() {
  const bytes = Buffer.alloc(16044);
  bytes.write('RIFF'); bytes.writeUInt32LE(16036, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(16000, 40);
  for (let i = 0; i < 8000; i++) bytes.writeInt16LE(Math.round(Math.sin(i / 8000 * Math.PI * 880) * 5000), 44 + i * 2);
  return bytes;
}
const popup = await context.newPage();
try {
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.evaluate(() => chrome.storage.local.clear());
  const page = await context.newPage();
  await check('All declared meeting hosts load the right platform without granting all-site access', async () => {
    for (const [url, name] of [
      ['https://meet.google.com/test', 'Meet'],
      ['https://teams.microsoft.com/v2/', 'Teams'],
      ['https://teams.cloud.microsoft/v2/', 'Teams'],
      ['https://teams.live.com/v2/', 'Teams']
    ]) {
      await page.goto(url);
      await page.locator('.launcher').click();
      assert.equal(await page.locator('.meet-badge').textContent(), `FOR ${name.toUpperCase()}`);
      assert.equal(await page.evaluate(() => __meetSoundboardInstalled), true);
      assert.match(await page.locator('.status-help').textContent(), new RegExp(name));
    }
    const manifest = await popup.evaluate(() => chrome.runtime.getManifest());
    assert.deepEqual(manifest.permissions, ['storage']);
    for (const script of manifest.content_scripts) {
      assert.deepEqual(script.matches, ['https://meet.google.com/*', 'https://teams.microsoft.com/*', 'https://teams.cloud.microsoft/*', 'https://teams.live.com/*']);
    }
    assert.equal(manifest.externally_connectable, undefined);
    assert.equal(manifest.host_permissions, undefined);
  });
  await check('Zoom meetings, login, unrelated and lookalike pages never load the soundboard', async () => {
    const excluded = [
      ...['app.zoom.us', 'app.zoom.com', 'zoom.us', 'zoom.com'].flatMap(host => [`https://${host}/wc`, `https://${host}/wc/123/join`]),
      'https://login.microsoftonline.com/test', 'https://zoom.us/profile', 'https://app.zoom.us/account',
      'https://teams.microsoft.com.example.test/', 'https://meet.google.com.example.test/', 'https://example.test/'
    ];
    assert.deepEqual(await page.evaluate(urls => urls.map(url => MeetSoundboardPlatforms.forURL(url)), excluded), excluded.map(() => null));
    for (const url of excluded) {
      await page.goto(url);
      assert.equal(await page.locator('#meet-soundboard-root').count(), 0);
      assert.equal(await page.evaluate(() => !!window.__meetSoundboardInstalled), false);
    }
  });
  for (const [id, url] of [['teams', 'https://teams.live.com/v2/'], ['meet', 'https://meet.google.com/test']]) {
    await check(`${id} controls fit without covering meeting buttons at desktop and narrow widths`, async () => {
      await page.goto(url);
      for (const viewport of [{ width: 1280, height: 900 }, { width: 640, height: 360 }, { width: 320, height: 480 }]) {
        await page.setViewportSize(viewport);
        await page.waitForFunction(() => {
          const box = document.querySelector('#meet-soundboard-root').shadowRoot.querySelector('.launcher').getBoundingClientRect();
          return box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight && [...document.querySelectorAll('button')].every(button => {
            const other = button.getBoundingClientRect();
            return !other.width || box.right <= other.left || box.left >= other.right || box.bottom <= other.top || box.top >= other.bottom;
          });
        });
        await page.locator('.launcher').click();
        for (const selector of ['.connection', '.controls', '.stop']) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, selector);
        }
        await page.getByRole('button', { name: 'Close soundboard', exact: true }).click();
      }
    });
    await check(`${id} light and dark panels pass accessibility checks`, async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.locator('.launcher').click();
      for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        const scan = await new AxeBuilder({ page }).include('#meet-soundboard-root').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        assert.deepEqual(scan.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), []);
        await page.screenshot({ path: path.join(output, `${id}-${colorScheme}.png`) });
      }
    });
    await check(`${id} microphone access alone never claims an outgoing connection`, async () => {
      await page.evaluate(async () => { window.mic = await navigator.mediaDevices.getUserMedia({ audio: true }); });
      await page.getByRole('button', { name: 'Turn on', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#meet-soundboard-root').shadowRoot.querySelector('.connection').dataset.state === 'waiting');
      await page.getByRole('button', { name: 'Play Correct! to meeting', exact: true }).click();
      assert.equal(await page.locator('.sound.playing').count(), 0);
      await page.getByRole('button', { name: 'Preview Correct! only for me', exact: true }).click();
      await page.locator('.sound.previewing').waitFor();
      await page.getByRole('button', { name: '■ Stop all', exact: true }).click();
      await page.evaluate(() => mic.getTracks().forEach(track => track.stop()));
    });
  }
  const pages = await Promise.all(Array.from({ length: 3 }, () => context.newPage()));
  await Promise.all(pages.map(async (page, index) => {
    await page.goto(['https://meet.google.com/test', 'https://teams.live.com/v2/', 'https://teams.microsoft.com/v2/'][index]);
    await page.locator('.launcher').click();
    await page.getByRole('tab', { name: 'My sounds' }).click();
  }));
  await check('Concurrent imports from Meet and two Teams tabs preserve all three clips', async () => {
    await Promise.all(pages.map(async (page, index) => {
      await importFile(page, { name: `Clip ${index + 1}.wav`, buffer: wave() });
      await page.locator('.editor-save:enabled').click();
      await page.locator('.clip-editor').waitFor({ state: 'hidden' });
    }));
    await Promise.all(pages.map(page => count(page, 3)));
    assert.deepEqual((await popup.evaluate(() => chrome.storage.local.get('sounds'))).sounds.map(sound => sound.name).sort(), ['Clip 1', 'Clip 2', 'Clip 3']);
  });
  await check('Deleting different clips from different services never resurrects either clip', async () => {
    await Promise.all([pages[0].getByRole('button', { name: 'Delete Clip 1', exact: true }).click(), pages[1].getByRole('button', { name: 'Delete Clip 2', exact: true }).click()]);
    await Promise.all(pages.map(page => count(page, 1)));
    assert.deepEqual((await popup.evaluate(() => chrome.storage.local.get('sounds'))).sounds.map(sound => sound.name), ['Clip 3']);
  });
  await check('Stale edits across services cannot overwrite a newer edit', async () => {
    await Promise.all(pages.slice(0, 2).map(page => page.getByRole('button', { name: 'Edit Clip 3', exact: true }).click()));
    await pages[0].locator('#clip-name').fill('Latest clip');
    await pages[0].locator('.editor-save').click();
    await pages[0].locator('.clip-editor').waitFor({ state: 'hidden' });
    await pages[1].locator('.editor-save').click();
    await pages[1].getByText('This sound changed in another tab. Cancel and reopen it to edit the latest version.', { exact: true }).waitFor();
    assert.deepEqual((await popup.evaluate(() => chrome.storage.local.get('sounds'))).sounds.map(sound => sound.name), ['Latest clip']);
  });
  await check('The library worker rejects changes from extension pages without a meeting sender', async () => {
    await popup.evaluate(async () => {
      const { sounds } = await chrome.storage.local.get('sounds');
      await chrome.runtime.sendMessage({ type: 'change-library', action: 'delete', id: sounds[0].id }).catch(() => {});
    });
    assert.equal((await popup.evaluate(() => chrome.storage.local.get('sounds'))).sounds.length, 1);
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, errors, liveServicesTested: false }, null, 2));
} finally { await context.close(); }
