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
  .restore-studio { margin: 10px 0 0 15px; padding: 6px 10px; border: 1px solid #a77945; border-radius: 6px; background: #fff2de; color: #68441e; font-size: 11px; }
  .beta { margin-left: 5px; padding: 2px 5px; border-radius: 4px; background: #ece7d7; color: #675536; font-size: 9px; }
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
  .custom-grid .sound-meta { padding-right: 22px; }
  .preview { position: absolute; top: 9px; right: 7px; border: 0; background: transparent; color: #657658; width: 26px; height: 26px; border-radius: 6px; font-size: 14px; }
  .preview:hover { color: #34482c; background: #e9efdd; }
  .remove { position: absolute; bottom: 5px; right: 5px; background: #fffef9; border: 0; font-size: 15px; color: #945b4f; border-radius: 4px; width: 26px; height: 26px; }
  .privacy-note { font-size: 11px; line-height: 1.5; color: #536445; margin: 12px 0 0; }
  .library-note { font-size: 10px; color: #69765e; margin: 11px 0 0; display: flex; justify-content: space-between; gap: 10px; }
  .add-card { grid-column: 1 / -1; border: 1px dashed #bccba5; border-radius: 12px; background: #f0f5e5; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; color: #637750; font-size: 11px; min-height: 48px; }
  .add-card span { font-size: 25px; line-height: 1; }
  .add-card:hover { background: #e6efcf; border-color: #819763; }
  .upload { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: 1px dashed #bac8a5; border-radius: 11px; background: #f2f5e8; padding: 15px; font-size: 12px; font-weight: 600; margin-top: 12px; }
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
  @media (max-height: 850px) { .panel { bottom: 82px; max-height: calc(100dvh - 100px); } .intro { display: none; } .trigger { padding: 9px 10px; } .sound-icon { width: 28px; height: 28px; font-size: 19px; margin-bottom: 6px; } .add-card { min-height: 44px; } }
  @media (max-width: 500px) { .panel { right: 12px; bottom: 80px; } }
  @media (max-width: 360px) { .builtin-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-height: 500px) { .panel { bottom: 12px; max-height: calc(100dvh - 24px); } }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;
