import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadConfig } from "./config.js";
import { resolveWorkflow, retier } from "./resolve.js";
import { TIERS, type Tier, type Workflow } from "./types.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    files: { type: "string" },
    intent: { type: "string" },
    raise: { type: "string" },
    built: { type: "string" },
    json: { type: "boolean", default: false },
  },
});

const command = positionals[0] ?? "plan";
const config = loadConfig(root);

if (command === "validate") {
  console.log(`OK: ${config.profiles.size} profiles, ${config.steps.size} steps, ${config.gates.policies.length} gate policies`);
  process.exit(0);
}

if (command !== "plan") {
  console.error(`Unknown command "${command}". Use: plan | validate`);
  process.exit(1);
}

const split = (s?: string) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
if (values.raise && !TIERS.includes(values.raise as Tier)) {
  console.error(`--raise must be one of ${TIERS.join(", ")}`);
  process.exit(1);
}

const input = {
  files: split(values.files),
  intent: values.intent,
  raiseTo: values.raise as Tier | undefined,
};
let workflow = resolveWorkflow(input, config);
let escalated = false;
if (values.built) {
  ({ escalated, workflow } = retier(workflow, input, split(values.built), config));
}

if (values.json) {
  console.log(JSON.stringify({ ...workflow, escalated }, null, 2));
} else {
  print(workflow, escalated);
}

function print(w: Workflow, escalated: boolean) {
  const list = (xs: string[]) => (xs.length ? xs.join(", ") : "(none)");
  console.log(`Types:   ${w.types.join(" + ")}`);
  console.log(`Tier:    ${w.tier}${escalated ? "  (escalated after drift)" : ""}`);
  for (const r of w.tierReasons) console.log(`           ${r.tier}  ${r.reason}`);
  console.log(`Plan:    ${list(w.plan)}`);
  console.log(`Verify:  shared  ${list(w.verify.shared)}`);
  console.log(`         type    ${list(w.verify.typeSpecific)}`);
  console.log(`Gate:    ${w.gate}`);
}
