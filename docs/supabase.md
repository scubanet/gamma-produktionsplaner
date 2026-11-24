# Supabase – Pilot-Datenbank

Stand: 15.11.2026

| | |
| --- | --- |
| Projekt | Gamma (`oqmtocxemtcsvtzmswwx`), Organisation Weckherlin |
| Region | Central Europe (Zürich), `eu-central-2` |
| API-URL | https://oqmtocxemtcsvtzmswwx.supabase.co |
| Zweck | Pilot Winter 2026/27. Danach Umzug auf einen eigenen Server von GAMMA (selbst gehostetes Supabase). |
| Umfang | 50 Tabellen, 38 Views, 21 Funktionen, 29 Migrationen (alle eingespielt, gezählt am 15.11.2026) |

## Aufbau

- `supabase/migrations/` ist die massgebende Quelle für das Schema. `db/*.sql` bleibt als Archiv des Proof of Concept.
- Alle Tabellen haben Row Level Security. Im Pilot dürfen angemeldete Benutzer alles lesen und schreiben (Policy `pilot_angemeldet`), anonyme Zugriffe nichts. Rollen pro Abteilung folgen.
- Ausnahme: Rezepte löschen und freigeben dürfen nur Admins (Freigabe: Trigger `rezept_status_pruefen`, Migration 32). Die Tabelle `app_admin` führt die Benutzer mit Admin-Rechten; jeder sieht darin nur seine eigene Zeile, geschrieben wird sie nur per Migration oder SQL (`insert into app_admin (user_id, bemerkung) …`). `rezept` hat darum eigene Policies statt `pilot_angemeldet`.
- Alle Views laufen mit `security_invoker = true`. Funktionen, die die App aufruft, sind nur für `authenticated` freigegeben.
- Import-Funktionen liegen im Schema `importer` und sind über die API nicht erreichbar.
- Nur Standard-PostgreSQL und offene Supabase-Funktionen, damit der Umzug auf den GAMMA-Server ohne Umbau geht.
- Die App rechnet nicht selbst: Mengen, Preise, Termine, Prüfhinweise und Herleitungstexte kommen aus Views und Funktionen.
- Eine unvollständige Zahl wird nie als Total ausgegeben. Fehlt ein Teil (Preis, Lohnsatz, Service-Datum), ist das Ergebnis leer und die App zeigt einen Platzhalter wie `[Preis]` oder `[Menge]`.

## Benutzerverwaltung (Edge Function `benutzer`)

- `supabase/functions/benutzer/index.ts`: Zugang anlegen, Benutzer auflisten, sperren und entsperren, Stufe setzen (`aktion: "stufe"` mit `admin`, `benutzer`, `kueche` oder `scannen`; die alte Aktion `admin` bleibt für ältere App-Stände). Nur für Benutzer in `app_admin`; die Funktion prüft das Token der App und arbeitet dann mit dem Service-Schlüssel, der den Server nie verlässt.
- **Reihenfolge bei Migration 43 (zwingend):** 1. `supabase db push --remote` (legt `app_kueche` und `stufe()` an), 2. `supabase functions deploy benutzer`, 3. erst dann die App pushen. Die Funktion liest `app_kueche`; ohne die Tabelle fällt die Seite Benutzer aus. Die neue App braucht für «Stufe ändern» die neue Funktion.
- **Reihenfolge bei Migration 44 (zwingend, wie bei 43):** 1. `supabase db push --remote` (legt `app_scannen` an), 2. `supabase functions deploy benutzer`, 3. erst dann die App pushen. Die neue Funktion liest `app_scannen`; ohne die Tabelle fällt die Seite Benutzer aus.
- Ausliefern: `supabase functions deploy benutzer` im Repo-Wurzelordner. Die Funktion gehört nicht zu den Migrationen und wird nicht vom Workflow «Ausliefern» verteilt.
- Ein neuer Zugang hat kein Passwort und eine bestätigte Adresse; die Person meldet sich mit dem Anmeldelink an. Sperren setzt eine Sperre von rund 100 Jahren, gelöscht wird nichts.
- Schutz: Niemand sperrt sich selbst oder senkt die eigene Stufe; so bleibt immer mindestens ein Admin.
- Erlaubte Herkunft (CORS): `https://gamma.atoll-os.com` und `http://localhost:3000`. Beim Umzug auf den GAMMA-Server die Adresse in der Funktion anpassen.
- Rollen pro Abteilung gibt es nicht. Seit Migration 43 gibt es Stufen, mit Migration 44 sind es vier, siehe unten.

## Stufen (Migrationen 43 und 44)

Entscheide Dominik, 20. und 21.11.2026. Migration 44 (Stufe «Scannen») ist am 21.11.2026 eingespielt.

| Stufe | Wer | Darf |
| --- | --- | --- |
| Admin | steht in `app_admin` | alles, dazu Benutzer verwalten, Rezepte löschen, Ware entsorgen |
| Benutzer | alle anderen Angemeldeten | alles lesen und schreiben |
| Küche | steht in `app_kueche` (und nicht in `app_admin`) | lesen ohne die Geld-Tabellen; schreiben nur: abhaken (`produktion_aufgabe`, ohne `zustaendig`), `etiketten_erstellen`, `produkt_einlagern`, `einheit_ausbuchen` mit «nicht produziert» |
| Scannen | steht in `app_scannen` (und weder in `app_admin` noch in `app_kueche`) | liest nur 13 Tabellen (siehe unten); schreibt nichts direkt. Packen und Scannen laufen über Funktionen, die mit dem Packen-Kern kommen (Plan Scan-App, S2) |

