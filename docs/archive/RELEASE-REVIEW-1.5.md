# Archived release review: 1.5

Historical notes from November 12, 2026, kept for the original findings and test evidence. Version and dashboard status statements below describe that review period. The publisher later reported submitting 1.5.15. Use the current [testing guide](../TESTING.md) and [publishing guide](../STORE-LISTING.md) for current status and instructions.

The current 1.5.15 build excludes Studio sound automation. That experiment is kept on the separate [`experimental/studio-sound`](https://github.com/nschechter/meeting-soundboard/tree/experimental/studio-sound) branch. The main extension does not open or change Meet audio settings. The review below describes the earlier 1.5.1 source release. The exact public store ZIP still needs the full separate-device checklist in [TESTING.md](../TESTING.md).

Version 1.5.15 keeps the editor and makes the requested Golf Clap, Quack, Dramatic boom, Tomato Squash, Awkward cricket, Funny Laugh Track, I'll be back, Punch Effect, and Luigi - Yahoo recordings the standard defaults. Their redistribution clearance is unresolved. The publisher has chosen to retain them. Release packaging requires an explicit --allow-unverified-audio option and keeps the rights disclosures unchanged. A local candidate ZIP is available for review. The exact release package is now saved as the unpublished 1.5.15 store draft.

Version 1.5.14 adds local playback while Meet's outgoing audio is paused. It respects the saved local-playback setting, labels the sound as a preview, and keeps it out of the meeting even if the sender resumes during playback. The next tap can send to the call. The engine still refuses to force paused senders active. Two integration checks cover pause, resume, local-output controls, and private previews. In the already-running call, a manual reset restored effects without rejoining: turn the board off, mute and unmute in Meet, then turn the board on. The tester confirmed voice and the test ding on the second device. Adaptive audio had also been separated for this test. This verifies the recovery steps on the existing build, not the new 1.5.14 preview behavior in live Meet.

The editor review covered three passes: audio and save behavior, security and storage, and UI and release files. It checks trim accuracy, volume limits, selected-audio previews, local preview routing, cancel behavior, stale edits from other tabs, storage limits, trusted input, keyboard controls, and small windows. Edited audio is saved as mono WAV with a 30-second limit and stays under the mixer's 2 MB limit. There are no new permissions or runtime dependencies. Version 1.5.13 removes the card category labels and the cut/undo tools. Play selection sits below the waveform. Its samples match the selected interval and volume, playback ends at the selected boundary, and changing the trim stops the preview. Reset restores the full selection and volume. Version 1.5.6 turns local playback on by default, keeps saved off/on choices, saves checkbox changes immediately, and removes stale connection notices. Local-output tests confirm that voice is not monitored and that changing local playback leaves outgoing audio active. These are three passes by the same reviewer, not independent audits.

The project's code and documentation now use the MIT License. Audio has separate terms. Six effects use CC0, while the nine requested replacements still need redistribution clearance. The extension ZIP includes both the code license and the audio credits.

Reviewed November 12, 2026. The starting point was the local 1.5.0 package. The prepared public copy is 1.5.1.

The original package was not ready for public distribution or store submission. The public copy fixes the findings below and is ready for source review. Store submission still needs the checks listed at the end.

## Audio review for 1.5.15

The latest review found two audio bugs. Both are fixed in this build.

- New tracks were attached as raw microphones before asynchronous mixing began. With Include my voice off and replacement delayed, a generated microphone tone reached a real WebRTC receiver. New tracks now use the mixed output from the start. The voice gain is set before connecting the audio graph. If mixing cannot be created with voice excluded, the new sender is rejected without attaching the microphone.
- Stopping an old, ended soundboard output could stop the restored microphone. Only active routes now forward mute and stop changes to the input. Cloning an ended output returns an ended track. This also protects a new route that reuses the same microphone after reactivation.

Seven new checks cover these cases for addTrack and addTransceiver, failed mixer creation, cleanup after deactivation and reactivation, and stopping an active route. Six failed against the old implementation. All seven now pass, and the full suite passes 74 checks with no page errors. The slow-replacement test is a controlled reproduction, not evidence that a user's microphone was exposed in a real Meet call.

The store description and reviewer instructions now match the editor, current clip names, import limits, local playback, and Adaptive audio guidance. The dashboard now holds version 1.5.15 with matching listing text, artwork, and reviewer notes. The tester reported that the basic two-device test worked with the exact 1.5.15 ZIP. The remaining individual live checks in TESTING.md are not separately confirmed.

The requested sounds are retained at the publisher's direction. Their rights remain unverified. This decision does not establish store policy compliance or grant a redistribution license. Google's intellectual property policy applies: https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property.

## Earlier findings

### P1: Movie and TV recordings had no verified redistribution rights

The original `SOUND-CREDITS.txt`, lines 91–95, explicitly said that the quote recordings had no verified open redistribution license. Those recordings were bundled in `audio.js` and included again in the source ZIP and preview audio. Publishing those files would distribute the recordings, not just the extension code.

The earlier 1.5.1 public copy contained only 15 effects whose source pages identified them as CC0. This statement does not apply to the current 1.5.15 build, which replaces nine of those recordings and still needs rights clearance. The current candidate includes the requested I'll be back movie quote and Luigi Yahoo! game voice clip. The old quote scripts and separate Quotes tab remain excluded. Custom uploads remain available. Source links are in [the audio credits](../../extension/SOUND-CREDITS.txt).

That resolved the asset problem in 1.5.1. Audio rights are open again for the nine requested replacements in 1.5.14. Source-page labels are not a guarantee about every contributor's ownership. [Chrome's intellectual property policy](https://developer.chrome.com/docs/webstore/program-policies/policies#impersonation--intellectual-property) applies to bundled media as well as code.

### P1: Importing a file exposed its bytes to the Meet page before playback

The original `panel.js`, lines 252–270, posted a chosen clip to the MAIN-world engine for duration validation. Any script in the Meet page could observe the posted bytes even if the user never played the clip. The import UI only said the clip was saved on the device.

The public copy validates imports using an isolated `OfflineAudioContext`. The engine's unused validation command was removed. A regression check observes the page message channel during import and confirms that no audio bytes enter it. The panel now explains the transfer that happens when the user previews or plays a clip.

The public copy also includes a [privacy policy](../PRIVACY.md) and a link from the extension popup. Its hosted URL still needs to be added to the store dashboard. [Chrome's privacy requirements](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy-policy) require an accurate policy for extensions that handle user data.

### P2: The installation ZIP could not be used as the store upload

The original packaging script put `manifest.json` under a `meet-soundboard/` folder. Chrome's store upload requires it at the ZIP root. The source ZIP also included files that should never enter the store package.

The new [packaging script](../../scripts/package.py) uses an explicit runtime file list, places the manifest at the root, checks syntax and permissions, and writes a checksum. Browser profiles, test reports, original recordings, and build tools cannot enter that ZIP. The ZIP has deterministic entry dates. [Chrome's package instructions](https://developer.chrome.com/docs/webstore/prepare#zip-your-extension-files) describe the root requirement.

### P2: The minimum Chrome version did not support the advertised library size

The original manifest allowed Chrome 111, while `panel.js` allowed 8 MB of saved clip data. Chrome 113 and earlier provide only 5 MB of local extension storage. Users on those versions could hit a storage error before reaching the advertised limit.

The public copy raises the declared minimum to Chrome 114, which has a 10 MB local quota. It keeps the 8 MB library limit to leave room for settings and storage overhead. It does not add `unlimitedStorage`. [Chrome's storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#storage_areas) lists these limits.

## Review passes

The functionality pass covered audio routing, mute and voice controls, replacement and removal of tracks, interruption handling, custom imports, and cancellation while audio is decoding. The new voice-plus-effect check measures both a 220 Hz microphone test tone and an 880 Hz effect at the receiving WebRTC peer.

The security and privacy pass covered permissions, storage boundaries, page messages, filenames, file limits, failed imports, and the contents of the public source tree. The runtime makes no direct network requests and has no third-party runtime dependencies. The development dependency audit reported zero known vulnerabilities on the review date.

The release and design pass covered media rights, packaging, installation instructions, privacy disclosures, keyboard controls, small windows, and automated accessibility checks. Browser screenshots were inspected. The public UI has two library tabs and keeps volume, voice, connection, and stop controls visible at small sizes. A later UI pass replaced the large green launcher with a compact gray waveform button beside the meeting toolbar. Five additional checks cover its placement and keyboard access.

These were three review passes on the same code, not three independent external audits.

## Remaining limits and release gates

- The audio engine shares the Meet page's MAIN world. Same-window message checks do not authenticate scripts in that page. A compromised Meet page or another extension with page access can interfere with the mixer. This is documented in [SECURITY.md](../../SECURITY.md). Adding a random message token would not isolate the audio engine from its host page. [Chrome documents this execution-world boundary](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts#world).
- All 74 automated checks passed on Chromium 158 for the 1.5.15 build. These use local Meet-origin fixtures, not Google's live application. On November 12, 2026, the tester confirmed that voice and effects from the public 1.5.2 package arrived together on a second device in Meet. The tester also reported that the basic two-device test worked after loading the exact 1.5.15 package. The other live checks, including voice excluded, Meet mute, microphone changes, and recovery after interruption, remain unconfirmed.
- Chrome 114 is the API floor. The 1.5.1 checks passed locally on macOS and in the [Linux GitHub workflow](https://github.com/nschechter/meeting-soundboard/actions/runs/43286338766). Other supported browser versions and operating systems have not been checked.
- The public privacy and support URLs are live. The Ponerian publisher account is verified, and version 1.5.15 is saved as an unpublished store draft. The listing, artwork, privacy disclosures, and reviewer notes are saved. The privacy policy and testing notes in this release describe 1.5.15. The unconfirmed live checks are listed above. The draft has not been submitted.
- Compressed audio can consume more memory after decoding than its file size suggests. Both validation and playback enforce duration after decoding. The byte limit reduces exposure but is not a fixed decoded-memory limit.

No guarantee of store approval or absence of all vulnerabilities is made. The local installed folder is updated only after checks. Chrome and Meet must be reloaded to activate it.
