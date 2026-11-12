globalThis.MeetSoundboardStudio = function (onManualChange) {
  let queue = Promise.resolve();
  let changed = false;
  let revision = 0;
  let busy = false;

  const visible = (element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  const name = (element) => (element.getAttribute("aria-label")
    || (element.getAttribute("aria-labelledby") || "").split(/\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ")
    || element.textContent).trim().replace(/\s+/g, " ");
  const isStudio = (element) => element?.matches('[role="switch"]') && ["Studio sound", "Noise cancellation"].includes(name(element));

  function find(selector, label) {
    const matches = [...document.querySelectorAll(selector)].filter((element) => visible(element) && label(name(element)));
    if (matches.length > 1) throw new Error("More than one Meet audio control was found. Change Studio sound manually.");
    return matches[0];
  }

  const studio = () => find('[role="switch"]', (label) => ["Studio sound", "Noise cancellation"].includes(label));
  const button = (label) => find('button, [role="button"]', (value) => value === label);
  const audioTab = () => find('[role="tab"]', (value) => value === "Audio");

  async function waitFor(read, description) {
    const deadline = performance.now() + 2000;
    do {
      const result = read();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 50));
    } while (performance.now() < deadline);
    throw new Error(description);
  }

  function state(control) {
    if (!control || control.matches(':disabled, [aria-disabled="true"]')) throw new Error("Meet's Studio sound switch is unavailable. Change it manually.");
    const value = control.getAttribute("aria-checked");
    if (!["true", "false"].includes(value)) throw new Error("Could not read Meet's Studio sound setting. Change it manually.");
    return value === "true";
  }

  function hasState(expected) {
    const control = studio();
    return control && state(control) === expected;
  }

  async function withControl(action) {
    let openedClose;
    let openedMenu;
    const focused = document.activeElement?.shadowRoot?.activeElement || document.activeElement;
    try {
      let control = studio();
      if (!control) {
        let tab = audioTab();
        if (!tab) {
          if ([...document.querySelectorAll('[role="dialog"], dialog[open]')].some(visible)) {
            throw new Error("Close the open Meet dialog before using automatic Studio sound.");
          }
          const audio = button("Audio settings");
          if (!audio) throw new Error("Could not find Meet's audio settings. Automatic Studio sound supports Meet in English.");
          if (audio.getAttribute("aria-expanded") !== "true") {
            openedMenu = audio;
            audio.click();
          }
          const settings = await waitFor(() => button("Settings"), "Could not open Meet's audio settings. Change Studio sound manually.");
          settings.click();
          openedClose = await waitFor(() => button("Close dialog"), "Meet's settings did not open. Change Studio sound manually.");
          tab = audioTab();
        }
        if (tab && tab.getAttribute("aria-selected") !== "true") {
          throw new Error("Open the Audio tab in Meet settings before using automatic Studio sound.");
        }
        control = await waitFor(studio, "Studio sound or noise cancellation is not available in this Meet call.");
      }
      return await action(control);
    } finally {
      if (openedClose?.isConnected && visible(openedClose)) {
        openedClose.click();
        if (focused?.isConnected) focused.focus({ preventScroll: true });
      }
      if (openedMenu?.isConnected && openedMenu.getAttribute("aria-expanded") === "true") openedMenu.click();
    }
  }

  function enqueue(action) {
    const task = queue.then(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      busy = true;
      try { return await action(); }
      finally { busy = false; }
    });
    queue = task.catch(() => {});
    return task;
  }

  document.addEventListener("click", (event) => {
    if (!event.isTrusted || !isStudio(event.target.closest?.('[role="switch"]'))) return;
    revision++;
    const interrupted = changed || busy;
    changed = false;
    if (interrupted) onManualChange();
  }, true);

  return {
    get needsRestore() { return changed; },
    prepare(isCurrent) {
      return enqueue(async () => {
        if (!isCurrent()) return;
        const started = revision;
        return withControl(async (control) => {
          if (!isCurrent()) return;
          if (revision !== started) throw new Error("Studio sound was changed manually. Playback was cancelled.");
          if (state(control)) {
            changed = true;
            control.click();
            await waitFor(() => revision !== started || hasState(false), "Meet did not turn Studio sound off. Playback was cancelled.");
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
          if (revision !== started) throw new Error("Studio sound was changed manually. Playback was cancelled.");
          if (state(studio())) throw new Error("Studio sound is still on. Playback was cancelled.");
        });
      });
    },
    restore() {
      return enqueue(async () => {
        if (!changed) return;
        const started = revision;
        await withControl(async (control) => {
          if (!changed || revision !== started) return;
          if (!state(control)) {
            control.click();
            await waitFor(() => revision !== started || hasState(true), "Meet did not restore Studio sound. Turn it back on in Meet's audio settings.");
          }
          changed = false;
        });
      });
    }
  };
};
