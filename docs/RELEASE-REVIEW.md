# Release review

Reviewed November 12, 2026. The starting point was the local 1.5.0 package. The prepared public copy is 1.5.1.

The original package was not ready for public distribution or store submission. The public copy fixes the findings below and is ready for source review. Store submission still needs the checks listed at the end.

## Findings

### P1: Movie and TV recordings had no verified redistribution rights

The original `SOUND-CREDITS.txt`, lines 91–95, explicitly said that the quote recordings had no verified open redistribution license. Those recordings were bundled in `audio.js` and included again in the source ZIP and preview audio. Publishing those files would distribute the recordings, not just the extension code.

The public copy contains only the 15 effects whose source pages identify them as CC0. Quote recordings, quote download scripts, quote previews, and the Quotes tab are excluded. Custom uploads remain available. Source links are in [the audio credits](../extension/SOUND-CREDITS.txt).

This resolves the known asset problem in this candidate. Source-page labels are not a guarantee about every contributor's ownership. [Chrome's intellectual property policy](https://developer.chrome.com/docs/webstore/program-policies/policies#impersonation--intellectual-property) applies to bundled media as well as code.

### P1: Importing a file exposed its bytes to the Meet page before playback

The original `panel.js`, lines 252–270, posted a chosen clip to the MAIN-world engine for duration validation. Any script in the Meet page could observe the posted bytes even if the user never played the clip. The import UI only said the clip was saved on the device.

The public copy validates imports using an isolated `OfflineAudioContext`. The engine's unused validation command was removed. A regression check observes the page message channel during import and confirms that no audio bytes enter it. The panel now explains the transfer that happens when the user previews or plays a clip.

The public copy also includes a [privacy policy](PRIVACY.md) and a link from the extension popup. Its hosted URL still needs to be added to the store dashboard. [Chrome's privacy requirements](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy-policy) require an accurate policy for extensions that handle user data.

### P2: The installation ZIP could not be used as the store upload

The original packaging script put `manifest.json` under a `meet-soundboard/` folder. Chrome's store upload requires it at the ZIP root. The source ZIP also included files that should never enter the store package.

The new [packaging script](../scripts/package.py) uses an explicit runtime file list, places the manifest at the root, checks syntax and permissions, and writes a checksum. Browser profiles, test reports, original recordings, and build tools cannot enter that ZIP. The ZIP has deterministic entry dates. [Chrome's package instructions](https://developer.chrome.com/docs/webstore/prepare#zip-your-extension-files) describe the root requirement.

### P2: The minimum Chrome version did not support the advertised library size

The original manifest allowed Chrome 111, while `panel.js` allowed 8 MB of saved clip data. Chrome 113 and earlier provide only 5 MB of local extension storage. Users on those versions could hit a storage error before reaching the advertised limit.

The public copy raises the declared minimum to Chrome 114, which has a 10 MB local quota. It keeps the 8 MB library limit to leave room for settings and storage overhead. It does not add `unlimitedStorage`. [Chrome's storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage#storage_areas) lists these limits.

## Review passes

The functionality pass covered audio routing, mute and voice controls, replacement and removal of tracks, interruption handling, custom imports, and cancellation while audio is decoding. The new voice-plus-effect check measures both a 220 Hz microphone test tone and an 880 Hz effect at the receiving WebRTC peer.

The security and privacy pass covered permissions, storage boundaries, page messages, filenames, file limits, failed imports, and the contents of the public source tree. The runtime makes no direct network requests and has no third-party runtime dependencies. The development dependency audit reported zero known vulnerabilities on the review date.

The release and design pass covered media rights, packaging, installation instructions, privacy disclosures, keyboard controls, small windows, and automated accessibility checks. Browser screenshots were inspected. The public UI has two library tabs and keeps volume, voice, connection, and stop controls visible at small sizes. A later UI pass replaced the large green launcher with a compact gray waveform button beside the meeting toolbar. Five additional checks cover its placement and keyboard access.

These were three review passes on the same code, not three independent external audits.

## Remaining limits and release gates

- The audio engine shares the Meet page's MAIN world. Same-window message checks do not authenticate scripts in that page. A compromised Meet page or another extension with page access can interfere with the mixer. This is documented in [SECURITY.md](../SECURITY.md). Adding a random message token would not isolate the audio engine from its host page. [Chrome documents this execution-world boundary](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts#world).
- All 51 automated checks passed on Chromium 158. These use local Meet-origin fixtures, not Google's live application. Test the exact ZIP with a second participant in a real Meet call before submission, including voice and effects together, voice excluded, Meet mute, microphone changes, and recovery after interruption.
- Chrome 114 is the API floor. This candidate has not been tested across the full range of supported Chrome versions or operating systems. The GitHub workflow is prepared but has not run yet.
- The public privacy and support URLs, store dashboard disclosures, store artwork, and developer account setup still need to be completed.
- Choose a source-code license before describing this as open source. Public source can be published without granting a license, but that is a different choice.
- Compressed audio can consume more memory after decoding than its file size suggests. Both validation and playback enforce duration after decoding. The byte limit reduces exposure but is not a fixed decoded-memory limit.

No guarantee of store approval or absence of all vulnerabilities is made. The current installed copy was not replaced during this review.
