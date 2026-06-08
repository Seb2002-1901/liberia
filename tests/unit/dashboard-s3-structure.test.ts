import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 5.0 S3 — dashboard refondu, 5 blocs strict.
 *
 * Check statique : on lit la source du dashboard et on verrouille
 *   1. présence des 9 composants nouveaux
 *   2. ordre visuel strict des 5 blocs (Score/Priorité/Mission →
 *      Roadmap → KPI ×4 → Opportunité/Répartition/Évolution →
 *      Coach CTA)
 *   3. retrait des composants Phase 4.0 caducs (PageHeader,
 *      AdvisorCard, FirstSessionMissionCard, HealthTimeline,
 *      StatCard, GoalsSummary, CoachButton)
 *   4. les anciens composants archivés sont bien dans _archive/
 */

const dashboardSource = readFileSync(
  resolve(process.cwd(), "app/(app)/dashboard/page.tsx"),
  "utf8",
);

describe("Phase 5.0 S3 — dashboard 5 blocs présents", () => {
  it("Bloc 1 : ScoreCard + PriorityCard + MissionCard", () => {
    expect(dashboardSource).toMatch(/<ScoreCard\b/);
    expect(dashboardSource).toMatch(/<PriorityCard\b/);
    expect(dashboardSource).toMatch(/<MissionCard\b/);
  });

  it("Bloc 2 : RoadmapTimeline", () => {
    expect(dashboardSource).toMatch(/<RoadmapTimeline\b/);
  });

  it("Bloc 3 : 4 KpiCard", () => {
    const matches = dashboardSource.match(/<KpiCard\b/g);
    expect(matches?.length).toBe(4);
  });

  it("Bloc 4 : OpportunityHighlightCard + RepartitionDonutCard + ScoreEvolutionChart", () => {
    expect(dashboardSource).toMatch(/<OpportunityHighlightCard\b/);
    expect(dashboardSource).toMatch(/<RepartitionDonutCard\b/);
    expect(dashboardSource).toMatch(/<ScoreEvolutionChart\b/);
  });

  it("Bloc 5 : TalkToAdvisorCard", () => {
    expect(dashboardSource).toMatch(/<TalkToAdvisorCard\b/);
  });
});

describe("Phase 5.0 S3 — ordre visuel strict", () => {
  it("Score → Priorité → Mission → Roadmap → KPI → Opportunité → Répartition → Évolution → Coach", () => {
    const scoreIdx = dashboardSource.indexOf("<ScoreCard");
    const priorityIdx = dashboardSource.indexOf("<PriorityCard");
    const missionIdx = dashboardSource.indexOf("<MissionCard");
    const roadmapIdx = dashboardSource.indexOf("<RoadmapTimeline");
    const firstKpiIdx = dashboardSource.indexOf("<KpiCard");
    const opportunityIdx = dashboardSource.indexOf("<OpportunityHighlightCard");
    const repartitionIdx = dashboardSource.indexOf("<RepartitionDonutCard");
    const evolutionIdx = dashboardSource.indexOf("<ScoreEvolutionChart");
    const coachIdx = dashboardSource.indexOf("<TalkToAdvisorCard");

    for (const i of [
      scoreIdx,
      priorityIdx,
      missionIdx,
      roadmapIdx,
      firstKpiIdx,
      opportunityIdx,
      repartitionIdx,
      evolutionIdx,
      coachIdx,
    ]) {
      expect(i).toBeGreaterThan(-1);
    }
    // Ordre strict
    expect(scoreIdx).toBeLessThan(priorityIdx);
    expect(priorityIdx).toBeLessThan(missionIdx);
    expect(missionIdx).toBeLessThan(roadmapIdx);
    expect(roadmapIdx).toBeLessThan(firstKpiIdx);
    expect(firstKpiIdx).toBeLessThan(opportunityIdx);
    expect(opportunityIdx).toBeLessThan(repartitionIdx);
    expect(repartitionIdx).toBeLessThan(evolutionIdx);
    expect(evolutionIdx).toBeLessThan(coachIdx);
  });
});

describe("Phase 5.0 S3 — composants Phase 4.0 retirés du dashboard", () => {
  it("plus de PageHeader dans le dashboard", () => {
    expect(dashboardSource).not.toMatch(/<PageHeader\b/);
  });

  it("plus de HealthScoreSection ou HealthScoreRing rendu directement", () => {
    expect(dashboardSource).not.toMatch(/<HealthScoreSection\b/);
    expect(dashboardSource).not.toMatch(/<HealthScoreRing\b/);
  });

  it("plus d'AdvisorCard, FirstSessionMissionCard, HealthTimeline, GoalsSummary, CoachButton, StatCard", () => {
    expect(dashboardSource).not.toMatch(/<AdvisorCard\b/);
    expect(dashboardSource).not.toMatch(/<FirstSessionMissionCard\b/);
    expect(dashboardSource).not.toMatch(/<HealthTimeline\b/);
    expect(dashboardSource).not.toMatch(/<GoalsSummary\b/);
    expect(dashboardSource).not.toMatch(/<CoachButton\b/);
    expect(dashboardSource).not.toMatch(/<StatCard\b/);
  });
});

describe("Phase 5.0 S3 — archivage des composants Phase 4.0", () => {
  it("AdvisorCard archivé dans components/dashboard/_archive/", () => {
    const archived = readFileSync(
      resolve(process.cwd(), "components/dashboard/_archive/advisor-card.tsx"),
      "utf8",
    );
    expect(archived.length).toBeGreaterThan(0);
  });

  it("FirstSessionMissionCard archivé", () => {
    const archived = readFileSync(
      resolve(
        process.cwd(),
        "components/dashboard/_archive/first-session-mission-card.tsx",
      ),
      "utf8",
    );
    expect(archived.length).toBeGreaterThan(0);
  });

  it("CoachButton archivé (remplacé par TalkToAdvisorCard)", () => {
    const archived = readFileSync(
      resolve(process.cwd(), "components/dashboard/_archive/coach-button.tsx"),
      "utf8",
    );
    expect(archived.length).toBeGreaterThan(0);
  });

  it("LearnedAboutYou + ProgressSinceLastVisit toujours archivés (J6)", () => {
    const a = readFileSync(
      resolve(
        process.cwd(),
        "components/dashboard/_archive/learned-about-you.tsx",
      ),
      "utf8",
    );
    const b = readFileSync(
      resolve(
        process.cwd(),
        "components/dashboard/_archive/progress-since-last-visit.tsx",
      ),
      "utf8",
    );
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });
});
