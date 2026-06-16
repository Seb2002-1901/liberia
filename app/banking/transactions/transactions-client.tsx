"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  reconcileBankTransactionAction,
  ignoreBankTransactionAction,
} from "@/app/actions/banking";

type Transaction = {
  id: string;
  transaction_date: string;
  amount: number;
  currency: string;
  label: string;
  suggested_category: string | null;
  reconciliation_status: string | null;
  raw_text: string | null;
};

type CategoryOption = { id: string; label: string };

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
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
};

const FONT_DISPLAY = "Outfit, Inter, system-ui";

export function TransactionsClient({
  transactions,
  filter,
  expenseCategories,
  incomeCategories,
}: {
  transactions: Transaction[];
  filter: "pending" | "all";
  expenseCategories: CategoryOption[];
  incomeCategories: CategoryOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  // État local pour la catégorie sélectionnée par ligne (init avec suggérée)
  const initialCategoryById = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of transactions) {
      if (t.suggested_category) map[t.id] = t.suggested_category;
    }
    return map;
  }, [transactions]);

  const [selectedCategoryById, setSelectedCategoryById] = React.useState<
    Record<string, string>
  >(initialCategoryById);
  const [pendingActions, setPendingActions] = React.useState<Set<string>>(
    new Set(),
  );

  // Re-sync si les transactions changent (après refresh)
  React.useEffect(() => {
    setSelectedCategoryById(initialCategoryById);
  }, [initialCategoryById]);

  const onConfirm = async (tx: Transaction) => {
    const category = selectedCategoryById[tx.id];
    if (!category) {
      toast.error("Sélectionne une catégorie.");
      return;
    }
    setPendingActions((prev) => new Set(prev).add(tx.id));
    try {
      const res = await reconcileBankTransactionAction(tx.id, category);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        tx.amount < 0 ? "Dépense créée." : "Revenu créé.",
      );
      router.refresh();
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(tx.id);
        return next;
      });
    }
  };

  const onIgnore = async (tx: Transaction) => {
    setPendingActions((prev) => new Set(prev).add(tx.id));
    try {
      const res = await ignoreBankTransactionAction(tx.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.info("Transaction ignorée.");
      router.refresh();
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(tx.id);
        return next;
      });
    }
  };

  const onBulkConfirmSuggested = async () => {
    const eligible = transactions.filter(
      (t) =>
        !t.reconciliation_status &&
        t.suggested_category &&
        selectedCategoryById[t.id] === t.suggested_category,
    );
    if (eligible.length === 0) {
      toast.info("Aucune ligne avec catégorie suggérée à confirmer.");
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Confirmer ${eligible.length} transaction${eligible.length > 1 ? "s" : ""} avec catégorie suggérée ?`,
      )
    ) {
      return;
    }
    let ok = 0;
    let ko = 0;
    for (const tx of eligible) {
      try {
        const res = await reconcileBankTransactionAction(
          tx.id,
          selectedCategoryById[tx.id],
        );
        if (res.ok) ok++;
        else ko++;
      } catch {
        ko++;
      }
    }
    toast.success(
      `${ok} confirmée${ok > 1 ? "s" : ""}${ko > 0 ? ` · ${ko} en erreur` : ""}`,
    );
    router.refresh();
  };

  const switchFilter = (next: "pending" | "all") => {
    const search = new URLSearchParams(params.toString());
    if (next === "pending") search.delete("filter");
    else search.set("filter", "all");
    router.push(`/banking/transactions${search.size > 0 ? `?${search}` : ""}`);
  };

  const pendingCount = transactions.filter(
    (t) => !t.reconciliation_status,
  ).length;
  const hasSuggested = transactions.some(
    (t) =>
      !t.reconciliation_status &&
      t.suggested_category &&
      selectedCategoryById[t.id] === t.suggested_category,
  );

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
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Link
              href="/banking"
              style={{
                fontSize: 12.5,
                color: C.primary,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              ← Mes imports
            </Link>
            <h1
              style={{
                margin: "8px 0 4px",
                fontFamily: FONT_DISPLAY,
                fontSize: 26,
                fontWeight: 700,
                color: C.textDark,
                letterSpacing: "-0.02em",
              }}
            >
              Transactions importées
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: C.textMuted,
              }}
            >
              {pendingCount} ligne{pendingCount !== 1 ? "s" : ""} à
              réconcilier. Confirme la catégorie ou ignore.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <FilterToggle
              active={filter === "pending"}
              onClick={() => switchFilter("pending")}
              label="À traiter"
            />
            <FilterToggle
              active={filter === "all"}
              onClick={() => switchFilter("all")}
              label="Toutes"
            />
            <button
              type="button"
              onClick={() => void onBulkConfirmSuggested()}
              disabled={!hasSuggested}
              style={{
                padding: "9px 16px",
                borderRadius: 9,
                background: hasSuggested ? C.success : "#CBD5E1",
                color: "white",
                border: "none",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: hasSuggested ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              ✓ Tout valider avec catégorie suggérée
            </button>
          </div>
        </header>

        {transactions.length === 0 ? (
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
              {filter === "pending"
                ? "Aucune transaction à réconcilier. Tout est traité 👌"
                : "Aucune transaction. Commence par importer un CSV depuis /banking/import."}
            </p>
          </section>
        ) : (
          <section
            style={{
              background: C.cardBg,
              borderRadius: 14,
              border: `1px solid ${C.borderGhost}`,
              overflowX: "auto",
            }}
          >
            <table
              data-testid="bank-transactions-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr style={{ background: C.pageBg }}>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th align="right">Montant</Th>
                  <Th>Catégorie</Th>
                  <Th align="center">Action</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const isIncome = t.amount > 0;
                  const cats = isIncome ? incomeCategories : expenseCategories;
                  const status = t.reconciliation_status;
                  const isPending = pendingActions.has(t.id);
                  return (
                    <tr
                      key={t.id}
                      style={{ borderTop: `1px solid ${C.borderGhost}` }}
                    >
                      <Td>
                        {new Date(t.transaction_date).toLocaleDateString(
                          "fr-CH",
                        )}
                      </Td>
                      <Td>
                        <div
                          style={{
                            fontSize: 13.5,
                            color: C.textDark,
                            fontWeight: 500,
                            maxWidth: 320,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={t.label}
                        >
                          {t.label || "—"}
                        </div>
                      </Td>
                      <Td align="right">
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: isIncome ? C.success : C.textDark,
                          }}
                        >
                          {isIncome ? "+" : ""}
                          {t.amount.toFixed(2)} {t.currency}
                        </span>
                      </Td>
                      <Td>
                        {status ? (
                          <StatusPill status={status} />
                        ) : (
                          <select
                            data-testid="category-select"
                            value={selectedCategoryById[t.id] ?? ""}
                            onChange={(e) =>
                              setSelectedCategoryById((prev) => ({
                                ...prev,
                                [t.id]: e.target.value,
                              }))
                            }
                            style={{
                              padding: "6px 10px",
                              border: `1px solid ${C.borderGhost}`,
                              borderRadius: 8,
                              fontSize: 12.5,
                              fontFamily: "inherit",
                              backgroundColor: C.cardBg,
                              cursor: "pointer",
                              maxWidth: 180,
                            }}
                          >
                            <option value="">— catégorie —</option>
                            {cats.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                                {c.id === t.suggested_category
                                  ? " (suggérée)"
                                  : ""}
                              </option>
                            ))}
                          </select>
                        )}
                      </Td>
                      <Td align="center">
                        {!status ? (
                          <div
                            style={{
                              display: "inline-flex",
                              gap: 6,
                              justifyContent: "center",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => void onConfirm(t)}
                              disabled={isPending}
                              data-testid="confirm-btn"
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                background: isPending ? "#94A3B8" : C.success,
                                color: "white",
                                border: "none",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: isPending ? "not-allowed" : "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => void onIgnore(t)}
                              disabled={isPending}
                              data-testid="ignore-btn"
                              style={{
                                padding: "6px 12px",
                                borderRadius: 8,
                                background: "transparent",
                                color: C.textMuted,
                                border: `1px solid ${C.borderGhost}`,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: isPending ? "not-allowed" : "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Ignorer
                            </button>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              color: C.textLight,
                            }}
                          >
                            —
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

function FilterToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 9,
        background: active ? C.navy : C.cardBg,
        color: active ? "white" : C.textDark,
        border: `1px solid ${active ? C.navy : C.borderGhost}`,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const config = (() => {
    switch (status) {
      case "created_expense":
        return { label: "Dépense créée", bg: "#FEF3C7", color: "#92400E" };
      case "created_income":
        return { label: "Revenu créé", bg: "#ECFDF5", color: "#065F46" };
      case "ignored":
        return { label: "Ignorée", bg: "#F1F5F9", color: "#475569" };
      case "matched_expense":
      case "matched_income":
        return { label: "Liée", bg: "#EDF2FD", color: "#1E40AF" };
      default:
        return { label: status, bg: "#F1F5F9", color: "#475569" };
    }
  })();
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "3px 9px",
        borderRadius: 999,
        background: config.bg,
        color: config.color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {config.label}
    </span>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      style={{
        padding: "12px 14px",
        textAlign: align,
        fontSize: 11.5,
        fontWeight: 600,
        color: C.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      style={{
        padding: "12px 14px",
        textAlign: align,
        fontSize: 13,
        color: C.textDark,
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}
