(() => {
  "use strict";
  const rate = 32000;
  const maxSeconds = 120;
  const maxBytes = 10 * 1024 * 1024;

  function encode(samples) {
    const bytes = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(bytes);
    const text = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
    text(0, "RIFF");
    view.setUint32(4, bytes.byteLength - 8, true);
    text(8, "WAVEfmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, samples.length * 2, true);
    samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.round(sample * 32767), true));
    let binary = "";
    const data = new Uint8Array(bytes);
    for (let offset = 0; offset < data.length; offset += 8192) binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
    return btoa(binary);
  }

  function create({ root, onSave, onClose, onPreview }) {
    const panel = root.querySelector(".panel");
    const view = document.createElement("section");
    view.className = "clip-editor";
    view.hidden = true;
    view.setAttribute("aria-labelledby", "editor-title");
    view.innerHTML = `
      <div class="editor-scroll">
        <h2 id="editor-title">Add a sound</h2>
        <p class="editor-status" role="status"></p>
        <div class="editor-fields" hidden>
          <label class="editor-label" for="clip-name">Sound name</label><input id="clip-name" type="text" maxlength="60" autocomplete="off" spellcheck="false">
          <div class="wave-label"><span>Trim your clip</span><span class="selection-length"></span></div>
          <div class="waveform"><canvas width="960" height="240" aria-hidden="true"></canvas><div class="wave-selection"></div><div class="playhead" hidden></div><button class="trim-handle trim-start" role="slider" aria-label="Trim start" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"></button><button class="trim-handle trim-end" role="slider" aria-label="Trim end" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"></button></div>
          <div class="wave-times"><span>0:00</span><span class="source-length"></span></div>
          <div class="selection-actions"><button class="editor-preview" type="button" aria-describedby="editor-local">▶ Play selection</button><button class="reset-clip" type="button" title="Reset trim and volume">Reset</button></div>
          <p class="editor-local" id="editor-local">Only you can hear this preview.</p>
          <div class="trim-fields"><label for="clip-start">Start <span>seconds</span><input id="clip-start" type="number" min="0" step="0.01"></label><label for="clip-end">End <span>seconds</span><input id="clip-end" type="number" min="0" step="0.01"></label></div>
          <div class="gain-heading"><label for="clip-gain">Clip volume</label><span class="gain-value">100%</span></div>
          <input id="clip-gain" type="range" min="0" max="300" step="5" value="100">
          <div class="gain-scale"><span>Quiet</span><button class="boost-clip" type="button">Auto boost</button><span>3× louder</span></div>
          <label class="setting editor-fade" for="clip-fade"><input id="clip-fade" type="checkbox" checked>Soften the edges</label>
          <p class="editor-hint">Save keeps only the selected audio, up to 30 seconds.</p>
        </div>
        <p class="editor-error" role="alert" hidden></p>
      </div>
      <div class="editor-footer"><button class="editor-cancel" type="button">Cancel</button><button class="editor-save" type="button" disabled>Save sound</button></div>`;
    panel.append(view);
    const $ = (selector) => view.querySelector(selector);
    let session = null;
    let loading = false;
    let saving = false;
    let generation = 0;
    let playback = null;
    let animation = 0;

    const duration = () => session.samples.length / rate;
    const bounds = () => [Math.round(session.start * rate), Math.round(session.end * rate)];
    const selectionLength = () => (bounds()[1] - bounds()[0]) / rate;

    function error(message) {
      $(".editor-error").textContent = message;
      $(".editor-error").hidden = !message;
    }

    function stop() {
      generation++;
      cancelAnimationFrame(animation);
      if (playback) {
        playback.source.onended = null;
        if (playback.started) playback.source.stop();
        playback.source.disconnect();
        void playback.context.close().catch(() => {});
        playback = null;
      }
      $(".editor-preview").textContent = "▶ Play selection";
      $(".playhead").hidden = true;
    }

    function close() {
      if (saving) return;
      stop();
      session = null;
      view.hidden = true;
      panel.classList.remove("editing");
      onClose();
    }

    function draw() {
      const canvas = $("canvas");
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      const samples = session.samples;
      const columns = 160;
      for (let column = 0; column < columns; column++) {
        const from = Math.floor(column * samples.length / columns);
        const to = Math.max(from + 1, Math.floor((column + 1) * samples.length / columns));
        let peak = 0;
        for (let index = from; index < to; index++) peak = Math.max(peak, Math.abs(samples[index]));
        const height = Math.max(4, Math.min(1, peak * session.gain) * 180);
        const position = (column + .5) / columns * duration();
        context.fillStyle = position >= session.start && position <= session.end ? "#c9ec8d" : "#68755d";
        context.fillRect(column * 6 + 1, 120 - height / 2, 4, height);
      }
    }

    function update() {
      if (!session) return;
      const length = duration();
      const selected = selectionLength();
      $("#clip-start").value = session.start.toFixed(3);
      $("#clip-end").value = session.end.toFixed(3);
      $("#clip-start").max = String(session.end - .01);
      $("#clip-end").max = String(length);
      $("#clip-end").min = String(session.start + .01);
      $(".selection-length").textContent = `${selected.toFixed(2)}s selected`;
      $(".selection-length").classList.toggle("too-long", selected > 30);
      $(".source-length").textContent = `${length.toFixed(2)}s`;
      $(".gain-value").textContent = `${Math.round(session.gain * 100)}%`;
      $("#clip-gain").value = String(session.gain * 100);
      $("#clip-fade").checked = session.fade;
      for (const [key, selector, min, max] of [["start", ".trim-start", 0, session.end - .01], ["end", ".trim-end", session.start + .01, length]]) {
        const handle = $(selector);
        handle.style.left = `${session[key] / length * 100}%`;
        handle.setAttribute("aria-valuemin", String(min));
        handle.setAttribute("aria-valuemax", String(max));
        handle.setAttribute("aria-valuenow", String(session[key]));
        handle.setAttribute("aria-valuetext", `${session[key].toFixed(2)} seconds`);
      }
      $(".wave-selection").style.left = `${session.start / length * 100}%`;
      $(".wave-selection").style.width = `${selected / length * 100}%`;
      $(".editor-save").disabled = saving || selected > 30 || !$("#clip-name").value.trim();
      $(".editor-preview").disabled = selected > 30;
      draw();
    }

    function setBoundary(key, value) {
      if (!session || !Number.isFinite(value) || saving) return;
      stop();
      session[key] = key === "start" ? Math.max(0, Math.min(session.end - .01, value)) : Math.max(session.start + .01, Math.min(duration(), value));
      update();
    }

    function render() {
      const [start, end] = bounds();
      const output = session.samples.slice(start, end);
      const fade = session.fade ? Math.min(rate * .005, output.length / 4) : 0;
      for (let index = 0; index < output.length; index++) {
        const sample = output[index] * session.gain;
        const magnitude = Math.abs(sample);
        const protectedSample = magnitude <= .8 ? sample : Math.sign(sample) * (.8 + .18 * (1 - Math.exp(-((magnitude - .8) / .18))));
        output[index] = protectedSample * (fade ? Math.min(1, index / fade, (output.length - 1 - index) / fade) : 1);
      }
      return output;
    }

    async function open(file, existing = null) {
      if (loading || saving || !view.hidden) return;
      view.hidden = false;
      panel.classList.add("editing");
      $("#editor-title").textContent = existing ? "Edit your sound" : "Add a sound";
      $(".editor-fields").hidden = true;
      $(".editor-save").disabled = true;
      $(".editor-status").textContent = "Opening your audio…";
      error("");
      $(".editor-cancel").focus();
      loading = true;
      const token = ++generation;
      try {
        if (!file.size || file.size > maxBytes) throw new Error("Choose an audio file smaller than 10 MB.");
        const bytes = await file.arrayBuffer();
        if (token !== generation) return;
        const context = new OfflineAudioContext(1, 1, rate);
        let buffer;
        try { buffer = await context.decodeAudioData(bytes); }
        catch { throw new Error("Chrome could not read this audio. Try an MP3 or WAV file."); }
        if (token !== generation) return;
        if (!Number.isFinite(buffer.duration) || buffer.duration < .01 || buffer.duration > maxSeconds) throw new Error("Choose audio up to 2 minutes long, then trim it to 30 seconds.");
        const samples = new Float32Array(buffer.length);
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const data = buffer.getChannelData(channel);
          for (let index = 0; index < samples.length; index++) samples[index] += data[index] / buffer.numberOfChannels;
        }
        if (samples.some((sample) => !Number.isFinite(sample))) throw new Error("This audio contains invalid samples. Try another file.");
        session = { samples, start: 0, end: Math.min(buffer.duration, 30), gain: 1, fade: true, existing };
        $("#clip-name").value = existing?.name || file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "My sound";
        $(".editor-status").textContent = buffer.duration > 30 ? "The first 30 seconds are selected. Drag the handles to choose your clip." : "";
        $(".editor-fields").hidden = false;
        update();
        $("#clip-name").focus();
      } catch (failure) {
        if (token === generation) { $(".editor-status").textContent = ""; error(failure.message || "Could not open this audio."); }
      } finally { loading = false; }
    }

    for (const key of ["start", "end"]) {
      $(`#clip-${key}`).addEventListener("change", (event) => { if (event.isTrusted) setBoundary(key, event.target.valueAsNumber); });
      const handle = $(`.trim-${key}`);
      handle.addEventListener("pointerdown", (event) => {
        if (!event.isTrusted || !session || saving) return;
        event.preventDefault();
        handle.focus();
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener("pointermove", (event) => {
        if (!event.isTrusted || !handle.hasPointerCapture(event.pointerId)) return;
        const box = $(".waveform").getBoundingClientRect();
        setBoundary(key, (event.clientX - box.left) / box.width * duration());
      });
      handle.addEventListener("keydown", (event) => {
        if (!event.isTrusted || !session) return;
        let value = session[key];
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") value -= event.shiftKey ? .1 : .01;
        else if (event.key === "ArrowRight" || event.key === "ArrowUp") value += event.shiftKey ? .1 : .01;
        else if (event.key === "Home") value = 0;
        else if (event.key === "End") value = duration();
        else return;
        event.preventDefault();
        setBoundary(key, value);
      });
    }
    $("#clip-name").addEventListener("input", update);
    $("#clip-gain").addEventListener("input", (event) => {
      if (!event.isTrusted || !session || saving) return;
      stop();
      session.gain = Math.max(0, Math.min(3, Number(event.target.value) / 100));
      update();
    });
    $("#clip-fade").addEventListener("change", (event) => { if (event.isTrusted && session && !saving) { stop(); session.fade = event.target.checked; } });
    $(".reset-clip").addEventListener("click", (event) => {
      if (!event.isTrusted || !session || saving) return;
      stop();
      Object.assign(session, { start: 0, end: Math.min(duration(), 30), gain: 1, fade: true });
      update();
    });
    $(".boost-clip").addEventListener("click", (event) => {
      if (!event.isTrusted || !session || saving) return;
      stop();
      const [start, end] = bounds();
      let peak = 0;
      for (let index = start; index < end; index++) peak = Math.max(peak, Math.abs(session.samples[index]));
      session.gain = peak ? Math.max(1, Math.min(3, .95 / peak)) : 1;
      update();
    });
    $(".editor-preview").addEventListener("click", async (event) => {
      if (!event.isTrusted || !session || saving || selectionLength() > 30) return;
      if (playback) { stop(); return; }
      stop();
      const token = generation;
      const context = new AudioContext();
      const source = context.createBufferSource();
      playback = { context, source };
      try {
        onPreview();
        const samples = render();
        const buffer = context.createBuffer(1, samples.length, rate);
        buffer.copyToChannel(samples, 0);
        source.buffer = buffer;
        source.connect(context.destination);
        await context.resume();
        if (token !== generation) return;
        const started = context.currentTime;
        source.start();
        playback.started = true;
        source.onended = stop;
        $(".editor-preview").textContent = "■ Stop preview";
        $(".playhead").hidden = false;
        const tick = () => {
          if (token !== generation) return;
          const time = session.start + context.currentTime - started;
          $(".playhead").style.left = `${Math.min(session.end, time) / duration() * 100}%`;
          animation = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (token === generation) { stop(); error("Preview could not start. Try again."); }
      }
    });
    $(".editor-save").addEventListener("click", async (event) => {
      if (!event.isTrusted || !session || saving || selectionLength() > 30) return;
      const name = $("#clip-name").value.trim().slice(0, 60);
      if (!name) { error("Give your sound a name."); return; }
      stop();
      error("");
      saving = true;
      $(".editor-save").disabled = true;
      $(".editor-save").textContent = "Saving…";
      $(".editor-cancel").disabled = true;
      try {
        const samples = render();
        await onSave({ name, data: encode(samples), duration: samples.length / rate }, session.existing);
        saving = false;
        close();
      } catch (failure) { error(failure.message || "Could not save this sound. Try again."); }
      finally {
        saving = false;
        $(".editor-save").textContent = "Save sound";
        $(".editor-cancel").disabled = false;
        update();
      }
    });
    $(".editor-cancel").addEventListener("click", (event) => { if (event.isTrusted) close(); });
    window.addEventListener("pagehide", stop);
    return { open, close, stop, get isOpen() { return !view.hidden; }, get isSaving() { return saving; } };
  }
  globalThis.MeetSoundboardEditor = Object.freeze({ create });
})();
