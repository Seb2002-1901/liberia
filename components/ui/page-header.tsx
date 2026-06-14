import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}

/**
 * PageHeader V3 — typo Outfit + couleur navy primary cohérente
 * avec le cockpit V3. Plus de font-display shadcn (qui dépendait
 * d'une variable CSS pré-V3).
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <p
            className="text-xs font-bold uppercase"
            style={{
              letterSpacing: "0.22em",
              color: "#2563EB",
            }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="text-2xl font-bold tracking-tight text-balance sm:text-3xl"
          style={{
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.02em",
            color: "#0F172A",
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="max-w-2xl text-sm"
            style={{ color: "#64748B", lineHeight: 1.55 }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
