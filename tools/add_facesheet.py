#!/usr/bin/env python3
"""Add a Hall PR "Media Visit Face Sheet" PDF to Lineup's Who's Coming section.

Step 1, extract (nothing is published):
    python3 tools/add_facesheet.py qa/facesheets/2026-10-21.pdf 2026-10-21
  Prints each person parsed from the sheet (name, outlet line, Instagram, short bio, time)
  and saves every embedded photo to qa/facesheets/2026-10-21/img_N.jpg.
  Open those images and decide which photo is which person (the Hall logo is usually img_0).

Step 2, assign photos and write the entries:
    python3 tools/add_facesheet.py qa/facesheets/2026-10-21.pdf 2026-10-21 \
        --assign img_1=adam-reiner --assign img_2=devorah-lev-tov --write
  Resizes each assigned photo to 400px wide JPEG at img/press/<slug>.jpg (served at
  https://staff.iara.nyc/img/press/<slug>.jpg) and merges the entries into the iara Inbox's
  app/src/data/facesheets.json (keyed by date + name, so re-running replaces, never duplicates).

Step 3: read the bios in facesheets.json (trim if needed; only text from the sheet), then commit
  img/press/*.jpg here and push, and ship the Inbox (cd ~/Claude/iara-inbox/app && npm run ship).
"""
import argparse, json, os, re, sys, unicodedata
import fitz  # PyMuPDF
from PIL import Image

HUB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.expanduser("~/Claude/iara-inbox/app/src/data/facesheets.json")
NAME = r"[A-Z][\w'’.-]+(?:[ -][A-Z][\w'’.-]+)+"


def slugify(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def parse(text):
    lines = [l.strip() for l in text.splitlines()]
    flat = re.sub(r"\s+", " ", text)
    m = re.search(r"at (\d{1,2}(?::\d{2})?\s*[AP]M)", flat, re.I)
    time = m.group(1).upper().replace(" ", " ") if m else ""
    if time and ":" not in time: time = re.sub(r"(\d+)\s*", r"\1:00 ", time, 1).strip()
    people = []
    for nm in dict.fromkeys(re.findall(rf"(?:^|\n)\s*({NAME}) is (?:a|an|the)\b", text)):
        bio_m = re.search(re.escape(nm) + r" is .*?(?=Recent Coverage|$)", flat)
        sents = re.findall(r".+?[.!?](?=\s|$)", bio_m.group(0)) if bio_m else []
        bio = ""
        for s in sents:
            if bio and len(bio) + len(s) > 320: break
            bio = (bio + " " + s.strip()).strip()
        outlet, ig = "", ""
        if nm in lines:
            i = lines.index(nm) + 1
            buf = []
            while i < len(lines) and not lines[i].lower().startswith("instagram"):
                if lines[i]: buf.append(lines[i])
                i += 1
            outlet = " ".join(buf)
            if i < len(lines): ig = lines[i].split("@", 1)[-1].strip() if "@" in lines[i] else ""
        people.append({"name": nm, "slug": slugify(nm), "outletLine": re.sub(r"\s+", " ", outlet).strip(), "instagram": ig, "bio": bio.replace("–", "-").replace("—", ", "), "time": time})
    return people


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf"); ap.add_argument("date", help="visit date, YYYY-MM-DD")
    ap.add_argument("--assign", action="append", default=[], help="img_N=slug (repeatable)")
    ap.add_argument("--write", action="store_true", help="resize assigned photos and merge into facesheets.json")
    a = ap.parse_args()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", a.date): sys.exit("date must be YYYY-MM-DD")
    doc = fitz.open(a.pdf)
    people = parse("\n".join(p.get_text() for p in doc))
    outdir = os.path.join(HUB, "qa", "facesheets", a.date); os.makedirs(outdir, exist_ok=True)
    n = 0
    for page in doc:
        for im in page.get_images(full=True):
            pix = fitz.Pixmap(doc, im[0])
            if pix.n - pix.alpha >= 4: pix = fitz.Pixmap(fitz.csRGB, pix)
            path = os.path.join(outdir, f"img_{n}.png"); pix.save(path)
            Image.open(path).convert("RGB").save(path[:-4] + ".jpg", quality=90); os.remove(path)
            print(f"photo img_{n}: {pix.width}x{pix.height} -> {path[:-4]}.jpg"); n += 1
    print(json.dumps(people, ensure_ascii=False, indent=2))
    if not a.write: print("\nNext: look at the photos, then re-run with --assign img_N=<slug> ... --write"); return
    assign = dict(x.split("=", 1) for x in a.assign)
    os.makedirs(os.path.join(HUB, "img", "press"), exist_ok=True)
    have = {}
    for key, slug in assign.items():
        src = os.path.join(outdir, key + ".jpg")
        img = Image.open(src).convert("RGB"); img.thumbnail((400, 400 * 4))
        img.save(os.path.join(HUB, "img", "press", slug + ".jpg"), quality=82, optimize=True, progressive=True)
        have[slug] = f"https://staff.iara.nyc/img/press/{slug}.jpg"
    store = json.load(open(STORE)) if os.path.exists(STORE) else []
    for p in people:
        e = {"date": a.date, "time": p["time"], "name": p["name"], "outletLine": p["outletLine"], "bio": p["bio"], "instagram": p["instagram"]}
        if p["slug"] in have: e["headshot"] = have[p["slug"]]
        else: print(f"warning: no photo assigned to {p['name']} (slug {p['slug']})")
        store = [x for x in store if not (x["date"] == a.date and x["name"] == p["name"])] + [e]
    store.sort(key=lambda x: (x["date"], x["name"]))
    with open(STORE, "w") as f: json.dump(store, f, ensure_ascii=False, indent=2); f.write("\n")
    print(f"wrote {len(people)} entries to {STORE}")


if __name__ == "__main__":
    main()
