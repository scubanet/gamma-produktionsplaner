# Datenkette vom Rezept bis zur Rentabilität – Plan

Stand: 19.11.2026. Ergebnis der kritischen Durchsicht von Repo und Pilot-Datenbank. Noch nichts gebaut.

**Ziel:** Die zehn Komponenten von Spiel 1 laufen einmal mit echten Zahlen von der Offerte über Produktion und Einkauf bis zur Rentabilität durch. Jede Zahl stammt aus einem freigegebenen Rezept oder ist sichtbar als Entwurf oder Annahme gekennzeichnet.

**Termine:** Dominik startet Anfang Dezember 2026. Pilot ist White Turf im Februar 2027. Der Spengler Cup läuft über die Excel, die App rechnet parallel mit.

**Vor dem Start lesen:** `CLAUDE.md`, `docs/uebergabe-claude-code.md`, `docs/supabase.md`.

**Für jede Aufgabe gilt:**

- Dieser Plan beschreibt Umfang, Dateien und Abnahme, nicht den Code. Vor dem Bauen die Schritte der Aufgabe ausarbeiten und die betroffenen Views lesen.
- Rechenlogik in Views oder SQL-Funktionen, neue Migration pro Aufgabe (nächste Nummer ist 35), Views mit `security_invoker = true`, danach `cd app && npm run types`.
- Eine unvollständige Zahl wird nie als Total ausgegeben. Jede neue Zahl bekommt eine Spalte «Herleitung».
- Tests und Typprüfung vor jedem Commit: `cd app && npm test && npm run typecheck`. Ein Commit pro Aufgabe, Nachricht auf Deutsch.
- Fragen an Dominik (mit **Frage** markiert) vor dem Bauen klären, nicht raten.

## Befund (Datenbank am 19.11.2026)

| Befund | Zahl |
| --- | --- |
| Rezepte mit Status «entwurf» | 364 von 364 |
| Komponenten im Bedarf des Spengler Cup | 251 |
| davon mit Rezept (generiert, ungeprüft) | 180 |
| davon mit Hauptartikel | 0 |
| davon mit Produktionssystem / Lagerart / Regeneration / Lagertagen | 112 / 27 / 0 / 0 |
| Zutaten mit Artikel verknüpft | 480 von 3020 |
| Zutaten ohne Menge in Gramm | 911 (alle in den importierten Rezepten «My Recipes»; die 1103 Zutaten der Spengler-Cup-Rezepte haben alle eine Menge) |
| Lohnsätze, Fixkosten, Lieferanten, Personal pro Anlass, Standard Geschirr | je 0 Zeilen |
| Übernommener Wellenplan (`produktionswelle`) | 0 Zeilen |
| Status-Kontrolle | 311 / 129 / 53, im Code erwartet 310 / 130 / 53 |
| Saisons / Anlässe | 1 / 7 |

## Reihenfolge

| Nr. | Aufgabe | Schwere | Braucht |
| --- | --- | --- | --- |
| D | Daten erfassen (Dominik, kein Code) | kritisch | – |
| 1 | Rezept-Freigabe und Kennzeichnung «aus Entwurf» (gebaut 19.11.2026) | kritisch | – |
| 2 | Zutaten mit Artikeln verknüpfen (gebaut 20.11.2026) | kritisch | – |
| 3 | Einkauf aus dem Rezept (gebaut 20.11.2026) | kritisch | 2 |
| 4 | Warenkosten aus dem Rezept | kritisch | 2 |
| 5 | Aufwand in Ressourcen und Rentabilität übernehmen | kritisch | D1 |
| 6 | Anlass wählen, Kontrollwerte aus dem Code nehmen | mittel | – |
| 7 | Tests für die Rechenlogik in der Datenbank | mittel | – |
| 8 | Sicherung ausserhalb von Supabase | mittel | Entscheid |
| 9 | Änderungsprotokoll und Konfliktprüfung | mittel | – |
| 10 | Rechte für Kostendaten | mittel | Entscheid |
| 11 | Ausliefern: Datenbank und App im Gleichschritt | klein | – |
| 12 | Küchenpass ohne Netz | klein | – |

Aufgaben 1, 2, 6 und 7 sind unabhängig. Empfohlen: D parallel zu 1 und 2, dann 3, 4, 5, danach Abnahme «Durchstich Spiel 1», erst dann 6 bis 12.

