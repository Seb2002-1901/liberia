import { ImageResponse } from "next/og";

/**
 * Sprint S2 — apple-touch-icon 180×180 généré dynamiquement.
 *
 * Critique pour l'expérience "Ajouter à l'écran d'accueil" iOS et
 * pour qu'un éventuel wrapper TWA / Capacitor passe la review Store
 * avec une icône cohérente. Sans ce fichier, iOS dégrade en
 * screenshot blurry du favicon.
 *
 * Sans coins arrondis ici — iOS applique son propre rounded mask
 * système, et on évite le double-arrondi qui crée une bordure visible.
 */
export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #011E5F 0%, #1E3A8A 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: -4,
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
