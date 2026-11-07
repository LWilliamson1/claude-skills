import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { TIERS, type Config, type HookName, type Profile, type Step, type Tier } from "./types.js";

const load = (path: string) => parse(readFileSync(path, "utf8"));

/** Load config/ and profiles/ from the change-pipeline root, then validate. */
export function loadConfig(root: string): Config {
  const spine = load(join(root, "config/spine.yaml"));
  const risk = load(join(root, "config/risk-map.yaml"));
  const gates = load(join(root, "config/gates.yaml"));
  const steps = new Map<string, Step>(
    (load(join(root, "config/steps.yaml")).steps as Step[]).map((s) => [s.id, s]),
  );

  const raw = new Map<string, Profile>();
  for (const f of readdirSync(join(root, "profiles")).filter((f) => f.endsWith(".yaml"))) {
    const p = load(join(root, "profiles", f)) as Profile;
    raw.set(p.type, p);
  }

  const config: Config = { spine, risk, steps, gates, profiles: resolveInheritance(raw) };
  const errors = validate(config, raw);
  if (errors.length) {
    throw new Error("Invalid pipeline config:\n  - " + errors.join("\n  - "));
  }
  return config;
}

/** A child that defines a hook replaces the parent's hook entirely; otherwise it inherits. */
function resolveInheritance(raw: Map<string, Profile>): Map<string, Profile> {
  const out = new Map<string, Profile>();
  const resolve = (name: string, seen: string[] = []): Profile => {
    if (out.has(name)) return out.get(name)!;
    const p = raw.get(name);
    if (!p) throw new Error(`Unknown profile "${name}" (extends chain: ${seen.join(" -> ")})`);
    if (seen.includes(name)) throw new Error(`Circular extends: ${[...seen, name].join(" -> ")}`);
    const parent = p.extends ? resolve(p.extends, [...seen, name]) : undefined;
    const merged: Profile = {
      ...p,
      plan: p.plan ?? parent?.plan,
      verify: p.verify ?? parent?.verify,
      gate: p.gate ?? parent?.gate,
    };
    out.set(name, merged);
    return merged;
  };
  for (const name of raw.keys()) resolve(name);
  return out;
}

function validate(config: Config, raw: Map<string, Profile>): string[] {
  const errors: string[] = [];
  const isTier = (t: unknown): t is Tier => TIERS.includes(t as Tier);
  const gateIds = new Set(config.gates.policies.map((g) => g.id));

  if (!raw.has("default")) errors.push(`profiles/default.yaml is required`);

  for (const [name, p] of raw) {
    if (name !== "default" && !p.detect?.paths?.length && !p.detect?.intents?.length) {
      errors.push(`${name}: detect needs at least one of paths or intents`);
    }
    if (p.detect?.risk_floor && !isTier(p.detect.risk_floor)) {
      errors.push(`${name}: unknown risk_floor "${p.detect.risk_floor}"`);
    }
    for (const hook of ["plan", "verify"] as HookName[]) {
      const tiered = p[hook as "plan" | "verify"] ?? {};
      for (const [key, ids] of Object.entries(tiered)) {
        if (key !== "all" && !isTier(key)) errors.push(`${name}.${hook}: unknown tier key "${key}"`);
        for (const id of ids ?? []) {
          const step = config.steps.get(id);
          if (!step) errors.push(`${name}.${hook}: unknown step "${id}" (add it to config/steps.yaml)`);
          else if (!step.hooks.includes(hook)) {
            errors.push(`${name}.${hook}: step "${id}" is not allowed at the ${hook} hook`);
          }
        }
      }
    }
    for (const [key, policy] of Object.entries(p.gate ?? {})) {
      if (!isTier(key)) errors.push(`${name}.gate: unknown tier key "${key}"`);
      if (!gateIds.has(policy)) {
        errors.push(`${name}.gate: "${policy}" is not on the gate menu (config/gates.yaml)`);
      }
    }
  }
  return errors;
}
