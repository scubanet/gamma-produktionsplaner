import type { Metadata } from "next";
import "./tokens.css";
import "../../design-system/components/bundle.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Produktionsplaner – GAMMA Catering",
  description: "Produktionsplanung von GAMMA Catering, Hünenberg",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
