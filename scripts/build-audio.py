import array
import base64
import json
import math
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
sources = root / 'assets/original'
assets = root / 'assets/clips'
assets.mkdir(exist_ok=True)
extension = root / 'extension'
settings = [
    ('airhorn', 'Air horn', '📣', 'Hype', 'orange', 0, 2.009, ''),
    ('applause', 'Applause', '👏', 'Reactions', 'green', .19, 3.0375736961451247, ''),
    ('rimshot', 'Ba dum tss', '🥁', 'Comedy', 'purple', 4.48, 2.15, ''),
    ('ding', 'Correct!', '✨', 'Reactions', 'yellow', 0, 1.6, ''),
    ('boo', 'BOOOOO!', '👎', 'Reactions', 'orange', .94, 3.8, 'acompressor=threshold=0.1:ratio=3:attack=5:release=100,'),
    ('luigi_yahoo', 'Luigi Yahoo!', '🎮', 'Gaming', 'green', .28, 1.968390022675737, ''),
    ('tomato', 'Tomato splat', '🍅', 'Comedy', 'orange', 0, .534, ''),
    ('ill_be_back', "I'll be back", '🕶️', 'Quotes', 'purple', .07, 3.0182539682539685, ''),
    ('punch', 'Punch', '🥊', 'Comedy', 'blue', 0, .3657142857142857, ''),
    ('laugh', 'Laugh track', '😂', 'Comedy', 'yellow', .07, 4.43, ''),
    ('cash', 'Cha-ching!', '💸', 'Reactions', 'green', .48, 1.5, ''),
    ('quack', 'Quack', '🦆', 'Comedy', 'yellow', 0, .383, ''),
    ('crickets', 'Crickets', '🦗', 'Comedy', 'green', .41, 4.025011337868481, ''),
    ('trombone', 'Sad trombone', '🎺', 'Comedy', 'blue', .22, 4.68, ''),
    ('boom', 'Dramatic boom', '💥', 'Hype', 'orange', 0, 1.344, '')
]
metadata, encoded, measurements = [], {}, []

rate = 44100
reference_clips = {
    'applause': ('applause.m4a', .19, 3.0375736961451247, 1),
    'quack': ('quack.mp3', 0, .16929705215419502, 1),
    'boom': ('vine-boom.webm', .19, 2.9052834467120183, 1),
    'tomato': ('tomato-squash.mp3', .26, .55, 1),
    'crickets': ('awkward-cricket-sound-effect.mp3', .41, 4.025011337868481, 1.8),
    'laugh': ('laugh-track-2-mp3cut.mp3', .07, 4.43, 1),
    'ill_be_back': ('ill-be-back.mp3', .07, 3.0182539682539685, 1),
    'punch': ('punch.mp3', 0, .3657142857142857, 1),
    'luigi_yahoo': ('luigi-yahoo.mp3', .28, 1.968390022675737, 1),
}

def reference_clip(key):
    filename, start, duration, gain = reference_clips[key]
    destination = assets / f'{key}.wav'
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', str(sources / filename),
        '-ss', str(start), '-t', str(duration), '-ac', '1', '-ar', str(rate),
        '-af', f'volume={gain},alimiter=limit=0.85:attack=1:release=50:level=false:latency=true',
        '-c:a', 'pcm_s16le', '-map_metadata', '-1', str(destination)
    ], check=True)
    pcm = array.array('f', subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(destination), '-ac', '1',
        '-ar', str(rate), '-f', 'f32le', '-'
    ]))
    return destination, pcm, start, gain

def read_clip(key, start, duration, filters=''):
    command = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(sources / f'{key}.mp3'), '-t', str(duration), '-ac', '1', '-ar', str(rate), '-af', filters + 'highpass=f=35', '-f', 'f32le', '-']
    return array.array('f', subprocess.check_output(command))

for key, name, icon, category, color, start, duration, filters in settings:
    if key in reference_clips:
        destination, pcm, start, gain = reference_clip(key)
    else:
        pcm = read_clip(key, start, duration, filters)
        peak = max(map(abs, pcm))
        blocks = [math.sqrt(sum(v*v for v in pcm[i:i+441])/len(pcm[i:i+441])) for i in range(0, len(pcm), 441)]
        active = [v for v in blocks if v > max(blocks)*.1]
        rms = math.sqrt(sum(v*v for v in active)/len(active))
        gain = min(.79/peak, (.22 if key == 'boo' else .14)/rms)
        fade_out = {'boo': .3, 'cash': .12}.get(key, .035)
        for i in range(len(pcm)):
            fade = min(1, i/(rate*.002), (len(pcm)-1-i)/(rate*fade_out))
            pcm[i] *= gain * max(0,fade)
        destination = assets / f'{key}.mp3'
        subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(rate),'-ac','1','-i','-','-c:a','libmp3lame','-b:a','128k','-map_metadata','-1',str(destination)], input=pcm.tobytes(), check=True)
    encoded[key] = base64.b64encode(destination.read_bytes()).decode()
    entry = dict(id=key,name=name,icon=icon,category=category,duration=round(len(pcm)/rate,3),color=color,library='effects')
    metadata.append(entry)
    measurements.append(dict(id=key,duration=round(len(pcm)/rate,3),gain=round(gain,3),peak=round(max(map(abs,pcm)),4),bytes=destination.stat().st_size,start=start))

(extension / 'sounds.js').write_text('(() => {\n  "use strict";\n  const sounds = ' + json.dumps(metadata,ensure_ascii=False,indent=2) + ';\n  globalThis.MeetSoundboardSounds = Object.freeze({ sounds: Object.freeze(sounds.map(Object.freeze)) });\n})();\n')
(extension / 'audio.js').write_text('(() => {\n  "use strict";\n  const clips = Object.freeze(' + json.dumps(encoded,separators=(',',':')) + ');\n  function bytes(id) {\n    if (typeof id !== "string" || !Object.hasOwn(clips, id)) throw new Error("That sound is not available.");\n    return Uint8Array.from(atob(clips[id]), (character) => character.charCodeAt(0)).buffer;\n  }\n  globalThis.MeetSoundboardAudio = Object.freeze({ bytes });\n})();\n')
(root / 'assets/measurements.json').write_text(json.dumps(measurements,indent=2)+'\n')
print(f'Built {len(metadata)} effects. Audio rights are recorded in assets/sources.json.')
