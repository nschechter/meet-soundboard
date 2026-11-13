# Browser meeting beta

Version 1.6.1 on `experimental/browser-meetings`. Not a store release.

## Current scope

- Google Meet keeps its existing audio integration.
- Teams browser pages and Zoom web meetings load the same soundboard, editor, and shared library.
- Each app gets its own labels, help text, and toolbar placement.
- Light and dark mode follow the system preference.
- Saved clip changes are queued by the extension so edits from different meeting sites cannot overwrite each other silently.

Only standard WebRTC outgoing audio is handled. Zoom can use other audio paths. Those paths are not supported by this prototype. Microphone access alone does not count as connected. The board stays waiting and offers local previews when it cannot find an active outgoing route.

The desktop and mobile apps are not supported. Embedded meeting frames are not supported. No audio settings are changed automatically.

Teams playback also checks the microphone button's state. Muting stops the current effect. Unmuting allows the next effect without replaying the interrupted clip. If the button is missing, disabled, duplicated, or has an unknown state, the soundboard pauses outgoing audio and keeps local previews available. Teams can change these controls, so this remains experimental.

## Install for a live test

1. Disable the existing Meet Soundboard so two mixers do not run together.
2. Load this build's `extension` folder through Chrome's Load unpacked button.
3. Reload an empty meeting tab after installing. Join using the browser and computer audio.
4. Open the soundboard and turn it on. Leave the meeting microphone on.
5. Join from another device with headphones and its mic muted.

A second browser session on the same computer can also receive the audio. Use a private window without the extension, keep its mic and camera off, and disable both Include my voice and Hear effects too in the sending soundboard. Any sound heard then must arrive through the receiving meeting session. Use headphones before testing voice on the same computer to avoid feedback.

Check voice and effects together, effects only, mute and unmute, local preview, microphone switching, and turning the soundboard off. Verify that muted means silence and that previews do not reach the other participant. Test noise suppression if effects are filtered. Do not enable settings automatically.

Use the same checks for Teams personal and work accounts. Tenant policies and meeting audio settings can differ.

## Verification limits

Automated tests use local pages served at meeting origins and real WebRTC peers in an isolated Chromium instance. They do not prove that the current Teams or Zoom production clients use the same audio path. Live tests with a separate receiving session are required before advertising either integration as supported.

On November 13, 2026, a live Teams personal call exposed a mute bug in 1.6.0: the listener heard applause while Teams was muted. Version 1.6.1 adds the microphone-button check for that failure. In the live retest, a private browser session on the same computer received the unmuted ding, stayed silent when applause was clicked while muted, and received a new ding after unmuting without either session rejoining. The user confirmed all three listening results. Voice and local playback were off on the sending soundboard.

Voice and effects together, Teams work accounts, microphone switching, and live Zoom calls still need live testing. Automated checks also cover muting during an active effect, unknown microphone states, private previews, and restoring the original microphone. Those cases have not all been checked in a live Teams call.

The submitted 1.5.15 ZIP and the installed Meet-only build are separate from this experiment.