---

### D: Daten erfassen (Dominik)

- [ ] **D1** Stammdaten: Lohnsätze pro Rolle, Strompreis, Fixkosten pro Monat, Bestand und Mietpreis der Geräte.
- [ ] **D2** Lieferanten mit Liefertagen und Bestellschluss.
- [ ] **D3** Systemzuteilung der zehn Komponenten von Spiel 1 vollständig: Produktionssystem, Lagerart, Lagertage, Regeneration.
- [ ] **D4** Die zehn Rezepte von Spiel 1 in der Küche prüfen (Mengen, Zeiten, Rollen, Menge pro Durchgang, Füllmenge) und freigeben (nach Aufgabe 1).
- [ ] **D5** Standard Geschirr pro Angebotsform und Gang.
- [ ] **D6** Wellenplan der Saison übernehmen, sobald D3 steht.

### Aufgabe 1: Rezept-Freigabe und Kennzeichnung «aus Entwurf»

**Stand 19.11.2026: gebaut** (Migration 32, noch einzuspielen). Entscheide Dominik: «Geprüft» dürfen alle Angemeldeten setzen; freigeben und eine Freigabe zurücknehmen nur Admins. Ein freigegebenes Rezept bleibt beim Speichern freigegeben. Zusätzlich zum Umfang: Knopf «Zurück auf Entwurf». Abweichung: Der Küchenpass zeigt heute keine Werte aus Rezepten und bleibt unverändert; in der Produktionsliste ist der Rezept-Link gekennzeichnet.

**Befund:** `rezept.status` kennt `entwurf`, `geprueft`, `freigegeben`, aber die App zeigt den Status nur an (`rezepte/bearbeiten/page.tsx`, Karte «Rezept»). Die Views `planung_*` (Migration 24) rechnen mit jedem Rezept.

**Umfang:**
- Funktion `rezept_status_setzen(p_rezept, p_status, p_geaendert_am)` mit Prüfung des geladenen Stands wie `rezept_speichern`.
- Rezeptkarte und Pflegeseite: Status als Pill, Knöpfe «Geprüft» und «Freigeben». Rezeptliste: Filter nach Status.
- Views `planung_produktion_komponente`, `planung_service_komponente` (und was darauf aufbaut) bekommen die Spalte `rezept_status`. Aufwand, Küchenpass und Produktionsliste kennzeichnen Werte aus nicht freigegebenen Rezepten wie Annahmen (gestrichelte Unterstreichung).
- Leitstand: «x von y Rezepten der Saison freigegeben».

**Fragen:** Wer darf freigeben (nur Admins oder alle)? Fällt ein freigegebenes Rezept beim nächsten Speichern auf «entwurf» zurück?

**Abnahme:** Ein freigegebenes Rezept erscheint ohne Kennzeichnung, ein Entwurf mit. Summen, die Entwürfe enthalten, sind als solche erkennbar.

### Aufgabe 2: Zutaten mit Artikeln verknüpfen

**Stand 20.11.2026: gebaut** (Migration 33, noch einzuspielen). Seite `/einkauf/zutaten/` «Zutaten zuordnen», Zähler in der Einkaufsliste.

- Eine Zeile pro Bezeichnung, nicht pro Zutat: «Salz» steht in 115 Zutaten und wird einmal entschieden. Ein Klick verknüpft alle offenen Zutaten mit genau dieser Bezeichnung in den Rezepten der Saison; mit dem Häkchen «auch in Rezepten ausserhalb der Saison» auch die übrigen. Bestehende Verknüpfungen bleiben.
- «Verknüpfte Zutaten» zeigt, was verknüpft ist, mit «Lösen» (gilt für alle Rezepte). Bisher liess sich eine Verknüpfung in der App weder ansehen noch ändern.
- Zutaten, die ein Unterrezept sind (`zutat.komponente_id`), bekommen keinen Artikel und zählen nicht mit.
- Gelesen in der Pilot-Datenbank am 20.11.2026: 179 Rezepte im Bedarf der Saison, 1087 Zutaten, 480 verknüpft, 178 offene Bezeichnungen, 46 davon mit Vorschlag. Die Abfragen der Vorschläge, der verknüpften Zutaten und des Zählers liefen lesend gegen die Datenbank; die Migration selbst und die beiden schreibenden Funktionen liefen in keiner Datenbank. Vor dem Einspielen `supabase db push --remote --dry-run`.
- Abnahme offen: Die Zutaten der zehn Rezepte von Spiel 1 verknüpft Dominik von Hand (Entscheid: Verknüpfungen macht er selbst).

