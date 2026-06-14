import { ImageResponse } from "next/og";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Sprint S2 — OG image dynamique 1200×630 pour partages sociaux
 * (LinkedIn, Twitter, WhatsApp, iMessage). Remplace la référence
 * /og-image.png du root layout qui retournait 404 (pas de public/
 * folder dans ce repo).
 */
export const runtime = "edge";

export const alt = `${APP_NAME} — ${APP_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #011E5F 0%, #1E3A8A 100%)",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 80,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 32,
            opacity: 0.6,
            letterSpacing: 4,
            marginBottom: 24,
          }}
        >
          {APP_NAME}
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          {APP_TAGLINE}
        </div>
        <div
          style={{
            fontSize: 28,
            opacity: 0.75,
            marginTop: 32,
            maxWidth: 900,
          }}
        >
          Le copilote financier qui transforme la confusion en clarté.
        </div>
      </div>
    ),
    { ...size },
  );
}
