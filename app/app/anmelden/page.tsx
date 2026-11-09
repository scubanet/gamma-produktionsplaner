"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Notice, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { ANMELDEN } from "@/lib/navigation";

type Zustand = { art: "bereit" } | { art: "sendet" } | { art: "gesendet"; email: string } | { art: "fehler"; text: string };

// Nur interne Pfade zulassen, damit ?weiter= nicht auf fremde Seiten führt.
const sichererPfad = (p: string | null) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

function Formular() {
  const router = useRouter();
  const weiter = sichererPfad(useSearchParams().get("weiter"));
  const [email, setEmail] = useState("");
  const [zustand, setZustand] = useState<Zustand>({ art: "bereit" });

  // Nach dem Klick auf den Link löst supabase-js den Code ein; dann weiter zur App.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && router.replace(weiter));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && router.replace(weiter));
    return () => data.subscription.unsubscribe();
  }, [router, weiter]);

  async function senden(e: FormEvent) {
    e.preventDefault();
    setZustand({ art: "sendet" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${ANMELDEN}?weiter=${encodeURIComponent(weiter)}`,
        shouldCreateUser: false, // nur eingeladene Benutzer
      },
    });
    if (!error) return setZustand({ art: "gesendet", email });
    const text = /signups not allowed/i.test(error.message)
      ? "Diese Adresse ist im Produktionsplaner nicht eingeladen. Bitte bei Dominik Weckherlin melden."
      : error.message;
    setZustand({ art: "fehler", text });
  }

  if (zustand.art === "gesendet")
    return (
      <Card title="Link gesendet">
        <p>
          Wir haben einen Anmeldelink an <strong>{zustand.email}</strong> geschickt. Öffne ihn auf diesem Gerät.
        </p>
      </Card>
    );

  return (
    <Card title="Anmelden" meta="Link per E-Mail, ohne Passwort">
      <form onSubmit={senden} style={{ display: "grid", gap: "var(--space-4)" }}>
        <TextField
          id="email"
          label="E-Mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail((e as { target: HTMLInputElement }).target.value)}
          hint="Nur für Benutzer, die im Produktionsplaner eingeladen sind."
        />
        {zustand.art === "fehler" ? <Notice title="Link nicht gesendet">{zustand.text}</Notice> : null}
        <div>
          <Button variant="primary" type="submit" disabled={zustand.art === "sendet"}>
            {zustand.art === "sendet" ? "Wird gesendet …" : "Anmeldelink senden"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function Anmelden() {
  return (
    <main className="pl-main">
      <header className="pl-head">
        <div>
          <div className="pl-crumb">GAMMA Catering</div>
          <h1 className="pl-h1">Produktionsplaner</h1>
        </div>
      </header>
      <div className="pl-grid-2">
        <Suspense>
          <Formular />
        </Suspense>
      </div>
    </main>
  );
}
