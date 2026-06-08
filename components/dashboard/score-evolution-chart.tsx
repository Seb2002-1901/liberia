import Link from "next/link";
import { ArrowRight, LineChart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SealedSnapshot } from "@/lib/calculations/health/types";
import { buildLineChart } from "@/lib/ui/svg-charts";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 5.0 S3 — Carte "Évolution du score" (Bloc 4, droite).
 *
 * Reproduit la maquette : line chart SVG natif avec 5 points sur ~2
 * mois, callout "{score} Score actuel" sur le dernier point, axes
 * X (dates) / Y (0-100), lien "Voir l'historique →".
 *
 * Server Component — aucun état. Consomme une liste de snapshots
 * FHS hebdomadaires (déjà persistés Phase 3.2). SVG natif (Q5).
 *
 * Empty state (D7 validé) : strictement empty si < 2 snapshots.
 * Aucune interpolation, aucune courbe artificielle.
 */

interface ScoreEvolutionChartProps {
  /** Snapshots récents, ordre quelconque — sera trié par semaine
   *  croissante (chronologique gauche → droite). Idéalement 5-12
   *  points pour matcher visuellement la maquette. */
  snapshots: SealedSnapshot[];
}

export async function ScoreEvolutionChart({
  snapshots,
}: ScoreEvolutionChartProps) {
  const t = await getTranslations("dashboard.scoreEvolution");

  // Tri chronologique strict (les snapshots arrivent souvent en
  // ordre décroissant depuis la DB pour optimiser la dernière
  // récupération).
  const chrono = [...snapshots].sort((a, b) =>
    a.week.localeCompare(b.week),
  );

  if (chrono.length < 2) {
    return (
      <article className="rounded-2xl border border-border bg-card p-5">
        <Eyebrow t={t} />
        <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
          <span
            aria-hidden
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <LineChart className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-foreground">
            {t("emptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground">{t("emptyBody")}</p>
        </div>
      </article>
    );
  }

  const points = chrono.map((s) => ({
    id: s.week,
    value: s.result.display,
  }));

  const chart = buildLineChart(points, {
    width: 300,
    height: 120,
    padding: { top: 16, right: 32, bottom: 24, left: 8 },
    yMin: 0,
    yMax: 100,
  });

  const lastPoint = chart.points[chart.points.length - 1];
  const currentScore = points[points.length - 1].value;

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <Eyebrow t={t} />

      <div className="mt-4">
        <svg
          viewBox="0 0 300 120"
          className="h-32 w-full"
          aria-label={t("ariaChart", { score: currentScore })}
        >
          {/* Lignes de référence (25/50/75/100) — discrètes */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = 16 + ((100 - v) / 100) * (120 - 40);
            return (
              <line
                key={v}
                x1={8}
                x2={268}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Aire sous courbe (halo très léger) */}
          {chart.areaD && (
            <path
              d={chart.areaD}
              fill="hsl(var(--primary))"
              fillOpacity={0.08}
            />
          )}

          {/* Courbe */}
          {chart.pathD && (
            <path
              d={chart.pathD}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {chart.points.map((p) => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
          ))}

          {/* Callout sur le dernier point */}
          {lastPoint && (
            <g>
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={4}
                fill="hsl(var(--primary))"
              />
              <rect
                x={lastPoint.x + 6}
                y={lastPoint.y - 14}
                width={36}
                height={20}
                rx={4}
                fill="hsl(var(--primary))"
              />
              <text
                x={lastPoint.x + 24}
                y={lastPoint.y - 1}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fill="white"
              >
                {currentScore}
              </text>
            </g>
          )}
        </svg>

        {/* Axe X : 1ère et dernière dates (lisibles, pas surchargé) */}
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{formatWeekShort(chrono[0].week)}</span>
          <span>{formatWeekShort(chrono[chrono.length - 1].week)}</span>
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={ROUTES.plan}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("historyLink")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function Eyebrow({
  t,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t("eyebrow")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {t("progression")}
      </p>
    </div>
  );
}

/** Formate une semaine ISO (ex. "2026-W22") en label court "22 mai". */
function formatWeekShort(isoWeek: string): string {
  // Format ISO 8601 week → trouve la date du lundi de cette semaine.
  // Implémentation simple, sans dépendance : pas de date-fns ici.
  const m = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return isoWeek;
  const year = Number(m[1]);
  const week = Number(m[2]);
  // 4 janvier est toujours dans la semaine 1 ISO. On reconstruit
  // depuis là pour éviter de gérer manuellement les années 53-week.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const day = target.getUTCDate();
  const monthShort = target.toLocaleString("fr-CH", {
    month: "short",
    timeZone: "UTC",
  });
  return `${day} ${monthShort}`;
}
