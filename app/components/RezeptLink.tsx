import { rezeptHref } from "@/lib/anlass";
import { nichtFreigegeben, statusText } from "@/lib/rezepte";

/**
 * Name als Sprung zur Rezeptkarte in neuem Tab (die Liste bleibt offen, wie sie ist); ohne Rezept Text mit [Rezept].
 * Mit Status: ein nicht freigegebenes Rezept ist gekennzeichnet («Rezept Entwurf», «Rezept Geprüft»).
 */
export function RezeptLink({ name, slug, status }: { name: string; slug: string | null | undefined; status?: string | null }) {
  const href = rezeptHref(slug);
  if (!href) return <>{name} <span className="pl-mono pl-small">[Rezept]</span></>;
  return (
    <>
      <a href={href} target="_blank" rel="noopener">
        {name}<span className="pl-sr"> – Rezept in neuem Tab öffnen</span>
      </a>
      {nichtFreigegeben(status) ? <> <span className="pl-small pl-assumed">Rezept {statusText(status)}</span></> : null}
    </>
  );
}
