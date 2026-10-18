#!/usr/bin/env python3
"""Stamp every /kit/* (and /lineup.js) include with ?v=<content hash>.

Run before every commit that touches kit/ or lineup.js:   python3 tools/version_assets.py
(--check exits 1 if anything is stale, without writing.)

Why: vercel.json gives /kit/* URLs that carry ?v= a one-year immutable cache,
and sw.js serves them cache-first. That is only safe because the hash changes
whenever the file does, so a page always asks for the exact kit it was built
with. Unversioned /kit/ URLs keep the old network-first handling (the
2026-10-13 stale-kit bug came from cache-first on UNversioned kit files).
"""
import hashlib, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = sorted(ROOT.glob("*.html")) + [ROOT / "sw.js"]
ASSET = re.compile(r'(?P<pre>=["\']|["\']\.?)(?P<path>/kit/[\w./-]+\.(?:css|js|svg)|/lineup\.js)(?:\?v=[0-9a-f]+)?(?=["\'])')

def digest(rel):
    f = ROOT / rel.lstrip("/")
    return hashlib.sha256(f.read_bytes()).hexdigest()[:10] if f.is_file() else None

def stamp(text):
    def rep(m):
        h = digest(m.group("path"))
        return m.group(0) if not h else f'{m.group("pre")}{m.group("path")}?v={h}'
    return ASSET.sub(rep, text)

stale = []
for p in PAGES:
    if not p.exists():
        continue
    old = p.read_text()
    new = stamp(old)
    if new != old:
        stale.append(p.name)
        if "--check" not in sys.argv:
            p.write_text(new)
print(("stale: " if "--check" in sys.argv else "stamped: ") + (", ".join(stale) or "nothing"))
sys.exit(1 if stale and "--check" in sys.argv else 0)
