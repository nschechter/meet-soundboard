import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extension = path.join(root, 'extension');
const extensionId = createHash('sha256').update(await fs.realpath(extension)).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(parseInt(digit, 16) + 97));
const context = await chromium.launchPersistentContext(path.join(root, 'test-results/studio-profile'), {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
const results = [];
const errors = [];
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
await context.route('https://meet.google.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Studio sound test</title></head><body style="background:#202124;color:white;font:14px system-ui"><h1>Local Studio sound test</h1></body></html>' }));
const setup = await context.newPage();
await setup.goto(`chrome-extension://${extensionId}/popup.html`);
await setup.evaluate(() => chrome.storage.local.clear());
await setup.close();

async function fixture() {
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.meet = { studio: true, changes: [], commands: [], started: [], ended: [], opened: 0, closed: 0, offDelay: 0 };
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (...args) {
      if (meet.failDecode) return Promise.reject(new DOMException('Decode failed', 'EncodingError'));
      return decode.apply(this, args);
    };
    window.addEventListener('message', event => {
      if (event.data?.channel !== 'meet-soundboard-v1') return;
      const message = event.data;
      if (message.from === 'panel' && message.type === 'play') meet.commands.push({ ...message, studio: meet.studio });
      if (message.from === 'engine' && message.type === 'status' && message.playing) meet.started.push({ id: message.playing, studio: meet.studio });
      if (message.from === 'engine' && message.type === 'playback-ended') meet.ended.push(message.requestId);
    });
  });
  await page.goto('https://meet.google.com/studio-test');
  await page.evaluate(() => {
    const audio = document.createElement('button');
    audio.textContent = 'Audio settings';
    audio.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div');
    menu.hidden = true;
    const settings = document.createElement('button');
    settings.textContent = 'Settings';
    menu.append(settings);
    audio.onclick = () => {
      const expanded = audio.getAttribute('aria-expanded') !== 'true';
      audio.setAttribute('aria-expanded', String(expanded));
      const render = () => { menu.hidden = audio.getAttribute('aria-expanded') !== 'true'; };
      if (expanded && meet.menuDelay) setTimeout(render, meet.menuDelay);
      else render();
    };
    document.addEventListener('click', event => {
      if (!meet.dismissOnOutsideClick || audio.contains(event.target) || menu.contains(event.target)) return;
      menu.hidden = true;
      audio.setAttribute('aria-expanded', 'false');
    });
    meet.openSettings = () => {
      if (!meet.persistentMenu) {
        menu.hidden = true;
        audio.setAttribute('aria-expanded', 'false');
      }
      meet.opened++;
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-label', 'Settings');
      dialog.style.cssText = 'position:fixed;left:20px;top:180px;background:white;color:black;padding:24px';
      const close = document.createElement('button');
      close.textContent = 'Close dialog';
      close.onclick = () => { meet.closed++; dialog.remove(); };
      const tabs = document.createElement('div');
      tabs.setAttribute('role', 'tablist');
      const tab = document.createElement('button');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'true');
      tab.textContent = 'Audio';
      tabs.append(tab);
      dialog.append(close, tabs);
      if (!meet.missing) {
        const control = document.createElement('button');
        control.setAttribute('role', 'switch');
        control.setAttribute('aria-label', meet.label || 'Studio sound');
        control.textContent = meet.label || 'Studio sound';
        control.setAttribute('aria-checked', String(meet.studio));
        control.disabled = !!meet.disabled;
        control.onclick = () => {
          const next = !meet.studio;
          if ((!next && meet.blockOff) || (next && meet.blockOn)) return;
          const change = () => {
            meet.studio = next;
            meet.changes.push(next);
            control.setAttribute('aria-checked', String(next));
          };
          if (!next && meet.offDelay) setTimeout(change, meet.offDelay);
          else change();
        };
        dialog.append(control);
        if (meet.duplicate) dialog.append(control.cloneNode(true));
      }
      const unrelated = document.createElement('button');
      unrelated.setAttribute('role', 'switch');
      unrelated.setAttribute('aria-label', 'Adaptive audio');
      unrelated.setAttribute('aria-checked', 'true');
      unrelated.onclick = () => { throw new Error('Unrelated setting was clicked'); };
      dialog.append(unrelated);
      document.body.append(dialog);
    };
    settings.onclick = meet.openSettings;
    document.body.append(audio, menu);
  });
  await page.locator('.launcher').click();
  await page.evaluate(async () => {
    const audio = new AudioContext();
    await audio.resume();
    const destination = audio.createMediaStreamDestination();
    const left = new RTCPeerConnection();
    const track = destination.stream.getAudioTracks()[0];
    left.addTrack(track, destination.stream);
    Object.defineProperty(left, 'connectionState', { get: () => meet.disconnected ? 'closed' : 'connected' });
    Object.defineProperty(left.getTransceivers()[0], 'currentDirection', { get: () => 'sendonly' });
    await left.setLocalDescription(await left.createOffer());
    Object.assign(meet, { audio, left, track });
  });
  await page.getByRole('button', { name: 'Turn on', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#meet-soundboard-root').shadowRoot.querySelector('.connection').dataset.state === 'ready');
  return page;
}

async function enable(page) {
  await page.locator('.studio-options summary').click();
  await page.getByLabel('Auto-pause Studio sound', { exact: true }).check();
}

const play = (page, name = 'Correct!') => page.getByRole('button', { name: `Play ${name} to meeting`, exact: true }).click();
const stop = page => page.getByRole('button', { name: '■ Stop all', exact: true }).click();
const restored = page => page.waitForFunction(() => meet.studio && meet.closed === meet.opened && meet.changes.at(-1) === true);
const changes = page => page.evaluate(() => meet.changes);

async function check(name, action) {
  const page = await fixture();
  try {
    await action(page);
    results.push(name);
    console.log(`PASS ${name}`);
  } finally {
    await page.evaluate(() => { meet.left.close(); meet.audio.close(); });
    await page.close();
  }
}

try {
  await check('Studio automation is off by default and previews do not change Meet settings', async page => {
    await play(page);
    await page.waitForFunction(() => meet.commands.length === 1);
    await stop(page);
    await enable(page);
    await page.getByRole('button', { name: 'Preview Correct! only for me', exact: true }).click();
    await page.waitForFunction(() => meet.commands.length === 2);
    assert.equal(await page.evaluate(() => meet.opened), 0);
    assert.deepEqual(await changes(page), []);
  });

  await check('Studio sound turns off before audio starts and restores when audio ends', async page => {
    await enable(page);
    await play(page);
    await restored(page);
    assert.deepEqual(await changes(page), [false, true]);
    assert.equal(await page.evaluate(() => meet.commands[0].studio), false);
    assert.ok(await page.evaluate(() => meet.started.length > 0 && meet.started.every(item => !item.studio)));
    assert.equal(await page.evaluate(() => meet.ended.length), 1);
  });

  await check('An originally disabled setting stays disabled', async page => {
    await page.evaluate(() => meet.studio = false);
    await enable(page);
    await play(page);
    await page.waitForFunction(() => meet.ended.length === 1);
    assert.equal(await page.evaluate(() => meet.studio), false);
    assert.deepEqual(await changes(page), []);
  });

  await check('Delayed Meet menus survive the original soundboard click', async page => {
    await page.evaluate(() => { meet.menuDelay = 50; meet.dismissOnOutsideClick = true; });
    await enable(page);
    await play(page);
    await restored(page);
    assert.deepEqual(await changes(page), [false, true]);
    assert.equal(await page.evaluate(() => meet.commands.length), 1);
  });

  await check('Audio menus opened by the extension close after preparation and restoration', async page => {
    await page.evaluate(() => meet.persistentMenu = true);
    await enable(page);
    await play(page, 'Sad trombone');
    await page.waitForFunction(() => meet.started.length > 0);
    assert.equal(await page.getByRole('button', { name: 'Audio settings', exact: true }).getAttribute('aria-expanded'), 'false');
    await stop(page);
    await restored(page);
    assert.equal(await page.getByRole('button', { name: 'Audio settings', exact: true }).getAttribute('aria-expanded'), 'false');
  });

  await check('Noise cancellation uses the same guarded behavior', async page => {
    await page.evaluate(() => meet.label = 'Noise cancellation');
    await enable(page);
    await play(page);
    await restored(page);
    assert.deepEqual(await changes(page), [false, true]);
  });

  await check('Stop during preparation cancels playback and restores the setting', async page => {
    await page.evaluate(() => meet.offDelay = 200);
    await enable(page);
    await play(page);
    await page.waitForFunction(() => !meet.studio);
    await stop(page);
    await restored(page);
    assert.equal(await page.evaluate(() => meet.commands.length), 0);
  });

  await check('Rapid taps play only the newest effect without restoring early', async page => {
    await enable(page);
    await play(page, 'Air horn');
    for (let index = 0; index < 8; index++) await play(page, 'Air horn');
    await play(page, 'Correct!');
    await restored(page);
    assert.equal(await page.evaluate(() => meet.commands.length), 1);
    assert.equal(await page.evaluate(() => meet.commands[0].id), 'ding');
    assert.deepEqual(await changes(page), [false, true]);
    assert.ok(await page.evaluate(() => meet.opened <= 3));
  });

  await check('Stop and disabling automation both restore active playback', async page => {
    await enable(page);
    await play(page, 'Sad trombone');
    await page.waitForFunction(() => meet.started.length > 0);
    await stop(page);
    await restored(page);
    await page.evaluate(() => { meet.changes = []; meet.started = []; });
    await play(page, 'Sad trombone');
    await page.waitForFunction(() => meet.started.length > 0);
    await page.getByLabel('Auto-pause Studio sound', { exact: true }).uncheck();
    await restored(page);
    assert.deepEqual(await changes(page), [false, true]);
  });

  await check('A preview replacing an effect restores Studio sound before previewing', async page => {
    await enable(page);
    await play(page, 'Sad trombone');
    await page.waitForFunction(() => meet.started.length > 0);
    await page.getByRole('button', { name: 'Preview Correct! only for me', exact: true }).click();
    await page.waitForFunction(() => meet.commands.length === 2);
    assert.equal(await page.evaluate(() => meet.commands[1].studio), true);
    assert.equal(await page.evaluate(() => meet.commands[1].preview), true);
  });

  await check('A manual setting change stops playback and preserves the user choice', async page => {
    await enable(page);
    await play(page, 'Sad trombone');
    await page.waitForFunction(() => meet.started.length > 0);
    await page.getByRole('button', { name: 'Audio settings', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('switch', { name: 'Studio sound', exact: true }).click();
    await page.getByText('Studio sound was changed manually. Playback stopped and your setting was kept.', { exact: true }).waitFor();
    await page.waitForFunction(() => meet.ended.length === 1);
    assert.deepEqual(await changes(page), [false, true]);
    assert.equal(await page.getByRole('dialog', { name: 'Settings' }).isVisible(), true);
  });

  await check('A failed decode restores Studio sound', async page => {
    await page.evaluate(() => meet.failDecode = true);
    await enable(page);
    await play(page);
    await restored(page);
    assert.deepEqual(await changes(page), [false, true]);
    assert.equal(await page.evaluate(() => meet.started.length), 0);
  });

  await check('Missing, disabled, ambiguous, or foreign-language controls block playback', async page => {
    await enable(page);
    for (const setting of ['missing', 'disabled', 'duplicate', 'foreign']) {
      await page.evaluate(setting => {
        meet.missing = setting === 'missing';
        meet.disabled = setting === 'disabled';
        meet.duplicate = setting === 'duplicate';
        meet.label = setting === 'foreign' ? 'Sonido de estudio' : 'Studio sound';
      }, setting);
      const opened = await page.evaluate(() => meet.opened);
      await play(page);
      await page.waitForFunction(opened => meet.opened > opened && meet.closed === meet.opened, opened);
      assert.equal(await page.evaluate(() => meet.commands.length), 0);
      assert.deepEqual(await changes(page), []);
    }
  });

  await check('A switch that fails to turn off prevents playback', async page => {
    await page.evaluate(() => meet.blockOff = true);
    await enable(page);
    await play(page);
    await page.getByText('Meet did not turn Studio sound off. Playback was cancelled.', { exact: true }).waitFor();
    await page.waitForFunction(() => meet.closed === meet.opened);
    assert.equal(await page.evaluate(() => meet.commands.length), 0);
    assert.equal(await page.evaluate(() => meet.studio), true);
  });

  await check('Failed restoration provides a working retry control', async page => {
    await page.evaluate(() => meet.blockOn = true);
    await enable(page);
    await play(page);
    const retry = page.getByRole('button', { name: 'Restore Studio sound', exact: true });
    await retry.waitFor();
    assert.equal(await page.evaluate(() => meet.studio), false);
    await page.evaluate(() => meet.blockOn = false);
    await retry.click();
    await restored(page);
    await retry.waitFor({ state: 'hidden' });
    await page.getByText('Studio sound restored.', { exact: true }).waitFor();
  });

  await check('Disconnecting meeting audio stops playback and restores the setting', async page => {
    await enable(page);
    await play(page, 'Sad trombone');
    await page.waitForFunction(() => meet.started.length > 0);
    await page.evaluate(() => meet.disconnected = true);
    await restored(page);
    assert.equal(await page.evaluate(() => meet.ended.length), 1);
  });

  await check('User-opened settings stay open and unrelated dialogs are left alone', async page => {
    await enable(page);
    await page.evaluate(() => meet.openSettings());
    await play(page);
    await page.waitForFunction(() => meet.changes.length === 2);
    assert.equal(await page.evaluate(() => meet.closed), 0);
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.evaluate(() => {
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.textContent = 'Unrelated dialog';
      document.body.append(dialog);
    });
    await play(page);
    await page.getByText('Close the open Meet dialog before using automatic Studio sound.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => meet.commands.length), 1);
    assert.equal(await page.getByText('Unrelated dialog', { exact: true }).isVisible(), true);
  });

  await check('Page-generated actions cannot enable Studio automation or start audio', async page => {
    await page.evaluate(() => {
      const root = document.querySelector('#meet-soundboard-root').shadowRoot;
      const setting = root.querySelector('#auto-studio');
      setting.checked = true;
      setting.dispatchEvent(new Event('change', { bubbles: true }));
      root.querySelector('.trigger').click();
    });
    assert.equal(await page.getByLabel('Auto-pause Studio sound', { exact: true }).isChecked(), false);
    assert.equal(await page.evaluate(() => meet.commands.length), 0);
    assert.equal(await page.evaluate(() => meet.opened), 0);
  });

  await check('Studio options remain accessible and fit narrow windows', async page => {
    await enable(page);
    await page.locator('.studio-options').scrollIntoViewIfNeeded();
    await page.locator('.panel').screenshot({ path: path.join(root, 'test-results/studio-preview.png') });
    for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 480 }]) {
      await page.setViewportSize(viewport);
      const box = await page.locator('.panel').boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
      const scan = await new AxeBuilder({ page }).include('#meet-soundboard-root').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(scan.violations.map(item => item.id), []);
    }
  });

  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(root, 'test-results/studio-results.json'), JSON.stringify({ checks: results, errors, browser: context.browser().version() }, null, 2));
  console.log(`\n${results.length} Studio sound checks passed. No browser errors.`);
} finally {
  await context.close();
}
