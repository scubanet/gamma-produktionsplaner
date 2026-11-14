"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, DataTable, Dialog, KpiTile, Notice, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { datumText, neuerZugang, sortieren, status, type Benutzer } from "@/lib/benutzer";

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

/** Edge Function aufrufen; sie antwortet mit Daten oder { fehler }. */
async function rufen<T>(body: Record<string, unknown>): Promise<T> {
  const r = await supabase.functions.invoke("benutzer", { body });
  if (r.error) throw new Error(`Benutzerverwaltung nicht erreichbar: ${r.error.message}`);
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
  const meldungRef = useRef<HTMLParagraphElement>(null);

  const neuLaden = useCallback(
    () =>
      rufen<{ benutzer: Benutzer[] }>({ aktion: "liste" }).then(
        (d) => {
          setListe(sortieren(d.benutzer));
          return true;
        },
        (e: Error) => {
          setFehler({ titel: "Benutzer nicht geladen", text: e.message });
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
      if (await neuLaden()) melden(text);
    } catch (e) {
      setFehler({ titel: "Nicht gespeichert", text: `${b.name || b.email}: ${(e as Error).message}` });
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
      setForm({ ...form, fehler: (e as Error).message });
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
            <KpiTile label="Administratoren" value={String(alle.filter((b) => b.admin).length)} detail="verwalten Benutzer und dürfen Rezepte löschen" />
            <KpiTile label="Noch nie angemeldet" value={String(alle.filter((b) => !b.letzte_anmeldung).length)} detail="Zugang angelegt, Anmeldelink noch nicht benutzt" />
          </div>

          <Card title="Benutzer" meta="Alle angemeldeten Benutzer dürfen lesen und schreiben; Admins dazu Benutzer verwalten und Rezepte löschen">
            <DataTable
              columns={[
                { key: "name", label: "Benutzer", subKey: "email" },
                { key: "status", label: "Status", render: (r) => <StatusPill status={(r.st as { pill: "ok" | "warn" | "neutral" }).pill}>{(r.st as { text: string }).text}</StatusPill> },
                { key: "admin", label: "Rolle", render: (r) => (r.admin ? <StatusPill status="info">Admin</StatusPill> : "Benutzer") },
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
                        <Button
                          ariaLabel={b.admin ? `${wer} das Admin-Recht entziehen` : `${wer} zum Admin machen`}
                          disabled={arbeitet !== null}
                          onClick={() => aktion(b, { aktion: "admin", admin: !b.admin }, b.admin ? `${wer} ist kein Admin mehr.` : `${wer} ist jetzt Admin.`)}
                        >
                          {b.admin ? "Admin entziehen" : "Zum Admin machen"}
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
                admin: b.admin,
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
        <p className="pl-muted" role="status">Benutzer werden geladen …</p>
      ) : null}

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
