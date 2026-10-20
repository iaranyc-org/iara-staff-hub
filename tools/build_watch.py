"""Rebuild the Watch List embed in lineup.js (moved out of iara_staff_hub.html 2026-10-17).

Inputs: watch_final.json (current roster), photo_staging_*.json + img/watch_staging
(verified photos and new people), watch_dossier.json (how they dine etc).
Output: watch_final.json and the /*WATCH_DATA*/ block in the page.
"""
import json, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = lambda f: os.path.join(ROOT, 'tools', f)

def load(f, default):
    try:
        d = json.load(open(T(f)))
    except FileNotFoundError:
        return default
    return d

roster = {p['slug']: p for p in load('watch_final.json', [])}

# Hall PR Look Book 2026 (tools/hallpr_lookbook_2026.md). Everyone in it is shown,
# new people are added, and Hall PR's intel is kept on each profile as hallIntel.
LOOKBOOK = load('hallpr_lookbook.json', [])
for e in LOOKBOOK:
    s = e['slug']
    if s not in roster:
        roster[s] = {'slug': s, 'name': e['name'], 'outlet': e.get('outlet', ''), 'role': e.get('role', ''),
                     'beat': '', 'note': '', 'group': e.get('group', 'Other Press'),
                     'sources': [e['source']] if e.get('source') else [], 'anonymous': False}
    roster[s]['hallIntel'] = e['hallIntel']

# New people from the roster expansion.
NEW_STATUS = {
    'melissa-mccart': ('Eater Regional Editor', 'Editor'),
    'alan-sytsma': ('NY Mag Food Editor', 'Editor'),
    'chris-crowley': ('Grub Street Writer', 'Food Writer'),
    'tammie-teclemariam': ('Underground Gourmet', 'Reviews Restaurants'),
    'bryan-kim': ('Infatuation NYC Lead', 'Reviews Restaurants'),
    'molly-fitzpatrick': ('Infatuation Writer', 'Reviews Restaurants'),
    'will-hartman': ('Infatuation Writer', 'Reviews Restaurants'),
    'willa-moore': ('Infatuation Writer', 'Reviews Restaurants'),
    'ellie-plass': ('Resy Writer', 'Food Writer'),
    'kate-krader': ('Bloomberg Food Editor', 'Editor'),
    'mahira-rivers': ('NYT Contributing Critic', 'Reviews Restaurants'),
    'sonal-shah': ('Infatuation NYC Editor', 'Editor'),
    'paolo-lucchesi': ('Head of Resy Editorial', 'Editor'),
    'beth-kracklauer': ('Freelance Food Editor', 'Food Writer'),
    'jay-cheshes': ('WSJ Contributor', 'Food Writer'),
    'brad-a-johnson': ('Independent Critic', 'Food Writer'),
    'frank-bruni': ('Former NYT Critic', 'Former Critic'),
    'julia-moskin': ('NYT Food Reporter', 'Food Writer'),
    'nick-digiovanni': ('Chef and Creator', 'Creator'),
    'jeremy-jacobowitz': ('Brunch Boys Creator', 'Creator'),
    'brian-lindo': ('Food Creator', 'Creator'),
    'morgan-carter': ('Time Out Food Editor', 'Editor'),
    'stephanie-wu': ('Eater Editor in Chief', 'Editor'),
    'jamila-robinson': ('Bon Appetit Editor', 'Editor'),
    'hunter-lewis': ('Food & Wine Editor', 'Editor'),
    'clare-reichenbach': ('James Beard CEO', 'Editor'),
    'gwendal-poullennec': ('Michelin Guide Director', 'Inspector'),
    'sam-sifton': ('NYT Editor', 'Editor'),
    'melissa-clark': ('NYT Food Columnist', 'Food Writer'),
    'ruth-reichl': ('Former NYT Critic', 'Former Critic'),
    'arthur-schwartz': ('Former Daily News Critic', 'Former Critic'),
    'david-chang': ('Chef and Podcaster', 'Creator'),
    'helen-rosner': ('Tables for Two Critic', 'Reviews Restaurants'),
}
REJECT_PHOTO = {'jay-cheshes', 'julia-moskin'}  # Cheshes: unverified avatar. Moskin: keep NYT byline portrait.
NO_PHOTO_NOTE = {
    'robert-sietsema': 'Hides his face in photos (a devil mask, a camera). Treat any regular solo diner taking notes seriously.',
}

