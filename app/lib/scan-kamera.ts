// Kamera und QR-Leser für die Seite «Scannen». Chrome und Samsung Internet auf Android bringen einen Leser mit
// (BarcodeDetector). Wo er fehlt (Safari, Firefox), wird jsQR nachgeladen und liest aus dem Kamerabild.
// Gelesen wird nur der Text; was er bedeutet, entscheidet lib/scan-code.ts und danach die Datenbank.

export type Kamera = {
  stoppen: () => void;
  /** Taschenlampe schalten; null, wenn Browser oder Gerät sie nicht freigeben. */
  licht: ((an: boolean) => Promise<void>) | null;
  /** «eingebaut» oder «jsQR», für die Anzeige. */
  leser: string;
};

type Detektor = { detect: (quelle: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetektorKlasse = { new (o: { formats: string[] }): Detektor; getSupportedFormats?: () => Promise<string[]> };

const PAUSE_MS = 160;

/** Verständlicher Text, wenn die Kamera nicht startet. */
export function kameraFehler(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Die Kamera ist für diese Seite nicht freigegeben. In den Einstellungen des Browsers die Kamera für diese Adresse erlauben und die Seite neu laden. Der Code lässt sich auch von Hand eingeben.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Dieses Gerät hat keine Kamera, die sich verwenden lässt. Der Code lässt sich von Hand eingeben.";
  if (name === "NotReadableError") return "Die Kamera wird von einer anderen App verwendet. Diese schliessen und nochmals versuchen.";
  return "Die Kamera lässt sich nicht starten. Der Code lässt sich von Hand eingeben.";
}

async function eingebaut(): Promise<Detektor | null> {
  const K = (globalThis as unknown as { BarcodeDetector?: DetektorKlasse }).BarcodeDetector;
  if (!K) return null;
  try {
    const formate = (await K.getSupportedFormats?.()) ?? [];
    return formate.includes("qr_code") ? new K({ formats: ["qr_code"] }) : null;
  } catch {
    return null;
  }
}

/** Startet die Rückkamera im Video und ruft beiCode für jeden gelesenen QR-Code auf (mehrmals pro Sekunde, auch denselben). */
export async function kameraStarten(video: HTMLVideoElement, beiCode: (text: string) => void): Promise<Kamera> {
  if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("Keine Kamera-Schnittstelle", "NotFoundError");
  const strom = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
  video.srcObject = strom;
  video.setAttribute("playsinline", "true");
  video.muted = true;
  await video.play();

  let laeuft = true;
  let lesen: () => Promise<string | null>;
  const detektor = await eingebaut();
  if (detektor) {
    lesen = async () => (await detektor.detect(video))[0]?.rawValue ?? null;
  } else {
    const jsQR = (await import("jsqr")).default;
    const leinwand = document.createElement("canvas");
    const stift = leinwand.getContext("2d", { willReadFrequently: true });
    lesen = async () => {
      if (!stift || !video.videoWidth) return null;
      // Halbe Auflösung reicht für QR-Codes und hält ältere Handys flüssig.
      const b = Math.min(video.videoWidth, 800);
      const h = Math.round((video.videoHeight * b) / video.videoWidth);
      leinwand.width = b;
      leinwand.height = h;
      stift.drawImage(video, 0, 0, b, h);
      return jsQR(stift.getImageData(0, 0, b, h).data, b, h, { inversionAttempts: "dontInvert" })?.data ?? null;
    };
  }

  const runde = async () => {
    if (!laeuft) return;
    try {
      const text = document.hidden ? null : await lesen();
      if (text && laeuft) beiCode(text);
    } catch {
      // Ein einzelnes Bild, das sich nicht lesen lässt, ist kein Fehler.
    }
    if (laeuft) setTimeout(runde, PAUSE_MS);
  };
  setTimeout(runde, PAUSE_MS);

  const spur = strom.getVideoTracks()[0];
  const kann = (spur?.getCapabilities?.() ?? {}) as { torch?: boolean };
  return {
    leser: detektor ? "eingebaut" : "jsQR",
    licht: kann.torch ? (an) => spur.applyConstraints({ advanced: [{ torch: an } as MediaTrackConstraintSet] }) : null,
    stoppen: () => {
      laeuft = false;
      strom.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

// Ton und Vibration zum Ergebnis. Der Ton entsteht im Browser (keine Datei); er braucht eine Berührung davor,
// die es auf dem Weg zum Scannen immer gibt (Spiel und Stufe wählen).
let klang: AudioContext | null = null;
const TON: Record<string, { hz: number; ms: number; pause: number; mal: number; vib: number[] }> = {
  gruen: { hz: 880, ms: 120, pause: 0, mal: 1, vib: [60] },
  gelb: { hz: 620, ms: 140, pause: 90, mal: 2, vib: [80, 80, 80] },
  rot: { hz: 220, ms: 500, pause: 0, mal: 1, vib: [300, 100, 300] },
};

export function signal(farbe: "gruen" | "gelb" | "rot"): void {
  const t = TON[farbe];
  try {
    navigator.vibrate?.(t.vib);
  } catch {
    // Safari kennt keine Vibration.
  }
  try {
    const K = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!K) return;
    klang ??= new K();
    const ctx = klang;
    if (ctx.state === "suspended") void ctx.resume();
    for (let i = 0; i < t.mal; i++) {
      const start = ctx.currentTime + (i * (t.ms + t.pause)) / 1000;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = t.hz;
      g.gain.setValueAtTime(0.18, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + t.ms / 1000);
      o.connect(g).connect(ctx.destination);
      o.start(start);
      o.stop(start + t.ms / 1000);
    }
  } catch {
    // Ohne Ton bleibt die Farbe.
  }
}
