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
    ('applause', 'Applause', '👏', 'Reactions', 'green', 1.5, 3.2, ''),
    ('rimshot', 'Ba dum tss', '🥁', 'Comedy', 'purple', 4.48, 2.15, ''),
    ('ding', 'Correct!', '✨', 'Reactions', 'yellow', 0, 1.6, ''),
    ('boo', 'BOOOOO!', '👎', 'Reactions', 'orange', .94, 3.8, 'acompressor=threshold=0.1:ratio=3:attack=5:release=100,'),
    ('eggs', 'Egg attack', '🥚', 'Comedy', 'yellow', 0, .3, ''),
    ('tomato', 'Tomato splat', '🍅', 'Comedy', 'orange', 0, .534, ''),
    ('scratch', 'Record scratch', '💿', 'Comedy', 'purple', .4, .85, ''),
    ('buzzer', 'Wrong answer', '❌', 'Reactions', 'blue', .035, .61, ''),
    ('laugh', 'Laugh track', '😂', 'Comedy', 'yellow', .57, 2.05, ''),
    ('cash', 'Cha-ching!', '💸', 'Reactions', 'green', .48, 1.5, ''),
    ('quack', 'Quack', '🦆', 'Comedy', 'yellow', 0, .383, ''),
    ('crickets', 'Crickets', '🦗', 'Comedy', 'green', 1, 2.7, 'highpass=f=800,'),
    ('trombone', 'Sad trombone', '🎺', 'Comedy', 'blue', .22, 4.68, ''),
    ('boom', 'Dramatic boom', '💥', 'Hype', 'orange', 0, 1.344, '')
]
metadata, encoded, measurements = [], {}, []

rate = 44100

def read_clip(key, start, duration, filters=''):
    command = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(sources / f'{key}.mp3'), '-t', str(duration), '-ac', '1', '-ar', str(rate), '-af', filters + 'highpass=f=35', '-f', 'f32le', '-']
    return array.array('f', subprocess.check_output(command))

def splats(key):
    layers = []
    for delay, speed in [(0, 1), (.38, 1.12), (.8, .92)]:
        filters = f'aresample={rate},asetrate={round(rate*speed)},aresample={rate},'
        wet = read_clip('tomato', 0, .6, filters)
        wet_peak = max(map(abs, wet))
        layers.append((delay, [v / wet_peak * (.45 if key == 'eggs' else 1) for v in wet]))
        if key == 'eggs':
            crack = read_clip('eggs', 0, .3, filters)
            crack_peak = max(map(abs, crack))
            layers.append((delay, [v / crack_peak for v in crack]))
    pcm = array.array('f', [0]) * max(round(delay*rate) + len(clip) for delay, clip in layers)
    for delay, clip in layers:
        offset = round(delay*rate)
        for i, value in enumerate(clip):
            pcm[offset+i] += value
    return pcm

for key, name, icon, category, color, start, duration, filters in settings:
    pcm = splats(key) if key in ('eggs', 'tomato') else read_clip(key, start, duration, filters)
    peak = max(map(abs, pcm))
    blocks = [math.sqrt(sum(v*v for v in pcm[i:i+441])/len(pcm[i:i+441])) for i in range(0, len(pcm), 441)]
    active = [v for v in blocks if v > max(blocks)*.1]
    rms = math.sqrt(sum(v*v for v in active)/len(active))
    gain = min(.79/peak, (.22 if key == 'boo' else .14)/rms)
    fade_out = {'applause': .22, 'crickets': .12, 'boo': .3, 'laugh': .15, 'cash': .12}.get(key, .035)
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
print(f'Built {len(metadata)} CC0 effects.')
