import { rezeptHref } from "@/lib/anlass";

/** Name als Sprung zur Rezeptkarte in neuem Tab (die Liste bleibt offen, wie sie ist); ohne Rezept Text mit [Rezept]. */
export function RezeptLink({ name, slug }: { name: string; slug: string | null | undefined }) {
  const href = rezeptHref(slug);
  if (!href) return <>{name} <span className="pl-mono pl-small">[Rezept]</span></>;
  return (
    <a href={href} target="_blank" rel="noopener">
      {name}<span className="pl-sr"> – Rezept in neuem Tab öffnen</span>
    </a>
  );
}
