import openpyxl, re, json, sys, unicodedata
U='/root/.claude/uploads/cc96d110-c9dd-54a2-9fa5-686be7f5c8f4/'
SZ=openpyxl.load_workbook(U+'46a88a72-Systemzuteilung_Winter_Collection_2026_27_5.xlsx')
VT=openpyxl.load_workbook(U+'2c5b0225-Verkaufstool_Gamma_TEST_2026-11-05.xlsx')
OUT='/tmp/claude-0/-home-claude/cc96d110-c9dd-54a2-9fa5-686be7f5c8f4/scratchpad/sb/import/'
def s(v): 
    if v is None: return None
    v=str(v).strip(); return v or None
SHEETS=[ws.title for ws in SZ.worksheets[7:]]
PROD={4:'FNG',5:'SF',6:'SV',7:'Past.',8:'HF',9:'NTG',10:'ÜNG',11:'Minute'}
REG={18:'BS',19:'Steamer',20:'Grill',21:'Herd',22:'Salamander',23:'SV',24:'Fritteuse',25:'Auftauen'}
x=lambda ws,r,c: s(ws.cell(r,c).value)=='x'
# Verkaufstool gericht -> gang, mengentyp
vt={}
g=VT['Gerichte']
for r in range(5,g.max_row+1):
    n=s(g.cell(r,1).value)
    if n: vt[n]=(s(g.cell(r,2).value),s(g.cell(r,3).value))
komp=[]; ger=[]; links=[]; byname={}
for kat in SHEETS:
    ws=SZ[kat]; start=7 if kat=='Basiskomponenten' else 6
    cur=None; pos=0
    for r in range(start,ws.max_row+1):
        a=s(ws.cell(r,1).value); b=s(ws.cell(r,2).value); z=s(ws.cell(r,26).value)
        if not b: continue
        if a and kat!='Basiskomponenten':
            m=re.match(r'^((?:GW|SC)\d+)\s+(.*)$',a)
            gang,mt=vt.get(a,(None,None))
            cur=(kat,r); pos=0
            ger.append([kat,r,a,m.group(1) if m else None,gang,mt])
        ver=None
        if z and z.lower().startswith('siehe blatt'):
            ver=z[12:].split('.')[0].strip()
        menge=ws.cell(r,45).value
        menge=menge if isinstance(menge,(int,float)) else None
        if not ver:
            cf=s(ws.cell(r,3).value); cf=int(cf[0]) if cf else None
            tage=ws.cell(r,16).value; tage=int(tage) if isinstance(tage,(int,float)) else None
            art=s(ws.cell(r,42).value)
            bem=None if (z and z.startswith('Verwendet in')) else z
            komp.append([kat,r,b,cf,[v for c,v in PROD.items() if x(ws,r,c)],int(x(ws,r,13)),int(x(ws,r,14)),int(x(ws,r,15)),tage,[v for c,v in REG.items() if x(ws,r,c)],bem,art])
            byname.setdefault((kat,b),r)
        if kat!='Basiskomponenten' and cur:
            pos+=1
            links.append([cur[0],cur[1],pos,b,ver,menge])
# resolve verweise
unres=[]
L=[]
for gk,gz,pos,b,ver,menge in links:
    if ver:
        tz=byname.get((ver,b))
        if tz is None: unres.append((gk,gz,b,ver))
        L.append([gk,gz,pos,b,ver,tz,menge])
    else:
        L.append([gk,gz,pos,b,None,None,menge])  # komponente = own row, resolved by row below
# own rows: need zeile; links for own rows -> same sheet row; recompute
L2=[]
for gk,gz,pos,b,ver,tz,menge in L: L2.append([gk,gz,pos,b,ver,tz,menge])
# fix own-row zeile: walk again
i=0
for kat in SHEETS:
    if kat=='Basiskomponenten': continue
    ws=SZ[kat]; cur=None
    for r in range(6,ws.max_row+1):
        a=s(ws.cell(r,1).value); b=s(ws.cell(r,2).value)
        if not b: continue
        if a: cur=r
        if cur:
            if L2[i][4] is None: L2[i][5]=r
            i+=1
print('komp',len(komp),'ger',len(ger),'links',len(L2),'unres',len(unres))
for u in unres[:40]: print(u)
json.dump({'komp':komp,'ger':ger,'links':L2},open(OUT+'katalog.json','w'),ensure_ascii=False,separators=(',',':'))
# Preisliste
p=SZ['Preisliste']; art=[]
for r in range(5,p.max_row+1):
    n=s(p.cell(r,2).value)
    if not n: continue
    art.append([n,s(p.cell(r,3).value),p.cell(r,4).value,s(p.cell(r,5).value),'S' if s(p.cell(r,6).value)=='Spezialpreis Fleisch' else 'D'])
print('artikel',len(art), 'dupes', len(art)-len({(a[0],a[1]) for a in art}))
json.dump(art,open(OUT+'artikel.json','w'),ensure_ascii=False,separators=(',',':'))
