#!/usr/bin/env python3
"""
Generate Brazilian Portuguese pronunciation clips for every iara menu item.

Reads the `speak:` field of each item in iara_staff_hub.html, sends it to the
ElevenLabs TTS API with a pt-BR voice, and writes audio/<id>.mp3.

Usage:
    export ELEVENLABS_API_KEY=sk_...
    python3 tools/generate_pronunciations.py            # only missing clips
    python3 tools/generate_pronunciations.py --force    # regenerate everything

Why files instead of the browser's speechSynthesis: voice availability differs
per device, so the same dish can be read by a different (or plainly wrong)
voice on each phone. Pre-rendered clips sound identical everywhere and work
offline once cached.
"""
import os, re, sys, json, pathlib, urllib.request, urllib.error

ROOT  = pathlib.Path(__file__).resolve().parent.parent
HTML  = ROOT / "iara_staff_hub.html"
OUT   = ROOT / "audio"

# Multilingual v2 handles pt-BR well. Override with ELEVENLABS_VOICE_ID.
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
MODEL_ID = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")

ITEM_RE = re.compile(
    r'\{\s*id:"(?P<id>[^"]+)",\s*category:"[^"]*",\s*name:"(?P<name>[^"]*)",'
    r'\s*pronunciation:"[^"]*",\s*speak:"(?P<speak>[^"]*)"'
)

def items():
    src = HTML.read_text(encoding="utf-8")
    seen, out = set(), []
    for m in ITEM_RE.finditer(src):
        d = m.groupdict()
        if d["speak"] and d["id"] not in seen:
            seen.add(d["id"]); out.append(d)
    return out

def synth(text, key):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        data=json.dumps({
            "text": text,
            "model_id": MODEL_ID,
            # slight stability bump keeps short proper nouns from being clipped
            "voice_settings": {"stability": 0.55, "similarity_boost": 0.8},
        }).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json",
                 "Accept": "audio/mpeg"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def main():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set. Create one at\n"
                 "  https://elevenlabs.io/app/settings/api-keys\n"
                 "then:  export ELEVENLABS_API_KEY=sk_...")
    force = "--force" in sys.argv
    OUT.mkdir(exist_ok=True)
    todo = items()
    print(f"{len(todo)} items; voice={VOICE_ID} model={MODEL_ID}")
    made = skipped = 0
    for it in todo:
        dest = OUT / f"{it['id']}.mp3"
        if dest.exists() and not force:
            skipped += 1; continue
        try:
            dest.write_bytes(synth(it["speak"], key))
            made += 1
            print(f"  ok   {it['id']:>4}  {it['speak']}")
        except urllib.error.HTTPError as e:
            print(f"  FAIL {it['id']:>4}  {it['speak']}  HTTP {e.code} {e.read()[:200]!r}")
        except Exception as e:
            print(f"  FAIL {it['id']:>4}  {it['speak']}  {e}")
    print(f"\nwrote {made}, skipped {skipped} already present -> {OUT}")

if __name__ == "__main__":
    main()