for f in ['photo_staging_C_partA.json', 'photo_staging_C_partB.json']:
    for p in load(f, []):
        if not isinstance(p, dict) or not p.get('slug') or not p.get('name'):
            continue
        s = p['slug']
        cur = roster.get(s, {})
        cur.update({
            'slug': s, 'name': p['name'], 'outlet': p.get('outlet') or cur.get('outlet', ''),
            'role': p.get('role') or cur.get('role', ''), 'beat': p.get('beat') or cur.get('beat', ''),
            'note': p.get('note') or cur.get('note', ''), 'group': p.get('group') or cur.get('group', 'Other Press'),
            'sources': [x for x in (p.get('sources') or []) if str(x).startswith('http')][:1] or cur.get('sources', []),
            'anonymous': False,
        })
        if p.get('photo_file') and s not in REJECT_PHOTO:
            cur['_stage'] = p['photo_file']
            cur['_credit'] = p.get('photo_source_page') or ''
        roster[s] = cur

for f in ['photo_staging_A.json', 'photo_staging_B.json']:
    for p in load(f, []):
        if isinstance(p, dict) and p.get('accepted') and p.get('slug') in roster:
            roster[p['slug']]['_stage'] = p.get('file')
            roster[p['slug']]['_credit'] = p.get('source_page_url') or ''

roster.get('julia-moskin', {}).update({'group': 'NYT'})
roster.get('mahira-rivers', {}).update({'outlet': 'The New York Times', 'group': 'NYT', 'role': 'Contributing restaurant critic (since Nov 2025); former Michelin inspector'})
roster.get('ryan-sutton', {}).update({'outlet': 'The New York Times / The Lo Times', 'group': 'NYT', 'role': 'NYT contributing critic (since Nov 2025); runs The Lo Times'})
roster.setdefault('melissa-clark', {'slug': 'melissa-clark', 'name': 'Melissa Clark', 'outlet': 'The New York Times',
    'role': 'Food columnist, NYT Food and Cooking', 'beat': 'Recipes and home cooking; filled in on restaurant reviews in 2024',
    'note': 'Longtime NYT food columnist; widely recognized from NYT Cooking videos.', 'group': 'NYT',
    'sources': ['https://www.nytimes.com/by/melissa-clark'], 'anonymous': False})

def host(u):
    try:
        return u.split('/')[2].replace('www.', '')
    except Exception:
        return ''

for s, p in roster.items():
    stage = p.pop('_stage', None)
    credit = p.pop('_credit', '')
    if stage:
        src = stage if os.path.isabs(stage) else os.path.join(ROOT, stage)
        if os.path.exists(src):
            dst = os.path.join(ROOT, 'img', 'watch', s + '.jpg')
            shutil.copyfile(src, dst)
            p['photo'] = 'img/watch/' + s + '.jpg'
            p['photoCredit'] = {'text': host(credit) or 'verified source'}
    if not p.get('photo') and os.path.exists(os.path.join(ROOT, 'img', 'watch', s + '.jpg')):
        p['photo'] = 'img/watch/' + s + '.jpg'
        p['photoCredit'] = {'text': 'nytimes.com byline page' if s in ('julia-moskin', 'mahira-rivers') else 'verified source'}
    if not p.get('photo'):
        p['photo'] = None
        p['photoCredit'] = None
    if s in NO_PHOTO_NOTE and not p.get('note'):
        p['note'] = NO_PHOTO_NOTE[s]
    elif s in NO_PHOTO_NOTE:
        p['recognizeBy'] = NO_PHOTO_NOTE[s]
    if s in NEW_STATUS:
        p['shortRole'], p['status'] = NEW_STATUS[s]

