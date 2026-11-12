# Privacy policy

Updated November 12, 2026. Applies to the public Meet Soundboard development preview, version 1.6.0.

Meet Soundboard adds sound effects to your outgoing Google Meet audio. The developer does not run a server for the extension and does not receive your audio, clips, or settings.

## Microphone and meeting audio

When you turn on the soundboard, it processes Meet's existing outgoing audio track in your browser. It combines your microphone with the effect you select, unless you turn off **Include my voice**. Google Meet sends that audio through the meeting to participants, under Google's own data practices. The extension does not record or save microphone or meeting audio.

Meet's microphone permission still applies. The extension does not request separate microphone access or bypass Meet mute. Turning off the soundboard restores your original microphone track, including your voice.

## Custom sounds and settings

Clips you choose to add are checked in the extension and saved in Chrome's local extension storage with their names and durations. Volume, voice, and local playback preferences are saved there too. The extension does not use Chrome sync storage.

If you enable Studio sound automation, the extension reads and changes Meet's Studio sound or noise cancellation switch during playback, then attempts to restore it. This option and the prior switch state stay in memory for the current tab. They are not sent to the developer or saved in extension storage. Changing the switch changes your audio setting in Google Meet.

The panel displays clip names within the Meet page. When you preview or play a clip, its audio bytes pass into the Meet page's audio mixer. Preview audio is played only on your device by the extension. Playing to the meeting sends the clip to participants. The Meet page can access those bytes once they enter its context. A preview can also be picked up by your physical microphone if you use speakers.

Use each clip's delete button to remove it from the saved library. Uninstalling the extension removes its local saved data. Audio already sent to participants cannot be recalled by deleting the local clip.

## Other data

The extension has no analytics, advertising, remote code downloads, or developer backend. It does not collect browsing history, account details, chat messages, or participant lists. It runs only on Meet pages.

Data is used only to provide the soundboard. It is not sold or used for advertising. Its use follows the Chrome Web Store User Data Policy, including the Limited Use requirements.

Questions can be raised through the [repository issue tracker](https://github.com/nschechter/meet-soundboard/issues). Do not attach private recordings or personal data to public issues.
