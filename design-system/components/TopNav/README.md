# TopNav

Hauptnavigation oben mit den sechs Bereichen der App. Ersetzt in der App die SideNav.

- Links der Schriftzug (`company`, Standard «GAMMACATERING») als Link zum Leitstand, daneben die Bereiche in Grossbuchstaben, rechts `actions` (Konto, Abmelden).
- Aktiver Bereich in `accent` mit Linie unten und `aria-current="page"`.
- Unter 760 px stehen nur Schriftzug und Button «Menü» (`aria-expanded`); Bereiche und `actions` klappen darunter auf.
- Bereiche: Leitstand, Verkauf, Produktion, Küche, Auswertung, Verwaltung (Quelle: `app/lib/navigation.ts`, `GRUPPEN`).
- Wird nicht gedruckt.
