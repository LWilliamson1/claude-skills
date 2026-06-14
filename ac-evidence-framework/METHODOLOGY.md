# AC → Evidence Mapping Methodology

## Problem this solves

Pipelines like claude-ops generate evidence (screenshots, logs, test runs) as a
*side effect* of building a feature. The evidence exists, but nobody defined
*in advance* what evidence would prove each acceptance criterion (AC) true —
so review becomes "here are some screenshots, looks fine?" instead of "AC #3
required a GIF of the modal closing on Escape, here it is, it closes."

This framework inserts one mandatory step between **epic breakdown** and
**subagent dispatch**: for every AC, declare what evidence will prove it,
how that evidence will be captured, and what the evidence must show to pass.
That declaration travels with the subagent's brief and is the checklist used
at integration time.

## Where this fits in the existing pipeline

```
Vet feature → Create epic → Break down into AC's
                                   │
                                   ▼
                    [NEW] AC → Evidence Mapping  ◄── guided, forced step
                                   │
                                   ▼
              Dispatch subagent (brief includes evidence contract)
                                   │
                                   ▼
                 Build in worktree + capture evidence per contract
                                   │
                                   ▼
            [NEW] Integration gate: evidence reviewed against contract
                                   │
                                   ▼
                          Merge / report
```

The mapping step is **forced** in the sense that the epic-breakdown stage
cannot hand off to a subagent until every AC has a row in the evidence table.
An AC with no evidence type assigned is a flag, not a default.

## Evidence taxonomy (platform-agnostic)

Evidence types are defined by *what kind of claim they support*, not by tool.
Pick the type first, then pick a capture method appropriate to the dev's
platform (Mac/PC) and app type (web/native).

| Evidence type | Proves... | When to use |
|---|---|---|
| **Static screenshot** | A specific state/layout exists | Single-state AC's ("error message appears with red border") |
| **GIF/video clip** | A transition, animation, or multi-step interaction occurred | AC's with verbs: opens, closes, transitions, drags, redirects, animates |
| **Log/console excerpt** | A backend event, error, or side effect occurred | AC's about non-visual behavior (API calls, retries, events fired) |
| **Test output** | A behavior is correct under defined inputs | AC's expressible as unit/integration/e2e assertions |
| **Diff/data snapshot** | Data was created/changed/persisted correctly | AC's about persistence, DB state, file output |
| **Performance metric** | A non-functional requirement is met | AC's with thresholds (load time, frame rate, memory) |

Most AC's map to exactly one primary evidence type plus optionally a test
output as a secondary confirmation. If an AC seems to need 3+ evidence types,
it's probably actually 2+ AC's — split it.

## Capture methods by platform/environment (generic)

These are *categories* of tooling — pick whichever the project already uses;
the contract only records the evidence type and expected result, not a
specific tool, so it stays portable.

### Web (any OS)
- Screenshot/video/trace: Playwright, Puppeteer, Cypress — all support
  screenshot-on-step and video recording natively.
- GIF: record video (webm/mp4) via the above, convert with ffmpeg
  (`palettegen`/`paletteuse`), or keep as video — most review tools
  (GitHub, Slack) play video inline now.
- Logs: capture browser console + network log via the same harness
  (Playwright `page.on('console')`, HAR export).

### Native desktop — macOS
- Screenshot: `screencapture` (CLI), or the app's own automation hooks.
- Video/GIF: `screencapture -V` (screen recording to mp4), or QuickTime
  scripted via AppleScript; convert to GIF with ffmpeg if needed.
- UI automation for repeatable capture: XCUITest (for Mac/iOS apps) or
  AppleScript/`osascript` for arbitrary apps.

### Native desktop — Windows
- Screenshot: PowerShell + `System.Windows.Forms`/`System.Drawing` (bit-blit
  the window), or built-in Snipping Tool CLI (`snippingtool /clip`).
- Video/GIF: Windows `Get-Process` + ffmpeg with `gdigrab`, or
  Xbox Game Bar capture; convert to GIF with ffmpeg.
- UI automation: WinAppDriver / FlaUI for repeatable interaction + capture.

### Mobile / cross-platform native (React Native, Flutter, etc.)
- Simulator/emulator screenshot: `xcrun simctl io booted screenshot` (iOS),
  `adb exec-out screencap` (Android).
- Video: `xcrun simctl io booted recordVideo`, `adb shell screenrecord`;
  convert to GIF with ffmpeg.
- Logs: platform device logs (`adb logcat`, `xcrun simctl spawn ... log`).

### Backend / non-UI
- Logs: structured log excerpt from the test run, filtered to relevant
  request ID / trace ID.
- Test output: raw test runner output (pass/fail + assertion diff).
- Data snapshot: before/after dump of the relevant DB rows or file(s).

The contract should record *evidence type + expected result*, never a
hardcoded path to a specific binary — the subagent picks the concrete
command based on what's available in its worktree.

## The guided mapping step

For each AC, the breakdown stage must produce a row with these fields
(see `AC_EVIDENCE_TEMPLATE.md`):

1. **AC ID & statement** — Given/When/Then if possible.
2. **Evidence type** — from the taxonomy above.
3. **Capture trigger** — *when* during the build/test run the evidence is
   captured (e.g., "after clicking Submit with empty field").
4. **Expected result** — what the evidence must show, stated concretely
   enough to be checked by a reviewer (human or agent) without re-reading
   the AC. E.g., not "shows error" but "red banner with text 'Email is
   required' visible below the email field."
5. **Capture method** — category from the platform table (free text,
   chosen by the subagent based on its environment).
6. **Status** — Pending / Captured / Verified / Failed.

If an AC can't produce a concrete "expected result" sentence, it's not
specific enough to be an AC yet — push it back to epic breakdown.

## Integration gate

Before merge, walk the evidence table:

- Every row is **Captured** (artifact exists and is linked).
- Every row is **Verified** — the artifact was actually compared against
  the "expected result" text, by a human or a review subagent, and matches.
- Any row still **Pending** or **Failed** blocks merge — either fix the
  feature or fix the AC (if it was wrong).

This turns "here's a folder of screenshots" into a per-AC pass/fail report
that's the actual merge gate, not a courtesy artifact.

## Guardrails / anti-patterns

- **Don't let evidence type default to screenshot.** Screenshots can't show
  a transition happened — if the AC has a verb, default to GIF/video first.
- **Don't write "expected result" after the fact.** It must be written
  during breakdown, before the subagent builds anything — otherwise it
  silently becomes "whatever the build produced."
- **Don't accept "looks right" as verification.** The expected-result text
  is the spec; verification means a side-by-side check against that text.
- **One AC, one primary evidence type.** Split AC's that need more.
