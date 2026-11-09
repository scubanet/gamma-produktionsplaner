import { Anmeldung } from "@/components/Anmeldung";
import { Geruest } from "@/components/Geruest";

export default function GeschuetztLayout({ children }: { children: React.ReactNode }) {
  return (
    <Anmeldung>
      <Geruest>{children}</Geruest>
    </Anmeldung>
  );
}
