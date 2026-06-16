"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  importBankCsvAction,
  type ImportSummary,
} from "@/app/actions/banking";

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  success: "#10A37F",
  successBg: "#ECFDF5",
};

const BANKS_SUPPORTED = [
  "UBS",
  "PostFinance",
  "Neon",
  "Yuh",
  "Revolut",
  "Raiffeisen",
  "BCV",
];

const FONT_DISPLAY = "Outfit, Inter, system-ui";

export function ImportClient() {
  const [uploading, setUploading] = React.useState(false);
  const [summary, setSummary] = React.useState<ImportSummary | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onUpload = async (file: File) => {
    setUploading(true);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await importBankCsvAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSummary(res.data);
      toast.success(
        `${res.data.importedCount} transaction${res.data.importedCount > 1 ? "s" : ""} importée${res.data.importedCount > 1 ? "s" : ""}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'import",
      );
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void onUpload(file);
  };

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
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header>
          <Link
            href="/banking"
            style={{
              fontSize: 12.5,
              color: C.primary,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            ← Mes imports bancaires
          </Link>
          <h1
            style={{
              margin: "10px 0 6px",
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              fontWeight: 700,
              color: C.textDark,
              letterSpacing: "-0.02em",
            }}
          >
            Importer un relevé bancaire
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: C.textMuted,
              lineHeight: 1.55,
            }}
          >
            Exporte ton historique en CSV depuis ton e-banking puis dépose le
            fichier ici. LIBERIA détecte automatiquement le format
            ({BANKS_SUPPORTED.join(", ")}) et dédoublonne les transactions
            déjà importées.
          </p>
        </header>

        <section
          style={{
            background: C.cardBg,
            borderRadius: 16,
            border: `1px dashed ${C.borderGhost}`,
            padding: 32,
            textAlign: "center",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            disabled={uploading}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "13px 28px",
              borderRadius: 11,
              background: uploading ? "#94A3B8" : C.navy,
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: uploading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {uploading ? "Import en cours…" : "Choisir un fichier CSV"}
          </button>
          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 12.5,
              color: C.textLight,
            }}
          >
            Taille max 2 MB · les transactions déjà importées seront ignorées
          </p>
        </section>

        {summary && (
          <section
            style={{
              background: C.successBg,
              borderRadius: 14,
              padding: 20,
              border: `1px solid ${C.success}33`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontSize: 18,
                fontWeight: 700,
                color: C.success,
              }}
            >
              Import terminé
            </h2>
            <dl
              style={{
                margin: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px 24px",
                fontSize: 13.5,
                color: C.textDark,
              }}
            >
              <div>
                <dt
                  style={{
                    color: C.textMuted,
                    fontSize: 11.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Banque détectée
                </dt>
                <dd style={{ margin: "2px 0 0", fontWeight: 600 }}>
                  {summary.bankHint}
                </dd>
              </div>
              <div>
                <dt
                  style={{
                    color: C.textMuted,
                    fontSize: 11.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Lignes du fichier
                </dt>
                <dd style={{ margin: "2px 0 0", fontWeight: 600 }}>
                  {summary.rowCount}
                </dd>
              </div>
              <div>
                <dt
                  style={{
                    color: C.textMuted,
                    fontSize: 11.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Importées
                </dt>
                <dd
                  style={{
                    margin: "2px 0 0",
                    fontWeight: 700,
                    color: C.success,
                  }}
                >
                  {summary.importedCount}
                </dd>
              </div>
              <div>
                <dt
                  style={{
                    color: C.textMuted,
                    fontSize: 11.5,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Doublons ignorés
                </dt>
                <dd style={{ margin: "2px 0 0", fontWeight: 600 }}>
                  {summary.skippedDuplicateCount}
                </dd>
              </div>
            </dl>
            <Link
              href="/banking/transactions"
              style={{
                alignSelf: "flex-start",
                padding: "10px 18px",
                borderRadius: 10,
                background: C.success,
                color: "white",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                marginTop: 6,
              }}
            >
              Voir les transactions →
            </Link>
          </section>
        )}

        <section
          style={{
            background: C.cardBg,
            borderRadius: 14,
            padding: 20,
            border: `1px solid ${C.borderGhost}`,
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: 600,
              color: C.textDark,
            }}
          >
            Comment exporter ton relevé ?
          </h2>
          <ul
            style={{
              margin: 0,
              padding: "0 0 0 18px",
              fontSize: 13,
              color: C.textMuted,
              lineHeight: 1.7,
            }}
          >
            <li>
              <strong>UBS</strong> : E-Banking → Compte → Mouvements → Exporter
              en CSV
            </li>
            <li>
              <strong>PostFinance</strong> : E-Finance → Mouvements → Imprimer/
              Exporter → CSV
            </li>
            <li>
              <strong>Neon</strong> : App → Compte → ⋯ → Exporter les
              transactions
            </li>
            <li>
              <strong>Yuh</strong> : App → Profil → Exporter mes transactions
            </li>
            <li>
              <strong>Revolut</strong> : App → Statements → Excel/CSV
            </li>
            <li>
              <strong>Raiffeisen</strong> : E-Banking → Mouvements → Exporter
            </li>
            <li>
              <strong>BCV</strong> : BCV-net → Mouvements → Exporter CSV
            </li>
            <li>
              <strong>Autre banque</strong> : le parser générique tente
              d'extraire date, montant et libellé automatiquement.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
