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

MODEL_ID = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")

# These clips teach an English speaker to say a Brazilian dish name, so they are
# rendered slowly and deliberately rather than at conversational pace.
SPEED      = float(os.environ.get("ELEVENLABS_SPEED", "0.8"))   # 0.7 slowest .. 1.2
STABILITY  = float(os.environ.get("ELEVENLABS_STABILITY", "0.7"))
SIMILARITY = float(os.environ.get("ELEVENLABS_SIMILARITY", "0.75"))

# A rotating cast, so the menu is not read by one voice end to end. All are
# ElevenLabs premade voices, which is what a free account can use via the API;
# shared-library voices (which include native Brazilian accents) are paid only.
VOICE_POOL = [
    ("Brian",   "nPczCjzI2devNBz1zQrb"),
    ("Sarah",   "EXAVITQu4vr4xnSDxMaL"),
    ("Chris",   "iP95p4xoKVk53GoZ742B"),
    ("Alice",   "Xb7hH8MSUJpSbSDYk0k2"),
    ("Will",    "bIHbv24MWmeRgasZH58o"),
    ("Matilda", "XrExE9yKIg1WjnnlVkGX"),
    ("Eric",    "cjVigY5qzO86Huf0OWal"),
    ("Jessica", "cgSgspJ2msm6clMCkdW9"),
    ("River",   "SAz9YHcvj6GT2YYXdXww"),
    ("Laura",   "FGY2WhTYpPnrIDTdsKH5"),
]

VARIANTS = int(os.environ.get("ELEVENLABS_VARIANTS", "3"))

def voices_for(index):
    """Pick VARIANTS distinct voices for one item, stable across reruns.

    Hearing the same word from several speakers is what builds recognition, so
    each dish gets a small panel of voices rather than one. The 0/3/7 offsets
    are coprime-ish with a 10-voice pool, so the three are always different and
    the pool stays evenly used across the menu. The pool alternates male and
    female, so a trio is normally mixed."""
    offsets = [0, 3, 7, 1, 5, 9][:VARIANTS]
    return [VOICE_POOL[(index + o) % len(VOICE_POOL)] for o in offsets]

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

def synth(text, key, voice_id):
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        data=json.dumps({
            "text": text,
            "model_id": MODEL_ID,
            "voice_settings": {
                "stability": STABILITY,
                "similarity_boost": SIMILARITY,
                "speed": SPEED,
            },
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
    todo = sorted(items(), key=lambda d: int(re.sub(r"\D", "", d["id"]) or 0))
    print(f"{len(todo)} items x {VARIANTS} voices; model={MODEL_ID} speed={SPEED} "
          f"from a pool of {len(VOICE_POOL)}")
    made = skipped = 0
    for n, it in enumerate(todo):
        chosen = voices_for(n)
        names = []
        for v, (vname, vid) in enumerate(chosen, start=1):
            dest = OUT / f"{it['id']}-{v}.mp3"
            names.append(vname)
            if dest.exists() and not force:
                skipped += 1; continue
            try:
                dest.write_bytes(synth(it["speak"], key, vid))
                made += 1
            except urllib.error.HTTPError as e:
                print(f"  FAIL {it['id']}-{v}  {it['speak']}  HTTP {e.code} {e.read()[:200]!r}")
            except Exception as e:
                print(f"  FAIL {it['id']}-{v}  {it['speak']}  {e}")
        print(f"  ok   {it['id']:>4}  {it['speak']:<28} {', '.join(names)}")
    print(f"\nwrote {made}, skipped {skipped} already present -> {OUT}")
    print(f"{len(todo)} items x {VARIANTS} voices")

if __name__ == "__main__":
    main()
