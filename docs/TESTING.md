# Testing

The standard 1.5.15 build passed 74 checks locally on November 12, 2026, using Chromium 158.0.8127.18. There were no page JavaScript errors. This candidate includes drag-and-drop imports and a waveform editor. Cards show the sound name and duration. Play selection sits under the waveform and previews only the selected samples with the chosen volume. Reset restores the full selection and volume. Cut and Undo are removed. Applause, Quack, Dramatic boom, Tomato splat, Crickets, Laugh track, I'll be back, Punch, and Luigi Yahoo! now use the nine requested recordings. The other 6 clips are byte-for-byte unchanged from 1.5.2. The publisher has chosen to retain these recordings with their rights still unverified. Local playback is on by default, saved off/on choices survive reloads, and outdated connection notices clear when the state changes. Local-output checks confirm that effects are audible on both sides, local playback can be disabled without muting the meeting, the microphone is not monitored locally, and Stop all stops both outputs. Paused outgoing audio now allows local playback through the main cards when Hear effects too is on. Tests confirm that resuming the sender does not broadcast a preview already playing. The next tap reaches the receiver without replacing the connection. Disabling Hear effects too stops the local preview. Explicit preview buttons still work when that setting is off. The checks include:

- 25 integration checks, including all 15 effects reaching a real WebRTC receiver, voice and effect frequencies arriving together, Luigi Yahoo!, I'll be back, and Punch replacing Egg attack, Record scratch, and Wrong answer on keys 6, 8, and 9, effects-only mode, mute, track changes, imports, keyboard use, layout, and accessibility.
- 7 audio lifecycle checks for new tracks with voice excluded, failed mixer creation, cleanup after turning the board off or back on, and stopping an active microphone. They use two real WebRTC peers and generated audio. Six of these checks reproduced failures in the old implementation.
- 6 failure-handling checks, including rejected mixer connections, interrupted operations, paused senders, screen audio, and camera tracks.
- 13 security and UI checks, including cross-tab library writes, import privacy, synthetic clicks, malformed messages, child frames, invalid files and settings, filenames, focus, and small viewports.
- 6 bundled-audio checks for offline decoding, duration, levels, rapid taps, cancellation, retry, and unknown keys.
- 5 toolbar-button checks for alignment, keyboard access, narrow windows, changing toolbar layouts, and the effects-only tooltip.
- 12 editor checks for native file drops, exact trimmed preview and saved samples, reset, volume boosts, clipping limits, long imports, local previews, keyboard and pointer handles, accessibility, storage failures, stale edits, and synthetic input. The integration test also checks that editor previews stay out of outgoing audio and that saved edits mix with voice.

Run `npm test` to produce fresh reports. The tests use local pages served by Playwright at the Meet origin and isolated browser profiles. They use generated microphone and custom-upload audio, plus the bundled recordings. They do not record any person or call. The failure-handling fixtures simulate selected browser states. They are not a test of Google's servers or current Meet implementation.

The dependency audit reported no known vulnerabilities. This does not replace code review. The runtime has no npm dependencies.

The package script checks the manifest, allowed files, JavaScript syntax, media metadata, ZIP contents, and checksum. It does not claim tests have passed based on old report files.

Studio sound automation and its tests are kept on the separate [`experimental/studio-sound`](https://github.com/nschechter/meet-soundboard/tree/experimental/studio-sound) branch. They are excluded from this candidate. The earlier beta live-test results do not verify this store package.

## Required live check before store submission

Load the exact unpacked contents of the store ZIP into a clean Chrome profile. Use headphones and a separate participant or device in an empty test call. Turn off Adaptive audio on both computers if available, so Meet does not merge their audio. Mute the receiving device microphone. Record the ZIP checksum with the result.

1. Confirm normal voice audio with the soundboard off.
2. Turn on the board and play an effect while speaking. Confirm both arrive.
3. Exclude your voice and confirm only the effect arrives.
4. Mute in Meet and confirm neither voice nor effects arrive.
5. Preview a clip and confirm it does not enter outgoing audio.
6. With Include my voice off, change microphones while speaking. Confirm voice stays excluded and effects still arrive. Include voice again and confirm both arrive.
7. Turn the board off and confirm normal voice returns. Turn it back on, change microphones again, and confirm voice and effects still arrive.
8. Start alone, then have another device join. Confirm the status updates and the next effect reaches that device without rejoining. Confirm a local preview already playing stays private.
9. Leave, rejoin, and repeat the voice-and-effect check.

Repeat with Meet noise cancellation or Studio sound disabled. Record the browser version, operating system, audio device, and result without recording anyone's private conversation.

On November 12, 2026, the tester confirmed that voice and sound effects arrived together on a second device after loading the unpacked public 1.5.2 store package. This passes step 2. The result is based on the tester's listening report.

The test setup used macOS, the built-in MacBook Pro microphone, and Meet with Studio sound turned off. The live Chrome version and receiving device model were not recorded. The package SHA-256 is `2aa86fdd40492e5cbaa514dd3640f2488e6ced929bbb4ac9eb038ee248bc821d`.

That listening result applies to 1.5.2. On November 12, 2026, the tester loaded the exact 1.5.15 package and reported that the two-device test worked. The board showed Connected to meeting audio with Include my voice and Hear effects too on. Meet showed two participants and an active microphone. This is a basic live-test pass based on the tester's report. The individual voice-exclusion, mute, private-preview, microphone-change, cleanup, and rejoin checks are not separately confirmed. The 1.5.15 package SHA-256 is `cc74f302ce8d29937e148d3ba5c57fa6d509605398dc8cc69bd9bdb643b2083e`.

During live troubleshooting on November 12, Meet showed one participant and an unmuted microphone while the extension reported paused outgoing audio. This shows that paused audio is not enough to diagnose a muted microphone. The reason Meet paused the sender was not confirmed. After a second device joined, Meet merged both devices with Adaptive audio. Stopping that merge and cycling the soundboard alone did not clear the paused state. The tester could still hear their voice on the second device. Turning the board off, muting and unmuting in Meet, then turning the board on restored the connected status without rejoining. The tester then confirmed the test ding arrived. This used the already-running call before the 1.5.14 update was loaded. The exact cause of the paused soundboard route is still unconfirmed.

The tester later reported that the repeated missing sound on the second computer was caused by Adaptive audio being on. This is a user-reported result, not a trace of Meet's internal audio routing. The help text now calls out Adaptive audio for nearby computers. Google documents how to stop a current merge or disable the setting: https://support.google.com/meet/answer/14263133?hl=en.
