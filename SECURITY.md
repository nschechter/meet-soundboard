# Security

The extension uses only the `storage` permission and runs only on the meeting hosts listed in the manifest. Microsoft sign-in pages, Zoom account settings, and unrelated sites are excluded. This branch adds experimental Teams and Zoom support. Its runtime has no external dependencies, remote scripts, or network requests. Test packages are development dependencies.

The panel runs in Chrome's isolated extension world. Saved clips use extension storage. A background service worker queues library edits across services, validates each clip, and accepts requests only from this extension in a top-level supported meeting tab. It exposes no external message API. User-supplied filenames are inserted as text, and saved values are checked before use. Synthetic page clicks and keyboard events cannot play or delete saved clips.

The audio engine runs in the meeting page's MAIN world so it can work with WebRTC senders. That world is not isolated from meeting-site scripts or other extensions with access to the meeting site. The same-window message channel filters other frames but does not authenticate scripts within the meeting page. Page scripts can issue mixer commands or forge status updates. The extension cannot protect a microphone stream from the page that already owns it. A random message token would not make this boundary secure.

Imported clips are decoded in the isolated world and remain in extension storage until previewed or played. At that point, the audio bytes enter the meeting page. Do not use confidential clips if you do not trust that page or other extensions running on it.

File size, duration, saved library size, and concurrent playback are limited. Audio decoding happens in the browser. The duration check occurs after decoding, so the file-size limit does not guarantee a fixed peak memory cost for heavily compressed input.

The review and automated checks are not a security certification. The exact release still needs a live check on each meeting service before store submission.

For sensitive reports, use [GitHub's private vulnerability reporting](https://github.com/nschechter/meet-soundboard/security/advisories/new). It is enabled for this repository. Do not publish private clips, credentials, or exploit details in public issues.
