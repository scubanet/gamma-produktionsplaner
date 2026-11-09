# RecipeGroups

Zutaten und Zubereitung eines Rezepts: je Gruppe links die Zutaten, rechts die nummerierten Schritte (Nummern laufen über die Gruppen weiter).

- Kopfzeile Zutat · Menge · Skal. · Zubereitung im Stil von `label`; Gruppen getrennt durch `divider`.
- Mengen und Prozente in Mono, rechtsbündig; Basiszutat (100 %) fett.
- Annahmen (`assumed`) bei Menge oder Schritt gestrichelt unterstrichen (`pl-assumed`).
- Schritte tragen Chips (Gerät, Temperatur, aktiv, unbeaufsichtigt, HACCP).
- Mengen kommen formatiert vom Aufrufer (z.B. «1.58 kg»); die Komponente rechnet nicht.
- Unter 760 px stehen Zutaten und Schritte untereinander, die Kopfzeile entfällt.
- Für Screenreader trägt jede Menge «Menge …», jedes Prozent «Skalierung …» und jede Annahme «(Annahme)» als unsichtbaren Text (`pl-sr`).