- `stufe()` gibt die Stufe des Angemeldeten. Bausteine für Regeln: `ist_admin()`, `ist_kueche()`, `ist_scannen()` und `ist_planer()` (Admin oder Benutzer; eine weitere Stufe ist damit von selbst ausgeschlossen). Die App liest `stufe()` einmal nach der Anmeldung (`components/Anmeldung.tsx`, `useStufe`); was sie zeigt, steht in `app/lib/stufe.ts` (Rechte `planen`, `preise`, gesperrte Seiten).
- Zugriffsregeln: Jede Tabelle hat `lesen` und `anlegen`, `aendern`, `loeschen`. Schreiben verlangt seit Migration 44 `ist_planer()` (vorher «nicht Küche»). Die Pilot-Regel `pilot_angemeldet` gibt es nicht mehr. **Neue Tabellen bekommen dieselben vier Regeln:** `lesen` mit `true`, wenn «Scannen» die Tabelle braucht, sonst mit `not ist_scannen()`; Geld-Tabellen mit `ist_planer()`.
- Für «Scannen» lesbar (Migration 44, geprüft über die Abhängigkeiten der Views `service_komponente_bedarf`, `lager_bedarf`, `lager_einheit`, `etikett_beutel`, `komponente_zuteilung`): `anlass`, `service`, `menuelinie`, `menuelinie_gericht`, `menuelinie_komponente`, `komponente`, `produktionssystem`, `regenerationsart`, `produkt`, `charge`, `lagereinheit`, `lagerbewegung`, `gebinde`, mit Migration 45 dazu `kiste` und `scan`. Alle anderen Tabellen nicht, also keine Rezepte, Artikel, Offerten, Kosten, Checkliste. Die Migration bricht ab, wenn die Liste nicht genau stimmt. Preis-Spalte in dieser Liste: nur `anlass.umsatz_netto_chf` (Preisschutz Schritt 2).
- Rechte des Lagers (`lager_recht`, Migration 44): `etikett_erstellen`, `einlagern`, `etikett_stornieren` alle ausser «Scannen»; `entsorgen` und `spiel_abschliessen` nur Admin (Abschluss bis zum Entscheid, Punkt 11 der Spezifikation); `packen` alle Stufen. `etiketten_erstellen` prüft das Recht seit Migration 44 (vorher nur «angemeldet»).
- Für «Küche» nicht lesbar: `lohnsatz`, `energiepreis`, `fixkosten`, `anlass_kosten`, `artikel_preis`, `offerte_gericht`, `anlass_personal`, `anlass_geraet`, `karte_position`. Davon hängen nur Kosten- und Offerten-Views ab (und `karte_uebersicht`).
- **Preisschutz, Schritt 1:** Preise, die als Spalte in einer sonst nötigen Tabelle stehen (`artikel.preis_*`, `anlass.umsatz_netto_chf`, Mietpreise, `betrieb.faktor_vk`) und Views wie `gericht_warenkosten` oder `einkauf_position` blendet nur die App aus; über die Schnittstelle kann «Küche» sie lesen. Schritt 2 (offen): diese Spalten in eigene Tabellen oder Views ohne Preis für «Küche».
- Die App merkt sich die Stufe im Browser (`localStorage`, `planer.stufe`) und gleicht sie bei jedem Laden mit `stufe()` ab. Wird jemand herabgestuft, während die App offen ist, gilt die neue Anzeige ab dem nächsten Laden; bis dahin lehnt die Datenbank das Schreiben ab, einzelne Dialoge melden dann aber trotzdem «gespeichert» (Ändern trifft 0 Zeilen ohne Fehler). Offen: an diesen Stellen 0 Zeilen als Fehler behandeln.
- `produktion_aufgabe`: «Küche» kann Saison, Komponente und Welle einer Zeile nicht ändern (Trigger, Fehler 42501) und `zustaendig` nicht setzen. Anlegen kann sie Zeilen für jede bestehende Saison und Komponente (ohne «Zuständig»); eine Prüfung gegen die Checkliste gibt es nicht.
- Offerten (`anlass.status = 'offerte'`) blendet für «Küche» nur die App aus (Leitstand, Anlass-Seite); lesbar sind sie über die Schnittstelle wie die Preis-Spalten.
- Die App zeigt «Scannen» nur die Seiten `/scannen`, `/packliste` und `/e` (`NUR_SCANNEN` in `app/lib/stufe.ts`); alles andere ist gesperrt, auch neue Seiten. Alle drei sind gebaut (S4, S5); ein Konto «Scannen» landet nach der Anmeldung auf `/scannen`.
- Eine weitere Stufe: Tabelle wie `app_scannen`, Zweig in `stufe()` und in `ist_planer()`, Eintrag in `STUFEN` und `RECHTE` (`app/lib/stufe.ts`) und in `STUFEN` und `TABELLEN` der Edge Function.

## Anmeldung per E-Mail

- Ohne Passwort: Die E-Mail enthält einen Link auf `/anmelden/?token_hash=…&type=email` und einen Code. Der Link meldet erst mit dem Klick auf «Jetzt anmelden» an (`verifyOtp` in `app/app/anmelden/page.tsx`, Hilfen in `app/lib/anmeldung.ts`).
- Grund (17.11.2026): Mailschutz-Programme bei Firmen- und Gemeindeadressen öffnen jeden Link zur Prüfung. Der frühere Link (`{{ .ConfirmationURL }}`) meldete schon beim Öffnen an und war verbraucht, bevor die Person klickte. `{{ .ConfirmationURL }}` deshalb nicht mehr in die Vorlage aufnehmen.
- Die Mailvorlage liegt in `supabase/templates/anmeldelink.html` und wird von Hand im Dashboard eingetragen: Authentication → Emails → «Magic Link». Sie enthält die Adresse `gamma.atoll-os.com` fest; beim Umzug auf den GAMMA-Server dort anpassen.
- Stand 20.11.2026: Vorlage im Auftritt der App (Marke oben, Knopf in `accent`). Sie muss nach dem Ausliefern erneut von Hand im Dashboard eingetragen werden; das Bild oben lädt `https://gamma.atoll-os.com/brand/icon-192.png` und erscheint erst, wenn die App mit den Icons ausgeliefert ist.

## Migrationen

