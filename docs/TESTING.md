# Testing

This branch contains Meeting Soundboard 1.6.2 for Meet and Teams. Zoom stays on the separate [beta branch](https://github.com/nschechter/meeting-soundboard/tree/experimental/browser-meetings). Results below identify which build was tested.

## Compatibility

| Service | Current coverage |
| --- | --- |
| Google Meet | Basic two-device test passed on 1.5.15. Repeat the checklist below for new releases. |
| Teams personal | Effects, mute, and unmute passed in a live 1.6.1 call. Voice and microphone switching still need live checks. |
| Teams work accounts | Automated checks only. Live testing is still needed. |
| Zoom web meetings | Not included on `main`. The beta has automated checks only and still needs live testing. |

Use desktop Chrome and open the meeting website directly. Native apps, mobile apps, and embedded meeting frames are unsupported. The extension never changes meeting audio settings automatically.

The Teams integration also checks the meeting's microphone button. If its state is unknown, outgoing effects pause and local previews remain available. Changes to meeting controls can affect compatibility.

## Automated checks

Follow the [development setup](../README.md#development), then run `npm test`. Reports go into `test-results/`.

The suite covers voice and effect mixing, mute, microphone changes, stopped tracks, failed connections, previews, shared clips across Meet and Teams, imports, trimming, volume, permissions, layout, keyboard use, and accessibility. It also checks that Zoom pages cannot load the main build. It uses generated audio and real WebRTC peers on local test pages in isolated Chromium profiles. It does not record people or test the meeting services themselves.

Run `npm run package:candidate` to create a review ZIP in `dist/`. Packaging checks permissions, included files, JavaScript syntax, ZIP integrity, and the audio license list. It writes a SHA-256 checksum. Packaging does not run the tests.

## Live test setup

1. Disable older soundboard installations. Load the exact unpacked ZIP being tested, then reload an empty meeting tab.
2. Join with browser audio and the meeting microphone on. Open the waveform button and click **Turn on**.
3. Join from a second device with headphones and its microphone muted. No separate soundboard login is needed.
4. In Meet, turn off Adaptive audio if available so nearby computers do not merge their audio. Start with noise cancellation or Studio sound off, then repeat playback with it on to check filtering.

For a same-computer effects test, receive through a private window without the extension. Keep that session's mic and camera off. On the sender, turn off **Include my voice** and **Hear effects too**, so heard effects must come through the receiving session. Use headphones before testing voice.

If Meet stays paused after unmuting, check Adaptive audio, turn the board off, mute and unmute in Meet, then turn the board back on. This recovered one live call without rejoining. A paused status alone does not prove the microphone is muted.

## Live checklist

Run these checks on each meeting service being released. Test Teams personal and work accounts separately.

1. With the board off, confirm normal voice reaches the receiver. Turn it on and confirm voice and an effect arrive together.
2. Turn off **Include my voice**. Only effects should arrive. Change microphones while speaking and confirm voice stays excluded. Turn voice back on and confirm both arrive.
3. Mute in the meeting during an effect. Voice and effects should stop. Try another effect while muted and confirm silence. Unmute and play a new effect without rejoining. The interrupted effect must not restart.
4. Preview a saved card and a trimmed selection. Neither should reach the receiver.
5. Turn **Hear effects too** off. Effects should still reach the receiver, and explicit previews should remain audible locally. Turn it on and confirm effects play on both devices without monitoring your own voice.
6. Click **Stop all** during playback. Both outputs should stop.
7. Turn the board off and confirm normal voice returns. Turn it on, change microphones, and confirm voice and effects work again.
8. Start alone, then have the receiver join. Confirm the connection updates and the next effect arrives. A local preview already playing must stay private when sending resumes.
9. Leave and rejoin, then repeat voice and effect playback.

Also check the editor and controls:

- Drop an audio file onto the board, then try **Add a sound**. Imports allow up to 2 minutes and 10 MB. Use audio you have permission to use.
- Select up to 30 seconds, change volume, and use **Play selection**. Confirm it plays only that interval at the chosen volume. Save, preview, play, edit, and delete the clip. The library allows 12 clips and 8 MB, with each saved clip under 2 MB.
- With the panel focused, check keys 1 through 9 and Escape. Check the panel and editor in light mode, dark mode, and a narrow window.

Record the build, ZIP checksum, browser version, operating system, audio device, meeting service, and each result. Do not record private conversations.

## Recorded live results

| Date | Build and setup | Confirmed result |
| --- | --- | --- |
| November 12, 2026 | Meet 1.5.15, exact store ZIP, two devices | User reported the basic test worked with voice and local playback enabled. Mute, voice exclusion, private previews, microphone changes, cleanup, and rejoin were not separately confirmed. |
| November 13, 2026 | Teams personal 1.6.1, receiver in a private window on the same computer | User heard the unmuted ding, confirmed silence for muted applause, and heard a new ding after unmuting without rejoining. Sender voice and local playback were off. |

The Teams result does not confirm voice mixing, microphone changes, muting during an active effect, preview privacy, or microphone restoration in a live call. Teams work accounts still need live testing. No live test has been recorded for the exact 1.6.2 package.

The tested Meet 1.5.15 ZIP has SHA-256 `cc74f302ce8d29937e148d3ba5c57fa6d509605398dc8cc69bd9bdb643b2083e`. That test used macOS and the built-in MacBook Pro microphone. The live Chrome version and receiving device model were not recorded.
