globalThis.MeetSoundboardStyle = `
  :host { all: initial; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202c25; font-size: 14px; line-height: 1.4; color-scheme: light; }
  *, *::before, *::after { box-sizing: border-box; }
  button, input { font: inherit; }
  button { cursor: pointer; color: inherit; }
  button:disabled { cursor: not-allowed; opacity: .5; }
  button:focus-visible, input:focus-visible, summary:focus-visible { outline: 3px solid #677f39; outline-offset: 3px; }
  button { -webkit-tap-highlight-color: transparent; }
  [hidden] { display: none !important; }
  .launcher { position: fixed; right: var(--launcher-right, 24px); bottom: var(--launcher-bottom, 24px); display: grid; place-items: center; width: 48px; height: 48px; padding: 12px; border: 0; border-radius: 50%; background: #202124; color: #c4c7c5; box-shadow: none; transition: background .15s; }
  .launcher:hover { background: #333537; color: #e3e3e3; }
  .launcher:active { background: #444746; }
  .launcher:focus-visible { outline: 2px solid #a8c7fa; outline-offset: 3px; }
  .launcher .wave { height: 24px; gap: 2px; }
  .launcher .wave i { width: 2.5px; height: 8px; }
  .launcher .wave i:nth-child(2), .launcher .wave i:nth-child(4) { height: 16px; }
  .launcher .wave i:nth-child(3) { height: 24px; }
  .launcher-label { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .wave { display: inline-flex; height: 23px; align-items: center; gap: 3px; }
  .wave i { width: 3px; border-radius: 3px; background: currentColor; height: 9px; }
  .wave i:nth-child(2), .wave i:nth-child(4) { height: 17px; }
  .wave i:nth-child(3) { height: 23px; }
  .panel { position: fixed; right: 24px; bottom: 96px; width: 404px; max-width: calc(100vw - 24px); max-height: calc(100dvh - 120px); display: flex; flex-direction: column; background: #f8f9f3; border: 1px solid #e4e8d9; border-radius: 22px; box-shadow: 0 18px 70px #0004; overflow: hidden; }
  header { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 17px 20px 13px; }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 750; letter-spacing: -.2px; }
  .brand .wave { color: #30452a; }
  .meet-badge { padding: 3px 7px; border-radius: 5px; font-size: 9px; font-weight: 700; letter-spacing: 1px; border: 1px solid #d9dfcf; margin-left: 3px; }
  .icon-button { display: grid; place-items: center; border: 0; background: transparent; border-radius: 8px; width: 30px; height: 30px; font-size: 22px; color: #737c70; }
  .icon-button:hover { background: #e9eddf; }
  .scroll { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 20px 14px; scrollbar-width: thin; }
  .intro { padding: 0 20px; flex: none; }
  .eyebrow { margin: 8px 0 6px; color: #778070; font-size: 10px; font-weight: 700; letter-spacing: 1.8px; }
  h1 { margin: 0; font-weight: 650; font-size: 29px; line-height: 1.12; letter-spacing: -1.2px; }
  .subtitle { margin: 9px 0 16px; color: #63705c; font-size: 12px; }
  .connection { flex: none; margin: 0 20px; padding: 13px 14px; border-radius: 12px; background: #eaf0dd; border: 1px solid #dce4cd; }
  .status-row { display: flex; align-items: center; gap: 8px; }
  .dot { width: 7px; height: 7px; border-radius: 100%; background: #a0a58e; flex: none; }
  .connection[data-state="ready"] .dot { background: #4c7a31; box-shadow: 0 0 0 3px #d2e3bd; }
  .connection[data-state="muted"] .dot, .connection[data-state="waiting"] .dot, .connection[data-state="paused"] .dot { background: #b98425; }
  .status-title { font-size: 12px; font-weight: 650; flex: 1; }
  .power { padding: 5px 9px; font-size: 11px; font-weight: 650; border: 1px solid #c5d2b1; border-radius: 6px; background: #f8faef; }
  .status-help { font-size: 11px; color: #5c694f; margin: 7px 0 0 15px; line-height: 1.5; }
  .tabs { display: flex; border-bottom: 1px solid #e0e5d8; margin: 18px 0 14px; gap: 16px; }
  .tab { border: 0; background: transparent; padding: 0 0 10px; color: #64705b; font-size: 12px; font-weight: 600; border-bottom: 2px solid transparent; }
  .tab[aria-selected="true"] { color: #293f22; border-bottom-color: #3e5a31; }
  .count { font-size: 10px; margin-left: 4px; opacity: .65; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .builtin-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sound { position: relative; border: 1px solid #e1e6d9; border-radius: 12px; background: #fffef9; overflow: hidden; transition: border-color .15s, box-shadow .15s; }
  .sound:hover { border-color: #aab895; box-shadow: 0 2px 8px #2c45220a; }
  .sound.playing { border-color: #75964c; background: #f0f6df; box-shadow: inset 0 0 0 1px #75964c; }
  .sound:has(.trigger:focus-visible) { outline: 3px solid #677f39; outline-offset: 2px; }
  .trigger:focus-visible { outline: none; }
  .sound.previewing { border-color: #8174a2; background: #f4f0fa; box-shadow: inset 0 0 0 1px #8174a2; }
  .trigger { display: flex; flex-direction: column; align-items: flex-start; width: 100%; min-width: 0; border: 0; background: transparent; padding: 11px 10px 10px; text-align: left; }
  .sound-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; background: #ececfa; font-size: 20px; margin-bottom: 8px; }
  .orange .sound-icon { background: #fff0de; }
  .yellow .sound-icon { background: #f7f2cc; }
  .purple .sound-icon { background: #efeafa; }
  .green .sound-icon { background: #eaf2db; }
  .blue .sound-icon { background: #e6eef7; }
  .sound-name { font-size: 11px; font-weight: 650; width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .sound-meta { font-size: 10px; color: #5d6c51; margin-top: 3px; }
  .custom-grid .trigger { padding-bottom: 38px; }
  .edit-sound { position: absolute; bottom: 6px; left: 9px; border: 0; border-radius: 5px; padding: 4px 8px; background: #edf1e4; color: #435733; font-size: 10px; font-weight: 600; }
  .preview { position: absolute; top: 9px; right: 7px; border: 0; background: transparent; color: #657658; width: 26px; height: 26px; border-radius: 6px; font-size: 14px; }
  .preview:hover { color: #34482c; background: #e9efdd; }
  .remove { position: absolute; bottom: 5px; right: 5px; background: #fffef9; border: 0; font-size: 15px; color: #945b4f; border-radius: 4px; width: 26px; height: 26px; }
  .privacy-note { font-size: 11px; line-height: 1.5; color: #536445; margin: 12px 0 0; }
  .library-note { font-size: 10px; color: #69765e; margin: 11px 0 0; display: flex; justify-content: space-between; gap: 10px; }
  .add-card { grid-column: 1 / -1; border: 1px dashed #bccba5; border-radius: 12px; background: #f0f5e5; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; color: #637750; font-size: 11px; min-height: 48px; }
  .add-card span { font-size: 25px; line-height: 1; }
  .add-card:hover { background: #e6efcf; border-color: #819763; }
  .upload { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: 1px dashed #bac8a5; border-radius: 11px; background: #f2f5e8; padding: 15px; font-size: 12px; font-weight: 600; margin-top: 12px; }
  .upload-icon { font-size: 27px; font-weight: 400; }
  .upload small { display: block; font-size: 10px; font-weight: 400; color: #59694b; margin-top: 3px; }
  .drop-target { position: absolute; inset: 7px; border: 2px dashed #839d5c; border-radius: 17px; background: #f0f6e7f5; z-index: 5; pointer-events: none; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 20px; text-align: center; }
  .drop-target > span { background: #dcebbf; border-radius: 50%; width: 66px; height: 66px; font-size: 36px; margin-bottom: 20px; }
  .drop-target strong { font-size: 20px; letter-spacing: -.5px; }
  .drop-target p { font-size: 12px; color: #536445; }
  .panel.editing > .intro, .panel.editing > .connection, .panel.editing > .scroll, .panel.editing > .controls, .panel.editing > footer { display: none; }
  .clip-editor { display: flex; flex-direction: column; min-height: 0; }
  .editor-scroll { overflow-y: auto; min-height: 0; padding: 0 20px 14px; overscroll-behavior: contain; scrollbar-width: thin; }
  .clip-editor h2 { margin: 0 0 20px; font-size: 25px; font-weight: 650; letter-spacing: -.8px; line-height: 1.2; }
  .editor-status:empty { display: none; }
  .editor-status { font-size: 11px; color: #5d6c51; }
  .editor-label, .gain-heading, .wave-label { font-size: 11px; font-weight: 650; }
  #clip-name, .trim-fields input { display: block; width: 100%; background: #fffef9; color: #202c25; border: 1px solid #ccd5be; border-radius: 8px; padding: 9px 10px; margin-top: 6px; }
  #clip-name { font-size: 13px; }
  .wave-label, .gain-heading { display: flex; justify-content: space-between; gap: 8px; margin: 21px 0 10px; }
  .selection-length, .gain-value { color: #50653a; font-variant-numeric: tabular-nums; }
  .selection-length.too-long { color: #a33d23; }
  .waveform { position: relative; height: 96px; background: #283625; border-radius: 10px; margin: 0 7px; touch-action: none; }
  .waveform canvas { display: block; width: 100%; height: 100%; border-radius: 10px; }
  .wave-selection { position: absolute; top: 0; height: 100%; border-top: 2px solid #c9ec8d; border-bottom: 2px solid #c9ec8d; pointer-events: none; background: #c9ec8d09; }
  .trim-handle { position: absolute; top: -3px; bottom: -3px; width: 14px; transform: translateX(-50%); background: #d6f2a7; border: 1px solid #d6f2a7; border-radius: 4px; padding: 0; cursor: ew-resize; touch-action: none; }
  .trim-handle::after { content: ''; position: absolute; top: 38%; bottom: 38%; width: 2px; left: 5px; border-radius: 2px; background: #506139; }
  .playhead { position: absolute; top: 5px; bottom: 5px; width: 2px; background: white; pointer-events: none; }
  .wave-times { display: flex; justify-content: space-between; margin-top: 8px; color: #5d6c51; font-size: 10px; font-variant-numeric: tabular-nums; }
  .trim-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 13px; }
  .trim-fields label { font-size: 11px; font-weight: 600; }
  .trim-fields label span { color: #5d6c51; font-weight: 400; font-size: 10px; margin-left: 4px; }
  .trim-fields input { font-size: 12px; font-variant-numeric: tabular-nums; padding: 7px 9px; }
  .selection-actions { display: flex; gap: 8px; margin-top: 12px; }
  .reset-clip { border: 1px solid #ccd5be; border-radius: 8px; background: #fffef9; padding: 9px 13px; font-size: 11px; }
  .reset-clip:hover { background: #edf3e1; }
  #clip-gain { display: block; width: 100%; }
  .gain-scale { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 10px; color: #5d6c51; }
  .boost-clip { border: 0; padding: 4px 8px; border-radius: 5px; background: #e8efd9; color: #3a5028; font-size: 10px; font-weight: 650; }
  .editor-fade { margin-top: 12px; }
  .editor-hint { color: #5d6c51; font-size: 10px; line-height: 1.5; margin: 6px 0 14px; }
  .editor-preview { flex: 1; border: 1px solid #344c25; border-radius: 8px; padding: 10px; background: #344c25; color: #f8fbee; font-weight: 650; font-size: 12px; }
  .editor-preview:hover { background: #405d2d; }
  .editor-local { font-size: 10px; color: #5d6c51; margin: 7px 0 0; }
  .editor-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid #dce3d1; background: #f2f5e9; flex: none; }
  .editor-footer button { font-size: 12px; font-weight: 650; padding: 9px 16px; border-radius: 8px; border: 1px solid #cdd8bf; background: #fffef9; }
  .editor-footer .editor-save { background: #344c25; border-color: #344c25; color: #f8fbee; }
  .editor-error { color: #963c26; background: #fff0e8; border-radius: 8px; padding: 10px; font-size: 11px; line-height: 1.5; }
  .empty { text-align: center; padding: 23px 12px 12px; color: #647257; font-size: 12px; }
  .empty b { display: block; color: #39452f; margin-bottom: 5px; font-size: 14px; }
  .controls { flex: none; border-top: 1px solid #e0e5d8; padding: 12px 20px 9px; background: #f8f9f3; }
  .volume-row { display: flex; align-items: center; gap: 12px; }
  .volume-label { font-size: 11px; font-weight: 600; white-space: nowrap; }
  output { color: #626f55; font-size: 10px; min-width: 29px; text-align: right; font-variant-numeric: tabular-nums; }
  input[type="range"] { min-width: 0; flex: 1; accent-color: #718a4e; height: 18px; margin: 0; cursor: pointer; }
  .settings-row { display: flex; justify-content: space-between; gap: 10px; margin-top: 6px; }
  .setting { display: flex; align-items: center; gap: 7px; font-size: 11px; color: #536445; padding: 6px 0; cursor: pointer; }
  .setting input { accent-color: #627e3d; width: 15px; height: 15px; margin: 0; }
  details { margin-top: 10px; font-size: 11px; color: #68755c; }
  summary { cursor: pointer; padding: 4px 0; }
  details p { line-height: 1.6; margin: 8px 0; }
  kbd { font-family: inherit; border: 1px solid #d9dfcf; border-radius: 3px; padding: 1px 4px; font-size: 10px; }
  footer { flex: none; padding: 11px 20px; border-top: 1px solid #e0e5d8; background: #f2f5e9; display: flex; gap: 12px; align-items: center; }
  .now-playing { flex: 1; min-width: 0; color: #637254; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .now-playing.active { color: #47602d; }
  .now-playing.previewing { color: #685081; }
  .stop { border: 1px solid #d2d9c6; border-radius: 8px; background: #fffef8; padding: 7px 10px; font-weight: 650; font-size: 11px; white-space: nowrap; }
  .stop:hover { border-color: #8e9f77; }
  .notice { font-size: 11px; line-height: 1.5; color: #805737; background: #fff2de; padding: 10px 12px; margin-top: 12px; border-radius: 9px; }
  @media (prefers-color-scheme: dark) {
    :host { color-scheme: dark; color: #e8ece4; --surface: #292c2a; --border: #41473e; --muted: #b4bdad; --accent: #c9e7a3; --hover: #343c2f; }
    button:focus-visible, input:focus-visible, summary:focus-visible { outline-color: var(--accent); }
    .panel, .controls { background: #202124; border-color: var(--border); }
    .brand .wave, .tab[aria-selected="true"], .selection-length, .gain-value, .now-playing.active { color: var(--accent); }
    .meet-badge, .tabs, kbd { border-color: var(--border); }
    .icon-button, .eyebrow, .subtitle, .status-help, .tab, .sound-meta, .preview, .privacy-note, .library-note, .upload small, .drop-target p, .editor-status, .wave-times, .trim-fields label span, .gain-scale, .editor-hint, .editor-local, .empty, output, .setting, details, .now-playing { color: var(--muted); }
    .icon-button:hover, .preview:hover, .reset-clip:hover, .add-card:hover { background: var(--hover); }
    .connection { background: #2b3427; border-color: #46543b; }
    .dot { background: #909b86; }
    .connection[data-state="ready"] .dot { background: #b5da8d; box-shadow: 0 0 0 3px #435735; }
    .connection[data-state="muted"] .dot, .connection[data-state="waiting"] .dot, .connection[data-state="paused"] .dot { background: #edba64; }
    .power { background: var(--hover); border-color: #6f805d; }
    .tab[aria-selected="true"] { border-bottom-color: var(--accent); }
    .count { opacity: .85; }
    .sound, .remove, #clip-name, .trim-fields input, .reset-clip, .stop, .editor-footer button { background: var(--surface); border-color: var(--border); }
    .sound:hover, .stop:hover { border-color: #8a9d75; }
    .sound.playing { background: #303c29; border-color: #b5d78e; box-shadow: inset 0 0 0 1px #b5d78e; }
    .sound:has(.trigger:focus-visible) { outline-color: var(--accent); }
    .sound.previewing { background: #322c3d; border-color: #bca2df; box-shadow: inset 0 0 0 1px #bca2df; }
    .sound-icon, .purple .sound-icon { background: #3b3349; }
    .orange .sound-icon { background: #463625; }
    .yellow .sound-icon { background: #403d25; }
    .green .sound-icon { background: #33432b; }
    .blue .sound-icon { background: #2d3c4b; }
    .edit-sound, .boost-clip { background: var(--hover); color: var(--accent); }
    .preview:hover, .empty b, #clip-name, .trim-fields input { color: #e8ece4; }
    #clip-name, .trim-fields input { border-color: #78856c; }
    .remove, .selection-length.too-long { color: #ffbaaa; }
    .add-card, .upload { background: #2a3125; border-color: #71825d; color: var(--accent); }
    .add-card:hover { border-color: var(--accent); }
    .drop-target { background: #232a20f5; border-color: var(--accent); }
    .drop-target > span { background: #3a4a2d; }
    .editor-preview, .editor-footer .editor-save { background: var(--accent); border-color: var(--accent); color: #1e2b18; }
    .editor-preview:hover { background: #d8eebc; }
    .editor-footer, footer { background: #252a24; border-color: var(--border); }
    .editor-error { color: #ffbaaa; background: #422b27; }
    input[type="range"], .setting input { accent-color: var(--accent); }
    .now-playing.previewing { color: #cbb3e9; }
    .notice { color: #f4c78e; background: #3b3022; }
  }
  @media (max-height: 850px) { .panel { bottom: 82px; max-height: calc(100dvh - 100px); } .intro { display: none; } .trigger { padding: 9px 10px; } .sound-icon { width: 28px; height: 28px; font-size: 19px; margin-bottom: 6px; } .add-card { min-height: 44px; } }
  @media (max-width: 500px) { .panel { right: 12px; bottom: 80px; } }
  @media (max-width: 360px) { .builtin-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-height: 500px) { .panel { bottom: 12px; max-height: calc(100dvh - 24px); } }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;