**Frage** (neu, vor Aufgabe 3 klären): Grundzutaten wie Salz, Zucker und Weissmehl haben keinen passenden Artikel in der Preisliste, die Vorschläge dafür sind falsch («Zucker» trifft «Aprikosenmark ohne Zucker»). Fehlen diese Artikel in der Preisliste? Und «Wasser» (22 Zutaten in der Saison) wird nie eingekauft: Braucht es ein Kennzeichen «kein Einkauf», damit eine Komponente in Aufgabe 3 trotzdem als vollständig gilt?

**Befund:** `zutat.artikel_id` gibt es seit Migration 01, 480 von 3020 Zutaten sind verknüpft. Eine Seite dafür fehlt.

**Umfang:** Seite nach dem Muster von `/einkauf/zuordnen` und `komponente_artikel_vorschlag` (Migration 22, `pg_trgm`): pro Zutat ohne Artikel bis zu drei Vorschläge, ein Klick ordnet zu, gleiche Bezeichnung in anderen Rezepten auf Wunsch gleich mit. Zuerst die Zutaten der Rezepte, die im Bedarf der Saison stehen. Die Verknüpfung bleibt ein Entscheid von Hand.

**Abnahme:** Zähler «x von y Zutaten der Saison verknüpft» im Einkauf; die Zutaten der zehn Rezepte von Spiel 1 sind verknüpft.

### Aufgabe 3: Einkauf aus dem Rezept

**Stand 20.11.2026: gebaut** (Migration 34, noch einzuspielen). Entscheid Dominik (20.11.2026): Auch ein Rezept im Entwurf zählt, mit Kennzeichnung.

- Weg pro Komponente: `rezept`, sobald das Rezept mindestens eine verknüpfte Zutat hat; sonst `hauptartikel`; Zukauf und offen wie bisher. Hat eine Komponente beides, gilt das Rezept.
- Rechnung: Bedarf der Komponente ÷ Ergibt-Menge des Rezepts = Faktor; Zutat × Faktor; über `zutat.artikel_id` zum Artikel, plus dessen Verlust. Unterrezepte werden aufgelöst (bis fünf Stufen; `zutat.komponente_id` zeigt auf ein Rezept).
- Unvollständig: Eine Zutat ohne Artikel, oder mit einem Artikel in einem Gebinde ohne Gewicht (Flasche, Dose, Tetrapack …: «Menge von Hand»). Die Position hat dann keine Kosten; die verknüpften Zutaten stehen trotzdem in der Einkaufsliste. Neue Karte «Aus dem Rezept, noch unvollständig».
- Annahme (gestrichelt): Rezept nicht freigegeben, Liter als Kilogramm gerechnet, Menge der Zutat als Annahme vermerkt, oder Weg über den Hauptartikel.
- Lieferung und «Bestellen bis» werden neu pro Artikelzeile gerechnet, nicht mehr pro Komponente.
- Geprüft: Die fünf View-Abfragen liefen als eine Abfrage lesend gegen die Pilot-Datenbank (20.11.2026). Ergebnis: 253 Positionen, davon 171 über das Rezept (4 vollständig, alle im Entwurf), 22 Zukauf, 60 offen; 1205 Zutatenzeilen, 187 Artikelzeilen, 130 davon mit Menge. Die Migration selbst (drop und create) lief in keiner Datenbank. Vor dem Einspielen `supabase db push --remote --dry-run`.
- **Kontrollwert** (Handrechnung, für Aufgabe 7): Gemüsestreifen, Spengler Cup, Bedarf 5.5 kg, Rezept ergibt 50 g je Charge, Faktor 110. Knollensellerie 15 g × 110 = 1.65 kg × CHF 3.16 = CHF 5.21; Lauch 18 g × 110 = 1.98 kg × CHF 5.10 = CHF 10.10; Rüebli 20 g × 110 = 2.2 kg × CHF 4.50 = CHF 9.90; zusammen CHF 25.21. Die View liefert dieselben Werte. Gemüsestreifen gehört nicht zu den zehn Komponenten von Spiel 1; von diesen ist noch keine vollständig verknüpft.
- Auffällig: 165 von 486 verknüpften Zutatenzeilen hängen an Artikeln in Gebinden ohne Gewicht. Für diese braucht es `gebinde_g` oder `stueck_g` am Artikel (beide Spalten gibt es, sie sind leer), sonst bleibt «Menge von Hand». Passt zum Laden der Preislisten.

