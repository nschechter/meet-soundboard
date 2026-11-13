importScripts("platforms.js", "library.js");
let libraryQueue = Promise.resolve();

async function changeLibrary(message) {
  const { savedSounds } = MeetSoundboardLibrary;
  const stored = await chrome.storage.local.get("sounds");
  const sounds = savedSounds(stored.sounds);
  let next;
  if (message.action === "delete") {
    if (typeof message.id !== "string" || !message.id.length || message.id.length > 80) throw new Error("Invalid sound.");
    next = sounds.filter((sound) => sound.id !== message.id);
  } else if (message.action === "save") {
    const id = message.existing?.id || crypto.randomUUID();
    const [clip] = savedSounds([{ ...message.clip, id }]);
    if (!clip) throw new Error("This clip could not be saved. Add the original file again.");
    if (message.existing) {
      const saved = sounds.find((sound) => sound.id === id);
      if (!saved) throw new Error("This sound was deleted in another tab. Cancel and add it again.");
      if (saved.data !== message.existing.data || saved.name !== message.existing.name) throw new Error("This sound changed in another tab. Cancel and reopen it to edit the latest version.");
      next = sounds.map((sound) => sound.id === id ? clip : sound);
    } else next = [...sounds, clip];
  } else throw new Error("Unknown library change.");
  if (next.length > 12) throw new Error("Your board holds 12 custom sounds. Delete one to add another.");
  if (JSON.stringify(next).length > 8 * 1024 * 1024) throw new Error("Your sound library is full. Delete a clip to make room.");
  await chrome.storage.local.set({ sounds: next });
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== "change-library" || sender.id !== chrome.runtime.id || sender.frameId !== 0 || !sender.tab || !MeetSoundboardPlatforms.forURL(sender.url)) return;
  const change = libraryQueue.then(() => changeLibrary(message));
  libraryQueue = change.catch(() => {});
  change.then(() => respond({ ok: true }), (error) => respond({ ok: false, error: error.message || "Could not save your sound library. Try again." }));
  return true;
});
