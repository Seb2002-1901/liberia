# Financial Health Score — Internal Reference

> Phase 3.2 of LIBERIA. Living technical document for everyone who
> touches the FHS pipeline. Read this BEFORE adding a feature that
> consumes the score.

---

## 1. What the FHS is — in one paragraph

A single integer 0–100 that measures the user's **financial process
health** — not their wealth, not their income. It moves on what they
control (discipline, savings rhythm, goals, profile depth) and what
they have built (résilience). It is the heartbeat of the dashboard
and the canonical reference every other phase consumes
(Timeline 3.3, Monthly Review 3.4, Notifications 3.5, Planning 3.7).

The score is **always** assorted with a confidence tier. A score
without a confidence tier is invalid by contract.

---

## 2. The formula — v1.0.0 (frozen for 18 months minimum)

### 2.1 Axes and nominal weights

| Axis | Weight | What it measures |
|---|---|---|
| **Discipline** | 25 % | Budgets respected + savings-rate stability over 3 months |
| **Résilience** | 25 % | `log₂(1 + runway) × 28` — months of fixed expenses covered |
| **Trajectoire** | 20 % | `savings_rate × 400` — capped at 25 % savings rate |
| **Couverture** | 15 % | Mirror of `completeness.structurelle` |
| **Objectifs** | 10 % | Presence + average progress of active goals (palier 30 after lifetime completion) |
| **Comportement** | 5 % | Engagement units (tx + 0.5 × coach_msg + 2 × memory) × 4 |

Each axis returns an integer 0–100 along with an `AxisConfidence`
(`HIGH | MEDIUM | LOW | UNKNOWN`).

### 2.2 Composition pipeline (6 steps)

```
Step 1 — Per axis : a_i ∈ [0, 100], c_i (axis calculator)
Step 2 — Renormalize :
   K = { i : c_i ≠ UNKNOWN }
   w'_i = w_i / Σ w_k for k ∈ K           if i ∈ K
   w'_i = 0                                 otherwise
Step 3 — raw = clamp(round(Σ a_i × w'_i), 0, 100)
Step 4 — EMA 60/40 :
   smoothed = round(0.6 × raw + 0.4 × previous_smoothed)
   First call (previous_smoothed = null) → smoothed = raw
Step 5 — display = clamp(round(smoothed), 0, 100)
Step 6 — band = bandFor(display) ; confidence = rollupGlobalConfidence()
```

### 2.3 Bands

| Range | Band | Label |
|---|---|---|
| 0 – 39 | `rose` | À reprendre |
| 40 – 64 | `ambre` | En construction |
| 65 – 84 | `or` | Solide |
| 85 – 100 | `emeraude` | Maîtrisé |

---

## 3. Confidence — two vocabularies, do not confuse

### 3.1 `AxisConfidence` (per-axis)

```
HIGH | MEDIUM | LOW | UNKNOWN
```

`UNKNOWN` means **the axis cannot be computed at all** and is
**excluded from the weighted sum**. The renormaliser redistributes
its weight across the surviving axes.

### 3.2 `Confidence` (global, surfaced to UI and coach)

```
HIGH | MEDIUM | LOW | INSUFFICIENT_DATA
```

`INSUFFICIENT_DATA` is a **short-circuit BEFORE the HIGH/MEDIUM/LOW
rollup**. When any of the 5 conditions below holds, the global
confidence is `INSUFFICIENT_DATA` regardless of individual axis
confidences. The score is still **computed and displayed** — but the
UI labels it "Données insuffisantes" (neutral, not accusatory) and
the coach refuses any conclusion and asks questions instead.

### 3.3 The 5 INSUFFICIENT_DATA conditions

```ts
isInsufficient =
   structurelle < 40
   OR monthlyIncome ≤ 0
   OR exploitableExpenses ≤ 0
   OR filledMajorAreasCount < 2
   OR previousSnapshotCount ≤ 0      // first ever computation
```

`previousSnapshotCount ≤ 0` ensures the **very first computation is
always provisional** — there is no historical baseline to compare to,
the coach cannot reason about momentum or trends.

### 3.4 HIGH/MEDIUM/LOW rollup (when not INSUFFICIENT_DATA)

```
nbHigh = count(axes where confidence === "HIGH")
HIGH    if nbHigh ≥ 5
MEDIUM  if nbHigh ≥ 3
LOW     otherwise
```

