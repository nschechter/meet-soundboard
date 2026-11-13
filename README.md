# Meeting Soundboard Beta

This branch tests Teams and Zoom browser support alongside Google Meet. Version 1.6.1 is experimental. A live Teams personal call passed effects-only playback, mute, and unmute recovery using a separate browser session. Voice and effects together and Teams work accounts still need live testing. Zoom is untested on the live service. Desktop apps are not supported. See [browser testing](docs/BROWSER-TESTING.md).

The Meet-only 1.5.15 package was submitted by the publisher. Existing store assets and release-review notes describe that package, not this beta.

A Chrome extension that adds a soundboard to browser meetings. Play classic reactions or your own clips through your meeting audio, without sharing your screen.

This is an unreleased candidate. The requested Applause, Quack, Dramatic boom, Tomato splat, Crickets, Laugh track, I'll be back, Punch, and Luigi Yahoo! are included as built-in defaults. The publisher has chosen to retain them with redistribution rights still unverified. This beta has not been submitted to the Chrome Web Store. It is an independent project and is not made or endorsed by Google, Microsoft, or Zoom.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome and turn on Developer mode.
3. Click **Load unpacked** and select the `extension` folder.
4. Open or reload Google Meet, Teams, or Zoom in Chrome after your current call ends.

The extension folder is ready to load. No build step or extra audio driver is needed. The declared minimum is Chrome 114. Automated checks currently run on Chromium 158, so that minimum is an API requirement, not a promise that every older release has been tested.

## Use

The small waveform button sits beside Meet’s bottom controls. Hover over it to see **Soundboard**. In narrow windows, it moves above the controls so it does not cover them.

Join a call, leave your Meet microphone on, open **Soundboard**, and click **Turn on**. Click a sound card to play it to the call. Turn off Meet's noise cancellation or Studio sound if it filters out effects. If Meet merges nearby computers, turn off Adaptive audio in Meet's audio settings. The extension does not change those settings for you.

- The small **▷** button previews a sound on your device.
- **Include my voice** controls whether your voice joins the effects. It only applies while the soundboard is on.
- **Hear effects too** plays outgoing effects on your device as well. It is on by default. If an older version saved it as off, check it once to turn local playback on. Your choice is saved.
- **Stop all** stops the effect. **Turn off** restores your normal microphone, including your voice.
- Keys **1–9** play the first nine effects while the panel has focus. **Escape** stops playback.

Meet mute silences both voice and effects. Use headphones for previews and local playback so your microphone does not pick them up.

**My sounds** accepts a file from the picker or a drop anywhere on the open board. Import up to 2 minutes and 10 MB, then save up to 30 seconds. Drag the waveform handles to select the part to keep and adjust its volume up to 300%. **Play selection**, directly below the waveform, previews that part with your volume changes. Only you hear it. **Reset** restores the full selection and original volume. Use **Edit** on a saved sound to change it later. Saving keeps only the selected audio, so keep the source file if you might need it again.

The library holds up to 12 clips and 8 MB of saved data. Edited clips use mono WAV audio and stay within the 2 MB playback limit. Clips and settings stay in Chrome's local extension storage. Imports and editor previews do not pass audio bytes into the meeting page. Previewing a saved card or playing it does. Playing to the meeting sends it to participants through the meeting service.

The included effects are Air horn, Applause, Ba dum tss, Correct!, BOOOOO!, Luigi Yahoo!, Tomato splat, I'll be back, Punch, Laugh track, Cha-ching!, Quack, Crickets, Sad trombone, and Dramatic boom.

This candidate includes the requested I'll be back movie quote and Luigi Yahoo! game voice clip. Their redistribution rights remain unresolved. Add your own clips only when you have permission to use them.

## Privacy and limits

The extension runs on the meeting hosts listed in the manifest. It uses existing outgoing browser audio tracks. Teams and Zoom compatibility is still being tested. It does not record calls, send analytics, or send audio to the developer. Read the [privacy policy](docs/PRIVACY.md) and [security notes](SECURITY.md).

The mixer runs in the meeting page because it needs access to outgoing audio. It shares that page's trust boundary. A connected status confirms the browser audio route, not whether another participant can hear it. Changes to meeting apps can affect compatibility.

If audio behaves unexpectedly, turn the soundboard off. Reloading the extension also requires reloading Meet after the call. Gmail's embedded Meet, mobile apps, and Safari are not supported.

## Development

Studio sound automation is an unfinished experiment on the [`experimental/studio-sound`](https://github.com/nschechter/meet-soundboard/tree/experimental/studio-sound) branch. It is excluded from `main` and the store candidate.

Use Node.js 22.12 or newer:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm test
npm run package:candidate
```

Tests use local fixtures and two real WebRTC peers in a separate test browser. They do not open a live Google meeting or use your microphone. Reports, screenshots, and browser profiles go in the ignored `test-results` directory. On Linux, Playwright may also need its system dependencies installed.

The store ZIP is written to `dist` with `manifest.json` at the root. Packaging validates the file list and JavaScript syntax. It does not replace running the tests.

To rebuild the audio, install Python 3 and FFmpeg with `libmp3lame`, then run `npm run build:audio`. Source files, source links, processing settings, and current rights information are included. Encoding can differ between FFmpeg versions. No download is needed to build or run the extension.

See [testing](docs/TESTING.md) and the [release review](docs/RELEASE-REVIEW.md) before publishing.

`npm run package:candidate` creates a local review ZIP. CI uses this command to check packaging without making a publication decision. The publisher has chosen to keep the requested recordings. `npm run package -- --allow-unverified-audio` creates the release ZIP with those recordings and their existing rights disclosures. That option does not grant rights or change the recorded licenses.

## Source and audio rights

The project's code and documentation use the [MIT License](LICENSE). Copyright (c) 2026 Noah Schechter. You can use, modify, and redistribute the code, including commercially, provided you keep the copyright and license notice. Modified versions do not have to publish their source code.

Six built-in effects use CC0. The nine replacements have separate or unverified rights, listed in [SOUND-CREDITS.txt](extension/SOUND-CREDITS.txt). Third-party development packages retain their own licenses. The MIT license does not grant rights to movie, TV, or other recordings you may import.
