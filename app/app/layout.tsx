import type { Metadata } from "next";
import "./tokens.css";
import "../../design-system/components/bundle.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Produktionsplaner – GAMMA Catering",
  description: "Produktionsplanung von GAMMA Catering, Hünenberg",
  // Auf dem Home-Bildschirm öffnet die App im Küchenpass (public/manifest.webmanifest).
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Planer" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
