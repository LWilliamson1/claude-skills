---
name: ac-evidence-verify
description: Use at the integration/merge gate, after a feature worktree has been built and evidence artifacts (screenshots, GIFs/videos, logs, test output, data snapshots) have been captured. Reads each artifact, compares it against the "Expected Result" recorded in the feature's AC evidence contract, marks each row Verified or Failed with notes, and produces a pass/fail merge-gate report. Triggers on "verify evidence," "check the AC contract," "run the integration gate," or before merging a feature branch built against an evidence contract.
---

# AC Evidence Verification (Integration Gate)

You are checking a completed feature against its AC evidence contract
(produced by the `ac-evidence-map` skill, structured like
`AC_EVIDENCE_TEMPLATE.md`). Your job is to turn a folder of artifacts into a
per-AC pass/fail report that gates the merge.

## Inputs

- The filled evidence contract for the feature (table of AC's with Evidence
  Type, Capture Trigger, Expected Result, Capture Method, Status, and the
  Evidence Links section pointing to artifacts).
- Access to the artifacts themselves (image files, video/GIF files, log
  files, test runner output, data dumps).

## Process

For each AC row in the contract:

1. **Confirm the artifact exists and matches the declared Evidence Type.**
   If Status is still `Pending` or the linked artifact is missing/empty,
   mark the row `Failed` with note "no evidence captured" — do not guess
   or substitute a different artifact type.

2. **Read/inspect the artifact directly:**
   - Screenshot/GIF/Video → view the image or, for video/GIF, extract and
     view representative frames (e.g., first/middle/last frame, or the
     frame at the described trigger point).
   - Log/Console excerpt → read the relevant lines.
   - Test output → read the pass/fail result and relevant assertion text.
   - Data snapshot → read the before/after values.

3. **Compare against the Expected Result sentence, literally.** Check each
   concrete claim in the Expected Result independently (e.g., "red banner,"
   "text reads 'Email is required'," "Submit button disabled" are three
   separate checks). Do not mark Verified if even one concrete claim in the
   Expected Result is not visible/true in the artifact.

4. **Record the outcome:**
   - `Verified` — every claim in Expected Result is confirmed by the
     artifact. Note which artifact and what was checked.
   - `Failed` — one or more claims are not confirmed, or contradicted. Note
     specifically which claim failed and what the artifact actually shows.
   - Do not introduce a third "partial" status — an AC either holds or it
     doesn't. If the AC was ambiguous enough to cause disagreement, say so
     in the notes, but still resolve to Verified/Failed based on the literal
     Expected Result text.

## Output: merge-gate report

Produce:

1. The updated contract table with Status and notes filled in for every row.
2. A summary:
   - `N / total AC's Verified`
   - List of any `Failed` AC's with the specific mismatch
   - List of any AC's still missing evidence entirely
3. A single verdict: **PASS** (all AC's Verified) or **BLOCK** (any AC not
   Verified), stated explicitly at the top of the report.

See `../../EXAMPLE.md` ("What ac-evidence-verify would check later") for a
worked example of how a transition-based AC (GIF/video) gets checked frame
by frame against its Expected Result, including a case that looks fine at a
glance but should still be marked Failed.

## Guardrails

- Never mark an AC Verified based on the artifact "looking roughly right" —
  the Expected Result text is the spec. If the artifact doesn't show what
  the text says, it's Failed, even if the feature seems to work.
- If the Expected Result itself seems wrong or was based on a
  misunderstanding (e.g., the feature's actual correct behavior differs from
  what was specified), do not silently mark it Verified to match reality —
  report the discrepancy as a Failed row with a note recommending the AC be
  revised. That decision belongs to the user/epic owner, not this gate.
- A BLOCK verdict should include enough detail (which AC, what was expected,
  what was found) that the next subagent or developer can act on it without
  re-deriving the comparison.