| Migration | Inhalt |
| --- | --- |
| 01 basisschema | Rezepte, Zutaten, Schritte, Artikel, Geräte (PoC) |
| 02 kostenmodell | Löhne, Energie, Fixkosten, Anlass, Kosten pro Anlass |
| 03 gamma_katalog_planung | Katalog, Systemzuteilung, Prüfregeln, Verkauf/Quantum, Saison, Services, Menülinien, Karten, Wellen, Views |
| 04 stammdaten_importer | Produktionssysteme, Quantumtabelle, Betriebe, Kategorien, Saison und 5 Anlässe, Import-Funktionen |
| 05 rezept_importer | Import der Rezeptbibliothek |
| 06 fk_indizes | Indizes auf Fremdschlüsseln |
| 07 komponente_pruefung | Prüfung der Systemzuteilung beim Speichern: Codes gegen die Stammtabellen, TK nur als Lagerung, Lagerung Tage ab 1 |
| 08 rezept_skalierung | Skalierung der Rezeptkarte: `rezept_faktor`, `rezept_zutaten_skaliert`, `rezept_komponenten_skaliert` |
| 09 rezept_skalierung_nachbesserung | Annahme-Felder auf `rezept` (Ergebnis-Menge, Portionen), feinere Rundung, Herleitung der Komponenten-Chargen |
| 10 offerte | Kunde und Offertnummer auf `anlass`, Tabelle `offerte_gericht`, Views `offerte_position` und `offerte_summe` |
| 11 anlass_pflege | Menge pro Gast darf fehlen, `menuelinie_gericht_hinzufuegen`, `offerte_bestaetigen`, `karte_kopieren`, Übersichts-Views |
| 12 wellen_einkauf | `wellen_termine`, Bedarf pro Service, Wellen-Vorschlag und Wellenplan, Lieferant mit Liefertagen, Einkaufs-Views |
| 13 ressourcen_rentabilitaet | `anlass_personal`, `anlass_geraet`, Kalkulation pro Anlass, Monatsergebnis; ersetzt die PoC-Views für den Deckungsbeitrag |
| 14 rezepte_my_recipes | Daten: 171 Rezepte aus dem Paprika-Export «My Recipes» über `importer.rezepte` |
| 15 rezept_pflege | Wertebereiche auf `rezept` und `zutat`, Funktion `rezept_speichern` für die Pflege in der App |
| 16 rezept_name | `rezept_speichern` nimmt auch den Namen; der Slug bleibt unverändert |
| 17 rezept_quelle | `rezept_speichern` nimmt auch die Quelle |
| 18 rezept_ganz_speichern | `rezept_speichern` nimmt das ganze Rezept als jsonb-Dokument und legt neue Rezepte an (`rezept_slug`); Wertebereiche auf `schritt` |
| 19 rezept_loeschen | Admin-Liste `app_admin`, `ist_admin()`, `rezept_loeschen`; auf `rezept` darf nur ein Admin löschen |
| 20 produktion_checkliste | Tabelle `produktion_aufgabe`: Zuständig und Erledigt pro Komponente und Saison. Version `20261110185525` (siehe unten) |
| 21 checkliste_pro_welle | `produktion_aufgabe` mit `welle_nr` (0 = ohne Welle), View `produktion_checkliste`, `wellenplan` mit `vorschlag_nr` |
| 22 artikel_vorschlag | Erweiterung `pg_trgm`, Funktion `komponente_artikel_vorschlag` (Vorschläge für den Hauptartikel) |
| 26 bedarf_pro_spiel | View `service_gericht_bedarf`: Bedarf pro Service, Gericht und Komponente für die Produktionsliste pro Spiel |
| 27 lager_trocken_kombi_steamer | `komponente.lager_trocken` (trocken, bis 18 °C, z.B. EcoNoma; schliesst 0–2 °C und TK aus; nimmt den roten Hinweis «ohne Kühlung» weg), Regeneration «Kombi-Steamer» |
| 28 economat_statt_gedeckt | Lagerung «Economat» (Spalte `lager_trocken`) ersetzt «gedeckt»; Prüfregel `fng_ohne_gedeckt` entfernt; `lager_gedeckt` bleibt ungenutzt stehen |
| 31 produktionssystem_frisch | Produktionssystem `Frisch` (frisch, nur gekühlt 0 bis 2 °C, Standard 3 Tage) für Produkte wie Thonsauce oder Salatsauce; `Minute` und `TK` rücken in der Reihenfolge nach |
| 29 leitstand | View `leitstand_wellen`: Aufgaben und erledigte Aufgaben der Checkliste pro Saison und Welle, für den Leitstand |
| 25 geschirr | Tabellen `service_artikel`, `geschirr_standard`, `anlass_geschirr`, Funktion `anlass_geschirr_vorschlagen`, View `anlass_geschirr_bedarf` |
| 24 planung_aus_rezept | Views `planung_bedarf`, `planung_produktion_schritt`, `planung_produktion_komponente`, `planung_produktion_rolle`, `planung_produktion_geraet`, `planung_service_komponente` |
| 32 rezept_freigabe | Funktion `rezept_status_setzen`, Trigger `rezept_status_pruefen` auf `rezept`, Spalte `rezept_status` in den Views `planung_*`, View `leitstand_rezepte`. Eingespielt am 20.11.2026 |
| 33 zutat_artikel | Funktionen `saison_rezepte`, `zutat_artikel_vorschlag`, `zutat_artikel_verknuepft`, `zutat_artikel_zuordnen`, `zutat_artikel_loesen`; View `einkauf_zutaten_stand`. Keine neue Tabelle. Eingespielt am 20.11.2026 |
| 34 einkauf_aus_rezept | Views `einkauf_bedarf` und `einkauf_zutat` neu; `einkauf_position`, `einkauf_artikel`, `einkauf_summe` neu angelegt (Weg über das Rezept, Spalten `weg`, `rezept_status`, `zutaten…`, `wege`, `annahme`). Eingespielt am 20.11.2026 |
| 35 rezept_warenkosten | View `rezept_warenkosten`: Warenkosten pro Rezept je Charge und je kg, ohne Zuschlag. Eingespielt am 20.11.2026 |
| 36 anlass_warenkosten | Views `anlass_warenkosten_komponente` und `anlass_warenkosten` (Warenkosten des Anlasses aus den Menülinien über die Rezepte); `anlass_kostenart` nimmt sie für die Kostenart Waren, sobald sie vollständig sind. Eingespielt am 20.11.2026 |
| 37 produktionsliste_anlass | View `produktionsliste_anlass`: Produktionsliste pro Anlass (Menge des Anlasses, Wellen und Start aus der Saison). Eingespielt am 20.11.2026 |
| 38 durchsicht_korrekturen | Korrekturen aus der Durchsicht: Einkaufs-Views mit technischem Schlüssel `bezug_id` neu angelegt, Herleitung bei Unterrezepten, leeres Unterrezept zählt als offene Zutat (`einkauf_zutat`, `rezept_warenkosten`), `anlass_warenkosten` ohne Total bei Services ohne Menülinie oder Gerichten ohne Komponenten. Eingespielt am 20.11.2026 |
| 39 einkauf_liste | Funktion `einkauf_liste(p_saison)`: Summe, Artikel, Positionen und Zutaten-Zähler in einer Antwort (Unterbau einmal gerechnet). Funktion `einkauf_summe_von` als einzige Stelle der Summen-Regeln; View `einkauf_summe` benützt sie (gleiche Spalten und Werte). Eingespielt am 20.11.2026 |
| 40 mhd_ab_produktionsdatum | `produktion_aufgabe.produziert_am` (Produktionstag, vom Trigger beim Abhaken gesetzt). View `produktion_checkliste` mit `haltbarkeit_tage`, `produziert_am`, `haltbar_bis`, `haltbar_grundlage`; `wellenplan.haltbar_bis` bei abgehakten Zeilen ab dem Produktionstag. Eingespielt am 20.11.2026 |
| 41 etiketten_lager | Etiketten und Lager, Etappe 1: `produkt` und `komponente.produkt_id`, `rezept.beutel_g` (samt `rezept_speichern`), `charge`, `lagereinheit`, `lagerbewegung`, `druckauftrag` (nur lesbar, geschrieben über Funktionen), Views `bedarf_service_welle`, `etikett_vorschlag`, `etikett_beutel`, Funktion `etiketten_erstellen` (erste `security definer`-Funktion im Projekt). Eingespielt am 20.11.2026 |
| 42 lager | Lager, Etappe 2: Views `lager_einheit`, `lager_bestand`, `lager_bedarf`; Funktionen `produkt_einlagern` (ohne Welle), `einheit_ausbuchen`, `lager_recht` (einzige Stelle für die Rechte des Lagers); `etikett_vorschlag.beutel_rest` leer statt 0 ohne Vorschlag. Eingespielt am 20.11.2026 |
| 43 stufe_kueche | Stufe «Küche»: Tabelle `app_kueche`, Funktionen `ist_kueche()`, `stufe()`; alle 49 Pilot-Regeln ersetzt durch `lesen`, `anlegen`, `aendern`, `loeschen` (Schreiben nicht für «Küche»); neun Geld-Tabellen für «Küche» nicht lesbar; `produktion_aufgabe` für «Küche» schreibbar ohne `zustaendig` (Trigger `produktion_aufgabe_kueche`); Rezepte anlegen und ändern nicht für «Küche». Eingespielt am 21.11.2026 |
| 44 stufe_scannen | Stufe «Scannen»: Tabelle `app_scannen`, Funktionen `ist_scannen()`, `ist_planer()`, `stufe()` mit `scannen`; 147 Schreib-Regeln verlangen `ist_planer()`; «Scannen» liest 13 Tabellen, 32 weitere sind für sie gesperrt, die neun Geld-Tabellen lesen nur Admin und Benutzer; `lager_recht` mit `etikett_erstellen`, `packen`, `spiel_abschliessen`; `etiketten_erstellen` prüft das Recht. Eingespielt am 21.11.2026 |
| 45 packen | Packen-Kern (Scan-App S2): Tabellen `kiste` (sortenrein, Code `K-XXXXXX`) und `scan` (mit `scan_nummer`, `quelle`); `lagereinheit.kiste_id` und `.klaeren`, `lagerbewegung.kiste_id`, `druckauftrag.kiste_id` (genau ein Ziel); Views `packliste_soll`, `packliste`, `packliste_ohne_etikett`, `etikett_kiste`; Funktionen `kiste_erstellen`, `beutel_einpacken`, `beutel_auspacken`, `kiste_aufloesen`, `scan_erfassen`, `service_abschliessen` (alle `security definer`, Recht über `lager_recht`). Eingespielt am 21.11.2026 |
| 46 gewicht_logistik | Gewicht für die Logistik (Scan-App S3): Funktionen `transportart` (gekühlt, tiefgekühlt, ungekühlt) und `komponente_packmass` (Gebinde, Tara, Füllmenge einer Komponente, `security definer`, damit auch «Scannen» sie bekommt); Views `kiste_gewicht` und `logistik_gewicht` (Soll und Ist pro Spiel und Transportart; Tara noch vom Gebinde am Rezept). Eingespielt am 21.11.2026 |
| 47 gebinde_pro_kiste | `kiste.gebinde_id` und `kiste_erstellen(service, gebinde)`: die Höhe der IFCO wird pro Kiste gewählt; `kiste_gewicht` nimmt die Tara vom Gebinde der Kiste; beide Gewichts-Views neu angelegt. Eingespielt am 21.11.2026 |
| 48 ifco_gebinde | Daten: zehn IFCO-Kisten «Black Lift Lock» als Gebinde (Aussenmass, Tara, Höchstbeladung) aus dem Datenblatt IFCO-DS1003-CH-DE; neue Spalte `gebinde.max_beladung_kg` (nur Angabe, wird nicht geprüft). Eingespielt am 21.11.2026 |
| 49 hinweis_hoechstbeladung | `beutel_einpacken` gibt nach dem Einpacken den gelben Hinweis `ueber_hoechstbeladung`, wenn das Netto der Kiste über `gebinde.max_beladung_kg` liegt; sperrt nichts. Eingespielt am 21.11.2026 |
| 50 temperaturkontrolle | Tabellen `kuehlstelle` (Art Kühlung/TK/Economat, Grenzwerte, Messungen pro Tag) und `temperaturmessung` (mit den beim Messen gültigen Grenzwerten, Visum, Massnahme, Storno); Funktionen `temperatur_recht`, `temperatur_erfassen` (Massnahme Pflicht bei Abweichung), `temperatur_stornieren` (nur Admin); Views `temperatur_liste`, `temperatur_heute`. Messungen nie änderbar, Schreiben nur über die Funktionen; «Scannen» sieht nichts. Eingespielt am 24.11.2026 (per SQL mit Eintrag in `schema_migrations`, wie `db push`) |
| 23 rezept_planung | Tabelle `gebinde` (IFCO-Box), `rezept` mit Gebinde, Verpackung, Füllmenge und Service-Aufwand, `schritt` mit Rüstzeit und Menge pro Durchgang, `rezept_speichern` nimmt die neuen Felder |

