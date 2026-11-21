// Benutzerverwaltung für den Produktionsplaner (Entscheid Dominik, 14.11.2026):
// Zugang verwalten (anlegen, auflisten, sperren, Stufe setzen), nur für Administratoren.
// Stufen (Entscheide Dominik, 20.11.2026): admin (app_admin), kueche (app_kueche), scannen (app_scannen), sonst benutzer.
// Admin geht vor, danach Küche, danach Scannen.
// Läuft als Supabase Edge Function, weil dafür der Service-Schlüssel nötig ist; der bleibt auf dem Server.
// Aufruf aus der App: supabase.functions.invoke("benutzer", { body: { aktion: "liste" | "anlegen" | "sperren" | "stufe", … } }).
// Antwort immer 200 mit { … } oder { fehler: "…" }, damit die App die Meldung anzeigen kann.
import { createClient } from "npm:@supabase/supabase-js@2";

const ERLAUBTE_HERKUNFT = ["https://gamma.atoll-os.com", "http://localhost:3000"];
// Rund 100 Jahre: gilt als gesperrt, bis ein Admin entsperrt.
const SPERRE = "876000h";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUFEN = ["admin", "benutzer", "kueche", "scannen"];
// Tabelle pro Stufe; «benutzer» steht in keiner. Ein Benutzer steht höchstens in einer.
const TABELLEN: Record<string, string> = { admin: "app_admin", kueche: "app_kueche", scannen: "app_scannen" };
const gesperrt = (u: unknown, jetzt = Date.now()) => {
  const bis = (u as { banned_until?: string | null }).banned_until;
  return !!bis && Date.parse(bis) > jetzt;
};

Deno.serve(async (req) => {
  const herkunft = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ERLAUBTE_HERKUNFT.includes(herkunft) ? herkunft : ERLAUBTE_HERKUNFT[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Nur POST.", { status: 405, headers: { ...cors, Allow: "POST, OPTIONS" } });
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
    // Ein Token gilt nach dem Sperren noch bis zu einer Stunde. Hier zählt die Sperre sofort.
    if (gesperrt(ich)) return fehler("Dieser Zugang ist gesperrt.");
    const istAdmin = await admin.from("app_admin").select("user_id").eq("user_id", ich.id).maybeSingle();
    if (istAdmin.error) return fehler(istAdmin.error.message);
    if (!istAdmin.data) return fehler("Nur Administratoren verwalten Benutzer.");

    const roh = await req.json().catch(() => null);
    const p: Record<string, unknown> = roh && typeof roh === "object" && !Array.isArray(roh) ? roh : {};
    const aktion = String(p.aktion ?? "");

    if (aktion === "liste") {
      const [benutzer, admins, kueche, scannen] = await Promise.all([
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from("app_admin").select("user_id"),
        admin.from("app_kueche").select("user_id"),
        admin.from("app_scannen").select("user_id"),
      ]);
      if (benutzer.error) return fehler(benutzer.error.message);
      if (admins.error) return fehler(admins.error.message);
      if (kueche.error) return fehler(kueche.error.message);
      if (scannen.error) return fehler(scannen.error.message);
      const adminIds = new Set((admins.data ?? []).map((a) => a.user_id));
      const kuecheIds = new Set((kueche.data ?? []).map((a) => a.user_id));
      const scannenIds = new Set((scannen.data ?? []).map((a) => a.user_id));
      const jetzt = Date.now();
      return antwort({
        benutzer: benutzer.data.users.map((u) => ({
          id: u.id,
          email: u.email ?? "",
          name: (u.user_metadata?.name as string | undefined) ?? "",
          erstellt_am: u.created_at,
          letzte_anmeldung: u.last_sign_in_at ?? null,
          gesperrt: gesperrt(u, jetzt),
          admin: adminIds.has(u.id),
          stufe: adminIds.has(u.id) ? "admin" : kuecheIds.has(u.id) ? "kueche" : scannenIds.has(u.id) ? "scannen" : "benutzer",
          ich: u.id === ich.id,
        })),
      });
    }

    if (aktion === "anlegen") {
      const email = String(p.email ?? "").trim().toLowerCase();
      const name = String(p.name ?? "").trim();
      // Gleiche Grenzen wie in der App (lib/benutzer.ts); hier nochmals, weil die Funktion auch direkt aufrufbar ist.
      if (email.length > 254 || !EMAIL.test(email)) return fehler("E-Mail-Adresse prüfen.");
      if (name.length > 80) return fehler("Name: höchstens 80 Zeichen.");
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
        // Wie bei «stufe»: höchstens eine Zeile, sonst ergäbe «Admin entziehen» später die Stufe Küche oder Scannen.
        for (const tabelle of ["app_kueche", "app_scannen"]) {
          const k = await admin.from(tabelle).delete().eq("user_id", id);
          if (k.error) return fehler(k.error.message);
        }
      } else {
        if (id === ich.id) return fehler("Das eigene Admin-Recht kann man nicht entziehen. Ein anderer Admin kann das tun.");
        const r = await admin.from("app_admin").delete().eq("user_id", id);
        if (r.error) return fehler(r.error.message);
      }
      return antwort({ id, admin: soll });
    }

    // Stufe setzen: admin, benutzer, kueche oder scannen. Zuerst die neue Stufe eintragen, dann die anderen entfernen.
    // Scheitert ein Schritt, meldet die Funktion den Fehler; die Liste zeigt danach den wahren Stand.
    if (aktion === "stufe") {
      const stufe = String(p.stufe ?? "");
      if (!STUFEN.includes(stufe)) return fehler("Stufe fehlt.");
      if (id === ich.id && stufe !== "admin") return fehler("Die eigene Stufe kann man nicht senken. Ein anderer Admin kann das tun.");
      const gibtEs = await admin.auth.admin.getUserById(id);
      if (gibtEs.error || !gibtEs.data.user) return fehler("Diesen Benutzer gibt es nicht mehr. Bitte die Liste neu laden.");
      if (TABELLEN[stufe]) {
        const zeile = stufe === "admin" ? { user_id: id, bemerkung: `In der App ernannt von ${ich.email ?? ich.id}` } : { user_id: id };
        const r = await admin.from(TABELLEN[stufe]).upsert(zeile);
        if (r.error) return fehler(r.error.message);
      }
      for (const [s, tabelle] of Object.entries(TABELLEN)) {
        if (s === stufe) continue;
        const r = await admin.from(tabelle).delete().eq("user_id", id);
        if (r.error) return fehler(r.error.message);
      }
      return antwort({ id, stufe });
    }

    return fehler("Unbekannte Aktion.");
  } catch (e) {
    // Einzelheiten ins Protokoll der Funktion, nicht an den Browser.
    console.error("benutzer:", e);
    return fehler("Unerwarteter Fehler. Bitte nochmals versuchen.");
  }
});
