# Meet Soundboard

A Chrome extension that adds a soundboard to Google Meet. Play classic reactions or your own clips through your meeting audio, without sharing your screen.

This is a release candidate. It has not been published to the Chrome Web Store. It is an independent project and is not made or endorsed by Google or Discord.

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome and turn on Developer mode.
3. Click **Load unpacked** and select the `extension` folder.
4. Open or reload Google Meet after your current call ends.

The extension folder is ready to load. No build step or extra audio driver is needed. The declared minimum is Chrome 114. Automated checks currently run on Chromium 158, so that minimum is an API requirement, not a promise that every older release has been tested.

## Use

The small waveform button sits beside Meet’s bottom controls. Hover over it to see **Soundboard**. In narrow windows, it moves above the controls so it does not cover them.

Join a call, leave your Meet microphone on, open **Soundboard**, and click **Turn on**. Click a sound card to play it to the call. Turn off Meet's noise cancellation or Studio sound if it filters out effects.

- The small **▷** button previews a sound on your device.
- **Include my voice** controls whether your voice joins the effects. It only applies while the soundboard is on.
- **Hear effects too** plays outgoing effects on your device as well.
- **Stop all** stops the effect. **Turn off** restores your normal microphone, including your voice.
- Keys **1–9** play the first nine effects while the panel has focus. **Escape** stops playback.

Meet mute silences both voice and effects. Use headphones for previews and local playback so your microphone does not pick them up.

**My sounds** accepts audio files up to 2 MB and 30 seconds. The library holds up to 12 clips and 8 MB of saved data. Clips and settings stay in Chrome's local extension storage. Importing a clip does not pass its audio into the Meet page. Previewing or playing it does. Playing to the meeting sends it to participants through Meet.

The included effects are Air horn, Applause, Ba dum tss, Correct!, BOOOOO!, Egg attack, Tomato splat, Record scratch, Wrong answer, Laugh track, Cha-ching!, Quack, Crickets, Sad trombone, and Dramatic boom.

Movie, TV, and internet quote recordings are not bundled in this public version. Add your own clips only when you have permission to use them.

## Privacy and limits

The extension works only on `https://meet.google.com/*`. It uses Meet's existing microphone tracks. It does not record calls, send analytics, or send audio to the developer. Read the [privacy policy](docs/PRIVACY.md) and [security notes](SECURITY.md).

The mixer runs in the Meet page because it needs access to outgoing audio. It shares that page's trust boundary. A connected status confirms the browser audio route, not whether another participant can hear it. Changes to Meet can affect compatibility.

If audio behaves unexpectedly, turn the soundboard off. Reloading the extension also requires reloading Meet after the call. Gmail's embedded Meet, mobile apps, and Safari are not supported.

## Development

Use Node.js 22.12 or newer:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm test
npm run package
```

Tests use local fixtures and two real WebRTC peers in a separate test browser. They do not open a live Google meeting or use your microphone. Reports, screenshots, and browser profiles go in the ignored `test-results` directory. On Linux, Playwright may also need its system dependencies installed.

The store ZIP is written to `dist` with `manifest.json` at the root. Packaging validates the file list and JavaScript syntax. It does not replace running the tests.

To rebuild the audio, install Python 3 and FFmpeg with `libmp3lame`, then run `npm run build:audio`. Original CC0 files, source links, and processing settings are included. Encoding can differ between FFmpeg versions. No download is needed to build or run the extension.

See [testing](docs/TESTING.md) and the [release review](docs/RELEASE-REVIEW.md) before publishing.

## Source and audio rights

No source-code license has been selected yet. Publishing this repository does not grant an open-source license. The third-party audio has separate CC0 terms, listed in [SOUND-CREDITS.txt](extension/SOUND-CREDITS.txt). Third-party development packages retain their own licenses.
