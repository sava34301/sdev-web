#!/usr/bin/env python3
"""Builds public/arduino/library-index.json — a compact copy of Arduino's
official Library Manager index (every library, latest version only).
Run:  python3 scripts/build-arduino-library-index.py
"""
import gzip, json, urllib.request, io, re

URL = 'https://downloads.arduino.cc/libraries/library_index.json.gz'
raw = urllib.request.urlopen(URL).read()
data = json.load(gzip.open(io.BytesIO(raw)))

def ver(v):
    return [int(p) if p.isdigit() else 0 for p in re.split(r'[.\-+]', v)[:4]]

latest = {}
for lib in data['libraries']:
    cur = latest.get(lib['name'])
    if cur is None or ver(lib['version']) > ver(cur['version']):
        latest[lib['name']] = lib

out = []
for name in sorted(latest, key=str.lower):
    l = latest[name]
    out.append([
        name,
        l['version'],
        l.get('providesIncludes') or [],
        (l.get('sentence') or '')[:140],
        l.get('category') or '',
        l.get('architectures') or ['*'],
        l.get('author', '')[:60],
    ])

with open('public/arduino/library-index.json', 'w') as f:
    json.dump({'fields': ['name', 'version', 'includes', 'sentence', 'category', 'architectures', 'author'], 'count': len(out), 'libraries': out}, f, separators=(',', ':'), ensure_ascii=False)
print(len(out), 'libraries')
