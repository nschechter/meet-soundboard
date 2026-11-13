globalThis.MeetSoundboardLibrary = {
  savedSounds(value) {
    if (!Array.isArray(value)) return [];
    const ids = new Set();
    return value.slice(0, 12).filter((sound) => {
      if (!sound || typeof sound.id !== "string" || !sound.id.length || sound.id.length > 80 || ids.has(sound.id)) return false;
      if (typeof sound.name !== "string" || !sound.name.length || sound.name.length > 60) return false;
      if (!Number.isFinite(sound.duration) || sound.duration <= 0 || sound.duration > 30) return false;
      if (typeof sound.data !== "string" || !sound.data.length || sound.data.length > 2796204 || sound.data.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(sound.data)) return false;
      ids.add(sound.id);
      return true;
    }).map(({ id, name, duration, data }) => ({ id, name, duration, data }));
  }
};
