"""Paprika-HTML-Export -> Importformat von importer.rezepte (siehe Migration 05).
Aufruf: python3 -I paprika.py <Ordner Recipes> <Zieldatei.sql> [vorhandene Slugs, kommagetrennt]
Regeln (mit Dominik abgestimmt, 10.11.2026):
- nur Rezepte mit mindestens einer Zutat
- g/kg genau; ml/cl/dl/l als Gramm (1 ml = 1 g) mit Annahme; alles andere ohne Menge, Originalangabe in der Notiz
- mit Portionenzahl: Gericht, sonst Komponente
"""
import re, sys, os, html, json, unicodedata

ordner, ziel = sys.argv[1], sys.argv[2]
vorhanden = set(x.strip().lower() for x in sys.argv[3].split(',')) if len(sys.argv) > 3 else set()

def text(s):
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = html.unescape(re.sub(r'<[^>]+>', '', s))
    s = s.replace('ß', 'ss').replace('\t', ' ').replace(' ', ' ')
    return re.sub(r'[ ]{2,}', ' ', s).strip()

def slug(name):
    s = name.lower()
    for a, b in (('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss'), ('&', ' und ')):
        s = s.replace(a, b)
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

BRUCH = {'½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125}
def titel(t):
    t = t.replace('*', '').rstrip(':').strip()
    return t.capitalize() if t.upper() == t else t

def zahl(q):
    """'2', '1,5', '½', '1 1/2', '1/2' -> float; Bereiche ('2-3') und Unklares -> None"""
    q = q.strip().replace(',', '.')
    if not q or re.search(r'\d\s*[-–]\s*\d', q): return None
    tot = 0.0
    for teil in q.split():
        m = re.fullmatch(r'(\d+(?:\.\d+)?)?([½¼¾⅓⅔⅛])?', teil)
        if m and (m.group(1) or m.group(2)):
            tot += float(m.group(1) or 0) + BRUCH.get(m.group(2), 0)
        elif re.fullmatch(r'\d+/\d+', teil):
            a, b = teil.split('/'); tot += int(a) / int(b)
        else: return None
    return tot

GEWICHT = {'g': 1, 'gr': 1, 'gramm': 1, 'kg': 1000}
VOLUMEN = {'ml': 1, 'cl': 10, 'dl': 100, 'l': 1000, 'liter': 1000}
EINHEIT = {'el', 'tl', 'tsp', 'tbsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'cup', 'cups', 'bund', 'prise', 'prisen',
           'msp', 'dose', 'dosen', 'pinch', 'oz', 'lb', 'lbs', 'pck', 'päckchen', 'stk', 'stück', 'zweig', 'zweige', 'handvoll', 'bd'}

def zutat(roh):
    """-> ('kopf', titel) | ('klammer', text) | ('zutat', [bezeichnung, menge_g, flags, notiz])"""
    roh = roh.strip()
    voll = text(roh)
    if not voll: return None
    m = re.match(r'<strong>(.*?)</strong>(.*)', roh, flags=re.S)
    q = text(m.group(1)) if m else ''
    if m and not re.search(r'[\d½¼¾⅓⅔⅛]', q):
        return ('kopf', titel(voll))
    if not m:
        if voll.endswith(':') or (len(voll) > 3 and voll.upper() == voll and re.search(r'[A-ZÄÖÜ]', voll)):
            return ('kopf', titel(voll))
        if voll.startswith('(') and voll.endswith(')'): return ('klammer', voll[1:-1].strip())
        return ('zutat', [voll, None, 0, None])
    rest = text(m.group(2))
    n = zahl(q)
    um = re.match(r'([A-Za-zäöüÄÖÜ]+)\.?(?=\s|$)\s*(.*)', rest, flags=re.S)
    e = um.group(1).lower() if um else ''
    if n is not None and um and e in GEWICHT and um.group(2):
        return ('zutat', [um.group(2), round(n * GEWICHT[e], 2), 0, None])
    if n is not None and um and e in VOLUMEN and um.group(2) and um.group(1) != 'L' or (n is not None and um and e == 'l' and um.group(2)):
        return ('zutat', [um.group(2), round(n * VOLUMEN[e], 2), 2, f'{q} {um.group(1)} (1 ml = 1 g)'])
    if um and e in EINHEIT and um.group(2):
        return ('zutat', [um.group(2), None, 0, f'{q} {um.group(1)}'])
    return ('zutat', [rest or voll, None, 0, voll])

rezepte, extra, bericht, slugs = [], [], {'leer': [], 'vorhanden': [], 'ok': []}, set()
for datei in sorted(os.listdir(ordner)):
    if not datei.endswith('.html'): continue
    s = open(os.path.join(ordner, datei), encoding='utf-8').read()
    name = text(re.search(r'<h1 itemprop="name"[^>]*>(.*?)</h1>', s, flags=re.S).group(1))
    zeilen = [z for z in (zutat(x) for x in re.findall(r'<p class="line" itemprop="recipeIngredient">(.*?)</p>', s, flags=re.S)) if z]
    if not any(z[0] == 'zutat' for z in zeilen):
        bericht['leer'].append(name); continue
    sl = slug(name) or slug(datei[:-5])
    if sl in vorhanden or name.lower() in vorhanden:
        bericht['vorhanden'].append(name); continue
    basis = sl; i = 2
    while sl in slugs: sl = f'{basis}-{i}'; i += 1
    slugs.add(sl)

    gruppen = [[None, [], []]]
    for art, w in zeilen:
        if art == 'kopf':
            if gruppen[-1][1] or gruppen[-1][0]: gruppen.append([w, [], []])
            else: gruppen[-1][0] = w
        elif art == 'klammer' and gruppen[-1][1]:
            z = gruppen[-1][1][-1]; z[3] = f'{z[3]}; {w}' if z[3] else w
        elif art == 'klammer': gruppen[-1][1].append([w, None, 0, None])
        else: gruppen[-1][1].append(w)
    gruppen = [g for g in gruppen if g[1]] or gruppen[:1]

    schritte = []
    d = re.search(r'<div itemprop="recipeInstructions"[^>]*>(.*?)</div>', s, flags=re.S)
    if d:
        for p in re.findall(r'<p class="line"[^>]*>(.*?)</p>', d.group(1), flags=re.S):
            schritte += [[re.sub(r'^[*•\-–]\s+', '', t.strip()), None, None, None, None, None, False] for t in text(p).split('\n') if t.strip()]
    if schritte:
        if len(gruppen) == 1: gruppen[0][2] = schritte
        else: gruppen.append(['Zubereitung', [], schritte])

    y = re.search(r'itemprop="recipeYield">(.*?)</span>', s, flags=re.S)
    y = text(y.group(1)) if y else None
    portionen = int(y) if y and re.fullmatch(r'\d+', y) and int(y) > 0 else None
    typ = 'gericht' if portionen else 'komponente'
    kat = re.search(r'itemprop="recipeCategory"[^>]*>(.*?)</', s, flags=re.S)
    q1 = re.search(r'itemprop="author">(.*?)</span>', s, flags=re.S)
    q2 = re.search(r'itemprop="url"[^>]*href="([^"]*)"', s) or re.search(r'href="([^"]*)"[^>]*itemprop="url"', s)
    quelle = text(q1.group(1)) if q1 else (html.unescape(q2.group(1)) if q2 else None)

    alle = [z for g in gruppen for z in g[1]]
    ml = sum(1 for z in alle if z[2] & 2); ohne = sum(1 for z in alle if z[1] is None)
    offen = []
    if ml: offen.append(f'{ml} Menge(n) in ml, dl oder l als Gramm übernommen (1 ml = 1 g): bitte prüfen.')
    if ohne: offen.append(f'{ohne} von {len(alle)} Zutaten ohne Grammangabe (EL, TL, Stück, nach Geschmack): Originalangabe steht in der Notiz, Menge in Gramm fehlt.')
    offen.append('Basiszutat für die Skalierung ist nicht festgelegt.')
    offen.append('Portionsgrösse in Gramm fehlt.' if portionen else 'Ergibt-Menge pro Charge fehlt.' + (f' Angabe im Original: {y}.' if y else ''))
    offen.append('Zeiten und Geräte pro Schritt fehlen.' if schritte else 'Zubereitung fehlt im Original.')

    rezepte.append([sl, typ, name.replace('ß', 'ss'), None, text(kat.group(1)) if kat else None, quelle, portionen, None, None, offen, [], gruppen])
    teile = []
    b = re.search(r'itemprop="description"[^>]*>(.*?)</div>', s, flags=re.S)
    n_ = re.search(r'itemprop="comment"[^>]*>(.*?)</div>', s, flags=re.S)
    for t in (b, n_):
        if t and text(t.group(1)): teile.append(re.sub(r'\n\s*\n+', '\n', text(t.group(1))))
    if teile or (y and not portionen): extra.append([sl, '\n'.join(teile) or None, y if y and not portionen else None])
    bericht['ok'].append((name, typ, len(alle), ohne, ml, len(schritte)))

def lit(o): return "'" + json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace("'", "''") + "'"
with open(ziel, 'w', encoding='utf-8') as f:
    f.write('-- Import «My Recipes» (Paprika-Export, 10.11.2026), erzeugt mit supabase/import/tools/paprika.py\n-- Regeln: nur Rezepte mit Zutaten; g/kg genau; ml/dl/l als Gramm mit Annahme; EL, TL, Stück ohne Menge (Original in der Notiz);\n-- mit Portionenzahl Gericht, sonst Komponente. Bereits vorhandene Rezepte (Slug oder Name) werden nicht angefasst.\n')
    for i in range(0, len(rezepte), 25):
        f.write(f'select importer.rezepte({lit(rezepte[i:i + 25])}::jsonb);\n')
    f.write('-- Notizen und Beschreibung nach «besonderes», Ertragsangabe als Text nach «chargengroesse»\n')
    f.write(f"update public.rezept r set besonderes = coalesce(r.besonderes, x.v->>1), chargengroesse = coalesce(r.chargengroesse, x.v->>2)\nfrom jsonb_array_elements({lit(extra)}::jsonb) x(v) where r.slug = x.v->>0;\n")
json.dump({'rezepte': rezepte, 'bericht': bericht}, open(ziel + '.json', 'w', encoding='utf-8'), ensure_ascii=False)
ok = bericht['ok']
print('importiert', len(ok), 'Gerichte', sum(1 for r in ok if r[1] == 'gericht'), 'Zutaten', sum(r[2] for r in ok), 'ohne g', sum(r[3] for r in ok), 'ml', sum(r[4] for r in ok), 'Schritte', sum(r[5] for r in ok), 'Notizen', len(extra))
print('leer', bericht['leer']); print('vorhanden', bericht['vorhanden'])