`UNKNOWN` axes are counted as not-HIGH (never as HIGH).

---

## 4. Lifecycle — live vs sealed

LIBERIA computes the FHS in two distinct modes, both using the **same
`composeHealthScore()` function** to guarantee no semantic drift.

| Mode | When | Storage | Purpose |
|---|---|---|---|
| **Live** | Every dashboard load | none (in-memory) | Up-to-date number shown in the ring + drawer |
| **Sealed** | Lazy at dashboard load when local time is past Sunday 23:00 of the latest unsealed week | `health_snapshots` | Anchor of momentum, delta engine, Monthly Review, Timeline |

The lazy sealing strategy means **no cron at MVP**. The user opening
the app at any point after Sunday 23:00 local time triggers their
own snapshot write. If they never open the app, no snapshot is ever
written — which is acceptable: a user who is inactive has nothing
to observe.

The week to seal is computed by `latestSealableWeek(localNow)` in
`utils.ts`, which always returns the most recent ISO week whose
Sunday 23:00 local has elapsed.

---

## 5. Persisted tables — Phase 3.2 schema

### 5.1 `health_snapshots`

Append-only, idempotent on `(user_id, week)`. Mirror of
`HealthScoreResult` with three small additions :

- `week` — ISO 8601 week label `YYYY-Www` (e.g. `2026-W23`)
- `previous_score` / `previous_band` — denormalised onto every row
  so Phase 3.3 (Timeline) detects transitions with a plain
  `WHERE band <> previous_band` rather than a window function
- `computed_at` — wall-clock timestamp of the computation

The 6 axis blobs are stored as **one jsonb column per axis**. Adding
a 7th axis in a future major version is an additive column — no
reshuffle of existing data.

### 5.2 `health_score_deltas`

Materialised explanation of the move between two consecutive
snapshots. Written at snapshot-write time so the dashboard drawer
renders in a single row read, zero compute.

Schema :
- `(user_id, week_to)` primary key — idempotent on the destination week
- `week_from` — the previous sealed snapshot
- `net_delta` — `display(to) - display(from)`, signed
- `contributors` jsonb — array of 1-5 `DeltaContributor` entries
- Cascading FKs to `health_snapshots` (deleting a user cascades through
  both paths)

### 5.3 Row-Level Security

| Table | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| `health_snapshots` | `auth.uid() = user_id` | **No policy** — service role only |
| `health_score_deltas` | `auth.uid() = user_id` | **No policy** — service role only |

A user-mutable score table would be vulnerable to clock-skew and
manual overwrites, which would break the 5-year continuity promise.
**All writes go through `lib/services/health-snapshots.ts` and
`health-deltas.ts` with the admin client.**

---

## 6. Idempotence — three guarantees

1. **Snapshot write** — `INSERT` against `(user_id, week)` PK. On
   conflict (Postgres code `23505`), the service catches the error,
   returns the pre-existing row. **Snapshots are IMMUTABLE** —
   re-calls never overwrite.

2. **Delta write** — same pattern, PK `(user_id, week_to)`.

3. **`fhs_version` guard** — the writer refuses any row whose
   `fhsVersion` differs from the runtime `FHS_VERSION` constant.
   Protects long-term continuity : a stale build cannot land into a
   table that has moved to v2.0.

---

## 7. Versioning policy

- **Patch (1.0.x)** — copy or doc changes, no math
- **Minor (1.x.0)** — weight or threshold change ≤ 5 points anywhere ;
  document the rationale in `PLAN_PHASE3.md`
- **Major (x.0.0)** — axis added / removed, scale changed, etc.

Every snapshot row stores `fhs_version`. Old snapshots remain readable
at their original semantics ; the UI may annotate a graph with a
"formula updated" marker when traversing a version boundary.

**Engagement** : no formula change before the 18-month stabilisation
period documented in the calibration doc §10.

---

## 8. Future consumers — what each downstream phase reads

