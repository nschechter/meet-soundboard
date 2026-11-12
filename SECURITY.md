# Security

The extension uses only the `storage` permission and runs only on `https://meet.google.com/*`. Its runtime has no external dependencies, remote scripts, or network requests. Test packages are development dependencies.

The panel runs in Chrome's isolated extension world. Saved clips use extension storage. User-supplied filenames are inserted as text, and saved values are checked before use. Synthetic page clicks and keyboard events cannot play or delete saved clips.

The audio engine runs in the Meet page's MAIN world so it can work with WebRTC senders. That world is not isolated from Meet scripts or other extensions with access to Meet. The same-window message channel filters other frames but does not authenticate scripts within the Meet page. Page scripts can issue mixer commands or forge status updates. The extension cannot protect a microphone stream from the page that already owns it. A random message token would not make this boundary secure.

Imported clips are decoded in the isolated world and remain in extension storage until previewed or played. At that point, the audio bytes enter the Meet page. Do not use confidential clips if you do not trust that page or other extensions running on it.

File size, duration, saved library size, and concurrent playback are limited. Audio decoding happens in the browser. The duration check occurs after decoding, so the file-size limit does not guarantee a fixed peak memory cost for heavily compressed input.

The review and automated checks are not a security certification. The exact release still needs a live Meet check before store submission.

For sensitive reports, use [GitHub's private vulnerability reporting](https://github.com/nschechter/meet-soundboard/security/advisories/new). It is enabled for this repository. Do not publish private clips, credentials, or exploit details in public issues.