Die Versionen in der Datenbank entsprechen den Dateinamen. Migration 20 wurde nicht mit `supabase db push` eingespielt und trägt darum einen Zeitstempel (`20261110185525`); die Datei heisst seit dem 14.11.2026 gleich. Neue Migrationen immer mit `supabase db push` einspielen, sonst passen Datei und Datenbank nicht zusammen.

### Neue Migration einspielen

1. Datei in `supabase/migrations/` anlegen (Zeitstempel-Präfix).
2. Im Repo-Wurzelordner zuerst `supabase db push --remote --dry-run` (zeigt, was eingespielt würde), dann `supabase db push --remote` ausführen und bestätigen (seit CLI 3 zielt der Befehl ohne `--remote` auf die lokale Datenbank). Ohne Terminal, also aus einem Skript oder durch Claude, braucht es `--yes` statt der Rückfrage.
3. Typen neu erzeugen: `cd app && npm run types`, dann `npm run typecheck`. Die Datei `app/lib/database.types.ts` committen.

Eine eingespielte Migration wird nicht mehr geändert. Korrekturen kommen als neue Migration (Beispiel: 09 nach 08).

## Importiert

| Quelle | Bereich | Anzahl |
| --- | --- | --- |
| Systemzuteilung Winter Collection 2026/27 | Preisliste | 669 Artikel (670 Zeilen, 1 Doppeleintrag) |
| | Komponenten | 493 (310 ok, 130 offen, 53 Zukauf) |
| | Gerichte | 300, mit 696 Gericht-Komponenten (alle Verweise aufgelöst) |
| | Blatt Spengler Cup | 6 Menülinien, 11 Spiele à 550 Gäste, 128 Gerichte, 344 Komponentenzeilen |
| F&B Spengler Cup 2026 | Barkarte Loft 23 | 64 Positionen |
| Verkaufstool Gamma TEST | Quantumtabelle, Faktoren, Warenkosten-Schätzung | 40 Werte, 2 Betriebe, 16 Kategorien |
| rezepte.json | Rezeptbibliothek | 14 Rezepte, 163 Zutaten, 96 Schritte |
| My Recipes (Paprika-Export, 186 Rezepte) | Rezeptbibliothek | 171 Rezepte, 1761 Zutaten, 626 Schritte |

