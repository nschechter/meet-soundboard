# Meeting Soundboard

Play sound effects in Google Meet and Microsoft Teams (beta), right from the call. Use 15 built-in sounds or drop in your own clips to trim and adjust their volume.

Requires desktop Chrome. Zoom support is experimental and has not been tested in a live call.

## Install

1. [Open the beta branch](https://github.com/nschechter/meeting-soundboard/tree/experimental/browser-meetings), choose **Code → Download ZIP**, and unzip it.
2. Open `chrome://extensions`, disable any older soundboard installation, and enable **Developer mode**.
3. Click **Load unpacked** and select the `extension` folder.
4. Reload your meeting tab after your current call ends.

## Use

Keep your meeting mic **unmuted**, open the waveform button, and click **Turn on**. Click a sound to play it to the call, or **▷** to preview it locally.

- Uncheck **Include my voice** to send only effects.
- Enable **Hear effects too** to hear the effects you send. Use headphones to avoid echo.
- **Stop all** stops the sound. **Turn off** restores your normal microphone, including your voice.

Drop an audio file onto the board to trim it, adjust its volume, and save it.

## Development

Requires Node.js 22.12+ and Python 3.

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm test
```

Edit files in `extension/`, reload the extension, and refresh the meeting tab. No build step needed.

Run `npm run package:candidate` for a ZIP in `dist/`. On Linux, add `--with-deps` when installing Chromium.

[Compatibility and testing](docs/BROWSER-TESTING.md) · [Privacy](docs/PRIVACY.md) · [Security](SECURITY.md)

Code uses [MIT](LICENSE). Audio has separate terms, including recordings with unverified redistribution rights. See [sound credits](extension/SOUND-CREDITS.txt).
