#!/usr/bin/env bash
# Sample changes run through the resolver. From change-pipeline/runner:
#   npm install && npm run examples
set -euo pipefail
cd "$(dirname "$0")/../runner"
run() { echo; echo "== $1"; shift; npx tsx src/cli.ts plan "$@"; }

run "Copy fix pulled from the CRM" \
  --files "content/pricing-page.copy.json" --intent copy

run "Copy fix that also edits a pricing constant (floor wins)" \
  --files "content/pricing-page.copy.json,src/pricing/plans.ts" --intent copy

run "New settings page" \
  --files "src/app/pages/settings.tsx,src/app/components/Toggle.tsx" --intent feature

run "Refactor across the app" \
  --files "src/app/components/Button.tsx,src/lib/format.ts,tools/codemod.ts" --intent refactor

run "Feature that ships with a schema migration (types compose)" \
  --files "src/api/courses.ts,db/migrations/0042_add_course_status.sql" --intent feature

run "Delete a course while Stripe webhooks are live" \
  --files "src/api/courses.ts,src/billing/webhooks.ts" --intent feature

run "Content change whose build drifted into auth (re-tier)" \
  --files "src/i18n/en.json" --intent copy --built "src/i18n/en.json,src/auth/session.ts"