dossier = load('watch_dossier.json', {'people': []})
for d in dossier.get('people', []):
    p = roster.get(d.get('slug'))
    if not p:
        continue
    for k in ('shortRole', 'status', 'ratingSystem', 'howTheyDine', 'caresAbout', 'recognizeBy', 'whyItMatters', 'relevanceToIara'):
        if d.get(k):
            p[k] = d[k]
    revs = [r for r in (d.get('recentReviews') or []) if isinstance(r, dict) and r.get('restaurant')]
    if revs:
        p['recentReviews'] = revs[:3]

# Extra photos: img/watch_more/<slug>/<n>.jpg, provenance in more_photos_*.json.
import glob
more_meta = {}
for f in sorted(glob.glob(T('more_photos_*.json'))):
    try:
        for m in json.load(open(f)):
            if isinstance(m, dict) and m.get('file'):
                more_meta[os.path.normpath(os.path.join(ROOT, m['file']) if not os.path.isabs(m['file']) else m['file'])] = m
    except Exception as e:
        print('skip', f, e)
PRIMARY = {'morgan-carter': 'img/watch/morgan-carter-r2-2.jpg'}  # clearest captioned face leads
REJECT_EXTRA = {'hunter-lewis/3.jpg', 'alan-sytsma/r2-5.jpg'}  # 'slug/n.jpg' entries rejected on visual review
# Same-shot duplicates (same photograph cropped/zoomed/recolored, or consecutive frames), Jay 2026-10-20.
# 'slug/lb.jpg' rejects the Hall PR Look Book copy as an extra photo.
REJECT_EXTRA |= {
    'willa-moore/r3-1.jpg',          # duplicate of willa-moore.jpg, Jay 2026-10-20
    'willa-moore/lb.jpg',            # duplicate of willa-moore.jpg (zoomed), Jay 2026-10-20
    'melissa-mccart/r3-1.jpg',       # duplicate of melissa-mccart.jpg, Jay 2026-10-20
    'melissa-mccart/2.jpg',          # duplicate of melissa-mccart-lb.jpg (wider crop), Jay 2026-10-20
    'stephanie-wu/3.jpg',            # duplicate of stephanie-wu-lb.jpg (text overlay), Jay 2026-10-20
    'ryan-sutton/lb.jpg',            # duplicate of ryan-sutton-r2-4.jpg (consecutive frame), Jay 2026-10-20
    'chris-crowley/lb.jpg',          # duplicate of chris-crowley.jpg, Jay 2026-10-20
    'bryan-kim/lb.jpg',              # duplicate of bryan-kim.jpg, Jay 2026-10-20
    'julia-moskin/lb.jpg',           # duplicate of julia-moskin.jpg, Jay 2026-10-20
    'prairie-rose/r4-3.jpg',         # duplicate of prairie-rose-lb.jpg (B&W copy), Jay 2026-10-20
    'hannah-goldfield/lb.jpg',       # duplicate of hannah-goldfield.jpg (B&W copy), Jay 2026-10-20
    'elyse-inamine/r3-1.jpg',        # duplicate of elyse-inamine-r3-2.jpg (circle crop), Jay 2026-10-20
    'dana-brown/r3-2.jpg',           # duplicate of dana-brown-r3-1.jpg (tighter crop), Jay 2026-10-20
    'mahira-rivers/lb.jpg',          # duplicate of mahira-rivers-3.jpg, Jay 2026-10-20
    'tejal-rao/4.jpg',               # duplicate of tejal-rao-lb.jpg (name caption), Jay 2026-10-20
    'adam-platt/lb.jpg',             # duplicate of adam-platt.jpg, Jay 2026-10-20
    'tammie-teclemariam/lb.jpg',     # duplicate of tammie-teclemariam-3.jpg, Jay 2026-10-20
    'stephanie-wu/r2-5.jpg',         # duplicate of stephanie-wu-2.jpg (zoomed), Jay 2026-10-20
}
for s_, p in roster.items():
    files = (sorted(glob.glob(os.path.join(ROOT, 'img', 'watch_more', s_, '*.jpg')))
             + sorted(glob.glob(os.path.join(ROOT, 'img', 'watch_more2', s_, '*.jpg')))
             + sorted(glob.glob(os.path.join(ROOT, 'img', 'watch_more3', s_, '*.jpg')))
             + sorted(glob.glob(os.path.join(ROOT, 'img', 'watch_more4', s_, '*.jpg'))))
    photos = []
    if p.get('photo'):
        photos.append({'src': p['photo'], 'credit': (p.get('photoCredit') or {}).get('text', '')})
    lb = os.path.join(ROOT, 'img', 'watch_lookbook', s_ + '.jpg')
    if os.path.exists(lb):
        lb_rel = f'img/watch/{s_}-lb.jpg'
        shutil.copyfile(lb, os.path.join(ROOT, lb_rel))
        if not p.get('photo'):
            p['photo'] = lb_rel
            p['photoCredit'] = {'text': 'Hall PR Look Book'}
            photos.append({'src': lb_rel, 'credit': 'Hall PR Look Book'})
        elif f'{s_}/lb.jpg' not in REJECT_EXTRA and not any(x['src'] == lb_rel for x in photos):
            photos.insert(1, {'src': lb_rel, 'credit': 'Hall PR Look Book'})
    for src in files:
        n = os.path.splitext(os.path.basename(src))[0]
        if 'watch_more2' in src:
            n = 'r2-' + n
        elif 'watch_more3' in src:
            n = 'r3-' + n
        elif 'watch_more4' in src:
            n = 'r4-' + n
        if f'{s_}/{n}.jpg' in REJECT_EXTRA:
            continue
        dst_rel = f'img/watch/{s_}-{n}.jpg'
        if any(x['src'] == dst_rel for x in photos):
            continue
        shutil.copyfile(src, os.path.join(ROOT, dst_rel))
        m = more_meta.get(os.path.normpath(src), {})
        credit = host(m.get('source_page') or '') or 'verified source'
        if n in ('1', 'r2-1') and not p.get('photo'):
            p['photo'] = dst_rel
            p['photoCredit'] = {'text': credit}
            photos.insert(0, {'src': dst_rel, 'credit': credit})
        else:
            photos.append({'src': dst_rel, 'credit': credit})
    lead = PRIMARY.get(s_)
    if lead and any(x['src'] == lead for x in photos):
        photos.sort(key=lambda x: x['src'] != lead)
        p['photo'] = lead
        p['photoCredit'] = {'text': photos[0]['credit']}
    p['photos'] = photos[:5]

