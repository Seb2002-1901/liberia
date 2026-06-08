import Link from "next/link";
import { ArrowRight, LineChart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SealedSnapshot } from "@/lib/calculations/health/types";
import { buildLineChart } from "@/lib/ui/svg-charts";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 5.0 S3.1 — ScoreEvolutionChart pixel-perfect maquette
 * dashboard.png.
 *
 * Spec visuelle stricte :
 *   - Carte blanche `rounded-2xl shadow-card p-6`
 *   - Eyebrow "ÉVOLUTION DU SCORE" + sous "Votre progression"
 *   - Grid lines horizontales fines (0/25/50/75/100)
 *   - **Axe Y labels visibles à droite (100/75/50/25)**
 *   - Courbe `strokeWidth=2.5` primary
 *   - **Aire sous courbe avec gradient SVG vertical** primary/20 → 0
 *   - Points `r=3` cerclés blanc
 *   - **Callout dernier point : pill navy** rx=6 avec "{score}" gros
 *     + "Score actuel" small dessous
 *   - 5 dates axe X (1ère + 3 intermédiaires + dernière)
 *   - Lien "Voir l'historique →" bleu primary
 *   - Animation fade-in au mount
 *
 * Empty state (D7 validé) : < 2 snapshots → message pédagogique
 * "Revenez la semaine prochaine".
 */

interface ScoreEvolutionChartProps {
  snapshots: SealedSnapshot[];
}

const CHART_WIDTH = 300;
const CHART_HEIGHT = 140;
const PAD = { top: 16, right: 40, bottom: 24, left: 8 };

export async function ScoreEvolutionChart({
  snapshots,
}: ScoreEvolutionChartProps) {
  const t = await getTranslations("dashboard.scoreEvolution");

  const chrono = [...snapshots].sort((a, b) => a.week.localeCompare(b.week));

  if (chrono.length < 2) {
    return (
      <article className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
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
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    padding: PAD,
    yMin: 0,
    yMax: 100,
  });

  const lastPoint = chart.points[chart.points.length - 1];
  const currentScore = points[points.length - 1].value;

  // Sélection des labels X : 5 dates max espacées régulièrement.
  const xLabels = pickXLabels(chrono.map((s) => s.week), 5);
  const innerH = CHART_HEIGHT - PAD.top - PAD.bottom;

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
      <Eyebrow t={t} />

      <div className="mt-5">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-36 w-full"
          aria-label={t("ariaChart", { score: currentScore })}
        >
          <defs>
            {/* Gradient vertical sous la courbe — signature maquette */}
            <linearGradient id="score-curve-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.20" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Lignes de référence (0/25/50/75/100) */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = PAD.top + ((100 - v) / 100) * innerH;
            return (
              <line
                key={v}
                x1={PAD.left}
                x2={CHART_WIDTH - PAD.right}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Labels axe Y à droite (100/75/50/25) — pas 0 pour éviter
              chevauchement avec l'axe X. */}
          {[25, 50, 75, 100].map((v) => {
            const y = PAD.top + ((100 - v) / 100) * innerH;
            return (
              <text
                key={`y-${v}`}
                x={CHART_WIDTH - PAD.right + 6}
                y={y + 3}
                fontSize={9}
                fill="hsl(var(--muted-foreground))"
              >
                {v}
              </text>
            );
          })}

          {/* Aire sous courbe avec gradient */}
          {chart.areaD && (
            <path d={chart.areaD} fill="url(#score-curve-gradient)" />
          )}

          {/* Courbe */}
          {chart.pathD && (
            <path
              d={chart.pathD}
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points (sauf le dernier — overlay callout) */}
          {chart.points.slice(0, -1).map((p) => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
          ))}

          {/* Callout dernier point : pill navy avec score + "Score actuel" */}
          {lastPoint && (
            <g>
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r={4}
                fill="hsl(var(--primary))"
              />
              <rect
                x={lastPoint.x + 8}
                y={lastPoint.y - 16}
                width={40}
                height={26}
                rx={6}
                fill="hsl(var(--navy))"
              />
              <text
                x={lastPoint.x + 28}
                y={lastPoint.y - 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="white"
              >
                {currentScore}
              </text>
              <text
                x={lastPoint.x + 28}
                y={lastPoint.y + 6}
                textAnchor="middle"
                fontSize={6}
                fill="white"
                fillOpacity={0.85}
              >
                {t("calloutLabel")}
              </text>
            </g>
          )}
        </svg>

        {/* Axe X : labels 5 dates intermédiaires */}
        <div
          className="mt-1 flex text-[10px] text-muted-foreground"
          style={{ paddingLeft: PAD.left, paddingRight: PAD.right }}
        >
          {xLabels.map((week, i) => (
            <span
              key={`x-${week}-${i}`}
              className="flex-1 text-center first:text-left last:text-right"
            >
              {formatWeekShort(week)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <Link
          href={ROUTES.plan}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t("eyebrow")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("progression")}</p>
    </div>
  );
}

/**
 * Sélectionne `count` labels équirépartis sur la liste des semaines
 * (avec garantie de la 1ère et de la dernière).
 */
function pickXLabels(weeks: string[], count: number): string[] {
  if (weeks.length <= count) return weeks;
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (weeks.length - 1));
    labels.push(weeks[idx]);
  }
  return labels;
}

/** Formate "2026-W22" → "22 mai" (short FR). */
function formatWeekShort(isoWeek: string): string {
  const m = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return isoWeek;
  const year = Number(m[1]);
  const week = Number(m[2]);
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
