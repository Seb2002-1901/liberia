"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  /** Section heading text. */
  title: string;
  /** Optional small line shown below the title (closed and open states). */
  subtitle?: string;
  /** When undefined, an open/closed indicator (no badge) is shown. */
  badge?: React.ReactNode;
  /** Defaults to false so analytics opens calm. */
  defaultOpen?: boolean;
  /** Icon shown in the chip beside the title. */
  icon?: React.ReactNode;
  /** Visual tone — only used for the leading icon chip. */
  tone?: "default" | "warning" | "danger" | "success" | "gold";
  children: React.ReactNode;
  className?: string;
}

/**
 * Phase 3.1.8 — analytics accordion primitive.
 *
 * Pure useState-based; no Radix dep added. Keeps the page calm:
 * sections are summarised by their title + subtitle (and optional
 * count badge) in the closed state, and only reveal their content
 * when the user actively opens them. The open state animates the
 * chevron and lets the underlying card fill its natural height.
 *
 * Why not a full <details>? We want the chip + badge in the trigger
 * and clean keyboard focus styling, and we want consistent
 * border/spacing with the rest of the analytics card grid. A small
 * controlled component beats fighting the browser's <details>
 * styling.
 */
export function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  icon,
  tone = "default",
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left transition-colors hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {icon ? (
          <span
            aria-hidden
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              toneFor(tone),
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
        {badge}
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border/40 px-5 py-4">{children}</div>
      )}
    </section>
  );
}

function toneFor(tone: NonNullable<CollapsibleSectionProps["tone"]>): string {
  switch (tone) {
    case "warning":
      return "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]";
    case "danger":
      return "bg-rose-500/15 text-rose-500";
    case "success":
      return "bg-emerald-500/15 text-emerald-500";
    case "gold":
      return "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]";
    default:
      return "bg-secondary/40 text-foreground/70";
  }
}