OVERRIDES = {
    'chris-crowley': {'outlet': 'Caper Media (formerly Grub Street)', 'role': 'Food writer at Caper Media; formerly Grub Street senior writer',
                      'shortRole': 'Caper Founding Journalist', 'group': 'Food Media',
                      'note': 'Left New York magazine for Caper Media (Instagram bio, Oct 2026). Follows iara on Instagram.'},
    'sonal-shah': {'note': 'Infatuation NYC editor. Follows iara on Instagram.'},
    'ryan-sutton': {'note': 'NYT contributing critic since Nov 2025; also runs The Lo Times newsletter.'},
    'mahira-rivers': {'recognizeBy': 'Public NYT byline photo since Dec 2025. Former Michelin inspector, so expect a quiet, observant diner.',
                      'photoCredit': {'text': 'nytimes.com byline page'}},
}
for s_, o in OVERRIDES.items():
    if s_ in roster:
        roster[s_].update(o)

# Cut 2026-10-05: not likely to dine at iara, or recognizing them would not change service.
HIDE = {'gwendal-poullennec', 'clare-reichenbach', 'hunter-lewis', 'jamila-robinson', 'sam-sifton',
        'melissa-clark', 'julia-moskin', 'eric-asimov', 'kate-krader', 'beth-kracklauer', 'jay-cheshes',
        'brad-a-johnson', 'elazar-sontag', 'tom-sietsema', 'adam-platt', 'ruth-reichl', 'frank-bruni',
        'arthur-schwartz', 'dave-portnoy', 'david-chang', 'nick-digiovanni'}
