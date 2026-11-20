# TopNav

Hauptnavigation oben mit den sechs Bereichen der App. Ersetzt in der App die SideNav.

- Links die Marke (Komponente Brand, `brandSrc` für die Bildmarke, `company` Standard «GAMMA Catering») als Link zum Leitstand, daneben die Bereiche in Grossbuchstaben, rechts `actions` (Konto, Abmelden).
- Aktiver Bereich in `accent` mit Linie unten und `aria-current="page"`.
- Unter 760 px stehen nur Marke und Button «Menü» (`aria-expanded`); Bereiche und `actions` klappen darunter auf.
- Bereiche: Leitstand, Verkauf, Produktion, Küche, Auswertung, Verwaltung (Quelle: `app/lib/navigation.ts`, `GRUPPEN`).
- Wird nicht gedruckt.
- Bleibt ab 761 px beim Scrollen oben stehen (`topnav-height`). In `actions` steht das UserMenu.
