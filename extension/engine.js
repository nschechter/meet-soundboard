(() => {
  "use strict";
  if (globalThis.__meetSoundboardInstalled || !globalThis.RTCPeerConnection) return;
  globalThis.__meetSoundboardInstalled = true;
  const channel = "meet-soundboard-v1";
  const native = {
    addTrack: RTCPeerConnection.prototype.addTrack,
    addTransceiver: RTCPeerConnection.prototype.addTransceiver,
    removeTrack: RTCPeerConnection.prototype.removeTrack,
    close: RTCPeerConnection.prototype.close,
    setLocalDescription: RTCPeerConnection.prototype.setLocalDescription,
    setRemoteDescription: RTCPeerConnection.prototype.setRemoteDescription,
    replaceTrack: RTCRtpSender.prototype.replaceTrack,
    enabled: Object.getOwnPropertyDescriptor(MediaStreamTrack.prototype, "enabled"),
    stop: MediaStreamTrack.prototype.stop,
    clone: MediaStreamTrack.prototype.clone,
    getUserMedia: navigator.mediaDevices.getUserMedia,
    getDisplayMedia: navigator.mediaDevices.getDisplayMedia
  };
  const connections = new Set();
  const routes = new Map();
  const outputRoutes = new WeakMap();
  const excluded = new WeakSet();
  const microphones = new Set();
  const senderQueues = new WeakMap();
  const fallbackInputs = new WeakMap();
  const removedSenders = new WeakSet();
  const buffers = new Map();
  const pending = new Set();
  let context;
  let effects;
  let monitor;
  let enabled = false;
  let volume = 0.65;
  let hearEffects = false;
  let includeVoice = true;
  let microphoneObserved = false;
  let playing;
  let playbackRequestId;
  let playbackGeneration = 0;
  let lastError = "";
  let activationGeneration = 0;
  let decoding = false;

  function emit(type, payload = {}) {
    window.postMessage({ channel, from: "engine", type, ...payload }, location.origin);
  }

  function originalTrack(track) {
    return outputRoutes.get(track)?.input || track;
  }

  function eligible(track) {
    return track?.kind === "audio" && track.readyState === "live" && !excluded.has(track);
  }

  function microphoneMuted() {
    const live = [...microphones].filter((track) => track.readyState === "live");
    return microphoneObserved && (live.length === 0 || live.every((track) => !track.enabled || track.muted));
  }

  function syncRoute(route) {
    const audible = route.input.readyState === "live" && route.input.enabled && !route.input.muted && !microphoneMuted();
    native.enabled.set.call(route.output, audible);
    route.voice.gain.value = !enabled || includeVoice ? 1 : 0;
  }

  function syncAll() {
    for (const route of routes.values()) syncRoute(route);
  }

  function createContext() {
    if (context) return context;
    context = new AudioContext({ latencyHint: "interactive" });
    effects = context.createGain();
    effects.gain.value = volume;
    monitor = context.createGain();
    monitor.gain.value = hearEffects ? 1 : 0;
    effects.connect(monitor).connect(context.destination);
    context.addEventListener("statechange", () => {
      if (enabled) {
        if (context.state !== "running") stopPlayback();
        reconcile().then(() => publish());
      } else publish();
    });
    return context;
  }

  function routeFor(input) {
    if (routes.has(input)) return routes.get(input);
    const source = context.createMediaStreamSource(new MediaStream([input]));
    const voice = context.createGain();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    const destination = context.createMediaStreamDestination();
    destination.channelCount = 1;
    source.connect(voice).connect(limiter);
    effects.connect(limiter);
    limiter.connect(destination);
    const output = destination.stream.getAudioTracks()[0];
    const route = { input, source, voice, limiter, destination, output };
    routes.set(input, route);
    outputRoutes.set(output, route);
    route.onEnded = () => { dispose(route); publish(); };
    input.addEventListener("ended", route.onEnded, { once: true });
    input.addEventListener("mute", syncAll);
    input.addEventListener("unmute", syncAll);
    syncRoute(route);
    return route;
  }

  function dispose(route) {
    if (routes.get(route.input) !== route) return;
    route.source.disconnect();
    route.voice.disconnect();
    route.limiter.disconnect();
    effects.disconnect(route.limiter);
    native.stop.call(route.output);
    route.input.removeEventListener("ended", route.onEnded);
    route.input.removeEventListener("mute", syncAll);
    route.input.removeEventListener("unmute", syncAll);
    routes.delete(route.input);
  }

  function allSenders() {
    return [...connections].filter((pc) => pc.signalingState !== "closed").flatMap((pc) => pc.getSenders());
  }

  function prune() {
    if (pending.size) return;
    const used = new Set(allSenders().map((sender) => sender.track));
    for (const route of routes.values()) {
      if (!used.has(route.output)) dispose(route);
    }
  }

  function enqueue(sender, action) {
    const previous = senderQueues.get(sender) || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (removedSenders.has(sender)) return;
      await action();
      if (removedSenders.has(sender)) {
        fallbackInputs.delete(sender);
        await native.replaceTrack.call(sender, null);
      }
    });
    senderQueues.set(sender, next);
    pending.add(next);
    const finish = () => { pending.delete(next); prune(); publish(); };
    next.then(finish, finish);
    return next;
  }

  async function replace(sender, input) {
    fallbackInputs.delete(sender);
    if (!enabled || !eligible(input) || (context?.state !== "running" && includeVoice)) {
      return native.replaceTrack.call(sender, input);
    }
    try {
      const output = routeFor(input).output;
      if (sender.track !== output) await native.replaceTrack.call(sender, output);
      lastError = "";
    } catch {
      if (removedSenders.has(sender)) return native.replaceTrack.call(sender, null);
      if (!includeVoice) fallbackInputs.set(sender, input);
      await native.replaceTrack.call(sender, includeVoice ? input : null);
      lastError = includeVoice
        ? "Could not connect the soundboard. Your original microphone is still connected."
        : "Could not connect the soundboard. Audio is paused. Turn off to restore your microphone.";
    }
  }

  function reconcile() {
    return Promise.allSettled(allSenders().map((sender) => enqueue(sender, async () => {
      const input = fallbackInputs.get(sender) || originalTrack(sender.track);
      if (input?.kind === "audio") await replace(sender, input);
    })));
  }

  for (const method of ["setLocalDescription", "setRemoteDescription"]) {
    RTCPeerConnection.prototype[method] = function (...args) {
      watch(this);
      return native[method].apply(this, args);
    };
  }

  function watch(pc) {
    if (connections.has(pc)) return;
    connections.add(pc);
    pc.addEventListener("connectionstatechange", publish);
    pc.addEventListener("signalingstatechange", () => {
      if (pc.signalingState === "closed") connections.delete(pc);
      prune();
      publish();
    });
    pc.addEventListener("track", (event) => excluded.add(event.track));
  }

  RTCPeerConnection.prototype.addTrack = function (...args) {
    watch(this);
    const sender = native.addTrack.apply(this, args);
    fallbackInputs.delete(sender);
    removedSenders.delete(sender);
    const input = originalTrack(sender.track);
    if (enabled && eligible(input)) enqueue(sender, () => replace(sender, input)).catch(() => {});
    return sender;
  };

  RTCPeerConnection.prototype.addTransceiver = function (...args) {
    watch(this);
    const transceiver = native.addTransceiver.apply(this, args);
    if (enabled && eligible(transceiver.sender.track)) enqueue(transceiver.sender, () => replace(transceiver.sender, originalTrack(transceiver.sender.track))).catch(() => {});
    return transceiver;
  };

  RTCPeerConnection.prototype.removeTrack = function (...args) {
    const result = native.removeTrack.apply(this, args);
    removedSenders.add(args[0]);
    fallbackInputs.delete(args[0]);
    prune();
    publish();
    return result;
  };

  RTCPeerConnection.prototype.close = function (...args) {
    const result = native.close.apply(this, args);
    connections.delete(this);
    prune();
    publish();
    return result;
  };

  RTCRtpSender.prototype.replaceTrack = function (track = null) {
    const sender = this;
    if (track?.kind === "video" || sender.track?.kind === "video") return native.replaceTrack.call(sender, track);
    if (track) removedSenders.delete(sender);
    const input = originalTrack(track);
    return enqueue(sender, () => replace(sender, input));
  };

  Object.defineProperty(MediaStreamTrack.prototype, "enabled", {
    ...native.enabled,
    set(value) {
      native.enabled.set.call(this, value);
      const route = outputRoutes.get(this);
      if (route) native.enabled.set.call(route.input, value);
      syncAll();
      publish();
    }
  });

  MediaStreamTrack.prototype.stop = function () {
    const route = outputRoutes.get(this) || routes.get(this);
    native.stop.call(this);
    if (route) {
      native.stop.call(route.input);
      dispose(route);
    }
    microphones.delete(this);
    syncAll();
    publish();
  };

  MediaStreamTrack.prototype.clone = function () {
    const source = originalTrack(this);
    const cloned = native.clone.call(source);
    if (excluded.has(source)) excluded.add(cloned);
    if (microphones.has(source)) observeMicrophone(cloned);
    return cloned;
  };

  function observeMicrophone(track) {
    microphoneObserved = true;
    microphones.add(track);
    track.addEventListener("ended", () => { microphones.delete(track); syncAll(); publish(); }, { once: true });
    track.addEventListener("mute", () => { syncAll(); publish(); });
    track.addEventListener("unmute", () => { syncAll(); publish(); });
    syncAll();
    publish();
  }

  navigator.mediaDevices.getUserMedia = async function (...args) {
    const stream = await native.getUserMedia.apply(this, args);
    stream.getAudioTracks().forEach(observeMicrophone);
    return stream;
  };

  if (native.getDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia = async function (...args) {
      const stream = await native.getDisplayMedia.apply(this, args);
      stream.getAudioTracks().forEach((track) => excluded.add(track));
      return stream;
    };
  }

  function connectedRoutes(includePaused = false) {
    const result = new Set();
    for (const pc of connections) {
      if (pc.connectionState !== "connected") continue;
      for (const transceiver of pc.getTransceivers()) {
        if (!["sendrecv", "sendonly"].includes(transceiver.currentDirection)) continue;
        const sender = transceiver.sender;
        const route = outputRoutes.get(sender.track);
        const encodings = sender.getParameters().encodings;
        if (!includePaused && encodings?.length && encodings.every((encoding) => encoding.active === false)) continue;
        if (route && routes.has(route.input) && route.input.readyState === "live") result.add(route);
      }
    }
    return [...result];
  }

  function status() {
    const live = connectedRoutes(true);
    const active = connectedRoutes();
    const audible = active.filter((route) => route.output.enabled && !route.output.muted);
    let state = "off";
    if (enabled) {
      state = context?.state !== "running" ? "suspended" : !live.length ? "waiting" : !active.length ? "paused" : !audible.length ? "muted" : "ready";
    }
    return { state, enabled, volume, hearEffects, includeVoice, playing: playing?.id || null, preview: !!playing?.preview, error: lastError };
  }

  let previousStatus = "";
  function publish(force = false) {
    const value = status();
    const serialized = JSON.stringify(value);
    if (force === true || serialized !== previousStatus) {
      previousStatus = serialized;
      emit("status", value);
    }
  }

  function stopPlayback() {
    playbackGeneration++;
    if (playing) {
      const { source, previewGain } = playing;
      playing = null;
      source.onended = null;
      try { source.stop(); } catch {}
      source.disconnect();
      previewGain?.disconnect();
    }
    finishRequest();
    publish();
  }

  function finishRequest() {
    const requestId = playbackRequestId;
    playbackRequestId = null;
    if (requestId) emit("playback-ended", { requestId });
  }

  async function loadBuffer(message) {
    if (message.builtin) {
      if (!buffers.has(message.builtin)) {
        const bytes = MeetSoundboardAudio.bytes(message.builtin);
        const loading = context.decodeAudioData(bytes).catch(() => {
          buffers.delete(message.builtin);
          throw new Error("This effect could not load. Reload Meet and try again.");
        });
        buffers.set(message.builtin, loading);
      }
      return buffers.get(message.builtin);
    }
    if (!(message.bytes instanceof ArrayBuffer) || !message.bytes.byteLength || message.bytes.byteLength > 2 * 1024 * 1024) {
      throw new Error("Choose an audio file smaller than 2 MB.");
    }
    if (decoding) throw new Error("A clip is still loading. Try again in a moment.");
    decoding = true;
    let buffer;
    try {
      buffer = await context.decodeAudioData(message.bytes.slice(0));
    } catch {
      throw new Error("Chrome could not read this audio. Try an MP3 or WAV file.");
    } finally { decoding = false; }
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 30) throw new Error("Choose a clip that is 30 seconds or shorter.");
    return buffer;
  }

  async function play(message) {
    stopPlayback();
    playbackRequestId = typeof message.requestId === "string" && message.requestId.length <= 80 ? message.requestId : null;
    const generation = playbackGeneration;
    createContext();
    await context.resume();
    if (generation !== playbackGeneration) return;
    if (!message.preview && status().state !== "ready") {
      throw new Error(enabled ? "Join the call and unmute in Meet before playing to everyone." : "Turn on the soundboard first.");
    }
    const buffer = await loadBuffer(message);
    if (generation !== playbackGeneration) return;
    if (!message.preview && status().state !== "ready") throw new Error("Your meeting audio is no longer connected.");
    const source = context.createBufferSource();
    source.buffer = buffer;
    let previewGain;
    if (message.preview) {
      previewGain = context.createGain();
      previewGain.gain.value = volume;
      source.connect(previewGain).connect(context.destination);
      source.onended = finish;
    } else {
      source.connect(effects);
      source.onended = finish;
    }
    function finish() {
      source.disconnect();
      previewGain?.disconnect();
      if (playing?.source === source) {
        playing = null;
        finishRequest();
      }
      publish();
    }
    playing = { source, previewGain, id: message.id || message.builtin, preview: !!message.preview };
    source.start();
    publish();
  }

  async function command(message) {
    if (message.type === "status") return publish(true);
    if (message.type === "configure") {
      const voiceChanged = typeof message.includeVoice === "boolean" && message.includeVoice !== includeVoice;
      if (typeof message.volume === "number" && Number.isFinite(message.volume)) volume = Math.max(0, Math.min(1, message.volume));
      if (typeof message.hearEffects === "boolean") hearEffects = message.hearEffects;
      if (typeof message.includeVoice === "boolean") includeVoice = message.includeVoice;
      if (effects) effects.gain.setTargetAtTime(volume, context.currentTime, 0.015);
      if (playing?.previewGain) playing.previewGain.gain.setTargetAtTime(volume, context.currentTime, 0.015);
      if (monitor) monitor.gain.value = hearEffects ? 1 : 0;
      syncAll();
      if (voiceChanged && enabled) await reconcile();
    } else if (message.type === "activate") {
      const generation = ++activationGeneration;
      createContext();
      await context.resume();
      if (generation !== activationGeneration) return;
      if (context.state !== "running") throw new Error("Click Turn on again to allow audio.");
      enabled = true;
      lastError = "";
      await reconcile();
    } else if (message.type === "deactivate") {
      activationGeneration++;
      enabled = false;
      lastError = "";
      stopPlayback();
      syncAll();
      await reconcile();
      prune();
    } else if (message.type === "stop") {
      stopPlayback();
    } else if (message.type === "play") {
      await play(message);
    }
    publish();
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.channel !== channel || message.from !== "panel") return;
    if (message.type === "play" && (typeof message.id !== "string" || message.id.length > 80 || typeof message.preview !== "boolean")) return;
    command(message).catch((error) => {
      if (message.type === "play" && message.requestId === playbackRequestId) stopPlayback();
      emit("error", { message: error.message || "Audio could not be played.", requestId: message.requestId });
      publish();
    });
  });

  setInterval(() => {
    syncAll();
    if (playing && !playing.preview && status().state !== "ready") stopPlayback();
    prune();
    publish();
  }, 250);
})();