Manuell zugeordnet beim Import (Menütext → Katalog):

- «Blumenkohlcrèmesuppe mit Kräuteröl» → GW070 Blumenkohlcrèmesuppe (automatisch wäre GW069 gewählt worden)
- «Klassische Crèmeschnitte» → Dessert «Cremeschnitte»

Import «My Recipes» (`supabase/import/tools/paprika.py`, Migration 14):

- Nicht importiert: 12 Rezepte ohne Zutaten und 3, die es schon gab (Sugo, Truffaux, Quiche aux Oignons). Bilder und Bewertungen werden nicht übernommen.
- g und kg genau. ml, dl und l als Gramm (1 ml = 1 g), als Annahme markiert (116 Zutaten). EL, TL, Cup, Bund und Stück ohne Menge, die Originalangabe steht in `zutat.notiz` (911 Zutaten).
- 44 Rezepte mit Portionenzahl sind Gerichte, 127 Komponenten. Portionsgrösse, Ergibt-Menge, Basiszutat, Zeiten und Geräte fehlen und stehen pro Rezept als offener Punkt.
- Notizen und Beschreibung liegen in `rezept.besonderes`, eine Ertragsangabe als Text in `rezept.chargengroesse`. «ß» ist durch «ss» ersetzt.
- Auffällig im Original: «French Dressing 3» mit 400 dl Geflügelbouillon (40 kg).

Prüfen: «Geräucherter Saibling mit Couscous und Gurke» → GW054, «Waffeln mit Honig» → «Waffeln, Bündner-Nusstortenfüllung, Rahm», «Bündner Nusstorte» → GW191 Engadiner Nusstorte. Die Zuordnung folgt den Komponentenzeilen, auf die das Blatt Spengler Cup verweist.

Noch leer (in der App zu erfassen): Lohnsätze, Strompreis, Fixkosten, Lieferanten, Bestand und Mietpreis der Geräte, Datum der 11 Spiele des Spengler Cup. Erst 5 Komponenten haben einen Hauptartikel; keine Zutat und kein Katalog-Gericht ist mit einem Rezept oder Artikel verknüpft. Diese Verknüpfungen macht Dominik von Hand.

## Berechnungen

### Katalog und Systemzuteilung

- `komponente_zuteilung`: Status (offen, ok, Zukauf) und Haltbarkeit wie Spalten AA und AM der Systemzuteilung
- `komponente_pruefhinweis`: die drei Prüfregeln aus dem Blatt Legende (rot, gelb)
- `gericht_warenkosten`: Hauptartikel × Menge pro Portion + Zuschlag (`wk_zuschlag`)

### Rezepte

