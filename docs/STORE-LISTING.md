# Chrome Web Store publishing

The publisher reported submitting Meet Soundboard 1.5.15 under Ponerian. Approval and public availability have not been confirmed. The store item ID is `fponfnfbnfidambdifaclnfedhbbgcdh`.

Teams and experimental Zoom support are on the separate [browser meeting beta branch](https://github.com/nschechter/meeting-soundboard/tree/experimental/browser-meetings). The saved store copy describes the submitted Meet-only release.

## Listing and reviewer copy

[dashboard-fields.json](../store/dashboard-fields.json) holds the listing name, descriptions, category, links, privacy answers, and short reviewer instructions. Keep these values in one place. The file is a local reference, not a live record of the dashboard or review status. Publication timing has not been confirmed.

Use its `reviewerInstructions` text for the dashboard's reviewer field. The full setup and checks are in [Testing](TESTING.md#live-test-setup). No extension login or paid account is required beyond access to the meeting service.

For a beta release, update the saved name, descriptions, site-access explanation, privacy policy, and screenshots to match the packaged services. Do not reuse the Meet-only disclosures unchanged.

## Privacy answers

The saved Meet-only answers describe one purpose: playing effects into the user's outgoing Meet audio. The extension uses `storage` for local clips and preferences, accesses `meet.google.com`, and bundles its code without remote scripts.

| Data category | Saved disclosure |
| --- | --- |
| Personal communications | Yes. Microphone audio is processed locally and sent through the meeting service, without recording or sending it to the developer. |
| Website content | Yes. Imported clips and names are stored locally. Saved-card previews and playback pass audio bytes into the meeting page. Imports and editor previews stay inside the extension. |
| Personally identifiable information | No separate collection. Users may choose clips containing personal information. |
| Health, financial, payment, or authentication information | No collection. |
| Location or browsing history | No collection. |
| User activity | No tracking or analytics. Keyboard shortcuts work locally while the panel has focus. |

These answers reflect the extension's behavior. Check the current dashboard fields and [Google's User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) when preparing an update. Local processing should still be disclosed. Data is not sold or used for unrelated purposes, lending, or credit decisions.

Keep the [hosted privacy policy](https://github.com/nschechter/meeting-soundboard/blob/main/docs/PRIVACY.md) aligned with the submitted build. This branch's [privacy policy](PRIVACY.md) describes the Meet-only release. The bundled `extension/privacy.html` provides the same policy offline.

## Store images

The submitted Meet-only artwork is in [store/assets](../store/assets):

| File | Size |
| --- | --- |
| `store-icon-128.png` | 128 × 128 |
| `01-classic-reactions.png` | 1280 × 800 |
| `02-your-own-sounds.png` | 1280 × 800 |
| `03-trim-and-preview.png` | 1280 × 800 |
| `promo-small-440x280.png` | 440 × 280 |
| `promo-marquee-1400x560.png` | 1400 × 560 |

The images show the actual extension on a demo meeting background, with no real participants or private recordings. Recreate them from the exact unpacked release ZIP:

```sh
node scripts/store-assets.mjs /absolute/path/to/unpacked-store-zip
```

Check Google's [listing instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) for current image requirements.

## Preparing an update

1. Run the automated tests and create a candidate ZIP. Complete the [live checklist](TESTING.md#live-checklist) for each advertised service and record the ZIP checksum.
2. Review [sound credits](../extension/SOUND-CREDITS.txt). Code uses MIT, while audio has separate terms. Nine bundled recordings still have unverified redistribution rights. The publisher chose to retain them, which does not establish permission to distribute them. Packaging requires `--allow-unverified-audio` to include them in a release ZIP.
3. Match the listing copy, privacy answers, hosted policy, reviewer notes, and images to the exact package being uploaded. Confirm support and privacy links work.
4. Review the dashboard, choose publication timing, and submit. Confirm the resulting status before describing the update as submitted or published.

See Google's [submission instructions](https://developer.chrome.com/docs/webstore/publish) for the current dashboard flow. Historical findings are in the [archived release review](archive/RELEASE-REVIEW-1.5.md).
