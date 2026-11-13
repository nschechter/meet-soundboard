(() => {
  const platforms = {
    meet: {
      id: "meet", name: "Meet", company: "Google", experimental: false,
      audioHelp: "If effects get cut off, turn off Studio sound or noise cancellation in Meet.",
      settingsHelp: "If effects get filtered out, try turning off noise cancellation or Studio sound in Meet → Settings → Audio. Turn off Adaptive audio if Meet merges nearby computers.",
      waitingHelp: "Join a call with your microphone on. Reload Meet if this stays here."
    },
    teams: {
      id: "teams", name: "Teams", company: "Microsoft", experimental: true,
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
      waitingHelp: "Join a call using computer audio with your microphone on. This Teams integration is experimental."
    },
    zoom: {
      id: "zoom", name: "Zoom", company: "Zoom", experimental: true,
      audioHelp: "If effects get cut off, check noise suppression in Zoom audio settings.",
      settingsHelp: "Use Zoom in Chrome and join with computer audio. Some Zoom browser audio modes may not connect to this experimental soundboard.",
      waitingHelp: "Join with computer audio and unmute. Some Zoom audio modes may not connect yet. Preview still works."
    }
  };
  function forURL(value) {
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== "https:") return null;
    if (url.hostname === "meet.google.com") return platforms.meet;
    if (["teams.microsoft.com", "teams.cloud.microsoft", "teams.live.com"].includes(url.hostname)) return platforms.teams;
    if (["app.zoom.us", "app.zoom.com", "zoom.us", "zoom.com"].includes(url.hostname) && /^\/wc(?:\/|$)/.test(url.pathname)) return platforms.zoom;
    return null;
  }
  globalThis.MeetSoundboardPlatforms = { forURL, current: forURL(location.href) };
})();
