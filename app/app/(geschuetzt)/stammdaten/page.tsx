"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Notice, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatZahl } from "@/lib/format";
import { chf } from "@/lib/ressourcen";
import { ANGEBOTSFORMEN, FELDER, FIXKOSTEN_KATEGORIEN, SERVICE_ARTEN, standardFelder, type Zeile } from "@/lib/stammdaten";
import { Stammtabelle } from "@/components/stammdaten/Stammtabelle";

type Daten = { lohnsatz: Zeile[]; energiepreis: Zeile[]; fixkosten: Zeile[]; geraet: Zeile[]; gebinde: Zeile[]; serviceArtikel: Zeile[]; standard: Zeile[] };

async function laden(): Promise<Daten> {
  const [l, e, f, g, gb, sa, gs] = await Promise.all([
    supabase.from("lohnsatz").select("*").order("rolle").order("gueltig_ab", { ascending: false }),
    supabase.from("energiepreis").select("*").order("gueltig_ab", { ascending: false }),
    supabase.from("fixkosten").select("*").order("kategorie").order("bezeichnung"),
    supabase.from("geraet").select("*").order("name"),
    supabase.from("gebinde").select("*").order("name"),
    supabase.from("service_artikel").select("*").order("art").order("name"),
    supabase.from("geschirr_standard").select("*").order("angebotsform").order("gang"),
  ]);
  for (const x of [l, e, f, g, gb, sa, gs]) if (x.error) throw x.error;
  return { lohnsatz: l.data ?? [], energiepreis: e.data ?? [], fixkosten: f.data ?? [], geraet: g.data ?? [], gebinde: gb.data ?? [], serviceArtikel: sa.data ?? [], standard: gs.data ?? [] };
}

const datum = (v: unknown) => (v ? formatDatum(v as string) : "–");
const betrag = (v: unknown) => chf(v as number | null);

