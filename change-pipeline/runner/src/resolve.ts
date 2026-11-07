import { minimatch } from "minimatch";
import {
  TIERS,
  type ChangeInput,
  type Config,
  type Profile,
  type Tier,
  type TierReason,
  type TieredSteps,
  type Workflow,
} from "./types.js";

const rank = (t: Tier) => TIERS.indexOf(t);
const maxTier = (a: Tier, b: Tier): Tier => (rank(a) >= rank(b) ? a : b);
const matches = (file: string, globs: string[] = []) =>
  globs.some((g) => minimatch(file, g, { dot: true }));

/** Classify -> tier -> compose. Pure: same input and config, same workflow. */
export function resolveWorkflow(input: ChangeInput, config: Config): Workflow {
  const { types, unmatchedFiles } = detectTypes(input, config);
  const { tier, reasons } = computeTier(input, types, unmatchedFiles, config);
  const profiles = types.map((t) => config.profiles.get(t)!);

  return {
    types,
    tier,
    tierReasons: reasons,
    plan: union(profiles.map((p) => stepsFor(p.plan, tier))),
    verify: {
      shared: [...config.spine.shared_gates],
      typeSpecific: union(profiles.map((p) => stepsFor(p.verify, tier))),
    },
    gate: strictestGate(profiles, tier, config),
    unmatchedFiles,
  };
}

/**
 * Called after build with the files the diff actually touched. If the work
 * drifted outside its classified scope, re-run classification. The tier can
 * only go up.
 */
export function retier(
  original: Workflow,
  input: ChangeInput,
  builtFiles: string[],
  config: Config,
): { escalated: boolean; workflow: Workflow } {
  if (!config.spine.retier_on_drift) return { escalated: false, workflow: original };
  // A superset of files can only add floors, so the tier never drops.
  const next = resolveWorkflow(
    { ...input, files: [...new Set([...input.files, ...builtFiles])] },
    config,
  );
  const escalated =
    rank(next.tier) > rank(original.tier) || next.types.some((t) => !original.types.includes(t));
  return { escalated, workflow: escalated ? next : original };
}

function detectTypes(input: ChangeInput, config: Config) {
  const types = new Set<string>();
  const unmatchedFiles: string[] = [];

  // Intent claims a type for the whole change.
  if (input.intent) {
    for (const p of config.profiles.values()) {
      if (p.detect?.intents?.includes(input.intent)) types.add(p.type);
    }
  }
  // Paths always apply too: they are deterministic and can't be argued away.
  for (const file of input.files) {
    let claimed = false;
    for (const p of config.profiles.values()) {
      if (matches(file, p.detect?.paths)) {
        types.add(p.type);
        claimed = true;
      }
    }
    if (!claimed) unmatchedFiles.push(file);
  }
  // Files nobody claims by path always bring in the default profile, even
  // when an intent claimed the change. Otherwise a "copy" change that also
  // touches pricing code would get a T3 tier with only copy checks.
  if (unmatchedFiles.length || types.size === 0) types.add("default");
  return { types: [...types].sort(), unmatchedFiles };
}

function computeTier(
  input: ChangeInput,
  types: string[],
  unmatchedFiles: string[],
  config: Config,
): { tier: Tier; reasons: TierReason[] } {
  const reasons: TierReason[] = [];

  for (const t of types) {
    const floor = config.profiles.get(t)?.detect?.risk_floor;
    if (floor) reasons.push({ tier: floor, reason: `${t} profile floor` });
  }
  for (const rule of config.risk.path_floors) {
    const hit = input.files.find((f) => matches(f, rule.paths));
    if (hit) reasons.push({ tier: rule.tier, reason: `${rule.reason} (${hit})` });
  }
  const domains = new Set(input.files.map((f) => f.split("/")[0])).size;
  for (const rule of config.risk.size_floors) {
    if (rule.min_files && input.files.length >= rule.min_files) {
      reasons.push({ tier: rule.tier, reason: `${rule.reason} (${input.files.length} files)` });
    }
    if (rule.min_domains && domains >= rule.min_domains) {
      reasons.push({ tier: rule.tier, reason: `${rule.reason} (${domains} domains)` });
    }
  }
  if (unmatchedFiles.length) {
    reasons.push({ tier: config.spine.unmatched_floor, reason: `${unmatchedFiles.length} unclaimed file(s)` });
  }
  if (input.raiseTo) reasons.push({ tier: input.raiseTo, reason: "raised by judgment" });

  const tier = reasons.reduce<Tier>((acc, r) => maxTier(acc, r.tier), "T0");
  return { tier, reasons };
}

function stepsFor(tiered: TieredSteps | undefined, tier: Tier): string[] {
  if (!tiered) return [];
  const keys = ["all", ...TIERS.slice(0, rank(tier) + 1)] as const;
  return union(keys.map((k) => tiered[k] ?? []));
}

function strictestGate(profiles: Profile[], tier: Tier, config: Config): string {
  const rankOf = new Map(config.gates.policies.map((g) => [g.id, g.rank]));
  const candidates = [config.gates.tier_minimum[tier]];
  for (const p of profiles) {
    const key = [...TIERS.slice(0, rank(tier) + 1)].reverse().find((t) => p.gate?.[t]);
    if (key) candidates.push(p.gate![key]!);
  }
  return candidates.reduce((a, b) => (rankOf.get(b)! > rankOf.get(a)! ? b : a));
}

function union(lists: string[][]): string[] {
  return [...new Set(lists.flat())];
}