**Befund:** `einkauf_position` (Migration 12, Zeile 295) rechnet Komponentenmenge × (1 + Verlust) über den Hauptartikel der Komponente; im Kommentar als Annahme vermerkt, «bis Rezepte mit Artikeln verknüpft sind». Keine Komponente hat einen Hauptartikel.

**Umfang:**
- Neue View: Bedarf der Komponente pro Welle × Rezeptfaktor (`rezept_faktor`, Migration 08) ergibt die Zutatenmengen, diese über `zutat.artikel_id` und den Verlust des Artikels die Artikelmengen. Unterrezepte (`zutat.komponente_id`, 9 Fälle) auflösen.
- `einkauf_position` wählt pro Komponente den Weg: Rezept mit verknüpften Zutaten, sonst Hauptartikel (bestehend), Zukauf unverändert. Spalte `weg` und Herleitung.
- Zutaten ohne Artikel oder ohne Menge erscheinen als offene Position; die Komponente gilt dann als unvollständig.

**Frage:** Zählt für den Einkauf nur ein freigegebenes Rezept, oder auch ein Entwurf mit Kennzeichnung?

**Abnahme:** Für eine Komponente von Spiel 1 stimmt die Einkaufsmenge jeder Zutat mit einer Handrechnung überein; der Wert kommt als Kontrollwert in die Tests (Aufgabe 7).

### Aufgabe 4: Warenkosten aus dem Rezept

**Befund:** `gericht_warenkosten` (Migration 03, Zeile 328) und `offerte_position` (Migration 10) rechnen Hauptartikel × Menge + 20 % Zuschlag (`wk_zuschlag`), sonst die Schätzung CHF/kg der Kategorie.

**Umfang:** Dritte Quelle «rezept» mit Vorrang vor «artikel» und «schaetzung»: Summe der Zutaten × Artikelpreis, inklusive Verlust, pro Portion oder kg. Die Offerte zeigt die Quelle pro Position.

**Frage:** Entfällt der Zuschlag von 20 % beim Weg über das Rezept ganz?

**Abnahme:** Offerte mit Gerichten von Spiel 1 zeigt Quelle «rezept»; der Deckungsbeitrag ändert sich nachvollziehbar.

### Aufgabe 5: Aufwand in Ressourcen und Rentabilität übernehmen

**Befund:** `/produktion/aufwand` rechnet Stunden pro Rolle und Belegung der Geräte (`planung_produktion_rolle`, `planung_produktion_geraet`, `planung_service_komponente`). `anlass_personal` und `anlass_geraet` sind Handeingabe und leer; `anlass_kalkulation` kennt den Aufwand nicht.

**Umfang:**
- Nach dem Muster von «Geschirr»: Knopf «Vorschlag aus den Rezepten übernehmen» in Ressourcen, Zeilen übersteuerbar, Herkunft sichtbar.
- `schritt.rolle` und `rezept.service_rolle` sind freier Text, der Lohnsatz hängt an der Rolle der Stammdaten: Rolle im Rezept als Auswahl aus den Stammdaten, bestehende Texte zuordnen.
- Rentabilität zeigt Personalkosten mit Herkunft (Rezept oder Hand).

**Frage:** Die Produktion rechnet pro Welle, die Kalkulation pro Anlass. Nach welchem Schlüssel werden die Stunden einer Welle auf die Anlässe verteilt (Vorschlag: nach Menge)?

**Abnahme:** Mit D1 erfasst zeigt die Rentabilität des Spengler Cup Personalkosten ohne Handeingabe.

### Abnahme «Durchstich Spiel 1»

- [ ] Zehn Komponenten: Rezept freigegeben, Zutaten verknüpft, Systemzuteilung vollständig.
- [ ] Produktionsliste, Wellenplan, Aufwand, Einkauf, Geschirr, Ressourcen und Rentabilität zeigen für Spiel 1 Zahlen statt Platzhalter.
- [ ] Dominik rechnet drei Werte von Hand nach (eine Einkaufsmenge, eine Stundenzahl, einen Deckungsbeitrag).