for e in LOOKBOOK:
    p = roster[e['slug']]
    for k in ('status', 'shortRole'):
        if e.get(k):
            p[k] = e[k]
HIDE -= {e['slug'] for e in LOOKBOOK}  # Jay, 2026-10-13: show everyone in the Hall PR Look Book.

# Current roles from each person's own verified bio (2026-10-17, Jay approved). Applied
# after the Look Book block so its older shortRole does not overwrite them.
ROLE_UPDATES = {
    'tierney-plumb': {'outlet': 'Eater DC', 'role': 'Editor, Eater DC (per her Instagram bio)', 'shortRole': 'Eater DC Editor'},
    'kathleen-squires': {'outlet': 'Wirecutter (formerly The Wall Street Journal)',
                         'role': "Senior staff writer, Wirecutter's kitchen section; former WSJ columnist (per her Instagram bio)",
                         'shortRole': 'Wirecutter Staff Writer'},
    'chris-stang': {'role': 'Co-founder of The Infatuation; Chief Product Officer at Chase (per his Instagram bio)'},
    'paolo-lucchesi': {'role': 'Editor-in-Chief, Resy (per his Instagram bio)', 'shortRole': 'Resy Editor-in-Chief'},
}
for s_, o in ROLE_UPDATES.items():
    if s_ in roster:
        roster[s_].update(o)
for s_, p in roster.items():
    p['hidden'] = s_ in HIDE

# Need to Know tier (2026-10-17, Jay approved the rule). Rule: the person currently
# publishes reviews, ratings or rankings of NYC restaurants that send diners somewhere,
# judged from the role/status already in their profile. Editors who do not review,
# general food writers, creators, out-of-town critics and former critics stay in
# "Also Worth Knowing". Pete Wells (former critic, reporter now) and Hannah Goldfield
# (former Tables for Two critic, now staff writer) are out for that reason. The
# Michelin inspectors are in as a group; they are anonymous, so never in face drills.
NEED_TO_KNOW = {
    'ligaya-mishan', 'tejal-rao', 'mahira-rivers', 'ryan-sutton',   # NYT critics
    'luke-fortney',                                                 # NYT Where To Eat rankings
    'matthew-schneier', 'tammie-teclemariam',                       # New York Mag critic, Underground Gourmet
    'helen-rosner', 'shauna-lyon',                                  # New Yorker Tables for Two
    'nadia-chaudhury',                                              # Eater NY editor (maps, heatmaps)
    'bryan-kim', 'molly-fitzpatrick', 'will-hartman', 'willa-moore', 'kenny-yang',  # Infatuation NYC reviewers
    'morgan-carter',                                                # Time Out NY food editor (best-of lists)
    'robert-sietsema', 'steve-cuozzo',                              # Independent and NY Post critics
    'michelin-inspectors',
    'pete-wells', 'hannah-goldfield',                               # Jay 2026-10-18: former critics staff should still know on sight
}
ALIAS_RE_T = __import__('re').compile(r'(?i:under the name|alias(?: name)?(?: is|:)?|books? (?:as|under)|reservations? (?:are made )?(?:as|under))\s+["“]?([A-Z][a-z]+ [A-Z][a-zA-Z\'-]+)')
for s_, p in roster.items():
    if s_ in NEED_TO_KNOW:
        p['tier'] = 'need'
    else:
        p.pop('tier', None)
    txt = ' '.join(str(p.get(k) or '') for k in ('hallIntel', 'howTheyDine', 'recognizeBy', 'note'))
    al = sorted(set(m.group(1) for m in ALIAS_RE_T.finditer(txt)))
    if al:
        p['aliases'] = al
    else:
        p.pop('aliases', None)

out = list(roster.values())
json.dump(out, open(T('watch_final.json'), 'w'), indent=1, ensure_ascii=False)
out = [p for p in out if not p.get('hidden')]
raw_out = out