| Phase | Consumes | How |
|---|---|---|
| **3.3 Timeline** | `previous_score`, `previous_band` denormalised columns | `WHERE band <> previous_band` to detect promotions/demotions ; `WHERE display_score > previous_score` for personal records |
| **3.4 Monthly Review** | `listRecentSnapshotsByUserId(userId, 5)` | Aggregates the 4-5 weeks of a calendar month, diffs first vs last to write the narrative |
| **3.5 Notifications** | `health_score_deltas.contributors` | Uses `reasonKey` + `payload` as ready-made notification body templates |
| **3.6 Momentum Engine** | `listRecentSnapshotsByUserId(userId, 4)` | Computes 4-week trend (UP / DOWN / FLAT × WEAK / MEDIUM / STRONG) — see `momentum.ts` (Sprint 2 J6) |
| **3.7 Planning IA** | `composeHealthScore()` re-used with simulated inputs | Projects future score under "what if I save 200 more / month" scenarios |
| **3.6 Recommendation Engine** | Latest `HealthScoreResult` + `FinanceData` | Finds the weakest confident axis, simulates a canonical action, returns `estimatedGain` — see `recommendation.ts` (Sprint 2 J6) |
| **Coach context** | Latest `display` + `band` + `confidence` + delta + recommendation | Injected into `lib/ai/context.ts` so the coach speaks the same number as the ring |

**Every phase reads from these tables via the same services. There is
no parallel store, no shadow calculation, no LLM that recomputes the
score.**

---

## 9. File map

```
lib/calculations/health/
├── types.ts            # AxisId, AxisConfidence, Confidence, AxisResult,
│                       # HealthScoreResult, MomentumResult,
│                       # HealthRecommendation, DeltaExplanation, DrawerData
├── constants.ts        # FHS_VERSION, AXIS_WEIGHTS, SMOOTHING_ALPHA,
│                       # BAND_THRESHOLDS, INSUFFICIENT_DATA_RULES,
│                       # MOMENTUM_RULES, RECOMMENDATION_ACTIONS
├── utils.ts            # clamp, round, isoWeekString, subtractIsoWeeks,
│                       # toUserTimezone, latestSealableWeek
├── confidence.ts       # isInsufficientData, rollupGlobalConfidence
├── score.ts            # composeHealthScore (the 6-step pipeline)
├── axes/
│   ├── discipline.ts
│   ├── resilience.ts
│   ├── trajectoire.ts
│   ├── couverture.ts
│   ├── objectifs.ts
│   └── comportement.ts
├── delta.ts            # explainDelta (Sprint 2 J6)
├── momentum.ts         # computeMomentum (Sprint 2 J6)
└── recommendation.ts   # buildHealthRecommendation (Sprint 2 J6)

lib/services/
├── health-snapshots.ts # session + admin reads, append-only write,
│                       # snapshotPayloadFromResult / healthScoreResultFromRow
└── health-deltas.ts    # session + admin reads, append-only write,
                        # deltaPayloadFromExplanation / deltaExplanationFromRow

supabase/migrations/
└── 20260606_health_snapshots.sql

supabase/sql_smoke/
└── health_snapshots.sql  # manual smoke tests (this phase)
```

---

## 10. Sprint 1 audit — cross-reference J1 → J4

A coherence check passed at end of Sprint 1, locking the foundation
before Sprint 2 starts.

### 10.1 Column ↔ type alignment

| Migration column | `SnapshotRow` field | `HealthScoreResult` field |
|---|---|---|
| `user_id` | `user_id` | — (passed separately) |
| `week` | `week` | — (passed separately) |
| `fhs_version` | `fhs_version` | `fhsVersion` |
| `raw_score` | `raw_score` | `raw` |
| `smoothed_score` | `smoothed_score` | `smoothed` |
| `display_score` | `display_score` | `display` |
| `confidence` | `confidence` | `confidence` |
| `band` | `band` | `band` |
| `previous_score` | `previous_score` | `previousScore` |
| `previous_band` | `previous_band` | `previousBand` |
| `axis_*` | `axis_*` | `axes.*` |
| `computed_at` | `computed_at` | `computedAt` |

Roundtrip locked by tests in `health-snapshots-service.test.ts` :
`snapshotPayloadFromResult` then `healthScoreResultFromRow` yields
the original object (`toEqual` deep-equality).

### 10.2 Enum alignment

| Enum | SQL CHECK | TS type |
|---|---|---|
| Confidence | `('HIGH','MEDIUM','LOW','INSUFFICIENT_DATA')` | `"HIGH" \| "MEDIUM" \| "LOW" \| "INSUFFICIENT_DATA"` |
| Band | `('rose','ambre','or','emeraude')` | `"rose" \| "ambre" \| "or" \| "emeraude"` |
| AxisConfidence | (not in SQL — stored in axis jsonb) | `"HIGH" \| "MEDIUM" \| "LOW" \| "UNKNOWN"` |
| AxisId | (column names + jsonb `id` field) | 6 string literals |

