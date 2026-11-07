export const TIERS = ["T0", "T1", "T2", "T3"] as const;
export type Tier = (typeof TIERS)[number];

export type HookName = "detect" | "plan" | "verify" | "gate";

/** Per-tier step lists. Cumulative: tier T gets `all` plus every key <= T. */
export type TieredSteps = Partial<Record<Tier | "all", string[]>>;
/** Per-tier gate choice. Lookup takes the highest key <= T. */
export type TieredGate = Partial<Record<Tier, string>>;

export interface Profile {
  type: string;
  extends?: string;
  detect?: {
    paths?: string[];
    intents?: string[];
    risk_floor?: Tier;
  };
  plan?: TieredSteps;
  verify?: TieredSteps;
  gate?: TieredGate;
}

export interface Step {
  id: string;
  kind: "deterministic" | "agent";
  hooks: HookName[];
  description: string;
  source?: string;
}

export interface GatePolicy {
  id: string;
  rank: number;
  description: string;
}

export interface Spine {
  shared_gates: string[];
  retier_on_drift: boolean;
  unmatched_floor: Tier;
}

export interface RiskMap {
  path_floors: { paths: string[]; tier: Tier; reason: string }[];
  size_floors: { min_files?: number; min_domains?: number; tier: Tier; reason: string }[];
}

export interface Config {
  spine: Spine;
  risk: RiskMap;
  steps: Map<string, Step>;
  gates: { policies: GatePolicy[]; tier_minimum: Record<Tier, string> };
  profiles: Map<string, Profile>;
}

export interface ChangeInput {
  files: string[];
  intent?: string;
  /** Model judgment may only raise the tier, never lower it. */
  raiseTo?: Tier;
}

export interface TierReason {
  tier: Tier;
  reason: string;
}

export interface Workflow {
  types: string[];
  tier: Tier;
  tierReasons: TierReason[];
  plan: string[];
  verify: { shared: string[]; typeSpecific: string[] };
  gate: string;
  unmatchedFiles: string[];
}

/** What the merge stage logs, so tiers and plugins can be calibrated later. */
export interface OutcomeRecord {
  changeId: string;
  workflow: Workflow;
  findings: { step: string; severity: "info" | "minor" | "major"; confirmed: boolean }[];
  merged: boolean;
  /** Filled in later: reverted, caused an incident, or a bug found after merge. */
  postMerge?: { reverted: boolean; incident: boolean; laterBugs: number };
}
