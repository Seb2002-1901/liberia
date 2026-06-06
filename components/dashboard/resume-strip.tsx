"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Gauge, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ResumeStripProps {
  /** Discipline score 0-100. */
  discipline: number;
  /** Structurelle completeness 0-100. */
  completeness: number;
  /** Tier derived from completeness reliability. */
  reliability: "high" | "medium" | "low";
  /** Route to open the analytics laboratory. */
  analyticsHref: string;
}

/**
 * Phase UX premium — ultra-compact one-line summary.
 *
 * Replaces the old "Discipline card + Completeness card" pair the
 * brief asked us to compress. Reads in 2 seconds: two micro-scores +
 * a single CTA to dig deeper. No gradients, no badges, no surplus
 * colour. The dashboard's hero remains the NextActionCard.
 */
export function ResumeStrip({
  discipline,
  completeness,
  reliability,
  analyticsHref,
}: ResumeStripProps) {
  const t = useTranslations("dashboard.resumeStrip");
  return (
    <Link
      href={analyticsHref}
      className="group flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-card/60"
    >
      <Metric
        icon={<Gauge className="h-3.5 w-3.5" />}
        label={t("discipline")}
        value={`${discipline}/100`}
      />
      <span aria-hidden className="text-border">
        ·
      </span>
      <Metric
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        label={t("completeness")}
        value={`${completeness}%`}
        tone={reliabilityTone(reliability)}
      />
      <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
        {t("openAnalytics")}
        <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground"
      >
        {icon}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", tone)}>
        {value}
      </span>
    </span>
  );
}

function reliabilityTone(r: ResumeStripProps["reliability"]): string {
  if (r === "high") return "text-emerald-600";
  if (r === "medium") return "text-[hsl(var(--gold))]";
  return "text-rose-500";
}
