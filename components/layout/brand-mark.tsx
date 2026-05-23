import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showWordmark?: boolean;
}

export function BrandMark({
  href = "/",
  size = "md",
  className,
  showWordmark = true,
}: BrandMarkProps) {
  const sizes = {
    sm: { box: "h-7 w-7", text: "text-sm tracking-[0.18em]" },
    md: { box: "h-8 w-8", text: "text-sm tracking-[0.22em]" },
    lg: { box: "h-10 w-10", text: "text-base tracking-[0.24em]" },
  } as const;

  const s = sizes[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-lg",
          "bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-muted))]",
          "shadow-[0_4px_20px_-6px_hsl(var(--gold)/0.5)]",
          s.box,
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-1/2 w-1/2 text-[hsl(var(--gold-foreground))]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 20V6" />
          <path d="M4 20h14" />
          <path d="M8 14l4-4 3 3 5-6" />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-semibold uppercase text-foreground",
            s.text,
          )}
        >
          LIBERIA
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="LIBERIA, page d'accueil">
      {content}
    </Link>
  );
}
