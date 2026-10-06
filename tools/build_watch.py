"""Rebuild the Watch List embed in iara_staff_hub.html.

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
    'ryan-sutton': 'Showed his face publicly in Nov 2025, but no captioned solo photo exists yet. Pays by Apple Pay, so no name on the card.',
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

OVERRIDES = {
    'mahira-rivers': {'recognizeBy': 'Public NYT byline photo since Dec 2025. Former Michelin inspector, so expect a quiet, observant diner.',
                      'photoCredit': {'text': 'nytimes.com byline page'}},
}
for s_, o in OVERRIDES.items():
    if s_ in roster:
        roster[s_].update(o)

out = list(roster.values())
json.dump(out, open(T('watch_final.json'), 'w'), indent=1, ensure_ascii=False)

page = os.path.join(ROOT, 'iara_staff_hub.html')
s = open(page, encoding='utf-8').read()
a = s.index('/*WATCH_DATA*/') + len('/*WATCH_DATA*/')
b = s.index('/*END_WATCH_DATA*/')
s = s[:a] + json.dumps(out, ensure_ascii=False, indent=1).replace('</', '<\\/') + s[b:]
open(page, 'w', encoding='utf-8').write(s)

from collections import Counter
print(len(out), 'people;', sum(1 for p in out if p['photo']), 'with photo')
print(Counter(p.get('status') for p in out))
print('no photo:', [p['name'] for p in out if not p['photo']])
print('no status:', [p['name'] for p in out if not p.get('status')])
