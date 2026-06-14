# AC → Evidence Contract: {{Feature/Epic Name}}

> Fill this out during epic breakdown, *before* dispatching subagents.
> Every AC must have a row. No row may have an empty "Expected result."

| # | AC (Given/When/Then) | Evidence Type | Capture Trigger | Expected Result (concrete, checkable) | Capture Method | Status |
|---|---|---|---|---|---|---|
| AC-1 | Given _, when _, then _ | Screenshot / GIF / Video / Log / Test output / Data snapshot | e.g. "after clicking Submit with empty email field" | e.g. "Red banner reading 'Email is required' appears directly below the email input; Submit button stays disabled" | e.g. "Playwright screenshot + console log" | Pending |
| AC-2 | | | | | | Pending |
| AC-3 | | | | | | Pending |

## Status definitions

- **Pending** — not yet built / no artifact yet.
- **Captured** — artifact exists and is linked below.
- **Verified** — artifact was compared against "Expected Result" and matches.
- **Failed** — artifact exists but does not match "Expected Result"; blocks merge.

## Evidence links

| AC # | Artifact link/path | Verified by | Notes |
|---|---|---|---|
| AC-1 | | | |

## Integration gate checklist

- [ ] Every AC has a non-empty "Expected Result."
- [ ] Every AC has Status = Captured or further.
- [ ] Every AC's artifact has been compared against its "Expected Result" and marked Verified.
- [ ] No AC is Failed (or Failed AC's have a resolution noted: fixed feature / revised AC).
- [ ] Reviewer sign-off: __________
