import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "positive" | "negative" | "gold";
  hint?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-lg",
              tone === "positive"
                ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                : tone === "negative"
                ? "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]"
                : tone === "gold"
                ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
                : "bg-secondary/60 text-muted-foreground",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3 font-display text-2xl font-semibold sm:text-3xl",
          tone === "negative" && "text-[hsl(var(--destructive))]",
          tone === "positive" && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
