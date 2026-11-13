# Meeting Soundboard

Meeting Soundboard adds sound effects to your browser meetings. Play a reaction or your own clip without sharing your screen or installing an audio driver.

- 15 built-in sounds, including air horn, applause, quack, crickets, and dramatic boom.
- Drag-and-drop imports with trimming, volume adjustment, and a preview of your selection.
- Controls for mixing in your voice and hearing effects on your own device.
- Light and dark mode, keyboard shortcuts, and a shared sound library across meeting sites.

## Where it works

| Meeting app | Status |
| --- | --- |
| Google Meet | Supported in Chrome. |
| Microsoft Teams in Chrome | Beta with limited live testing. |
| Zoom in Chrome | Experimental. Not yet tested in a live call. |

Requires desktop Chrome. Native meeting apps, mobile apps, and embedded calls are not supported. See the [browser testing notes](docs/BROWSER-TESTING.md) for details.

## Install the beta

1. Download and unzip the [`experimental/browser-meetings` branch](https://github.com/nschechter/meet-soundboard/tree/experimental/browser-meetings) using **Code → Download ZIP**, or clone that branch.
2. Open `chrome://extensions` in Chrome. Disable any older Meet Soundboard installation so only one soundboard runs.
3. Enable **Developer mode**, click **Load unpacked**, and select the downloaded repository's `extension` folder.
4. After any active call ends, reload the meeting tab and join using browser audio.

No build step is needed. A separate installation has its own saved sounds and settings.

## Play a sound

Keep the meeting microphone **unmuted**, open the waveform button near the meeting controls, and click **Turn on**. Click a card to play to the call, or **▷** to preview only on your device.

- **Include my voice** mixes your microphone with effects. Uncheck it to send only effects while keeping the meeting mic unmuted.
- **Hear effects too** lets you hear the effects you send. It starts on and remembers your choice.
- **Stop all** stops the current sound. **Turn off** restores your normal microphone, including your voice.
- Press **1–9** to play the first nine effects while the panel has focus. **Escape** stops playback.

Use headphones to keep local playback out of your microphone. A connected status confirms the audio connection. Check with another participant to confirm they hear it.

## Add your own sounds

Drop a file onto the board or choose **My sounds → Add a sound**. Drag the waveform handles to trim it, adjust volume up to **300%**, and use **Play selection** before saving.

Import up to **2 minutes / 10 MB** and save up to **30 seconds**. The library holds **12 clips / 8 MB**. Saved clips can be edited, but only the trimmed audio is kept. Keep your source file for later.

## If audio is missing

- If others hear effects but you do not, enable **Hear effects too**. The **▷** button previews locally even when that setting is off.
- If the board stays paused after unmuting, try turning it off, muting and unmuting in the meeting app, then turning it back on.
- If effects get cut off, check noise suppression. In Meet, Studio sound or Adaptive audio can also affect playback. The extension never changes those settings automatically.
- If Teams shows **Cannot read microphone state**, outgoing audio is paused. Previews still work. Turn the board off to restore your normal microphone.

## Privacy

The extension does not record calls, collect analytics, or use a developer server. Clips and settings stay in Chrome's local extension storage.

Imports and editor previews stay inside the extension. Previewing or playing a saved card passes its audio to the meeting page. Playing to the call sends it to participants through the meeting service.

Read the [privacy policy](docs/PRIVACY.md) and [security notes](SECURITY.md) for details.

## Local development

Requires Node.js 22.12+ and Python 3.

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm test
```

Edit files in `extension/`, reload the extension at `chrome://extensions`, then refresh your meeting tab after the call ends. No build step is needed.

Run `npm run package:candidate` to create a ZIP in `dist/`. On Linux, add `--with-deps` when installing Chromium.

## License and sound credits

Code and documentation use [MIT](LICENSE). Audio has separate terms. Six effects use CC0. Nine recordings are included at the publisher's direction with redistribution rights still unverified. See [SOUND-CREDITS.txt](extension/SOUND-CREDITS.txt).

Only add or distribute clips you have permission to use.

This is an independent project and is not made or endorsed by Google, Microsoft, or Zoom.
