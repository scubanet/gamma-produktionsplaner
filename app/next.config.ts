import path from "node:path";
import type { NextConfig } from "next";

// Statischer Export (Ordner out/) für gamma.atoll-os.com: kein eigener App-Server.
// Root eine Ebene höher, damit design-system/ aus dem Repo eingebunden werden kann.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
