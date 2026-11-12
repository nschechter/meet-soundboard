import hashlib
import json
import pathlib
import subprocess
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
extension = root / 'extension'
manifest = json.loads((extension / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest['permissions'] == ['storage']
assert int(manifest['minimum_chrome_version']) >= 114
assert len(manifest['description']) <= 132
expected = {
    'manifest.json', 'sounds.js', 'audio.js', 'engine.js', 'panel.js',
    'panel-style.js', 'popup.html', 'popup.css', 'popup.js', 'SOUND-CREDITS.txt',
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
assert len(sources) == 15 and all(s['license'] == 'CC0-1.0' for s in sources)
assert 'quote_' not in (extension / 'sounds.js').read_text()
assert 'quote_' not in (extension / 'audio.js').read_text()
destination = root / 'dist'
destination.mkdir(exist_ok=True)
archive_path = destination / f"meet-soundboard-{manifest['version']}.zip"
with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(expected):
        entry = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, (extension / name).read_bytes())
with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None
    assert 'manifest.json' in archive.namelist()
digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
(destination / 'SHA256SUMS.txt').write_text(f'{digest}  {archive_path.name}\n')
print(f'Packaged {len(expected)} files into {archive_path.name}. Run npm test before release.')
