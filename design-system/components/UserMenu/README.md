# UserMenu

Benutzer-Menü rechts in der TopNav (`actions`): wer angemeldet ist, und abmelden.

- Geschlossen: Kürzel im Kreis (erster Buchstabe des Namens, sonst der E-Mail), Trefferfläche 44 px, `aria-label` «Benutzer-Menü», `aria-expanded`.
- Geöffnet: Name, E-Mail und der Knopf «Abmelden» (`onSignOut`) auf `surface` mit `shadow-overlay`. Escape oder ein Klick daneben schliesst.
- Unter 760 px gibt es keinen Kreis: E-Mail und «Abmelden» stehen offen im aufgeklappten Menü der TopNav.
