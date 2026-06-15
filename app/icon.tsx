import { ImageResponse } from "next/og";

/**
 * Sprint S2 — favicon dynamique 32×32 généré par Next 15 (ImageResponse
 * + Satori). Évite d'avoir à committer un .ico binaire dans le repo
 * et garantit la cohérence visuelle avec la charte V3 (navy #011E5F).
 *
 * Logo : "L" blanc sur fond navy arrondi. Suffit pour la lisibilité
 * onglet + barre signets.
 */
export const runtime = "edge";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#011E5F",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 8,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
