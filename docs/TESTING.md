# Testing

The 1.6.0 development preview passed 70 checks locally on November 12, 2026, using Chromium 158.0.8127.18. There were no page JavaScript errors. The checks include:

- 22 integration checks, including all 15 effects reaching a real WebRTC receiver, voice and effect frequencies arriving together, effects-only mode, mute, track changes, imports, keyboard use, layout, and accessibility.
- 6 failure-handling checks, including rejected mixer connections, interrupted operations, paused senders, screen audio, and camera tracks.
- 12 security and UI checks, including cross-tab library writes, import privacy, synthetic clicks, malformed messages, child frames, invalid files and settings, filenames, focus, and small viewports.
- 6 bundled-audio checks for offline decoding, duration, levels, rapid taps, cancellation, retry, and unknown keys.
- 5 toolbar-button checks for alignment, keyboard access, narrow windows, changing toolbar layouts, and the effects-only tooltip.
- 19 Studio sound checks for default-off behavior, playback ordering, restoring the prior setting, delayed menus, menu cleanup, rapid taps, Stop, previews, manual changes, failed decoding, unavailable controls, failed restoration and retry, disconnection, dialog ownership, synthetic actions, layout, and accessibility.

Run `npm test` to produce fresh reports. The tests use local pages served by Playwright at the Meet origin and isolated browser profiles. They use generated audio, not personal recordings. The failure-handling fixtures simulate selected browser states. They are not a test of Google's servers or current Meet implementation.

The dependency audit reported no known vulnerabilities. This does not replace code review. The runtime has no npm dependencies.

The package script checks the manifest, allowed files, JavaScript syntax, media metadata, ZIP contents, and checksum. It does not claim tests have passed based on old report files.

Studio sound tests use a local model of Meet's labeled switches and settings dialogs. Connection state is simulated for those checks. They exercise the actual extension and audio playback, but cannot prove compatibility with every Meet rollout or the time it takes Google's filter to change. The 400 ms pause after the switch changes remains provisional.

## Live beta check on November 12, 2026

Tested the installed private 1.6.0 copy in a new empty Meet room on Chrome 156.0.8078.82 and macOS 26.6.2, using the built-in MacBook Pro microphone and speakers. That copy retains a separate private quote library and shares the public mixer and Studio helper. Its 19 Studio checks also passed locally.

The live check found a timing bug: the original sound-card click could dismiss Meet's newly opened audio menu. The helper now waits for that click to finish before opening settings. It also closes the audio menu when it opened that menu. Both cases have regression checks.

Studio sound turned off before playback and returned on afterward. Stop restored it too. An initially off setting stayed off. BOOOOO!, Sad trombone, Correct!, and Air horn were exercised. The private library still showed all 12 quotes.

A second signed-in Meet session joined with its microphone and camera off. Adaptive audio was temporarily disabled on the receiver so Meet would not merge the two sessions. With local effect monitoring off and voice excluded, the receiver's total audio energy rose from 0.000000147 to 0.217477 after Air horn. After another Air horn with Include my voice checked, it rose to 0.443831. This confirms audio reached the receiving session through Meet. It does not prove that every part of each clip sounded correct or that spoken voice and effects were both audible in that live call. Those mixing checks passed in the local WebRTC tests.

No call audio was recorded. Both test sessions ended. Studio sound and Adaptive audio were restored to on, Include my voice was restored to checked, and local monitoring stayed off.

The earlier 1.5.1 release passed 51 checks in the [Linux GitHub workflow](https://github.com/nschechter/meet-soundboard/actions/runs/43286338766). The 1.6.0 preview has not run in GitHub Actions. The workflow runs on pushes to main and on pull requests.

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

For Studio sound automation, repeat with the switch initially on and then off. Confirm the whole clip reaches a second participant, including its first and last sounds. Check rapid taps, Stop, changing the setting manually, and leaving the call. Confirm the original setting returns. Check that closing or reloading Meet during a clip is clearly documented as a case where restoration can fail.

The live beta check above covers settings and received audio in the installed private copy. The full checklist on a separate device using the exact public store ZIP is still required before submission.