- `zutat_skaliert`: Skalierungs-Prozent gegen die Basiszutat
- `rezept_zeit`: aktive und unbeaufsichtigte Minuten
- `rezept_faktor(rezept, wert)`: Faktor aus Portionen (Gericht) oder Chargen (Komponente), mit Herleitung
- `rezept_zutaten_skaliert(rezept, wert)`, `rezept_komponenten_skaliert(rezept, wert)`: skalierte Mengen
- `rezept_speichern(rezept, geaendert_am, daten jsonb)`: speichert das ganze Rezept (Kopf, Gruppen, Zutaten, Schritte, erledigte offene Punkte) in einem Schritt und gibt `{id, slug, geaendert_am}` zurück. Das Dokument ist vollständig: Gruppen, Zutaten und Schritte, die fehlen, werden gelöscht; Einträge mit `id` werden geändert, ohne `id` neu angelegt. `rezept` null legt ein neues Rezept an. Lehnt ab, wenn der geladene Stand (`geaendert_am`) nicht mehr gilt oder ein Typwechsel bestehende Verknüpfungen bricht. Ein Gericht braucht Basisportionen; Mengen sind über 0 oder leer, Minuten ab 0.
- Planung im Rezept (Migration 23, Etappe 1 von 3): `schritt.ruest_min` fällt einmal an; `aktiv_min` und `unbeaufsichtigt_min` gelten pro Durchgang; `schritt.menge_pro_durchgang_g` ist die Menge, die das Gerät in einem Durchgang fasst (leer = eine Basis-Charge). `rezept.gebinde_id`, `verpackung`, `fuellmenge_g` für die Logistik, `rezept.service_min_pro_100` und `service_rolle` für die Ausgabe vor Ort (Minuten pro 100 Portionen). Regenerieren vor Ort ist ein Schritt mit `ort = 'vor_ort'`. Lagerung, Haltbarkeit und Regeneration bleiben in der Systemzuteilung der Komponente (massgebend) und erscheinen im Rezept über `komponente.rezept_id`. Fehlt ein neuer Schlüssel im Dokument von `rezept_speichern`, bleibt der gespeicherte Wert. Die Berechnung pro Anlass (Durchgänge, Stunden, Gebinde) folgt in Etappe 2.
- `rezept_status_setzen(rezept, status, geaendert_am)` (Migration 32): setzt `entwurf`, `geprueft` oder `freigegeben` und gibt `{id, status, geaendert_am}` zurück. Lehnt ab, wenn der geladene Stand nicht mehr gilt. Entscheide Dominik (19.11.2026): «Geprüft» dürfen alle Angemeldeten setzen; freigeben und eine Freigabe zurücknehmen nur Admins. Das prüft der Trigger `rezept_status_pruefen` auf der Tabelle, also auch bei direktem Zugriff über die API; Migrationen und Importer (ohne angemeldeten Benutzer) sind ausgenommen. `rezept_speichern` fasst den Status nicht an: ein freigegebenes Rezept bleibt beim Speichern freigegeben.
- `rezept_loeschen(rezept)`: löscht ein Rezept endgültig samt Gruppen, Zutaten, Schritten und offenen Punkten. Nur für Admins (`ist_admin()`); lehnt ab und nennt die Stelle, solange das Rezept in Katalog, Systemzuteilung, Anlass oder einem anderen Rezept verwendet wird.
- `rezept_slug(name)`: Adresse (Slug) für ein neues Rezept aus dem Namen
- `rezept_kosten_waren`, `rezept_kosten_arbeit_energie`: aus dem PoC; liefern erst Werte, wenn Zutaten mit Artikeln verknüpft und Lohnsätze erfasst sind

### Offerte

- `offerte_position`: pro Gericht Menge pro Gast (Quantum × Anteil), Warenkosten (Artikel, sonst Schätzung CHF/kg der Kategorie), Preis (× Faktor des Betriebs), Herleitung
- `offerte_summe`: Preis pro Gast (gerundet nach `vk_rundung_chf`), Total exkl. MWST, MWST, Warenkosten, Deckungsbeitrag
- `offerte_bestaetigen(anlass, saison)`: macht aus der Offerte einen bestätigten Anlass mit Menülinie «Menü» und einem Service

### Anlass und Produktion

- `anlass_uebersicht`, `menuelinie_gaeste`, `karte_uebersicht`: Zahlen für die Listen
- `menuelinie_gericht_hinzufuegen(linie, gericht, anteil)`: Gericht aus dem Katalog mit seinen Komponenten in eine Menülinie; `karte_kopieren(karte, anlass, name)`
- `anlass_komponente_bedarf`: Gäste × Anteil × Menge pro Gast je Menülinie
- `service_komponente_bedarf`: derselbe Bedarf je Service (mit Datum)
- `service_gericht_bedarf`: Bedarf je Service, Gericht und Komponente mit Datum und Anlieferung. Die Produktionsliste filtert damit pro Spiel, auch wenn mehrere Spiele dieselbe Menülinie haben. Kontrollwert: Rindsentrecote Spiel 1 und Spiel 6 je 39.6 kg, zusammen 79.2 kg wie die Menülinie
- `produktionsliste`: Menge, Haltbarkeit, Wellen, Start pro Komponente und Saison; `zeilen_ohne_menge` zeigt fehlende Mengen
- `wellen_anzahl(saison, haltbarkeit)`: Anzahl Produktionswellen wie die Hilfstabelle im Blatt Produktionsplan
- `wellen_termine(saison, haltbarkeit)`: die Termine dazu (erste Welle am Tag vor der Anlieferung, danach alle «Haltbarkeit» Tage). Migration 12 prüft beim Einspielen, dass die Anzahl mit `wellen_anzahl` übereinstimmt.
- `wellen_vorschlag`: Komponente × Welle mit Menge nach Service-Datum; `wellenplan_uebernehmen(saison)` speichert ihn in `produktionswelle` und `welle_komponente`
- `wellenplan`: gespeicherter Plan mit Prüfhinweisen (rot, gelb); `wellen_uebersicht`: Zahlen pro Saison
- `leitstand_rezepte` (Migration 32): pro Saison die Rezepte, die mit einer Komponente im Bedarf eines Anlasses der Saison verknüpft sind (`rezepte`), und wie viele davon freigegeben sind (`freigegeben`)
- `leitstand_wellen`: zählt die Checkliste pro Saison und Welle (`aufgaben`, `erledigt`). Kontrollwert am 15.11.2026: ohne Welle 172, Welle 1 77, Welle 2 3, erledigt überall 0
- `produktion_checkliste`: eine Zeile pro Saison, Komponente und Welle mit Produktionstag (aus dem Plan, sonst aus dem Vorschlag), Zuständig und Erledigt. `welle_nr` ist die Welle der Komponente im Vorschlag; Komponenten ohne Welle (Zukauf, offen, nur vor Ort) haben `welle_nr` 0. Geschrieben wird in `produktion_aufgabe`; Zeitpunkt und Person des Häkchens setzt ein Trigger. Die Einträge bleiben erhalten, wenn der Vorschlag neu übernommen wird. Annahme: Ändern sich Anlassdaten oder Haltbarkeit, verschieben sich die Wellen-Nummern.
  - MHD (Migration 40, Entscheid 20.11.2026): `haltbar_bis` = Produktionsdatum + Haltbarkeit der Systemzuteilung. Produktionsdatum = `produziert_am` der abgehakten Zeile, sonst Datum des Wellenplans, sonst spätester Termin; `haltbar_grundlage` sagt, welches (`produziert`, `geplant`, `spaetestens`). `produziert_am` setzt der Trigger `produktion_aufgabe_stempel`: beim Abhaken heute (Europe/Zurich); am selben Tag zurückgenommen wird es geleert, später zurückgenommen bleibt es stehen (erneutes Abhaken verlängert das MHD nicht). Annahme: abgehakt wird am Produktionstag.

