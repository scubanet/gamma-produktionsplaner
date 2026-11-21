"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, DataTable, Dialog, KpiTile, Notice, Select, StatusPill, TextField, Skeleton } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { datumText, neuerZugang, sortieren, status, type Benutzer } from "@/lib/benutzer";
import { fehlerText } from "@/lib/fehler";
import { STUFEN, stufeLabel, type Stufe } from "@/lib/stufe";

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

/** Edge Function aufrufen; sie antwortet mit Daten oder { fehler }. */
async function rufen<T>(body: Record<string, unknown>): Promise<T> {
  const r = await supabase.functions.invoke("benutzer", { body });
  if (r.error) throw new Error(fehlerText(r.error));
  const d = r.data as { fehler?: string } & T;
  if (d?.fehler) throw new Error(d.fehler);
  return d;
}

export default function BenutzerSeite() {
  const [liste, setListe] = useState<Benutzer[] | null>(null);
  const [fehler, setFehler] = useState<{ titel: string; text: string } | null>(null);
  const [meldung, setMeldung] = useState("");
  const [arbeitet, setArbeitet] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; fehler: string | null } | null>(null);
  const [offen, setOffen] = useState(false);
  const [stufeWahl, setStufeWahl] = useState<{ b: Benutzer; stufe: Stufe } | null>(null);
  const meldungRef = useRef<HTMLParagraphElement>(null);

  const neuLaden = useCallback(
    () =>
      rufen<{ benutzer: Benutzer[] }>({ aktion: "liste" }).then(
        (d) => {
          // Antwortet noch die alte Funktion (ohne Stufe), gilt Admin oder Benutzer.
          setListe(sortieren(d.benutzer.map((b) => ({ ...b, stufe: b.stufe ?? (b.admin ? "admin" : "benutzer") }))));
          return true;
        },
        (e: Error) => {
          setFehler({ titel: "Benutzer nicht geladen", text: fehlerText(e) });
          return false;
        },
      ),
    [],
  );

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const melden = (text: string) => {
    setFehler(null);
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };

  async function aktion(b: Benutzer, body: Record<string, unknown>, text: string) {
    if (arbeitet) return;
    setArbeitet(b.id);
    try {
      await rufen({ ...body, id: b.id });
      setStufeWahl(null);
      if (await neuLaden()) melden(text);
    } catch (e) {
      setStufeWahl(null);
      setFehler({ titel: "Nicht gespeichert", text: `${b.name || b.email}: ${fehlerText(e)}` });
    } finally {
      setArbeitet(null);
    }
  }

  async function anlegen() {
    if (!form) return;
    const p = neuerZugang(form.name, form.email);
    if ("fehler" in p) return setForm({ ...form, fehler: p.fehler });
    setArbeitet("neu");
    try {
      await rufen({ aktion: "anlegen", ...p });
      setOffen(false);
      if (await neuLaden()) melden(`Zugang für ${p.email} angelegt. Die Person öffnet gamma.atoll-os.com und lässt sich mit dieser Adresse einen Anmeldelink schicken.`);
    } catch (e) {
      setForm({ ...form, fehler: fehlerText(e) });
    } finally {
      setArbeitet(null);
    }
  }

  const alle = liste ?? [];

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Benutzer · nur für Administratoren</div>
          <h1 className="pl-h1">Benutzerverwaltung</h1>
        </div>
        <div className="pl-actions">
          <Button variant="primary" onClick={() => { setForm({ name: "", email: "", fehler: null }); setOffen(true); }} disabled={!liste}>Zugang anlegen</Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title={fehler.titel}>{fehler.text}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      {liste ? (
        <>
          <div className="pl-grid-3">
            <KpiTile label="Benutzer" value={String(alle.length)} detail={`${alle.filter((b) => b.gesperrt).length} gesperrt`} />
            <KpiTile label="Administratoren" value={String(alle.filter((b) => b.stufe === "admin").length)} detail={`verwalten Benutzer und dürfen Rezepte löschen · ${alle.filter((b) => b.stufe === "kueche").length} Stufe Küche · ${alle.filter((b) => b.stufe === "scannen").length} Stufe Scannen`} />
            <KpiTile label="Noch nie angemeldet" value={String(alle.filter((b) => !b.letzte_anmeldung).length)} detail="Zugang angelegt, Anmeldelink noch nicht benutzt" />
          </div>

          <Card title="Benutzer" meta="Benutzer lesen und schreiben; Admins verwalten dazu Benutzer und löschen Rezepte; Küche liest ohne Preise, hakt ab und führt Etiketten und Lager">
            <DataTable
              columns={[
                { key: "name", label: "Benutzer", subKey: "email" },
                { key: "status", label: "Status", render: (r) => <StatusPill status={(r.st as { pill: "ok" | "warn" | "neutral" }).pill}>{(r.st as { text: string }).text}</StatusPill> },
                { key: "stufe", label: "Stufe", render: (r) => (r.stufe === "admin" ? <StatusPill status="info">Admin</StatusPill> : stufeLabel(r.stufe as Stufe)) },
                { key: "letzte", label: "Letzte Anmeldung", numeric: true },
                { key: "erstellt", label: "Angelegt", numeric: true },
                {
                  key: "aktion",
                  label: <span className="pl-sr">Aktionen</span>,
                  render: (r) => {
                    const b = r.b as Benutzer;
                    if (b.ich) return <span className="pl-small">das bist du</span>;
                    const wer = b.name || b.email;
                    return (
                      <span className="pl-actions">
                        <Button
                          ariaLabel={`${wer} ${b.gesperrt ? "entsperren" : "sperren"}`}
                          disabled={arbeitet !== null}
                          onClick={() => aktion(b, { aktion: "sperren", gesperrt: !b.gesperrt }, b.gesperrt ? `${wer} entsperrt.` : `${wer} gesperrt. Eine laufende Sitzung endet spätestens nach einer Stunde.`)}
                        >
                          {b.gesperrt ? "Entsperren" : "Sperren"}
                        </Button>
                        <Button ariaLabel={`Stufe von ${wer} ändern, heute ${stufeLabel(b.stufe)}`} disabled={arbeitet !== null} onClick={() => setStufeWahl({ b, stufe: b.stufe })}>
                          Stufe ändern
                        </Button>
                      </span>
                    );
                  },
                },
              ]}
              rows={alle.map((b) => ({
                id: b.id,
                b,
                name: b.name || "[Name]",
                email: b.email,
                st: status(b),
                stufe: b.stufe,
                letzte: datumText(b.letzte_anmeldung),
                erstellt: datumText(b.erstellt_am),
              }))}
            />
            <p className="pl-small" style={{ marginTop: 12 }}>
              Ein neuer Zugang bekommt kein Passwort: Die Person meldet sich mit dem Anmeldelink per E-Mail an. Sperren nimmt den Zugang weg, ohne Daten zu löschen.
            </p>
          </Card>
        </>
      ) : !fehler ? (
        <Skeleton variant="zeile" label="Benutzer werden geladen" />
      ) : null}

      <Dialog
        open={stufeWahl !== null}
        id="benutzer-stufe"
        title="Stufe ändern"
        meta={stufeWahl ? stufeWahl.b.name || stufeWahl.b.email : undefined}
        onClose={() => setStufeWahl(null)}
        onCancel={(e) => arbeitet !== null && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setStufeWahl(null)} disabled={arbeitet !== null}>Abbrechen</Button>
            <Button
              variant="primary"
              disabled={arbeitet !== null || !stufeWahl || stufeWahl.stufe === stufeWahl.b.stufe}
              onClick={() => stufeWahl && aktion(stufeWahl.b, { aktion: "stufe", stufe: stufeWahl.stufe }, `${stufeWahl.b.name || stufeWahl.b.email} hat jetzt die Stufe ${stufeLabel(stufeWahl.stufe)}. Die Person sieht das nach dem nächsten Laden der App.`)}
            >
              {arbeitet !== null ? "Wird gespeichert …" : "Stufe speichern"}
            </Button>
          </>
        }
      >
        {stufeWahl ? (
          <Select
            id="benutzer-stufe-wahl"
            label="Stufe"
            value={stufeWahl.stufe}
            options={STUFEN.map((s) => ({ value: s.stufe, label: s.label }))}
            hint={STUFEN.find((s) => s.stufe === stufeWahl.stufe)?.darf}
            onChange={(v) => setStufeWahl({ ...stufeWahl, stufe: v as Stufe })}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={offen}
        id="benutzer-neu"
        title="Zugang anlegen"
        meta="Die Person meldet sich danach mit dem Anmeldelink an"
        onClose={() => setOffen(false)}
        onCancel={(e) => arbeitet === "neu" && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setOffen(false)} disabled={arbeitet === "neu"}>Abbrechen</Button>
            <Button variant="primary" onClick={anlegen} disabled={arbeitet === "neu"}>{arbeitet === "neu" ? "Wird angelegt …" : "Zugang anlegen"}</Button>
          </>
        }
      >
        {form ? (
          <>
            <div className="pl-grid-2">
              <TextField id="benutzer-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: wert(e), fehler: null })} placeholder="Vorname Name" />
              <TextField id="benutzer-email" type="email" label="E-Mail" required value={form.email} onChange={(e) => setForm({ ...form, email: wert(e), fehler: null })} />
            </div>
            {form.fehler ? <Notice role="alert" title="Nicht angelegt">{form.fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </>
  );
}
