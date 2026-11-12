(() => {
  "use strict";
  if (document.getElementById("meet-soundboard-root")) return;
  const channel = "meet-soundboard-v1";
  const allSounds = MeetSoundboardSounds.sounds;
  const builtins = allSounds.filter((sound) => sound.library !== "quotes");
  const tabs = ["effects", "custom"];
  const host = document.createElement("div");
  host.id = "meet-soundboard-root";
  host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483646;";
  document.documentElement.append(host);
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = MeetSoundboardStyle;
  root.append(style);
  const wave = '<span class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
  const shell = document.createElement("div");
  shell.innerHTML = `
    <button class="launcher" style="pointer-events:auto" aria-label="Soundboard" title="Soundboard" aria-expanded="false" aria-controls="soundboard-panel">${wave} <span class="launcher-label">Soundboard</span></button>
    <section class="panel" id="soundboard-panel" style="pointer-events:auto" role="region" aria-label="Meet Soundboard" hidden>
      <header><div class="brand">${wave} Soundboard <span class="meet-badge">FOR MEET</span></div><button class="icon-button close" aria-label="Close soundboard">×</button></header>
      <div class="intro"><p class="eyebrow">SET THE MOOD</p>
        <h1>Make some noise.</h1>
        <p class="subtitle">The right sound, right on cue.</p></div>
        <div class="connection" data-state="off"><div class="status-row"><span class="dot"></span><span class="status-title" role="status">Soundboard is off</span><button class="power">Turn on</button></div><p class="status-help">Turn on to mix sounds with your Meet microphone and send them to the call.</p></div>
      <div class="scroll">
        <div class="notice" role="alert" hidden></div>
        <div class="tabs" role="tablist" aria-label="Sound library"><button class="tab" id="effects-tab" role="tab" aria-selected="true" aria-controls="effects-panel" data-tab="effects">Sound effects <span class="count">${builtins.length}</span></button><button class="tab" id="custom-tab" role="tab" aria-selected="false" aria-controls="custom-panel" tabindex="-1" data-tab="custom">My sounds <span class="count custom-count">0</span></button></div>
        <div id="effects-panel" role="tabpanel" aria-labelledby="effects-tab"><div class="grid builtin-grid"></div><p class="library-note"><span>${builtins.length} classic reactions. Perfect timing.</span><span>▷ = preview</span></p></div>
        <div id="custom-panel" role="tabpanel" aria-labelledby="custom-tab" hidden><div class="grid custom-grid"></div><div class="empty"><b>Your own kind of funny.</b>Add a clip and make it yours.</div><button class="upload">＋ Add a sound</button><input class="file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm" hidden><p class="privacy-note">Previewing or playing a clip shares it with this Meet page. Playing to the meeting sends it to participants. Only add clips you have permission to use.</p><p class="library-note">Up to 30 seconds and 2 MB per clip. Saved on this device.</p></div>
        <details><summary>A few things to know</summary><p>Audio is mixed in this Meet page. Nothing is recorded or sent to the developer. This is an independent extension, not made by Google.</p><p>Keep your Meet mic on to send effects. To play only effects, uncheck “Include my voice.”</p><p>If effects get filtered out, try turning off noise cancellation or Studio sound in Meet → Settings → Audio. Use headphones for previews and local playback.</p><p>While this panel is focused: <kbd>1</kbd>–<kbd>9</kbd> play the first nine sounds in the Sound effects tab. <kbd>Esc</kbd> stops playback. The small ▷ buttons preview only for you.</p></details>
      </div>
      <div class="controls"><div class="volume-row"><label class="volume-label" for="effect-volume">Effect volume</label><input id="effect-volume" type="range" min="0" max="100" value="65"><output for="effect-volume">65%</output></div><div class="settings-row"><label class="setting" for="include-voice" title="Only changes your voice while the soundboard is on"><input id="include-voice" type="checkbox" checked>Include my voice</label><label class="setting" for="hear-effects" title="Use headphones so your microphone does not pick up the effect twice"><input id="hear-effects" type="checkbox">Hear effects too</label></div></div>
      <footer><span class="now-playing" role="status">Ready for your next cue</span><button class="stop">■ Stop all</button></footer>
    </section>`;
  root.append(shell);
  const $ = (selector) => root.querySelector(selector);

  function positionLauncher() {
    const buttons = [...document.querySelectorAll('button, [role="button"]')]
      .map((element) => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width >= 32 && box.width <= 96 && box.height >= 32 && box.height <= 72
        && box.top >= innerHeight - 112 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth);
    const anchor = buttons.find(({ element, box }) => box.left > innerWidth / 2
      && (/chat|activities|meeting tools|call tools/i.test(element.getAttribute("aria-label") || "")
        || /^(chat|chat_bubble|chat_bubble_outline|apps|interests)$/.test(element.textContent.trim())));
    let right = 24;
    let bottom = buttons.length ? 96 : 24;
    if (anchor) {
      const center = anchor.box.top + anchor.box.height / 2;
      const row = buttons.filter(({ box }) => Math.abs(box.top + box.height / 2 - center) < 12).sort((a, b) => a.box.left - b.box.left);
      let first = row.indexOf(anchor);
      while (first > 0 && row[first].box.left - row[first - 1].box.right < 64) first--;
      const left = row[first].box.left - 64;
      if (left >= 12) {
        right = innerWidth - left - 48;
        bottom = Math.max(12, innerHeight - center - 24);
      } else bottom = innerHeight - anchor.box.top + 16;
    }
    host.style.setProperty("--launcher-right", `${right}px`);
    host.style.setProperty("--launcher-bottom", `${Math.min(bottom, Math.max(12, innerHeight - 60))}px`);
  }

  positionLauncher();
  window.addEventListener("resize", positionLauncher);
  setInterval(positionLauncher, 1000);

  let current = { enabled: false, state: "off" };
  let custom = [];
  let prefs = { volume: 0.65, hearEffects: false, includeVoice: true };
  let saveTimer;
  let noticeTimer;
  let currentTab = "effects";

  function savedSounds(value) {
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

  function changeSounds(change) {
    return navigator.locks.request("meet-soundboard-library", async () => {
      const stored = await chrome.storage.local.get("sounds");
      const next = change(savedSounds(stored.sounds));
      if (next.length > 12) throw new Error("Your board holds 12 custom sounds. Delete one to add another.");
      if (JSON.stringify(next).length > 8 * 1024 * 1024) throw new Error("Your sound library is full. Delete a clip to make room.");
      await chrome.storage.local.set({ sounds: next });
      custom = next;
      renderCustom();
    });
  }

  function send(type, payload = {}) {
    window.postMessage({ channel, from: "panel", type, ...payload }, location.origin);
  }

  function notice(message) {
    clearTimeout(noticeTimer);
    $(".notice").textContent = message;
    $(".notice").hidden = false;
    $(".scroll").scrollTop = 0;
    noticeTimer = setTimeout(() => { $(".notice").hidden = true; }, 9000);
  }

  function setOpen(open) {
    $(".panel").hidden = !open;
    $(".launcher").hidden = open;
    $(".launcher").setAttribute("aria-expanded", String(open));
    if (open) { send("status"); $(".close").focus(); }
    else $(".launcher").focus();
  }

  function setTab(tab) {
    currentTab = tab;
    for (const button of root.querySelectorAll(".tab")) {
      const selected = button.dataset.tab === tab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const name of tabs) $(`#${name}-panel`).hidden = tab !== name;
    $(".scroll").scrollTop = 0;
  }

  function decode(base64) {
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)).buffer;
  }

  function play(sound, preview = false) {
    if (!preview && current.state !== "ready") {
      if (current.state === "paused") { notice("Meet has paused outgoing audio. Unmute, or leave and rejoin the call."); return; }
      notice(current.enabled ? "Join the call and unmute in Meet before playing to everyone." : "Click Turn on first, or use ▷ to preview a sound.");
      return;
    }
    try {
      send("play", sound.data ? { id: sound.id, bytes: decode(sound.data), preview } : { id: sound.id, builtin: sound.id, preview });
    } catch { notice("This saved clip could not be read. Delete it and add the original file again."); }
  }

  function makeCard(sound, index, isCustom) {
    const card = document.createElement("div");
    card.className = `sound ${sound.color || "purple"}`;
    card.dataset.id = sound.id;
    const button = document.createElement("button");
    button.className = "trigger";
    button.setAttribute("aria-label", `Play ${sound.name} to meeting`);
    const icon = document.createElement("span");
    icon.className = "sound-icon";
    icon.textContent = sound.icon || "♫";
    icon.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "sound-name";
    name.textContent = sound.name;
    if (isCustom) button.title = sound.name;
    const meta = document.createElement("span");
    meta.className = "sound-meta";
    meta.textContent = `${isCustom ? "Your sound" : sound.category} · ${sound.duration.toFixed(1)}s`;
    if (sound.work) meta.title = sound.work;
    button.append(icon, name, meta);
    button.addEventListener("click", (event) => { if (event.isTrusted) play(sound); });
    const preview = document.createElement("button");
    preview.className = "preview";
    preview.textContent = "▷";
    preview.title = "Preview only for me";
    preview.setAttribute("aria-label", `Preview ${sound.name} only for me`);
    preview.addEventListener("click", (event) => { if (event.isTrusted) play(sound, true); });
    card.append(button, preview);
    if (isCustom) {
      const remove = document.createElement("button");
      remove.className = "remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Delete ${sound.name}`);
      remove.addEventListener("click", async (event) => {
        if (!event.isTrusted) return;
        try {
          await changeSounds((sounds) => sounds.filter((entry) => entry.id !== sound.id));
          if (current.playing === sound.id) send("stop");
        } catch { notice("Could not delete that sound. Please try again."); }
      });
      card.append(remove);
    } else {
      button.title = index < 9 ? `Play to meeting (key ${index + 1} while panel is focused)` : "Play to meeting";
    }
    return card;
  }

  function renderCustom() {
    $(".custom-grid").replaceChildren(...custom.map((sound, index) => makeCard(sound, index, true)));
    $(".custom-count").textContent = String(custom.length);
    $(".empty").hidden = custom.length > 0;
  }

  function update(status) {
    const states = {
      off: ["Soundboard is off", "Turn on to mix sounds with your Meet microphone and send them to the call."],
      waiting: ["Waiting for meeting audio", "Join a call with your microphone on. Reload Meet if this stays here."],
      ready: ["Connected to meeting audio", "If effects get cut off, turn off Studio sound or noise cancellation in Meet."],
      muted: ["Your Meet mic is muted", "Unmute in Meet to send effects to the call."],
      paused: ["Meet audio is paused", "Unmute in Meet. If this stays paused, leave and rejoin the call."],
      suspended: ["Audio needs a click", "Click Resume to allow sound playback."]
    };
    if (typeof status.state !== "string" || !Object.hasOwn(states, status.state) || typeof status.enabled !== "boolean" || typeof status.includeVoice !== "boolean") return;
    if (status.playing !== null && (typeof status.playing !== "string" || status.playing.length > 80)) return;
    status.error = typeof status.error === "string" ? status.error.slice(0, 300) : "";
    current = status;
    const [title, help] = states[status.state] || states.off;
    $(".connection").dataset.state = status.state;
    $(".status-title").textContent = title;
    $(".status-help").textContent = status.error || (status.state === "ready" && !status.includeVoice ? `Effects only. ${help}` : help);
    $(".launcher-label").textContent = status.enabled && !status.includeVoice ? "Soundboard · Effects only" : "Soundboard";
    $(".launcher").setAttribute("aria-label", $(".launcher-label").textContent);
    $(".launcher").title = $(".launcher-label").textContent;
    $(".power").textContent = status.state === "suspended" ? "Resume" : status.enabled ? "Turn off" : "Turn on";
    $(".power").title = status.enabled && !status.includeVoice ? "Turning off restores your voice to Meet's microphone." : "";
    for (const card of root.querySelectorAll(".sound")) {
      card.classList.toggle("playing", card.dataset.id === status.playing && !status.preview);
      card.classList.toggle("previewing", card.dataset.id === status.playing && status.preview);
    }
    const sound = [...allSounds, ...custom].find((entry) => entry.id === status.playing);
    $(".now-playing").textContent = sound ? `${status.preview ? "Preview" : "To meeting"}: ${sound.name}` : "Ready for your next cue";
    $(".now-playing").classList.toggle("active", !!sound);
    $(".now-playing").classList.toggle("previewing", !!sound && status.preview);
  }

  $(".builtin-grid").append(...builtins.map((sound, index) => makeCard(sound, index, false)));
  const addCard = document.createElement("button");
  addCard.className = "add-card";
  addCard.innerHTML = '<span aria-hidden="true">＋</span>Add your own';
  addCard.addEventListener("click", () => { setTab("custom"); $(".file").click(); });
  $(".builtin-grid").append(addCard);
  $(".launcher").addEventListener("click", () => setOpen(true));
  $(".close").addEventListener("click", () => setOpen(false));
  $(".power").addEventListener("click", () => send(!current.enabled || current.state === "suspended" ? "activate" : "deactivate"));
  $(".stop").addEventListener("click", () => send("stop"));
  for (const button of root.querySelectorAll(".tab")) {
    button.addEventListener("click", () => setTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let index = tabs.indexOf(currentTab);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = tabs.length - 1;
      else index = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      setTab(tabs[index]);
      $(`[data-tab="${currentTab}"]`).focus();
    });
  }
  root.addEventListener("keydown", (event) => {
    if (!event.isTrusted) return;
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); send("stop"); return; }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.matches("input, textarea")) return;
    if (/^[1-9]$/.test(event.key) && !$(".panel").hidden && currentTab !== "custom") {
      event.preventDefault();
      const sound = builtins[Number(event.key) - 1];
      if (sound) play(sound);
    }
  });
  root.addEventListener("keyup", (event) => event.stopPropagation());

  function configure() {
    prefs = { volume: Number($("#effect-volume").value) / 100, hearEffects: $("#hear-effects").checked, includeVoice: $("#include-voice").checked };
    $("output").value = `${Math.round(prefs.volume * 100)}%`;
    send("configure", prefs);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => chrome.storage.local.set({ prefs }).catch(() => notice("Could not save settings. Reload the Meet tab.")), 200);
  }
  $("#effect-volume").addEventListener("input", configure);
  $("#hear-effects").addEventListener("change", configure);
  $("#include-voice").addEventListener("change", configure);
  $(".upload").addEventListener("click", () => $(".file").click());

  async function validate(bytes) {
    const context = new OfflineAudioContext(1, 1, 44100);
    let buffer;
    try {
      buffer = await context.decodeAudioData(bytes.slice(0));
    } catch {
      throw new Error("Chrome could not read this audio. Try an MP3 or WAV file.");
    }
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 30) throw new Error("Choose a clip that is 30 seconds or shorter.");
    return buffer.duration;
  }

  $(".file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    $(".upload").disabled = true;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Choose an audio file smaller than 2 MB.");
      if (custom.length >= 12) throw new Error("Your board holds 12 custom sounds. Delete one to add another.");
      const bytes = await file.arrayBuffer();
      const duration = await validate(bytes);
      let binary = "";
      const data = new Uint8Array(bytes);
      for (let offset = 0; offset < data.length; offset += 8192) binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
      const sound = { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "My sound", duration, data: btoa(binary) };
      await changeSounds((sounds) => [...sounds, sound]);
      notice(`Added ${sound.name}. Use ▷ to preview it.`);
    } catch (error) {
      notice(error.message || "This file could not be added. Try MP3 or WAV.");
    } finally { $(".upload").disabled = false; }
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.channel !== channel || message.from !== "engine") return;
    if (message.type === "status") update(message);
    if (message.type === "error" && typeof message.message === "string") notice(message.message.slice(0, 300));

  });

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id === chrome.runtime.id && message?.type === "toggle-soundboard") { setOpen($(".panel").hidden); respond({ ok: true }); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.sounds) return;
    custom = savedSounds(changes.sounds.newValue);
    if (current.playing && ![...builtins, ...custom].some((sound) => sound.id === current.playing)) send("stop");
    renderCustom();
  });
  chrome.storage.local.get(["prefs", "sounds"]).then((stored) => {
    custom = savedSounds(stored.sounds);
    prefs = {
      volume: Number.isFinite(stored.prefs?.volume) ? Math.max(0, Math.min(1, stored.prefs.volume)) : 0.65,
      hearEffects: stored.prefs?.hearEffects === true,
      includeVoice: stored.prefs?.includeVoice !== false
    };
    $("#effect-volume").value = String(Math.round(prefs.volume * 100));
    $("output").value = `${Math.round(prefs.volume * 100)}%`;
    $("#hear-effects").checked = prefs.hearEffects;
    $("#include-voice").checked = prefs.includeVoice;
    renderCustom();
    send("configure", prefs);
    send("status");
  }).catch(() => notice("Could not load your saved sounds. Reload the Meet tab."));
})();