### Aufgabe 6: Anlass wählen, Kontrollwerte aus dem Code nehmen

**Befund:** `produktion/page.tsx` Zeile 39 nimmt den ersten Anlass mit Menülinien; Wellen, Aufwand, Küchenpass und Einkauf nehmen die jüngste Saison. `app/lib/kontrollwerte.ts` enthält feste Werte; die Status-Kontrolle weicht ab, seit eine Komponente bearbeitet wurde.

**Umfang:** Aufgabe 10 aus `docs/plan-ui-ux-look-d.md` (Kontextzeile) bauen, mindestens mit Wahl des Anlasses. Die Status-Kontrolle entfernen. Mengen- und Wellen-Kontrollen als Abgleich Spengler Cup kennzeichnen und nur dort zeigen.

**Abnahme:** White Turf 1 lässt sich in Produktion und Einkauf wählen; keine rote Kontrolle ohne fachlichen Grund.

### Aufgabe 7: Tests für die Rechenlogik in der Datenbank

**Befund:** Die Tests in `app/tests/` prüfen das Zusammensetzen in TypeScript. Die Views und Funktionen, die rechnen, haben keinen Test; die Kontrollwerte werden von Hand geprüft.

**Umfang:** `supabase/tests/` mit pgTAP (offene Erweiterung, läuft auch selbst gehostet): kleiner fester Datensatz, Kontrollwerte aus der Excel (181.5 kg, 79.2 kg, 27.5 kg, Wellen 3 / 8 / 1) und die neuen Werte aus den Aufgaben 3 bis 5. Aufruf `supabase test db` lokal und im Workflow vor dem Bauen.

**Abnahme:** Eine absichtlich falsche Änderung an `wellen_anzahl` lässt den Test fehlschlagen.

### Aufgabe 8: Sicherung ausserhalb von Supabase

**Umfang:** Geplanter Workflow, der täglich `pg_dump` zieht, verschlüsselt ablegt und alte Stände aufräumt. Einmal das Zurückspielen in eine leere Datenbank proben und in `docs/supabase.md` beschreiben.

**Frage:** Wohin (Infomaniak, GAMMA-Server) und wie lange aufbewahren?

### Aufgabe 9: Änderungsprotokoll und Konfliktprüfung

**Befund:** Nur `rezept` hat `geaendert_am` und prüft den geladenen Stand. Überall sonst überschreibt der Letzte, und es ist nicht sichtbar, wer was geändert hat.

**Umfang:** Tabelle `aenderung` (Tabelle, Zeile, Benutzer, Zeit, alt, neu als jsonb) mit einem Trigger für Komponente, Anlass, Service, Menülinie, Artikel und Stammdaten der Kosten. `geaendert_am` mit Prüfung für Systemzuteilung und Anlass. Anzeige «zuletzt geändert von» in der Detailspalte.

### Aufgabe 10: Rechte für Kostendaten

**Befund:** Policy `pilot_angemeldet` erlaubt jedem angemeldeten Benutzer alles, auch Lohnsätze und Fixkosten.

**Frage:** Reicht «Kostendaten nur für Admins» (Lohnsatz, Fixkosten, Rentabilität), oder braucht es Rollen pro Abteilung? Erst nach dem Entscheid bauen.

### Aufgabe 11: Ausliefern im Gleichschritt

**Befund:** Migrationen und die Edge Function `benutzer` werden von Hand eingespielt, die App automatisch. Bei falscher Reihenfolge läuft die neue App gegen die alte Datenbank.

**Umfang:** Schritt im Workflow, der den Stand der Migrationen in der Datenbank mit dem Repo vergleicht und bei Abweichung abbricht. Edge Function im selben Workflow ausliefern.

### Aufgabe 12: Küchenpass ohne Netz

**Umfang:** Service Worker, der den Küchenpass und die geladene Welle hält; Abhaken ohne Netz in eine Warteschlange, Abgleich bei Verbindung, sichtbarer Stand «nicht übertragen».

## Nicht in diesem Plan

- Etiketten, Druckdienst und iPhone-Scanner: eigene Spezifikation `docs/spezifikation-etiketten-packliste.md`, nach der Abnahme «Durchstich Spiel 1».
- Eigene Swift-App fürs Handy.
- Vollkosten pro Gericht und die Diagramme der Rentabilität: folgen auf die Aufgaben 4 und 5.
