import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Layout auth V3 — charte navy/blanc identique au cockpit
 * authentifié. Plus de palette gold (héritage Phase 5 pré-V3).
 *
 * 2 colonnes desktop ≥ 1024 px : form (gauche) + panel marketing
 * navy (droite). Mobile : form pleine largeur.
 */

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#F2F4F8",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  gold: "#FBBF24",
};

const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "Outfit, Inter, system-ui";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, tCommon] = await Promise.all([
    getTranslations("auth.layout"),
    getTranslations("common"),
  ]);
  const tagline = tCommon("tagline");
  return (
    <>
      <style>{`
        @media (max-width: 1023px) {
          [data-auth-panel] { display: none !important; }
          [data-auth-content] { grid-column: span 2 !important; }
        }
        @media (max-width: 640px) {
          [data-auth-content-inner] { padding: 56px 22px 28px 22px !important; }
        }
      `}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "100vh",
          backgroundColor: C.pageBg,
          fontFamily: FONT_STACK,
          color: C.textDark,
        }}
      >
        {/* Colonne gauche : brand + form */}
        <div
          data-auth-content
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div
            data-auth-content-inner
            style={{
              flex: 1,
              padding: "56px 64px 28px 64px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Link
              href="/"
              aria-label="LIBERIA"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  backgroundColor: C.navy,
                  borderRadius: 8,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 20V6" />
                  <path d="M4 20h14" />
                  <path d="M8 14l4-4 3 3 5-6" />
                </svg>
              </span>
              <span
                style={{
                  color: C.navy,
                  letterSpacing: "0.16em",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                LIBERIA
              </span>
            </Link>
            <div
              style={{
                margin: "auto 0",
                width: "100%",
                maxWidth: 420,
                padding: "40px 0",
              }}
            >
              {children}
            </div>
            <p
              style={{
                fontSize: 11.5,
                color: C.textLight,
                margin: 0,
              }}
            >
              © {new Date().getFullYear()} LIBERIA ·{" "}
              <Link
                href="/terms"
                style={{ color: C.textMuted, textDecoration: "none" }}
              >
                {t("footerTerms")}
              </Link>{" "}
              ·{" "}
              <Link
                href="/privacy"
                style={{ color: C.textMuted, textDecoration: "none" }}
              >
                {t("footerPrivacy")}
              </Link>
            </p>
          </div>
        </div>

        {/* Colonne droite : brand panel navy premium */}
        <aside
          data-auth-panel
          style={{
            position: "relative",
            overflow: "hidden",
            backgroundColor: C.navy,
            color: "white",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 0%, rgba(37, 99, 235, 0.35) 0%, transparent 55%), radial-gradient(circle at 80% 100%, rgba(2, 31, 96, 0.6) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              padding: "72px 56px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
            }}
          >
            <div />
            <div style={{ maxWidth: 420 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.gold,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                {tagline}
              </p>
              <h2
                style={{
                  margin: "18px 0 0 0",
                  fontFamily: FONT_DISPLAY,
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                {t("panelTitle")}
              </h2>
              <p
                style={{
                  margin: "16px 0 0 0",
                  fontSize: 14.5,
                  color: "rgba(255, 255, 255, 0.78)",
                  lineHeight: 1.55,
                }}
              >
                {t("panelBody")}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.55)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              <span>Sécurité bancaire</span>
              <span>Coach IA</span>
              <span>Sans pub</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
