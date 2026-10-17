import os,re,json,sys,difflib,unicodedata
sys.path.insert(0,'tools'); import generate_pronunciations as g, best_of_pronunciations as b
from faster_whisper import WhisperModel
def phon(t):
    t=t.lower().replace('ç','s')
    t=unicodedata.normalize('NFD',t).encode('ascii','ignore').decode()
    t=re.sub(r'[^a-z]','',t)
    for a,c in [('ch','x'),('sh','x'),('lh','ly'),('nh','ny'),('qu','k'),('ss','s'),('ph','f'),('th','t'),('w','u'),('y','i')]: t=t.replace(a,c)
    t=re.sub(r'c(?=[ei])','s',t); t=t.replace('c','k'); t=t.replace('h','')
    t=re.sub(r'(.)\1+',r'\1',t)
    return t
m=WhisperModel("large-v3",device="cpu",compute_type="int8")
items={d['id']:d['speak'] for d in g.items()}
out={}
for i,sp in items.items():
    lang=b.LANG.get(i,'pt')
    for v in (1,2,3):
        f=f"audio/{i}-{v}.mp3"
        h=" ".join(s.text for s in m.transcribe(f,language=lang,beam_size=5)[0]).strip()
        sc=round(difflib.SequenceMatcher(None,phon(sp),phon(h)).ratio(),2)
        out[f"{i}-{v}"]=[sc,sp,h]
        json.dump(out,open(os.environ['SP']+'/judge.json','w'),ensure_ascii=False)
print('done',len(out))
