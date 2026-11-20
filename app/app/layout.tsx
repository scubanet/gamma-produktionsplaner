import type { Metadata, Viewport } from "next";
import tokens from "../../design-system/tokens.json";
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

// Farbe der Browserleiste = Fläche der Kopfzeile (Token surface), hell und dunkel.
const surface = tokens.color.tokens.find((t) => t.name === "surface")!.value;
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: surface.light },
    { media: "(prefers-color-scheme: dark)", color: surface.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
