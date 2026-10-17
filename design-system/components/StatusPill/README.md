# StatusPill

Kennzeichnet den Zustand einer Zeile oder eines Anlasses in einem Wort oder einer kurzen Mengenangabe.

| status | Bedeutung | Beispiele |
| --- | --- | --- |
| `ok` | erledigt, aus eigenem Bestand gedeckt | Bestätigt, Eigen gedeckt |
| `info` | Zusatzbedarf, wird automatisch disponiert | +1 Freelancer, +1 Miete, Miete |
| `warn` | offen, braucht eine Entscheidung | Option, Bestellen |
| `critical` | echter Fehler, blockiert | Allergen-Konflikt, Lieferung storniert |
| `neutral` | reine Kategorie | Eigen |

Regel: Fehlendes Personal oder Gerät ist **kein** Fehler – es gibt den Freelancer-Pool und Miete. Zusatzbedarf ist immer `info`, nie `critical`.
