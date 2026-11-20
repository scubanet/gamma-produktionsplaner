"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BILDMARKE, BILDMARKE_MONO, Brand, Button, Card, Notice, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { ANMELDEN, sichererPfad } from "@/lib/navigation";
import { ABGELAUFEN, ankunft, fehlertext, nurZiffern } from "@/lib/anmeldung";

// Ziel nach der Anmeldung überlebt den Umweg über die E-Mail im gleichen Browser; sonst geht es zum Leitstand.
const MERKER = "pl-weiter";
const gemerkt = () => {
  try {
    return window.localStorage.getItem(MERKER);
  } catch {
    return null;
  }
};
const merken = (pfad: string | null) => {
  try {
    if (pfad) window.localStorage.setItem(MERKER, pfad);
    else window.localStorage.removeItem(MERKER);
  } catch {}
};

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

function Formular() {
  const router = useRouter();
  const ausAdresse = useSearchParams().get("weiter");
  const [start] = useState(() => ankunft(window.location.search, window.location.hash));
  const [weiter] = useState(() => sichererPfad(ausAdresse ?? gemerkt()));
  const [tokenHash, setTokenHash] = useState(start.art === "bestaetigen" ? start.tokenHash : null);
  const [fehler, setFehler] = useState<string | null>(start.art === "abgelaufen" ? ABGELAUFEN : null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [gesendet, setGesendet] = useState(false);
  const [laeuft, setLaeuft] = useState(false);

  // Sobald eine Sitzung da ist (Klick auf «Jetzt anmelden», Code oder schon angemeldet): weiter zur App.
  useEffect(() => {
    const los = () => {
      merken(null);
      router.replace(weiter);
    };
    supabase.auth.getSession().then(({ data }) => data.session && los());
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && los());
    return () => data.subscription.unsubscribe();
  }, [router, weiter]);

  async function pruefen(angaben: { token_hash: string } | { email: string; token: string }) {
    setLaeuft(true);
    setFehler(null);
    const { error } = await supabase.auth.verifyOtp({ ...angaben, type: "email" });
    if (!error) return; // Weiterleitung übernimmt onAuthStateChange
    setLaeuft(false);
    setTokenHash(null);
    setFehler(fehlertext(error.message));
  }

  async function senden(e: FormEvent) {
    e.preventDefault();
    setLaeuft(true);
    setFehler(null);
    merken(weiter);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${ANMELDEN}?weiter=${encodeURIComponent(weiter)}`,
        shouldCreateUser: false, // nur eingeladene Benutzer
      },
    });
    setLaeuft(false);
    if (error) return setFehler(fehlertext(error.message));
    setCode("");
    setGesendet(true);
  }

  if (tokenHash)
    return (
      <Card title="Anmeldung bestätigen" meta="Link aus der E-Mail">
        <p>Mit einem Klick bist du im Produktionsplaner angemeldet.</p>
        <div>
          <Button variant="primary" disabled={laeuft} onClick={() => pruefen({ token_hash: tokenHash })}>
            {laeuft ? "Wird angemeldet …" : "Jetzt anmelden"}
          </Button>
        </div>
      </Card>
    );

  if (gesendet)
    return (
      <Card title="E-Mail gesendet" meta="Link oder Code">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pruefen({ email, token: nurZiffern(code) });
          }}
          className="pl-stack"
        >
          <p>
            Wir haben eine E-Mail an <strong>{email}</strong> geschickt. Öffne den Link darin oder gib hier den Code aus der E-Mail ein.
          </p>
          <TextField
            id="code"
            label="Code aus der E-Mail"
            name="code"
            autoComplete="one-time-code"
            code
            required
            value={code}
            onChange={(e) => setCode(wert(e))}
          />
          {fehler ? <Notice title="Anmeldung nicht möglich">{fehler}</Notice> : null}
          <div className="pl-auth__aktionen">
            <Button variant="primary" type="submit" disabled={laeuft || nurZiffern(code).length < 6}>
              {laeuft ? "Wird angemeldet …" : "Mit Code anmelden"}
            </Button>
            <Button variant="secondary" disabled={laeuft} onClick={() => { setGesendet(false); setFehler(null); }}>
              Neue E-Mail anfordern
            </Button>
          </div>
        </form>
      </Card>
    );

  return (
    <Card title="Anmelden" meta="Link per E-Mail, ohne Passwort">
      <form onSubmit={senden} className="pl-stack">
        {fehler ? <Notice title="Anmeldung nicht möglich">{fehler}</Notice> : null}
        <TextField
          id="email"
          label="E-Mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(wert(e))}
          hint="Nur für Benutzer, die im Produktionsplaner eingeladen sind."
        />
        <div>
          <Button variant="primary" type="submit" disabled={laeuft}>
            {laeuft ? "Wird gesendet …" : "Anmeldelink senden"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function Anmelden() {
  return (
    <div className="pl-app pl-auth">
      <main className="pl-auth__main">
        <div className="pl-auth__kopf">
          <Brand size="lg" src={BILDMARKE} mono={BILDMARKE_MONO} product={null} />
          <h1 className="pl-auth__titel">Produktionsplaner</h1>
        </div>
        <Suspense>
          <Formular />
        </Suspense>
        <p className="pl-small">GAMMA Catering · Hünenberg</p>
      </main>
    </div>
  );
}
