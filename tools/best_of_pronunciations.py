#!/usr/bin/env python3
"""
Best-of pronunciation clips, judged by speech recognition.

For every item with a `speak` field: render N candidate takes through
ElevenLabs (language forced per item, so a Portuguese word is read as
Portuguese, a Spanish wine as Spanish), transcribe each take with Whisper in
that same language, score it against the intended text, and keep the clearest
3 as audio/<id>-1..3.mp3. Writes tools/pronunciation_audit.json with every
take's transcript and score so low scorers can be checked by ear.

Usage (needs ELEVENLABS_API_KEY and a python with faster-whisper):
    python tools/best_of_pronunciations.py [--only id1,id2]
"""
import os, re, sys, json, difflib, unicodedata, pathlib, tempfile, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import generate_pronunciations as g

LANG = {  # default pt
  "ing-brazilnut":"en","ing-plantain":"en","ing-tilefish":"en","ing-jonahcrab":"en",
  "ing-hiramasa":"en","ing-oleo":"en","ing-pox":"es",
  "d29":"es","d30":"es","d31":"es","d38":"es","d33":"it","d36":"fr",
}
MODEL = "eleven_turbo_v2_5"
TAKES = int(os.environ.get("TAKES", "6"))
KEEP = 3

def norm(t):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", t.lower()).encode("ascii", "ignore").decode())

def synth(text, key, voice, lang):
    body = {"text": text, "model_id": MODEL, "language_code": lang,
            "voice_settings": {"stability": 0.7, "similarity_boost": 0.75, "speed": 0.8}}
    r = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        data=json.dumps(body).encode(), method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    return urllib.request.urlopen(r, timeout=60).read()

def main():
    from faster_whisper import WhisperModel
    key = os.environ["ELEVENLABS_API_KEY"]
    only = None
    if "--only" in sys.argv: only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    asr = WhisperModel("small", device="cpu", compute_type="int8")
    out = g.OUT; out.mkdir(exist_ok=True)
    audit = {}
    for n, it in enumerate(g.items()):
        if only and it["id"] not in only: continue
        lang = LANG.get(it["id"], "pt")
        takes = []
        for k in range(TAKES):
            vname, vid = g.VOICE_POOL[(n + k * 3) % len(g.VOICE_POOL)]
            try: audio = synth(it["speak"], key, vid, lang)
            except Exception as e: print("  fail", it["id"], vname, e); continue
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                f.write(audio); path = f.name
            heard = " ".join(s.text for s in asr.transcribe(path, language=lang, beam_size=3)[0]).strip()
            os.unlink(path)
            score = difflib.SequenceMatcher(None, norm(it["speak"]), norm(heard)).ratio()
            takes.append({"voice": vname, "heard": heard, "score": round(score, 2), "audio": audio})
        takes.sort(key=lambda t: -t["score"])
        best = takes[:KEEP]
        for i, t in enumerate(best, 1):
            (out / f"{it['id']}-{i}.mp3").write_bytes(t["audio"])
        audit[it["id"]] = {"speak": it["speak"], "lang": lang,
            "kept": [{k: t[k] for k in ("voice", "heard", "score")} for t in best],
            "dropped": [{k: t[k] for k in ("voice", "heard", "score")} for t in takes[KEEP:]]}
        print(f"  {it['id']:>14} {it['speak']:<30} kept {[t['score'] for t in best]}")
    p = ROOT / "tools" / "pronunciation_audit.json"
    prev = json.loads(p.read_text()) if p.exists() else {}
    prev.update(audit); p.write_text(json.dumps(prev, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
