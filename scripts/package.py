import hashlib
import argparse
import json
import pathlib
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--candidate', action='store_true', help='Create a local review ZIP while audio rights remain unresolved.')
parser.add_argument('--allow-unverified-audio', action='store_true', help='Package the selected recordings without claiming redistribution clearance.')
arguments = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
extension = root / 'extension'
manifest = json.loads((extension / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest['permissions'] == ['storage']
assert int(manifest['minimum_chrome_version']) >= 114
assert len(manifest['description']) <= 132
expected = {
    'manifest.json', 'sounds.js', 'audio.js', 'engine.js', 'panel.js',
    'panel-style.js', 'clip-editor.js', 'popup.html', 'popup.css', 'popup.js', 'SOUND-CREDITS.txt',
    'privacy.html', 'icons/icon-16.png', 'icons/icon-48.png', 'icons/icon-128.png'
}
actual = {p.relative_to(extension).as_posix() for p in extension.rglob('*') if p.is_file()}
assert actual == expected, f'Unexpected extension files: {actual ^ expected}'
for script in manifest['content_scripts']:
    assert script['matches'] == ['https://meet.google.com/*']
    for name in script['js']:
        assert name in expected
for file in extension.glob('*.js'):
    subprocess.run(['node', '--check', str(file)], check=True)
sources = json.loads((root / 'assets/sources.json').read_text())
assert len(sources) == 15
unresolved = [s['id'] for s in sources if s['license'] != 'CC0-1.0']
if unresolved and not arguments.candidate and not arguments.allow_unverified_audio:
    raise SystemExit('Redistribution clearance is unverified for: ' + ', '.join(unresolved) + '. See SOUND-CREDITS.txt. Use --candidate for a local review ZIP, or --allow-unverified-audio to package these recordings explicitly.')
destination = root / 'dist'
destination.mkdir(exist_ok=True)
suffix = '-candidate' if arguments.candidate else ''
archive_path = destination / f"meet-soundboard-{manifest['version']}{suffix}.zip"
package_files = {name: extension / name for name in expected}
package_files['LICENSE'] = root / 'LICENSE'
with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, file in sorted(package_files.items()):
        entry = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, file.read_bytes())
with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None
    assert 'manifest.json' in archive.namelist()
    assert archive.read('LICENSE') == (root / 'LICENSE').read_bytes()
digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
(destination / 'SHA256SUMS.txt').write_text(f'{digest}  {archive_path.name}\n')
print(f'Packaged {len(package_files)} files into {archive_path.name}. Run npm test before release.')
if unresolved:
    print('Redistribution clearance is still needed for: ' + ', '.join(unresolved) + '.')
