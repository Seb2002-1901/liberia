"use client";

import * as React from "react";
import { HealthScoreRing } from "@/components/dashboard/health-score-ring";
import { HealthScoreDrawer } from "@/components/dashboard/health-score-drawer";
import type { DrawerData } from "@/lib/calculations/health/types";

interface HealthScoreSectionProps {
  data: DrawerData;
  currency: string;
  isDemo: boolean;
}

/**
 * Phase 3.2 — client wrapper that co-locks the Ring and the Drawer
 * around a single open/close state. The server-side dashboard
 * computes the DrawerData ONCE via getOrSealDrawerData and hands the
 * whole object here ; ring + drawer read the same source, no
 * recomposition, no duplicate fetch.
 */
export function HealthScoreSection({
  data,
  currency,
  isDemo,
}: HealthScoreSectionProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <HealthScoreRing
        score={data.score.display}
        delta={data.delta?.netDelta ?? null}
        confidence={data.score.confidence}
        band={data.score.band}
        isDemo={isDemo}
        onOpen={() => setOpen(true)}
      />
      <HealthScoreDrawer
        open={open}
        onOpenChange={setOpen}
        data={data}
        currency={currency}
        isDemo={isDemo}
      />
    </>
  );
}
