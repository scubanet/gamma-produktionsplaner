// Benutzerverwaltung für den Produktionsplaner (Entscheid Dominik, 14.11.2026):
// Zugang verwalten (anlegen, auflisten, sperren, Admin ja/nein), nur für Administratoren.
// Läuft als Supabase Edge Function, weil dafür der Service-Schlüssel nötig ist; der bleibt auf dem Server.
// Aufruf aus der App: supabase.functions.invoke("benutzer", { body: { aktion: "liste" | "anlegen" | "sperren" | "admin", … } }).
// Antwort immer 200 mit { … } oder { fehler: "…" }, damit die App die Meldung anzeigen kann.
import { createClient } from "npm:@supabase/supabase-js@2";

const ERLAUBTE_HERKUNFT = ["https://gamma.atoll-os.com", "http://localhost:3000"];
// Rund 100 Jahre: gilt als gesperrt, bis ein Admin entsperrt.
const SPERRE = "876000h";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const herkunft = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ERLAUBTE_HERKUNFT.includes(herkunft) ? herkunft : ERLAUBTE_HERKUNFT[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const antwort = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...cors, "Content-Type": "application/json" } });
  const fehler = (text: string) => antwort({ fehler: text });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Wer ruft auf? Das Token der App prüfen, dann die Admin-Liste.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const wer = await admin.auth.getUser(token);
    if (wer.error || !wer.data.user) return fehler("Nicht angemeldet.");
    const ich = wer.data.user;
    const istAdmin = await admin.from("app_admin").select("user_id").eq("user_id", ich.id).maybeSingle();
    if (istAdmin.error) return fehler(istAdmin.error.message);
    if (!istAdmin.data) return fehler("Nur Administratoren verwalten Benutzer.");

    const p = await req.json().catch(() => ({}));
    const aktion = String(p.aktion ?? "");

    if (aktion === "liste") {
      const [benutzer, admins] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from("app_admin").select("user_id"),
      ]);
      if (benutzer.error) return fehler(benutzer.error.message);
      if (admins.error) return fehler(admins.error.message);
      const adminIds = new Set((admins.data ?? []).map((a) => a.user_id));
      const jetzt = Date.now();
      return antwort({
        benutzer: benutzer.data.users.map((u) => ({
          id: u.id,
          email: u.email ?? "",
          name: (u.user_metadata?.name as string | undefined) ?? "",
          erstellt_am: u.created_at,
          letzte_anmeldung: u.last_sign_in_at ?? null,
          gesperrt: !!(u as { banned_until?: string }).banned_until && Date.parse((u as { banned_until?: string }).banned_until!) > jetzt,
          admin: adminIds.has(u.id),
          ich: u.id === ich.id,
        })),
      });
    }

    if (aktion === "anlegen") {
      const email = String(p.email ?? "").trim().toLowerCase();
      const name = String(p.name ?? "").trim();
      if (!EMAIL.test(email)) return fehler("E-Mail-Adresse prüfen.");
      // Kein Passwort: Der Benutzer meldet sich mit dem Anmeldelink an. Die Adresse gilt als bestätigt.
      const r = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: name ? { name } : {} });
      if (r.error) return fehler(/already|registered|exists/i.test(r.error.message) ? "Diese E-Mail-Adresse hat schon einen Zugang." : r.error.message);
      return antwort({ id: r.data.user?.id, email });
    }

    const id = String(p.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fehler("Benutzer fehlt.");

    if (aktion === "sperren") {
      const sperren = p.gesperrt === true;
      if (sperren && id === ich.id) return fehler("Den eigenen Zugang kann man nicht sperren.");
      const r = await admin.auth.admin.updateUserById(id, { ban_duration: sperren ? SPERRE : "none" });
      if (r.error) return fehler(r.error.message);
      return antwort({ id, gesperrt: sperren });
    }

    if (aktion === "admin") {
      const soll = p.admin === true;
      if (soll) {
        const r = await admin.from("app_admin").upsert({ user_id: id, bemerkung: `In der App ernannt von ${ich.email ?? ich.id}` });
        if (r.error) return fehler(r.error.message);
      } else {
        if (id === ich.id) return fehler("Das eigene Admin-Recht kann man nicht entziehen. Ein anderer Admin kann das tun.");
        const r = await admin.from("app_admin").delete().eq("user_id", id);
        if (r.error) return fehler(r.error.message);
      }
      return antwort({ id, admin: soll });
    }

    return fehler("Unbekannte Aktion.");
  } catch (e) {
    return fehler(e instanceof Error ? e.message : "Unbekannter Fehler.");
  }
});
