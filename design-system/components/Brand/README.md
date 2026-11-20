# Brand

Die Marke der App: Bildmarke, Wortmarke «GAMMA Catering» und der Produktname «Produktionsplaner».

- `size="sm"` (Standard): Bildmarke 28 px, Text daneben. Steht in der TopNav und verlinkt mit `href` auf den Leitstand.
- `size="lg"`: Bildmarke 56 px, Text darunter, zentriert. Steht über der Karte der Anmeldeseite.
- `src` ist die Bildmarke als Datei. Quelle ist `design-system/assets/bildmarke.svg`; die App liefert die Kopie `/brand/bildmarke.svg` aus. Ohne `src` steht der Platzhalter (Quadrat in `accent`).
- `mono` für eine einfarbig dunkle Bildmarke als Rasterbild: Im Dunkel-Thema erscheint sie hell. Stand 20.11.2026 ist das `assets/bildmarke-web.png`, die Bildmarke von gammagruppe.ch (74 px, unverändert bis auf den leeren Rand rechts). Bei 56 px auf der Anmeldeseite ist sie auf hochauflösenden Bildschirmen leicht weich.
- `product={null}` blendet den Produktnamen aus, wenn die Seite ihn selbst als Titel trägt (Anmeldung).
- Die Bildmarke ist Schmuck neben dem Namen (`alt=""`); vorgelesen wird der Text.
- Bis GAMMA die Bildmarke als Vektordatei liefert, ist `bildmarke.svg` ein Platzhalter; aus ihm entstehen weiterhin Favicon und App-Icons, weil das Rasterbild dafür zu klein ist. Tausch: Datei ersetzen, in `app/` `npm run icons` laufen lassen (Favicon, App-Icons, Kopie für die App). Das Logo nicht verändern: nur Schwarz oder Weiss oder nach Vorgabe von GAMMA, Schutzraum einhalten.
