import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extension = await fs.realpath(process.argv[2] || path.join(root, 'extension'));
const output = path.join(root, 'store/assets');
const profile = path.join(root, 'test-results/store-profile');
const extensionId = createHash('sha256').update(extension).digest('hex').slice(0, 32).replace(/[0-9a-f]/g, digit => String.fromCharCode(parseInt(digit, 16) + 97));
await fs.mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
const errors = [];
const setup = await context.newPage();
await setup.goto(`chrome-extension://${extensionId}/popup.html`);
await setup.evaluate(() => chrome.storage.local.clear());
await setup.close();
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const wave = '<span class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
const fixture = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Meet Soundboard demo</title><style>
* { box-sizing:border-box; } body { margin:0; background:#151c19; color:#f4f5ec; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
.copy { padding:56px 64px; width:780px; } .brand { display:flex; align-items:center; gap:14px; font-size:19px; font-weight:650; }
.wave { display:inline-flex; align-items:center; gap:4px; height:32px; color:#dff59b; } .wave i { display:block; width:4px; height:12px; border-radius:6px; background:currentColor; } .wave i:nth-child(2),.wave i:nth-child(4) { height:24px; } .wave i:nth-child(3) { height:32px; }
.eyebrow { margin:60px 0 18px; color:#b0c29c; font-size:12px; font-weight:600; letter-spacing:2px; text-transform:uppercase; } h1 { margin:0; font-size:59px; line-height:1.07; letter-spacing:-2.8px; font-weight:650; } h1 em { font-style:normal; color:#dff59b; } .description { max-width:540px; margin:23px 0 0; color:#bcc7be; font-size:19px; line-height:1.55; }
.room { position:absolute; left:64px; top:457px; width:704px; height:214px; display:flex; gap:14px; } .tile { position:relative; width:345px; height:214px; background:#27352e; border:1px solid #3b4a40; border-radius:20px; display:grid; place-items:center; } .tile:nth-child(2) { background:#303136; border-color:#45464a; } .avatar { width:78px; height:78px; border-radius:50%; display:grid; place-items:center; background:#61745f; font-size:30px; font-weight:500; } .tile:nth-child(2) .avatar { background:#716b80; } .name { position:absolute; left:18px; bottom:15px; color:#d1dad3; font-size:13px; }
.demo { position:absolute; bottom:30px; left:64px; color:#84968a; font-size:12px; } .dock { position:fixed; bottom:20px; right:24px; display:flex; gap:4px; background:#202124; padding:4px; border-radius:32px; } .dock button { display:grid; place-items:center; width:48px; height:48px; padding:12px; border:0; border-radius:50%; color:#c4c7c5; background:transparent; } svg { width:24px; height:24px; fill:currentColor; }
</style></head><body><section class="copy"><div class="brand">${wave}Meet Soundboard</div><p class="eyebrow">Classic reactions. Perfect timing.</p><h1>Make the moment<br><em>a little louder.</em></h1><p class="description">Play 15 classic effects into your Meet call.<br>Keep your voice in the mix.</p></section><div class="room"><div class="tile"><span class="avatar">A</span><span class="name">Alex</span></div><div class="tile"><span class="avatar">J</span><span class="name">Jamie</span></div></div><div class="demo">Demo meeting · Actual extension interface</div><div class="dock"><button aria-label="Chat with everyone"><svg viewBox="0 0 24 24"><path d="M4 3h16a1 1 0 0 1 1 1v14H7l-4 4V4a1 1 0 0 1 1-1zm1 2v12.2L6.2 16H19V5H5zm2 3h10v2H7zm0 4h8v2H7z"/></svg></button><button aria-label="Meeting tools"><svg viewBox="0 0 24 24">${[5,12,19].flatMap(y => [5,12,19].map(x => `<circle cx="${x}" cy="${y}" r="2"/>`)).join('')}</svg></button></div></body></html>`;
await context.route('https://meet.google.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));

try {
  await page.goto('https://meet.google.com/store-demo');
  await page.getByRole('button', { name: 'Soundboard', exact: true }).click();
  assert.equal(await page.locator('.builtin-grid .sound').count(), 15);
  assert.equal(await page.locator('.studio-options').count(), 0);
  await page.evaluate(async () => {
    const audio = new AudioContext();
    await audio.resume();
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    const stream = audio.createMediaStreamDestination();
    gain.gain.value = .15;
    tone.connect(gain).connect(stream);
    tone.start();
    const sender = new RTCPeerConnection();
    const receiver = new RTCPeerConnection();
    sender.onicecandidate = event => { if (event.candidate) receiver.addIceCandidate(event.candidate); };
    receiver.onicecandidate = event => { if (event.candidate) sender.addIceCandidate(event.candidate); };
    receiver.ontrack = event => {
      const player = document.createElement('audio');
      player.srcObject = new MediaStream([event.track]);
      player.muted = true;
      player.play();
    };
    sender.addTrack(stream.stream.getAudioTracks()[0], stream.stream);
    await sender.setLocalDescription(await sender.createOffer());
    await receiver.setRemoteDescription(sender.localDescription);
    await receiver.setLocalDescription(await receiver.createAnswer());
    await sender.setRemoteDescription(receiver.localDescription);
    window.demoAudio = { audio, sender, receiver, tone };
  });
  await page.waitForFunction(() => window.demoAudio.sender.connectionState === 'connected');
  await page.getByRole('button', { name: 'Turn on', exact: true }).click();
  await page.locator('.connection[data-state="ready"]').waitFor();
  await page.mouse.move(780, 400);
  await page.screenshot({ path: path.join(output, '01-classic-reactions.png') });

  await page.getByRole('tab', { name: 'My sounds' }).click();
  const samples = 24000;
  const clip = Buffer.alloc(44 + samples * 2);
  clip.write('RIFF'); clip.writeUInt32LE(clip.length - 8, 4); clip.write('WAVEfmt ', 8);
  clip.writeUInt32LE(16, 16); clip.writeUInt16LE(1, 20); clip.writeUInt16LE(1, 22);
  clip.writeUInt32LE(16000, 24); clip.writeUInt32LE(32000, 28); clip.writeUInt16LE(2, 32); clip.writeUInt16LE(16, 34);
  clip.write('data', 36); clip.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) clip.writeInt16LE(Math.round(Math.sin(i / 16000 * Math.PI * 2 * 660) * 8000 * Math.exp(-i / 8000)), 44 + i * 2);
  const importPath = path.join(root, 'test-results/My chime.wav');
  await fs.writeFile(importPath, clip);
  await page.locator('input.file').setInputFiles(importPath);
  await page.locator('.editor-save:enabled').waitFor();
  await page.locator('#clip-start').fill('0.12');
  await page.locator('#clip-start').press('Tab');
  await page.locator('#clip-end').fill('1.10');
  await page.locator('#clip-end').press('Tab');
  await page.locator('.boost-clip').click();
  await page.evaluate(() => {
    document.querySelector('.eyebrow').textContent = 'Built-in sound editor';
    document.querySelector('h1').innerHTML = 'Choose the part<br><em>you want to play.</em>';
    document.querySelector('.description').innerHTML = 'Trim your clip and adjust its volume.<br>Hear the selection before you save.';
  });
  await page.mouse.move(780, 400);
  await page.screenshot({ path: path.join(output, '03-trim-and-preview.png') });
  await page.locator('.editor-save:enabled').click();
  await page.getByRole('button', { name: 'Play My chime to meeting', exact: true }).waitFor();
  await page.evaluate(() => {
    document.querySelector('.eyebrow').textContent = 'Your sounds, your timing.';
    document.querySelector('h1').innerHTML = 'Bring your own<br><em>kind of funny.</em>';
    document.querySelector('.description').innerHTML = 'Add your own clips. Preview before you play.<br>Control the volume and stop with one click.';
  });
  await page.mouse.move(780, 400);
  await page.screenshot({ path: path.join(output, '02-your-own-sounds.png') });
  await page.getByRole('button', { name: 'Turn off', exact: true }).click();
  await page.evaluate(async () => {
    window.demoAudio.sender.close();
    window.demoAudio.receiver.close();
    window.demoAudio.tone.stop();
    await window.demoAudio.audio.close();
  });

  const promo = await context.newPage();
  const promoHtml = `<!doctype html><html lang="en"><meta charset="utf-8"><style>
* { box-sizing:border-box; } body { margin:0; width:100vw; height:100vh; overflow:hidden; background:#dff59b; color:#253b29; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; display:grid; place-items:center; }
.disc { width:164px; height:164px; border-radius:50%; background:#263f2e; display:grid; place-items:center; box-shadow:0 12px 0 #bfd978; position:relative; z-index:2; }
.wave { display:flex; align-items:center; gap:9px; height:86px; color:#e5f5b9; } .wave i { width:10px; height:28px; background:currentColor; border-radius:10px; } .wave i:nth-child(2),.wave i:nth-child(4) { height:58px; } .wave i:nth-child(3) { height:86px; }
.sound { position:absolute; display:grid; place-items:center; width:74px; height:74px; background:#fffef5; border:1px solid #cddbb1; border-radius:20px; font-size:42px; box-shadow:0 7px 0 #c3db8e; }
.horn { left:36px; top:31px; transform:rotate(-13deg); } .clap { right:31px; top:39px; transform:rotate(13deg); } .drum { left:53px; bottom:22px; transform:rotate(9deg); } .sparkle { right:42px; bottom:19px; transform:rotate(-10deg); }
.ring { position:absolute; width:310px; height:310px; border:1px solid #adc86d; border-radius:50%; } .ring.outer { width:398px; height:398px; opacity:.65; }
@media(min-width:1000px) { body { justify-content:end; padding-right:170px; } .disc { width:250px; height:250px; } .wave { transform:scale(1.5); } .sound { width:110px; height:110px; border-radius:28px; font-size:62px; } .horn { left:auto; right:490px; top:70px; } .clap { right:65px; top:55px; } .drum { left:auto; right:470px; bottom:55px; } .sparkle { right:55px; bottom:50px; } .ring { right:113px; width:360px; height:360px; } .ring.outer { right:25px; width:536px; height:536px; } .title { display:block !important; position:absolute; left:90px; top:166px; font-size:74px; line-height:1.05; letter-spacing:-3px; font-weight:650; } .title span { display:block; font-size:23px; letter-spacing:0; margin-top:25px; font-weight:450; color:#48613a; } }
</style><body><div class="title" style="display:none">Meet<br>Soundboard<span>Classic reactions. Perfect timing.</span></div><div class="ring"></div><div class="ring outer"></div><div class="sound horn">📣</div><div class="sound clap">👏</div><div class="sound drum">🥁</div><div class="sound sparkle">✨</div><div class="disc">${wave}</div></body></html>`;
  await promo.setViewportSize({ width: 440, height: 280 });
  await promo.setContent(promoHtml);
  await promo.screenshot({ path: path.join(output, 'promo-small-440x280.png') });
  await promo.setViewportSize({ width: 1400, height: 560 });
  await promo.setContent(promoHtml);
  await promo.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await promo.screenshot({ path: path.join(output, 'promo-marquee-1400x560.png') });
  await fs.copyFile(path.join(extension, 'icons/icon-128.png'), path.join(output, 'store-icon-128.png'));
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'provenance.json'), JSON.stringify({
    version: JSON.parse(await fs.readFile(path.join(extension, 'manifest.json'), 'utf8')).version,
    source: 'Extension loaded from the unpacked release ZIP. Screenshots use a local demo page and real local WebRTC peers, not a live Google Meet call.',
    screenshots: ['01-classic-reactions.png', '02-your-own-sounds.png', '03-trim-and-preview.png'],
    screenshotDimensions: [1280, 800],
    customClip: 'An original generated chime. No private clips, recordings, or user profiles are used.',
    browser: context.browser()?.version(),
    pageErrors: errors
  }, null, 2) + '\n');
  console.log(`Created store assets in ${output}`);
} finally {
  await context.close();
}
