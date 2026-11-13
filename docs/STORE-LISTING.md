# Chrome Web Store listing

Version 1.5.15 is saved as an unpublished draft in the dashboard. The package, description, three screenshots, promotional images, and reviewer notes are saved. It has not been submitted. Studio sound automation is excluded. The publisher has chosen to retain the nine requested recordings with redistribution rights still unverified.

## Product details

Name: Meet Soundboard

Short description: A soundboard inside Google Meet. Play classic reaction sounds or your own clips into your meeting audio.

Language: English

Suggested category: Communication, if available in the current dashboard. Otherwise use the closest category for meeting tools.

Suggested distribution: Free, public. Leave automatic publication after review off so the approved listing can be checked before launch.

## Description

Play sound effects into your Google Meet calls with a soundboard beside the meeting controls. No screen sharing or extra audio driver is needed.

Choose from 15 built-in sounds: Air horn, Applause, Ba dum tss, Correct!, BOOOOO!, Luigi Yahoo!, Tomato splat, I'll be back, Punch, Laugh track, Cha-ching!, Quack, Crickets, Sad trombone, and Dramatic boom.

- Click a sound card to play it to the meeting.
- Preview a clip before playing it to everyone.
- Include your voice or switch to effects only.
- Adjust effect volume and stop playback with one button.
- Hear effects on your own device too, or turn local playback off.
- Drag an audio file onto the board or choose one from your computer.
- Import up to 2 minutes and 10 MB. Trim to 30 seconds, adjust volume up to 300%, and preview the selection before saving.
- Keep up to 12 custom clips, with an 8 MB total library limit. Saved clips stay under 2 MB each.
- Use keys 1 through 9 while the soundboard has focus. Escape stops playback.

Keep your Meet microphone on to send effects. Muting in Meet silences both your voice and the effects from this computer. If Meet filters out effects, turn off noise cancellation or Studio sound in Meet's audio settings. If Meet merges nearby computers, turn off Adaptive audio. The extension does not change those settings for you. Use headphones for previews and local playback.

If Meet pauses outgoing audio, the board shows that playback is local only. A preview already playing stays local when the connection resumes. Tap a sound again to send it to the call.

Custom clips and preferences stay in Chrome's local extension storage. Imports and editor previews stay inside the extension. Previewing a saved card or playing it passes that clip's audio into the Meet page. Playing to the meeting sends it to participants through Meet. The extension does not record calls, run analytics, or send your audio to the developer.

Works on the Google Meet website in desktop Chrome. Gmail's embedded Meet and mobile apps are not supported. Changes to Meet may affect compatibility. Only add clips you have permission to use.

Meet Soundboard is an independent project. It is not made or endorsed by Google.

## Links

- Homepage: https://github.com/nschechter/meet-soundboard
- Support: https://github.com/nschechter/meet-soundboard/issues
- Privacy policy: https://github.com/nschechter/meet-soundboard/blob/main/docs/PRIVACY.md
- Private security reports: https://github.com/nschechter/meet-soundboard/security/advisories/new

The privacy policy is already published in the public repository. These links do not require GitHub Pages. Leave the optional verified official URL empty unless ownership has been verified in Google's dashboard.

## Privacy practices

### Single purpose

Let users play built-in or locally saved sound effects into their own outgoing Google Meet audio, with controls for preview, volume, voice inclusion, and stopping playback.

### Storage permission

Save the user's imported audio clips and playback preferences in Chrome's local extension storage. The library is limited to 12 clips and 8 MB. Chrome sync storage is not used.

### Meet site access

Run only on https://meet.google.com/* to show the soundboard and mix effects with Meet's existing outgoing microphone track. The mixer runs in the page's MAIN world because it needs access to WebRTC audio senders. The panel and saved-clip validation run in Chrome's isolated extension world. The extension does not read chat messages or participant lists and does not run on other sites.

### Remote code

Select: No, I am not using remote code.

All executable code and built-in sounds are bundled with the extension. Custom uploads are decoded as audio, not executed. There are no remote scripts or developer servers.

### User data

Use the following disclosure mapping when the dashboard asks which types of data the extension handles. Verify the current field labels before saving.

| Category | Disclose | Reason |
| --- | --- | --- |
| Personal communications | Yes | The extension processes the user's outgoing microphone audio locally while enabled. Meet sends the mixed audio to the call. It is not recorded or sent to the developer. |
| Website content | Yes | The extension handles imported audio files, clip names, and audio shared with the Meet page. Saved clips stay local until the user previews or plays them. |
| Personally identifiable information | No separate collection | The extension does not request or collect names, account details, addresses, or identifiers. Users may choose clips containing personal information. Those clips are covered by the audio disclosures above. |
| Health, financial, payment, or authentication information | No | The extension does not request or collect these categories. |
| Location or browsing history | No | The extension does not collect location or browsing history. |
| User activity | No tracking | There are no analytics, click logs, keystroke logs, or behavior tracking. Keyboard shortcuts are handled locally while the panel has focus. |

Do not describe this extension as handling no user data. Google's [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) requires disclosure even for local processing and storage. The category mapping above is based on this extension's behavior. It is not a decision issued by Google.

The code supports the required limited-use certifications: data is not sold, not used or transferred for unrelated purposes, and not used for lending or credit decisions. Review the exact certification text in the dashboard before accepting it.

## Store assets

Upload the files from [store/assets](../store/assets) in this order:

1. `store-icon-128.png`: store icon, 128 by 128.
2. `01-classic-reactions.png`: first screenshot, 1280 by 800.
3. `02-your-own-sounds.png`: second screenshot, 1280 by 800.
4. `03-trim-and-preview.png`: editor screenshot, 1280 by 800.
5. `promo-small-440x280.png`: optional small promotional tile.
6. `promo-marquee-1400x560.png`: optional marquee promotional tile.

The screenshots show the actual extension loaded from the unpacked release ZIP on a local demo page. The background meeting is a demonstration, not a real call. The custom chime is an original generated sound. Built-in clip names match the release. No private recordings or real participants appear.

Google lists these dimensions in its [listing instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-listing). Recreate the assets with `node scripts/store-assets.mjs /absolute/path/to/unpacked-store-zip`.

## Saved draft

Version 1.5.15 is saved under Ponerian as item `fponfnfbnfidambdifaclnfedhbbgcdh`. The publisher registration, trader verification, contact email verification, and two-step verification are complete. The package, listing, images, privacy disclosures, and reviewer notes are saved. The draft uses Communication, English, free of charge, public visibility, and all regions.

The local 1.5.15 release includes the editor and the nine requested replacement recordings. It fixes excluded voice during new-track setup and cleanup of retired audio tracks. The package and listing materials now match the saved 1.5.15 dashboard draft. The privacy policy and testing notes in this release match the saved draft. Recording rights remain unverified, as documented in SOUND-CREDITS.txt.

Google's reviewer field allows 500 characters. Paste [the short reviewer notes](STORE-REVIEWER-SUMMARY.txt) into that field. The [full reviewer instructions](STORE-REVIEWER-INSTRUCTIONS.txt) remain available as a reference.

## Before submission

- The tester reported that the basic two-device check worked with the exact 1.5.15 ZIP. The individual checks still unconfirmed are listed in [TESTING.md](TESTING.md).
- Confirm the hosted privacy policy and testing notes match this release. The store package, text, images, and reviewer notes are already saved.
- Review and approve the saved draft before selecting Submit for review.
- Choose deferred publication during submission so approval does not automatically make the extension public. This choice has not been set yet.

See Google's [submission instructions](https://developer.chrome.com/docs/webstore/publish) for the final review and deferred publication steps.
