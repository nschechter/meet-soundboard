import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extension = path.resolve(process.argv[2] || path.join(root, 'extension'));
const output = path.resolve(process.argv[3] || path.join(root, 'test-results'));
await fs.mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(path.join(output, 'launcher-profile'), {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
const errors = [];
const checks = [];
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const fixture = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Soundboard toolbar preview</title><style>
body { margin: 0; background: #131314; color: #c4c7c5; font: 14px system-ui; }
main { margin: 24px; height: calc(100vh - 136px); background: #202124; border-radius: 20px; display: grid; place-items: center; }
.dock { position: fixed; bottom: 24px; right: 24px; display: flex; padding: 4px; gap: 4px; background: #202124; border-radius: 32px; }
.dock button { display: grid; place-items: center; width: 48px; height: 48px; padding: 12px; border: 0; border-radius: 50%; background: transparent; color: #c4c7c5; }
svg { width: 24px; height: 24px; fill: currentColor; }
.call-controls { position: fixed; bottom: 28px; left: calc(50% - 112px); display: flex; gap: 8px; }
.call-controls button { width: 48px; height: 48px; border: 0; border-radius: 50%; color: #e3e3e3; background: #333537; }
.call-controls .leave { width: 80px; background: #f2b8b5; color: #601410; border-radius: 24px; }
@media(max-width: 700px) { .call-controls { left: 12px; } .call-controls .optional { display: none; } }
</style></head><body><main><p>Soundboard toolbar preview</p></main>
<div class="call-controls"><button aria-label="Microphone">●</button><button class="optional" aria-label="Camera">▣</button><button class="leave" aria-label="Leave call">⌁</button></div>
<div class="dock" aria-label="Meeting controls"><button aria-label="Chat with everyone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16a1 1 0 0 1 1 1v14H7l-4 4V4a1 1 0 0 1 1-1zm1 2v12.2L6.2 16H19V5H5zm2 3h10v2H7zm0 4h8v2H7z"/></svg></button><button aria-label="Meeting tools"><svg viewBox="0 0 24 24" aria-hidden="true">${[5,12,19].flatMap(y => [5,12,19].map(x => `<circle cx="${x}" cy="${y}" r="2"/>`)).join('')}</svg></button></div></body></html>`;
await context.route('https://meet.google.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));

async function check(name, action) {
  await action();
  checks.push(name);
  console.log(`PASS ${name}`);
}

try {
  await page.goto('https://meet.google.com/toolbar-fixture');
  const launcher = page.getByRole('button', { name: 'Soundboard', exact: true });
  await launcher.waitFor();

  await check('Compact icon aligns with the meeting controls and has an accessible label', async () => {
    const button = await launcher.boundingBox();
    const chat = await page.getByRole('button', { name: 'Chat with everyone' }).boundingBox();
    assert.equal(button.width, 48);
    assert.equal(button.height, 48);
    assert.ok(Math.abs(button.y + 24 - chat.y - chat.height / 2) < 1);
    assert.ok(button.x + button.width < chat.x);
    assert.equal(await launcher.getAttribute('title'), 'Soundboard');
    assert.equal(await launcher.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(32, 33, 36)');
    await page.screenshot({ path: path.join(output, 'toolbar-preview.png'), clip: { x: 800, y: 780, width: 480, height: 120 } });
  });

  await check('Keyboard users can open and close the panel and return to the icon', async () => {
    await launcher.focus();
    await launcher.press('Enter');
    assert.equal(await page.locator('.panel').isVisible(), true);
    await page.getByRole('button', { name: 'Close soundboard', exact: true }).click();
    assert.equal(await launcher.evaluate(element => element === element.getRootNode().activeElement), true);
    const scan = await new AxeBuilder({ page }).include('#meet-soundboard-root').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(scan.violations.map(item => item.id), []);
  });

  await check('The icon stays in view without covering meeting buttons at narrow widths', async () => {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 800, height: 600 }, { width: 390, height: 650 }, { width: 320, height: 480 }]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(() => {
        const button = document.querySelector('#meet-soundboard-root').shadowRoot.querySelector('.launcher').getBoundingClientRect();
        return button.x >= 0 && button.y >= 0 && button.right <= innerWidth && button.bottom <= innerHeight && [...document.querySelectorAll('button')].every(element => {
          const box = element.getBoundingClientRect();
          return !box.width || button.right <= box.left || button.left >= box.right || button.bottom <= box.top || button.top >= box.bottom;
        });
      });
    }
  });

  await check('The icon follows toolbar replacement and remains available without a toolbar', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('.dock').evaluate(element => { const replacement = element.cloneNode(true); replacement.style.right = '200px'; element.replaceWith(replacement); });
    await page.waitForFunction(() => {
      const button = document.querySelector('#meet-soundboard-root').shadowRoot.querySelector('.launcher').getBoundingClientRect();
      return Math.abs(button.right - document.querySelector('.dock button').getBoundingClientRect().left + 16) < 1;
    });
    await page.locator('.dock').evaluate(element => element.remove());
    await page.waitForFunction(() => document.querySelector('#meet-soundboard-root').style.getPropertyValue('--launcher-right') === '24px');
    assert.equal(await launcher.isVisible(), true);
    await launcher.click();
    assert.equal(await page.locator('.panel').isVisible(), true);
    await page.getByRole('button', { name: 'Close soundboard', exact: true }).click();
  });

  await check('Effects-only mode remains clear in the icon label and tooltip', async () => {
    await page.evaluate(() => window.postMessage({ channel: 'meet-soundboard-v1', from: 'engine', type: 'status', state: 'ready', enabled: true, includeVoice: false, playing: null }, location.origin));
    const effectsOnly = page.getByRole('button', { name: 'Soundboard · Effects only', exact: true });
    await effectsOnly.waitFor();
    assert.equal(await effectsOnly.getAttribute('title'), 'Soundboard · Effects only');
  });

  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'launcher-ui-results.json'), JSON.stringify({ checks, errors, browser: context.browser().version() }, null, 2));
} finally {
  await context.close();
}
