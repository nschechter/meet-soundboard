(() => {
  const platforms = {
    meet: {
      id: "meet", name: "Meet", company: "Google",
      audioHelp: "If effects get cut off, turn off Studio sound or noise cancellation in Meet.",
      settingsHelp: "If effects get filtered out, try turning off noise cancellation or Studio sound in Meet → Settings → Audio. Turn off Adaptive audio if Meet merges nearby computers.",
      waitingHelp: "Join a call with your microphone on. Reload Meet if this stays here."
    },
    teams: {
      id: "teams", name: "Teams", company: "Microsoft",
      microphoneState() {
        const buttons = document.querySelectorAll('button[data-inp="microphone-button"]');
        if (buttons.length !== 1) return "unknown";
        const button = buttons[0];
        if (button.disabled || button.getAttribute("aria-disabled") === "true") return "unknown";
        if (button.dataset.state === "mic-off") return "muted";
        return button.dataset.state === "mic-volume-renderer" ? "unmuted" : "unknown";
      },
      audioHelp: "If effects get cut off, try turning off noise suppression in Teams.",
      settingsHelp: "If effects get filtered out, try turning off noise suppression in Teams audio settings.",
      waitingHelp: "Join a call using computer audio with your microphone on."
    }
  };
  function forURL(value) {
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== "https:") return null;
    if (url.hostname === "meet.google.com") return platforms.meet;
    if (["teams.microsoft.com", "teams.cloud.microsoft", "teams.live.com"].includes(url.hostname)) return platforms.teams;
    return null;
  }
  globalThis.MeetSoundboardPlatforms = { forURL, current: forURL(location.href) };
})();