# --- Display cleanup (2026-10-17). watch_final.json stays raw; only the embed is cleaned. ---
# Verified profile links live in watch_links.json (slug -> {instagram, x, ...}, with _source/_verified).
import copy, re as _re
LINKS = load('watch_links.json', {})
LINK_ORDER = ['instagram', 'x', 'threads', 'bluesky', 'tiktok', 'linkedin', 'substack', 'website', 'authorPage']
OUTLET_FIX = [('New York magazine', 'New York Magazine'), ('Bon Appetit', 'Bon Appétit')]
STOP = set('a an the and or of to in on at for with his her their its is are was be by as from has have it this that he she they up so no not'.split())

def _sents(t):
    return [x.strip() for x in _re.split(r'(?<=[.!?])\s+(?=[A-Z"“])', _re.sub(r'\s+', ' ', t or '').strip()) if x.strip()]

def _words(t):
    return {w for w in _re.findall(r"[a-z0-9']+", t.lower()) if w not in STOP and len(w) > 1}

def _dupe(sent, seen):
    w = _words(sent)
    if len(w) < 3:
        return False
    for o in seen:
        if len(w & o) / len(w) >= 0.7:
            return True
    return False

HANDLE_SENT = _re.compile(r'^(?:(?:Twitter|Instagram|X|TikTok)(?: and (?:Twitter|Instagram))?:?\s*@[\w.]+[.,]?\s*)+$', _re.I)

def clean(p):
    p = copy.deepcopy(p)
    for k in ('outlet', 'role', 'shortRole'):
        v = _re.sub(r'\s+', ' ', p.get(k) or '').strip()
        for a, b in OUTLET_FIX:
            v = v.replace(a, b)
        p[k] = v
    links = {k: v for k, v in (LINKS.get(p['slug']) or {}).items() if k in LINK_ORDER and isinstance(v, str) and v.startswith('https://')}
    p['links'] = [{'type': k, 'url': links[k]} for k in LINK_ORDER if k in links]
    # Hall PR intel stays verbatim, except handle-only sentences now shown as link buttons.
    if p.get('hallIntel'):
        keep = []
        for s_ in _sents(p['hallIntel']):
            hs = {h.lower().rstrip('.') for h in _re.findall(r'@([\w.]+)', s_)}
            linked = {links[k].rstrip('/').rsplit('/', 1)[-1].lstrip('@').lower() for k in ('instagram', 'x', 'tiktok', 'threads') if k in links}
            if HANDLE_SENT.match(s_) and hs and hs <= linked:
                continue
            keep.append(s_)
        p['hallIntel'] = ' '.join(keep)
    # One home per fact: walk fields in display priority, drop sentences already said.
    seen = [_words(x) for x in _sents(p.get('role')) + _sents(p.get('hallIntel'))]
    for k in ('recognizeBy', 'howTheyDine', 'caresAbout', 'whyItMatters', 'relevanceToIara', 'ratingSystem', 'beat', 'note'):
        if not p.get(k):
            continue
        kept = []
        for s_ in _sents(p[k]) if k != 'beat' else [_re.sub(r'\s+', ' ', p[k]).strip()]:
            if _dupe(s_, seen):
                continue
            kept.append(s_)
            seen.append(_words(s_))
        v = ' '.join(kept).strip()
        if v:
            p[k] = v
        else:
            p.pop(k, None)
    for k in list(p):
        if isinstance(p[k], str) and not p[k].strip() and k not in ('slug', 'name'):
            p.pop(k)
    return p

out = [clean(p) for p in out]

# Photos with the person's name printed on them (caption, slide title) give the answer
# away, so face drills and exam questions skip them. They still show on the profile.
# Found on visual review, 2026-10-17. Tejal Rao's tejal-rao-2 shows "Mishan &", which
# would mislead too.
NO_QUIZ_PHOTO = {'img/watch/ligaya-mishan-2.jpg', 'img/watch/tejal-rao-2.jpg', 'img/watch/tejal-rao-4.jpg',
                 'img/watch/pete-wells-3.jpg', 'img/watch/keith-lee-2.jpg', 'img/watch/nikita-richardson-r3-1.jpg'}
