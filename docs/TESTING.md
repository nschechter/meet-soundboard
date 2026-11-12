# Testing

The public 1.5.2 candidate passed 51 checks locally on November 12, 2026, using Chromium 158.0.8127.18. There were no page JavaScript errors. The checks include:

- 22 integration checks, including all 15 effects reaching a real WebRTC receiver, voice and effect frequencies arriving together, effects-only mode, mute, track changes, imports, keyboard use, layout, and accessibility.
- 6 failure-handling checks, including rejected mixer connections, interrupted operations, paused senders, screen audio, and camera tracks.
- 12 security and UI checks, including cross-tab library writes, import privacy, synthetic clicks, malformed messages, child frames, invalid files and settings, filenames, focus, and small viewports.
- 6 bundled-audio checks for offline decoding, duration, levels, rapid taps, cancellation, retry, and unknown keys.
- 5 toolbar-button checks for alignment, keyboard access, narrow windows, changing toolbar layouts, and the effects-only tooltip.

Run `npm test` to produce fresh reports. The tests use local pages served by Playwright at the Meet origin and isolated browser profiles. They use generated audio, not personal recordings. The failure-handling fixtures simulate selected browser states. They are not a test of Google's servers or current Meet implementation.

The dependency audit reported no known vulnerabilities. This does not replace code review. The runtime has no npm dependencies.

The package script checks the manifest, allowed files, JavaScript syntax, media metadata, ZIP contents, and checksum. It does not claim tests have passed based on old report files.

Studio sound automation and its tests are kept on the separate [`experimental/studio-sound`](https://github.com/nschechter/meet-soundboard/tree/experimental/studio-sound) branch. They are excluded from this candidate. The earlier beta live-test results do not verify this store package.

## Required live check before store submission

Load the exact unpacked contents of the store ZIP into a clean Chrome profile. Use headphones and a separate participant or device in an empty test call.

1. Confirm normal voice audio with the soundboard off.
2. Turn on the board and play an effect while speaking. Confirm both arrive.
3. Exclude your voice and confirm only the effect arrives.
4. Mute in Meet and confirm neither voice nor effects arrive.
5. Preview a clip and confirm it does not enter outgoing audio.
6. Change microphones, then stop and restart playback.
7. Turn the board off and confirm normal voice returns.
8. Leave, rejoin, and repeat the voice-and-effect check.

Repeat with Meet noise cancellation or Studio sound disabled. Record the browser version, operating system, audio device, and result without recording anyone's private conversation.

This live check has not been completed for the public 1.5.2 candidate. Earlier successful testing of a different local version does not count as release verification for this one.
