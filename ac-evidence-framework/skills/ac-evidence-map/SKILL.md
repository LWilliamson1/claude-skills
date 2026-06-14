---
name: ac-evidence-map
description: Use during epic/feature breakdown, after acceptance criteria (AC's) are drafted and before any build subagent is dispatched. Converts each AC into a filled evidence contract — evidence type, capture trigger, a concrete checkable "Expected Result," and a capture method — so the subagent's brief includes exactly what proof is required. Triggers on "map evidence for these AC's," "create an evidence contract," "break down AC's with evidence," or as a mandatory pre-dispatch step in claude-ops style pipelines.
---

# AC → Evidence Mapping

You are filling out an evidence contract (`AC_EVIDENCE_TEMPLATE.md` structure)
for a feature/epic, one row per acceptance criterion, BEFORE any build work
starts. The output of this skill is what gets attached to the subagent's
brief and is later used as the integration gate checklist.

## Inputs

- The feature/epic name and its list of AC's (Given/When/Then or plain
  statements). If AC's are vague or missing a clear trigger/outcome, do not
  invent specifics — flag them back to the user/epic-breakdown step instead
  of guessing.
- The target platform(s)/environment(s) for this feature (web, native
  desktop on Mac/Windows, mobile, backend-only, etc.) if known. If unknown,
  ask, since it determines the capture method category.

## Process

For each AC, produce a row with these fields. Do not skip fields — if a
field can't be filled, that's a signal the AC itself needs rework, not that
the field should be left blank or filled with a placeholder.

1. **AC ID & statement** — restate as Given/When/Then if not already.

2. **Evidence type** — pick exactly ONE primary type from:
   - `Screenshot` — proves a specific state/layout exists (use only for
     single-state AC's with no verb describing motion/change)
   - `GIF/Video` — proves a transition, animation, or multi-step interaction
     (default whenever the AC contains a verb like opens, closes,
     transitions, redirects, drags, animates, navigates)
   - `Log/Console excerpt` — proves a non-visual backend event, error, or
     side effect occurred
   - `Test output` — proves correctness under defined inputs (assertions)
   - `Data snapshot` — proves data was created/changed/persisted correctly
   - `Performance metric` — proves a non-functional threshold is met

   If an AC seems to genuinely need more than one type, split it into
   multiple AC's instead of adding rows — surface this back to the user.

3. **Capture trigger** — the precise moment/action during the build or test
   run when the evidence is captured (e.g., "after clicking Submit with the
   email field empty," "30 seconds into the export, before completion").

4. **Expected Result** — the most important field. Write a sentence that:
   - describes exactly what the artifact must show, in concrete terms
     (specific text, colors, element states, log lines, exit codes, values)
   - could be checked by someone who has NEVER read the AC
   - is falsifiable — there's a clear way for it to be wrong

   Bad: "Shows an error." Good: "A red banner with the text 'Email is
   required' appears directly below the email input, and the Submit button
   has the `disabled` attribute."

   If you cannot write a concrete Expected Result for an AC, the AC is not
   specific enough yet. Do not fill this field with something generic —
   report back that this AC needs to be refined before mapping can proceed.

5. **Capture method** — a category appropriate to the stated platform(s),
   chosen from the taxonomy in `../../METHODOLOGY.md` (Playwright/Cypress
   for web, `screencapture`/AppleScript for macOS, PowerShell/ffmpeg for
   Windows, simulator/emulator tools for mobile, log/test-runner output for
   backend). Don't hardcode a binary path — name the category/tool, the
   subagent picks the exact command for its worktree.

6. **Status** — always starts as `Pending`.

## Output

Produce the filled contract as a markdown table matching
`AC_EVIDENCE_TEMPLATE.md`, plus an "Evidence links" section (empty rows,
to be filled during build) and the integration gate checklist from the
template.

## Hard gate

Before returning the contract as "ready for dispatch," verify:

- Every AC has a row.
- Every row has a non-empty, concrete Expected Result (not "looks correct,"
  "works as expected," or similar non-falsifiable language).
- No row defaults to Screenshot when its AC statement contains a
  transition/action verb — those must be GIF/Video.

If any AC fails these checks, list the specific AC's that need rework and
do NOT mark the contract as ready. The calling process should treat an
incomplete contract as a blocker to dispatching subagents, the same as a
missing AC.