for p in out:
    for ph in p.get('photos') or []:
        if ph.get('src') in NO_QUIZ_PHOTO:
            ph['noQuiz'] = True

page = os.path.join(ROOT, 'lineup.js')
s = open(page, encoding='utf-8').read()
a = s.index('/*WATCH_DATA*/') + len('/*WATCH_DATA*/')
b = s.index('/*END_WATCH_DATA*/')
s = s[:a] + json.dumps(out, ensure_ascii=False, indent=1).replace('</', '<\\/').replace('"img/watch/', '"/img/watch/') + s[b:]
open(page, 'w', encoding='utf-8').write(s)
# lineup.js is served with a content hash; refresh it so the new data isn't cached away.
import subprocess; subprocess.run(['python3', os.path.join(ROOT, 'tools', 'version_assets.py')], check=True)

from collections import Counter
print(len(out), 'people;', sum(1 for p in out if p['photo']), 'with photo')
print(Counter(p.get('status') for p in out))
print('photo counts:', Counter(len(p.get('photos', [])) for p in out))
print('no photo:', [p['name'] for p in out if not p['photo']])
print('no status:', [p['name'] for p in out if not p.get('status')])

# Bom Dia's Watch List Alert reads a copy of this list (names + Hall PR booking
# aliases) from the iara Inbox worker, so refresh it on every build; otherwise a
# critic added here would never be flagged in the morning email.
import re
ALIAS_RE = re.compile(r'(?i:under the name|alias(?: name)?(?: is|:)?|books? (?:as|under)|reservations? (?:are made )?(?:as|under))\s+["“]?([A-Z][a-z]+ [A-Z][a-zA-Z\'-]+)')
wl = []
for p in raw_out:
    txt = ' '.join(str(p.get(k) or '') for k in ('hallIntel', 'howTheyDine', 'recognizeBy', 'note'))
    wl.append({'name': p['name'], 'outlet': p.get('outlet', ''), 'role': p.get('shortRole') or p.get('role', ''),
               'match': [x.strip() for x in p['name'].split('&')],
               'aliases': sorted(set(m.group(1) for m in ALIAS_RE.finditer(txt)))})
wl_path = os.path.expanduser('~/Claude/iara-inbox/ig-worker/watchlist.json')
if os.path.isdir(os.path.dirname(wl_path)):
    json.dump(wl, open(wl_path, 'w'), ensure_ascii=False, indent=1)
    print('bom dia watchlist:', len(wl), 'people,', sum(1 for w in wl if w['aliases']), 'with aliases ->', wl_path)

# The iara Inbox manager app (staff.iara.nyc/inbox/watch) shows the same Watch List. It gets the
# display-cleaned, non-hidden list from this build (never hand-copied), with absolute image URLs and
# the booking aliases its reservation matcher needs (same rule as ig-worker/reviews.mjs).
full_path = os.path.expanduser('~/Claude/iara-inbox/app/src/data/watchlist.full.json')
if os.path.isdir(os.path.dirname(os.path.dirname(full_path))):
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    alias_by = {w['name']: w for w in wl}
    ABS = 'https://staff.iara.nyc/'
    def _abs(u):
        return ABS + u.lstrip('/') if isinstance(u, str) and u.lstrip('/').startswith('img/') else u
    full = []
    for p in out:
        q = copy.deepcopy(p)
        q['photo'] = _abs(q.get('photo'))
        q['photos'] = [dict(ph, src=_abs(ph.get('src'))) for ph in (q.get('photos') or [])]
        w = alias_by.get(q['name'], {})
        q['match'] = w.get('match', [q['name']])
        q['aliases'] = sorted(set((q.get('aliases') or []) + (w.get('aliases') or [])))
        full.append(q)
    json.dump(full, open(full_path, 'w'), ensure_ascii=False, indent=1)
    print('inbox watchlist:', len(full), 'people ->', full_path)
