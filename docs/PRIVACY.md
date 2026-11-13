# Privacy policy

Updated November 13, 2026. Applies to Meeting Soundboard Beta, version 1.6.1, on the experimental/browser-meetings branch. This is separate from the submitted Meet-only release.

Meeting Soundboard Beta adds sound effects to outgoing browser meeting audio in Google Meet, with experimental Microsoft Teams and Zoom support. The developer does not run a server for the extension and does not receive your audio, clips, or settings.

## Microphone and meeting audio

When you turn on the soundboard, it processes the meeting page's existing outgoing audio track in your browser. It combines your microphone with the effect you select, unless you turn off **Include my voice**. The meeting service sends that audio to participants under its own data practices. The extension does not record or save microphone or meeting audio.

The meeting site's microphone permission still applies. The extension does not request separate microphone access or bypass the meeting mute controls. Turning off the soundboard restores your original microphone track, including your voice.

## Custom sounds and settings

Clips you choose to add are checked in the extension and saved in Chrome's local extension storage with their names and durations. The same sound library is available across the supported services in this extension installation. Volume, voice, and local playback preferences are saved there too. The extension does not use Chrome sync storage.

Imports and edits are processed on your device. Editor previews play locally without passing their audio bytes to the meeting page mixer. Saving an edit replaces the saved clip with the selected audio and volume changes. The original file is not stored by the extension. The panel displays clip names within the meeting page. When you preview a saved sound card or play it to the meeting, its audio bytes pass into the meeting page's audio mixer. Preview audio is played only on your device by the extension. Playing to the meeting sends the clip to participants. The meeting page can access those bytes once they enter its context. A preview can also be picked up by your physical microphone if you use speakers.

Use each clip's delete button to remove it from the saved library. Uninstalling the extension removes its local saved data. Audio already sent to participants cannot be recalled by deleting the local clip.

## Other data

The extension has no analytics, advertising, remote code downloads, or developer backend. It does not collect browsing history, account details, chat messages, or participant lists. It runs only on meeting pages.

Data is used only to provide the soundboard. It is not sold or used for advertising. Its use follows the Chrome Web Store User Data Policy, including the Limited Use requirements.

Questions can be raised through the [repository issue tracker](https://github.com/nschechter/meeting-soundboard/issues). Do not attach private recordings or personal data to public issues.