### Einkauf

- `lieferant_bestelltermin(lieferant, liefern_bis)`: letzter Liefertag bis zum Datum und Bestellschluss dafür
- `wellen_aktuell`: Datum aus dem Plan, Menge immer aktuell aus dem Vorschlag
- `einkauf_position`: Bedarf pro Welle bzw. Anlass und Komponente, mit Hauptartikel, Menge, Kosten, Liefertermin und Bestellschluss
- `einkauf_artikel`: Einkaufsliste nach Lieferant und Artikel; `einkauf_summe`: Zahlen pro Saison
- `einkauf_liste(p_saison)`: liefert der Seite Einkauf alles in einer Abfrage (jsonb mit `summe`, `artikel`, `positionen`, `zutaten`); `einkauf_summe_von(positionen[], artikel[])` rechnet die Summe. Beide hängen an den Zeilentypen von `einkauf_position` und `einkauf_artikel`: wer diese Views neu anlegt, entfernt zuerst `einkauf_liste`, `einkauf_summe` und `einkauf_summe_von`.
- `komponente_artikel_vorschlag(saison, anzahl, schwelle)`: Komponenten der Saison ohne Hauptartikel mit den ähnlichsten aktiven Artikeln nach dem Namen (`pg_trgm`, Standard 3 Vorschläge ab Ähnlichkeit 0.5). Schlägt nur vor; zugeordnet wird von Hand. Probelauf 14.11.2026: 249 Komponenten ohne Hauptartikel

### Planung aus dem Rezept (Migration 24)

- `planung_bedarf`: Bedarf für die Produktion, pro Welle (`wellen_aktuell`) und für Komponenten ohne Welle pro Anlass. Gleiche Quelle wie der Einkauf.
- `planung_produktion_schritt`: pro Bezug, Komponente und Arbeitsschritt der Zentralküche. Durchgänge = Menge ÷ Menge pro Durchgang, aufgerundet (ohne Angabe die Ergibt-Menge des Rezepts). Aktiv = Rüstzeit + Durchgänge × aktiv. Gerät belegt = Durchgänge × (aktiv + unbeaufsichtigt). Ein Schritt ohne Ort zählt zur Zentralküche.
- `planung_produktion_komponente`: eine Zeile pro Bezug und Komponente, auch ohne Rezept. `status`: gerechnet, kein Rezept, Menge fehlt, Stück nicht umrechenbar, keine Schritte, Durchgang fehlt.
- `planung_produktion_rolle`, `planung_produktion_geraet`: aktive Zeit pro Rolle und Belegung pro Gerät, nur gerechnete Schritte.
- `planung_service_komponente`: pro Service und Komponente. Gebinde = Menge ÷ Füllmenge, aufgerundet; Gewicht = Menge + Gebinde × Tara; Volumen = Gebinde × Volumen; vor Ort aus den Schritten mit Ort `vor_ort`; Ausgabe = Portionen ÷ 100 × Minuten pro 100 Portionen.
- Freigabe (Migration 32): Die Views rechnen mit jedem verknüpften Rezept. `planung_produktion_schritt`, `planung_produktion_komponente` und `planung_service_komponente` tragen dessen Status in `rezept_status`; `planung_produktion_rolle` und `planung_produktion_geraet` zählen in `komponenten_nicht_freigegeben`, wie viele Komponenten der Summe aus einem nicht freigegebenen Rezept stammen. Die App kennzeichnet diese Werte wie Annahmen.
- Entscheide Dominik (14.11.2026): Produktion pro Welle, Logistik und Service pro Service. Liter als Kilogramm (1 l = 1 kg, Annahme, in der App gestrichelt). Stück werden nicht umgerechnet.
- Kontrollwert aus dem Probelauf (Testrezept, nicht gespeichert): Kartoffelgratin 99 kg in Welle 1 bei 12 kg pro Durchgang = 9 Durchgänge; 30 min Rüstzeit + 9 × (25 + 5 + 5) min = 345 min aktiv. Spiel 1: 33 kg ÷ 12 kg = 3 Gebinde, 330 Portionen × 15 min ÷ 100 = 49.5 min Ausgabe.

### Geschirr und Besteck (Migration 25)

- `service_artikel`: Teller, Besteck, Gläser, Material für die Ausgabe mit eigenem Bestand, Mietpreis pro Stück und Anlass, Stück pro Korb und Gewicht.
- `geschirr_standard`: Vorschlag pro Angebotsform und Gang (Stück pro Gast, Wechselfaktor, Reserve). Leer angelegt; Dominik legt die Werte in den Stammdaten fest.
- `anlass_geschirr`: Positionen am Anlass, entweder pro Gast (mit Gang) oder als feste Stückzahl (ohne Gang, für die Ausgabe). Eine Position pro Anlass, Gang und Artikel.
- `anlass_geschirr_vorschlagen(anlass)`: übernimmt den Standard der Angebotsform für die Gänge, die im Menü des Anlasses vorkommen. Bestehende Positionen bleiben.
- `anlass_geschirr_bedarf`: Bedarf = Gäste × Stück pro Gast × Wechselfaktor × (1 + Reserve), aufgerundet; eigener Bestand zuerst, der Rest Miete; Mietkosten, Körbe, Gewicht. Annahme: Gäste = grösster Service des Anlasses (dazwischen wird abgewaschen). Gleichzeitige Anlässe sind beim Bestand noch nicht berücksichtigt.
- Kontrollwert aus dem Probelauf (nicht gespeichert): 550 Gäste × 1 × 1.5 + 10 % = 908 Stück; bei 600 im Bestand 308 Miete.

### Ressourcen und Rentabilität

- `anlass_personal_kosten`: Stunden × Lohnsatz der Rolle am Anlassdatum; Freelancer als Zusatzbedarf
- `geraet_zuteilung()`, `anlass_geraet_bedarf`: eigener Bestand gegen den Bedarf gleichzeitiger Anlässe, Zusatzbedarf Miete und Mietkosten
- `anlass_kostenart`: pro Kostenart berechnet, Plan von Hand, Ist; `anlass_kosten_setzen(anlass, art, plan, ist)` schreibt Plan und Ist
- `anlass_kalkulation`: Umsatz, variable Kosten, Deckungsbeitrag, Fixkosten-Anteil, Ergebnis pro Anlass
- `anlass_deckungsbeitrag`, `monat_ergebnis`: Deckungsbeitrag pro Anlass und Monatsergebnis mit Break-even