### 10.3 `previousSmoothed` vs `previousDisplay` vs `previousScore`

Three distinct concepts, **kept separate on purpose** :

- `previousSmoothed` — input to the EMA recurrence at composition
  time. Holds the previous snapshot's `smoothed_score`. Used only
  inside `composeHealthScore()`.
- `previousDisplay` — input to the composition's "denormalised
  mirroring". Holds the previous snapshot's `display_score`. Written
  onto the new snapshot's `previous_score` column.
- `previousScore` (HealthScoreResult field) and `previous_score` (SQL
  column) — denormalised mirror of the previous snapshot's
  `display_score`, ready for Timeline queries.

In practice `previousSmoothed === previousDisplay` for most users
(both are integers in [0, 100]) but they remain distinct in the API
to preserve the option of de-rounding the EMA recurrence later.

### 10.4 `AxisResult.details` lifecycle

- Optional on the type
- Preserved verbatim through jsonb storage (`snapshotPayloadFromResult`
  passes the AxisResult object as-is to Supabase)
- Reconstructed verbatim by `healthScoreResultFromRow`
- Used today by `Couverture` (`filled_majors`, `missing_majors` string
  arrays) to let the delta engine cite specific areas

If a future axis adds `details`, no migration is required.

### 10.5 RLS and service-role usage

| Surface | Client | Why |
|---|---|---|
| `getMyLatestSnapshot()`, `listMyRecentSnapshots()`, `getMyDeltaForWeek()`, `getMyLatestDelta()` | session, cookie-bound | RLS enforces self-only — no risk of cross-read |
| `getLatestSnapshotByUserId()`, `getSnapshotForWeek()`, `listRecentSnapshotsByUserId()`, `countSnapshotsByUserId()`, `writeSnapshot()`, `getDeltaByUserIdAndWeek()`, `writeDelta()` | admin (`SUPABASE_SERVICE_ROLE_KEY`) | System paths called from the snapshot writer or background jobs ; bypass RLS but **always include an explicit `user_id` filter** |

No INSERT / UPDATE / DELETE policy exists on either table. A
hypothetical bypass attempt by the session client would fail at the
database boundary, not just the code review.

### 10.6 Tests inventory at end of Sprint 1

| File | Tests | Subject |
|---|---|---|
| `health-utils.test.ts` | 21 | clamp, ISO week, TZ helpers, sealing window |
| `health-axes-discipline.test.ts` | 12 | budget + savings sub-components, bonuses, malus |
| `health-axes-resilience.test.ts` | 10 | log scale, saturation, edge cases |
| `health-axes-trajectoire.test.ts` | 9 | 3-month average, deficit, MEDIUM/HIGH |
| `health-axes-couverture.test.ts` | 6 | details preservation, never UNKNOWN |
| `health-axes-objectifs.test.ts` | 10 | 50 + 50 × avg, palier 30, target 0 |
| `health-axes-comportement.test.ts` | 10 | engagement weights, grace, gaming bound |
| `health-confidence.test.ts` | 14 | 5 short-circuit conditions, HIGH/MEDIUM/LOW rollup |
| `health-score.test.ts` | 23 | renormalisation, EMA, bands, profiles A/B/H |
| `health-snapshots-service.test.ts` | 14 | payload projection, validation, roundtrip |
| `health-deltas-service.test.ts` | 8 | payload projection, roundtrip |
| **Total** | **137** | |

Global test suite : **635 / 635** (Sprint 1 added 137, zero
regression on the 498 pre-existing tests).

---

## 11. What is NOT in Sprint 1

These are the next slabs, in order :

- **J6** — `delta.ts` : Delta Explanation Engine, 20 reason keys
- **J6** — `momentum.ts` : 4-week trend
- **J6** — `recommendation.ts` : single source of truth for "next
  action" derivable from the score
- **J7** — Snapshot writer pipeline : ties live → seal → delta → write
- **J8-J9** — UI (ring + drawer) and i18n
- **J10** — Coach context integration

Anything outside this list belongs to a phase **after** 3.2 and must
not be added to this codebase until 3.2 ships green.
