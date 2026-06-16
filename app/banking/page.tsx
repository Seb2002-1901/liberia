import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";

/**
 * Sprint V5 Banking V1 — landing /banking.
 *
 * Liste des imports passés + CTA "Importer un relevé". V1 sans
 * agrégation live, juste imports CSV.
 */
export const dynamic = "force-dynamic";

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
};

const FONT_DISPLAY = "Outfit, Inter, system-ui";

export default async function BankingHomePage() {
  if (!isSupabaseConfigured()) redirect(ROUTES.login);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const { data: imports } = await supabase
    .from("bank_imports")
    .select(
      "id, bank_hint, file_name, row_count, imported_count, skipped_duplicate_count, status, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const importsList =
    (imports as Array<{
      id: string;
      bank_hint: string | null;
      file_name: string | null;
      row_count: number;
      imported_count: number;
      skipped_duplicate_count: number;
      status: string;
      created_at: string;
    }> | null) ?? [];

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: C.pageBg,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        padding: "32px 20px 80px",
      }}
    >
      <main
        style={{
          maxWidth: 800,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontSize: 28,
                fontWeight: 700,
                color: C.textDark,
                letterSpacing: "-0.02em",
              }}
            >
              Mes imports bancaires
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 14,
                color: C.textMuted,
                lineHeight: 1.55,
              }}
            >
              Importe l'historique de tes comptes via CSV pour automatiser
              ton suivi.
            </p>
          </div>
          <Link
            href="/banking/import"
            style={{
              flexShrink: 0,
              padding: "12px 22px",
              borderRadius: 11,
              background: C.navy,
              color: "white",
              textDecoration: "none",
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            + Importer un CSV
          </Link>
        </header>

        {importsList.length === 0 ? (
          <section
            style={{
              background: C.cardBg,
              borderRadius: 14,
              padding: 32,
              border: `1px dashed ${C.borderGhost}`,
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: C.textMuted }}>
              Aucun import pour le moment. Commence par téléverser un relevé
              CSV de ta banque.
            </p>
          </section>
        ) : (
          <section
            style={{
              background: C.cardBg,
              borderRadius: 14,
              border: `1px solid ${C.borderGhost}`,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.pageBg }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Banque
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Fichier
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Importé
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Doublons
                  </th>
                </tr>
              </thead>
              <tbody>
                {importsList.map((imp) => (
                  <tr
                    key={imp.id}
                    style={{ borderTop: `1px solid ${C.borderGhost}` }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: C.textDark,
                      }}
                    >
                      {new Date(imp.created_at).toLocaleDateString("fr-CH")}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: C.textDark,
                        textTransform: "capitalize",
                      }}
                    >
                      {imp.bank_hint ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: C.textMuted,
                      }}
                    >
                      {imp.file_name ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: C.textDark,
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {imp.imported_count} / {imp.row_count}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: C.textMuted,
                        textAlign: "right",
                      }}
                    >
                      {imp.skipped_duplicate_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