### Packen und Scannen (Migration 45)

- **Kiste:** gehört genau einem Spiel, ist sortenrein (`kiste.produkt_id`, gesetzt durch den ersten Beutel, leer, wenn die Kiste leer ist). Zustände: `offen`, `verladen`, `angekommen`, `abgeschlossen`, `aufgeloest`. Der Code hat die Form `K-XXXXXX`, damit er sich beim Eintippen von einer Seriennummer (8 Zeichen) unterscheidet.
- **Soll:** View `packliste_soll` ist die einzige Stelle: Bedarf des Spiels pro Produkt und Einheit, nur Komponenten mit Etikett (Status ok, mit Haltbarkeit, nicht nur vor Ort; gleiche Regel wie `lager_bedarf`). Fehlt eine Menge, ist das Soll leer und gilt nie als erreicht. Der Rest des Bedarfs steht in `packliste_ohne_etikett` mit Grund.
- **Ist:** Beutel in den Kisten des Spiels (`in_kiste` oder schon `verbraucht`). Produkte ohne Soll stehen in `packliste` mit Status `zusaetzlich`.
- **Antwort statt Fehler:** `beutel_einpacken`, `beutel_auspacken` und `scan_erfassen` geben jedes Scan-Ergebnis als jsonb zurück (`ergebnis`, `farbe` gruen/gelb/rot, `meldung`, `hinweise`, `kiste`), auch die roten. Eine Ausnahme gibt es nur bei fehlendem Recht und ungültigen Aufrufen. Die Oberflächen zeigen an und prüfen nichts selbst.
- **Reihenfolge der Prüfungen beim Einpacken:** unbekannt; schon in dieser Kiste (gelb, zählt nicht); Kiste nicht offen; Beutel verbraucht oder entsorgt; in anderer Kiste; anderes Produkt als in der Kiste; Verbrauchsdatum vor dem Service-Datum oder vor heute (alle rot); nicht im Bedarf; Soll erreicht (beide gelb, mit `p_bestaetigt` wird eingepackt). Hinweise ohne Sperre: älterer Beutel im Lager, Service ohne Datum, Kiste über der Höchstbeladung des Gebindes (Migration 49).
- **Ohne Netz (`p_ohne_netz`):** Der Beutel wird immer eingebucht; spricht eine Prüfung dagegen, steht ihr Code in `lagereinheit.klaeren` («zu klären»), bis jemand auspackt oder mit Netz und `p_bestaetigt` nochmals scannt. Nie eingebucht wird ein unbekannter Code, ein verbrauchter oder entsorgter Beutel und eine abgeschlossene oder aufgelöste Kiste. Lag der Beutel in einer anderen Kiste, wird er dort ausgebucht.
- **Verladen und Ankunft (`scan_erfassen`):** Jeder Scan wird gespeichert. Dieselbe `scan_nummer` nochmals gibt die gespeicherte Antwort zurück. Zählt nur `ok`; gelbe Hinweise: Kiste leer, Soll noch nicht gepackt (beim Verladen), Ankunft ohne Verlade-Scan. Die Antwort trägt «n von m Kisten».
- **Abschluss (`service_abschliessen`):** nur mit dem Recht `spiel_abschliessen` (Admin). Angekommene Kisten: Beutel verbraucht. Kisten ohne Ankunfts-Scan brauchen einen Entscheid pro Kiste; «zurück ins Lager» geht nur für nie verladene Kisten (Punkt 7 der Spezifikation ist offen). Beutel «zu klären» sperren den Abschluss.
- **Aufgelöste Kiste** bleibt als Verlauf stehen (Fremdschlüssel «restrict»). Ein Service mit Kisten lässt sich darum nicht löschen, auch nach dem Auflösen nicht.
- **Gewicht (Migration 46):** `kiste_gewicht` rechnet pro Kiste Netto (Beutel in kg, 1 l = 1 kg als Annahme), Tara aus dem Gebinde der Kiste (`kiste.gebinde_id`, beim Anlegen gewählt; ohne Angabe das einzige aktive Gebinde) und Brutto, sofern vollständig. Im Soll gilt als Planwert die Tara des Gebindes am Rezept. `logistik_gewicht` zeigt pro Spiel und Transportart das Soll aus dem Bedarf (Kisten: pro Produkt Bedarf ÷ Füllmenge pro Gebinde, aufgerundet) und das Ist aus den gepackten Kisten. Was sich nicht wiegen lässt, steht als Anzahl daneben (Produkte in Stück, ohne Menge, ohne Füllmenge, ohne Tara) und das betroffene Total ist leer. Transportart leer = Lagerart fehlt. Keine Obergrenze pro Kiste, keine Prüfung der Nutzlast.
- Noch nicht gebaut: Anhalt «rund n Beutel» in der Packliste (mit `komponente_packmass` seit Migration 46 möglich), ZPL für das Kisten-Etikett (Etappe 3).

## Einstellungen (Tabelle `einstellung`)

| Schlüssel | Wert | Bedeutung |
| --- | --- | --- |
| `wk_zuschlag` | 0.20 | Zuschlag auf die Warenkosten, solange keine Rezepte vorliegen (Annahme) |
| `mwst_satz` | 0.081 | MWST-Normalsatz |
| `vk_rundung_chf` | 0.05 | Rundung des Preises pro Gast (Annahme) |
| `einkauf_vorlauf_tage` | 1 | Ware trifft so viele Tage vor Bedarf ein (Annahme) |
| `db_ziel_pct` | 35 | Zielwert Deckungsbeitrag in % (Annahme, festzulegen) |

## Erneut importieren

`supabase/import/tools/parse.py` und `parse2.py` lesen die Excel und erzeugen die Dateien `supabase/import/0*.sql`. Diese rufen die Funktionen im Schema `importer` auf. Bestehende Zeilen werden nicht doppelt angelegt und in der App gepflegte Werte nicht überschrieben.
