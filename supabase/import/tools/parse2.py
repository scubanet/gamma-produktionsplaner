import openpyxl, re, json
from collections import Counter
U='/root/.claude/uploads/cc96d110-c9dd-54a2-9fa5-686be7f5c8f4/'
OUT='/tmp/claude-0/-home-claude/cc96d110-c9dd-54a2-9fa5-686be7f5c8f4/scratchpad/sb/import/'
SZ=openpyxl.load_workbook(U+'46a88a72-Systemzuteilung_Winter_Collection_2026_27_5.xlsx')
FB=openpyxl.load_workbook(U+'e1fd28e1-F__B_Spengler_Cup_2026_Margrip_Mengen_GP.xlsx')
K=json.load(open(OUT+'katalog.json'))
def s(v):
    if v is None: return None
    v=str(v).strip(); return v or None
# owner of komponente row
owner={}
for gk,gz,pos,b,ver,tz,menge in K['links']:
    owner.setdefault(((ver or gk),tz),Counter())[(gk,gz)]+=1
STOP={'mit','und','von','aus','dem','der','die','den','an','auf','in','im','zu','sowie','verschiedenen'}
def tok(t):
    t=re.sub(r'^(GW|SC)\d+\s+','',t or '').lower(); t=re.sub(r'[^a-zäöüéèàâçô]+',' ',t)
    return {w[:6] for w in t.split() if w not in STOP}
cat={(g[0],g[1]):(g[2],tok(g[2])) for g in K['ger']}
ws=SZ['Spengler Cup']; rows=[]
for r in range(6,ws.max_row+1):
    v=[ws.cell(r,c).value for c in range(1,12)]
    if not v[0] or not v[6]: continue
    rows.append(v)
# gericht mapping per (linie, gericht text)
grp={}
for v in rows: grp.setdefault(v[4],[]).append((v[9],v[10]))
gmap={}; report=[]
for txt,comps in grp.items():
    t=tok(txt); cand=Counter()
    for c in comps:
        for o,n in owner.get(c,{}).items(): cand[o]+=n
    best=None
    if cand:
        # prefer candidate with best token overlap among owners
        best=max(cand,key=lambda o:(len(t&cat[o][1])/len(t|cat[o][1]),cand[o]))
        sc=len(t&cat[best][1])/max(1,len(t|cat[best][1]))
        if sc<0.2: best=None
    if not best:
        b2=max(cat,key=lambda o:len(t&cat[o][1])/len(t|cat[o][1])); sc=len(t&cat[b2][1])/len(t|cat[b2][1])
        best=b2 if sc>=0.5 else None
    gmap[txt]=best; report.append((txt, cat[best][0] if best else '—'))
Z=[[v[0],v[3],v[4],v[5],v[6],v[7],v[8],v[9],v[10]]+(list(gmap[v[4]]) if gmap[v[4]] else [None,None]) for v in rows]
services=[]
for i in range(1,11): services.append(['Spiel %d'%i,'Spiel %d und %d'%((i-1)%5+1,(i-1)%5+6),i])
services.append(['Spiel 11','Brunch Spiel 11',11])
json.dump({'services':services,'zeilen':Z},open(OUT+'spengler.json','w'),ensure_ascii=False,separators=(',',':'))
for a,b in sorted(report): 
    if b=='—' or True: pass
print('gerichte',len(report),'ohne Katalog',sum(1 for a,b in report if b=='—'))
for a,b in report: print(' ',a,'=>',b)
# Karten
karten=[]
bk=FB['Barkarte']; rub=None; last=None
for r in range(1,bk.max_row+1):
    c=s(bk.cell(r,3).value); d=bk.cell(r,4).value
    if c and isinstance(d,(int,float)): karten.append(['Barkarte Loft 23','Snacks',c,None,d])
    g=s(bk.cell(r,7).value); h=s(bk.cell(r,8).value); i=bk.cell(r,9).value
    if not g or r<6: continue
    if isinstance(i,(int,float)) or (rub=="Spengler's Specials" and last!=r-1 and h is None and i is None and False):
        karten.append(['Barkarte Loft 23',rub,g,h,i]); last=r
    elif last==r-1 and karten and karten[-1][1]==rub and rub=="Spengler's Specials":
        karten[-1][2]=karten[-1][2]+' ('+g+')'
    elif h in (None,'Menge') and i in (None,'Preise'):
        rub=g
print('bar',len(karten), Counter(k[1] for k in karten))
json.dump(karten,open(OUT+'karten.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(json.dumps({'services':services,'zeilen':Z},ensure_ascii=False,separators=(',',':'))), len(json.dumps(karten,ensure_ascii=False)))