export default function Stammdaten() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState("");
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const anfrage = useRef(0);

  const neuLaden = useCallback(() => {
    const nr = ++anfrage.current;
    return laden().then(
      (d) => {
        if (nr === anfrage.current) setDaten(d);
        return true;
      },
      (e: Error) => {
        if (nr === anfrage.current) setFehler(`Stammdaten nicht geladen: ${e.message}`);
        return false;
      },
    );
  }, []);

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const melden = (text: string) => {
    setFehler(null);
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };
  const gemeinsam = { onGeaendert: neuLaden, onMeldung: melden, ladefehler: !!fehler };

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Kostensätze und Geräte</div>
          <h1 className="pl-h1">Stammdaten</h1>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Fehler">{fehler}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>
      <Notice title="Echte Werte eintragen">
        Lohnsätze kommen aus der Lohnbuchhaltung, Fixkosten aus Mietvertrag und Buchhaltung, der Strompreis aus der Stromrechnung. Die App schätzt nichts: Fehlt ein Satz, steht bei den Kosten [Preis].
      </Notice>

      <Stammtabelle
        tabelle="lohnsatz"
        titel="Lohnsätze"
        meta="pro Rolle; es gilt der jüngste Satz bis zum Anlassdatum"
        einzahl="Lohnsatz"
        felder={FELDER.lohnsatz}
        schluessel={["rolle", "gueltig_ab"]}
        zeilen={daten?.lohnsatz ?? null}
        spalten={[
          { key: "name", label: "Rolle", subKey: "quelle" },
          { key: "satz", label: "CHF pro Stunde", numeric: true },
          { key: "frei", label: "Freelancer", numeric: true },
          { key: "ab", label: "gültig ab", numeric: true },
        ]}
        anzeige={(z) => ({ name: z.rolle, aria: `${z.rolle}, gültig ab ${datum(z.gueltig_ab)}`, quelle: z.quelle, satz: betrag(z.chf_pro_h), frei: z.chf_pro_h_freelancer === null ? "gleicher Satz" : betrag(z.chf_pro_h_freelancer), ab: datum(z.gueltig_ab) })}
        {...gemeinsam}
      />

      <Stammtabelle
        tabelle="fixkosten"
        titel="Fixkosten"
        meta="pro Monat; bestimmen Fixkosten-Anteil, Ergebnis und Break-even"
        einzahl="Fixkosten-Position"
        felder={FELDER.fixkosten}
        schluessel={["id"]}
        zeilen={daten?.fixkosten ?? null}
        spalten={[
          { key: "name", label: "Bezeichnung", subKey: "kategorie" },
          { key: "betrag", label: "CHF pro Monat", numeric: true },
          { key: "zeitraum", label: "gültig", numeric: true },
        ]}
        anzeige={(z) => ({
          name: z.bezeichnung,
          kategorie: FIXKOSTEN_KATEGORIEN.find((k) => k.value === z.kategorie)?.label ?? z.kategorie,
          betrag: betrag(z.chf_pro_monat),
          zeitraum: `${datum(z.gueltig_ab)} bis ${z.gueltig_bis ? datum(z.gueltig_bis) : "offen"}`,
        })}
        {...gemeinsam}
      />

      <Stammtabelle
        tabelle="geraet"
        titel="Geräte"
        meta="eigener Bestand und Mietpreis bestimmen den Zusatzbedarf pro Anlass"
        einzahl="Gerät"
        felder={FELDER.geraet}
        schluessel={["id"]}
        zeilen={daten?.geraet ?? null}
        spalten={[
          { key: "name", label: "Gerät", subKey: "kapazitaet" },
          { key: "bestand", label: "Eigener Bestand", numeric: true },
          { key: "mietbar", label: "Miete", render: (r) => <StatusPill status={r.mietbar ? "info" : "neutral"}>{r.mietbar ? "mietbar" : "nicht mietbar"}</StatusPill> },
          { key: "mietpreis", label: "Mietpreis pro Tag", numeric: true },
          { key: "leistung", label: "Leistung", numeric: true },
        ]}
        anzeige={(z) => ({
          name: z.name,
          kapazitaet: z.kapazitaet,
          bestand: formatZahl(z.anzahl_eigen as number),
          mietbar: z.mietbar,
          mietpreis: betrag(z.mietpreis_chf_tag),
          leistung: z.leistung_kw === null ? "[Leistung]" : `${formatZahl(z.leistung_kw as number, 1)} kW`,
        })}
        {...gemeinsam}
      />

      <Stammtabelle
        tabelle="gebinde"
        titel="Gebinde"
        meta="Transportgebinde der Küche; Tara und Volumen bestimmen Gewicht und Ladevolumen pro Anlass"
        einzahl="Gebinde"
        felder={FELDER.gebinde}
        schluessel={["id"]}
        zeilen={daten?.gebinde ?? null}
        spalten={[
          { key: "name", label: "Gebinde", subKey: "bemerkung" },
          { key: "mass", label: "Mass L × B × H", numeric: true },
          { key: "tara", label: "Tara", numeric: true },
          { key: "volumen", label: "Volumen", numeric: true },
        ]}
        anzeige={(z) => ({
          name: z.name,
          bemerkung: z.bemerkung,
          mass: z.laenge_mm && z.breite_mm && z.hoehe_mm ? `${z.laenge_mm} × ${z.breite_mm} × ${z.hoehe_mm} mm` : "[Mass]",
          tara: z.tara_g === null ? "[Tara]" : `${formatZahl((z.tara_g as number) / 1000, 2)} kg`,
          volumen: z.volumen_l === null ? "[Volumen]" : `${formatZahl(z.volumen_l as number, 1)} l`,
        })}
        {...gemeinsam}
      />

      <Stammtabelle
        tabelle="service_artikel"
        titel="Geschirr und Besteck"
        meta="Artikel für den Service; eigener Bestand und Mietpreis bestimmen den Zusatzbedarf pro Anlass"
        einzahl="Artikel"
        felder={FELDER.service_artikel}
        schluessel={["id"]}
        zeilen={daten?.serviceArtikel ?? null}
        spalten={[
          { key: "name", label: "Artikel", subKey: "art" },
          { key: "bestand", label: "Eigener Bestand", numeric: true },
          { key: "mietpreis", label: "Mietpreis pro Stück", numeric: true },
          { key: "korb", label: "Stück pro Korb", numeric: true },
          { key: "gewicht", label: "Gewicht", numeric: true },
        ]}
        anzeige={(z) => ({
          name: z.name,
          art: SERVICE_ARTEN.find((a) => a.value === z.art)?.label ?? z.art,
          bestand: formatZahl(z.anzahl_eigen as number),
          mietpreis: betrag(z.mietpreis_chf),
          korb: z.stueck_pro_korb === null ? "[Stück]" : formatZahl(z.stueck_pro_korb as number),
          gewicht: z.gewicht_g === null ? "[Gewicht]" : `${formatZahl(z.gewicht_g as number)} g`,
        })}
        {...gemeinsam}
      />

      <Stammtabelle
        tabelle="geschirr_standard"
        titel="Standard Geschirr"
        meta="Vorschlag pro Angebotsform und Gang; im Anlass lässt sich jede Position übersteuern"
        einzahl="Standard-Position"
        felder={standardFelder((daten?.serviceArtikel ?? []).map((a) => ({ value: a.id as string, label: a.name as string })))}
        schluessel={["id"]}
        zeilen={daten?.standard ?? null}
        spalten={[
          { key: "gang", label: "Gang", subKey: "form" },
          { key: "artikel", label: "Artikel" },
          { key: "stueck", label: "Stück pro Gast", numeric: true },
          { key: "faktor", label: "Wechselfaktor", numeric: true },
          { key: "reserve", label: "Reserve", numeric: true },
        ]}
        anzeige={(z) => ({
          gang: z.gang,
          form: ANGEBOTSFORMEN.find((a) => a.value === z.angebotsform)?.label ?? z.angebotsform,
          artikel: (daten?.serviceArtikel ?? []).find((a) => a.id === z.artikel_id)?.name ?? "[Artikel]",
          stueck: String(z.stueck_pro_gast),
          faktor: String(z.wechselfaktor),
          reserve: `${z.reserve_pct} %`,
        })}
        {...gemeinsam}
      />

      <Stammtabelle
        tabelle="energiepreis"
        titel="Strompreis"
        meta="für die Energiekosten der Rezepte"
        einzahl="Strompreis"
        felder={FELDER.energiepreis}
        schluessel={["gueltig_ab"]}
        zeilen={daten?.energiepreis ?? null}
        spalten={[
          { key: "name", label: "gültig ab" },
          { key: "preis", label: "CHF pro kWh", numeric: true },
        ]}
        anzeige={(z) => ({ name: datum(z.gueltig_ab), preis: z.chf_pro_kwh === null ? "[Preis]" : `CHF ${formatZahl(z.chf_pro_kwh as number, 4)}` })}
        {...gemeinsam}
      />
    </>
  );
}
