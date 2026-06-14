# Worked Example: AC → Evidence Contract

Feature: **Inline email validation on the signup form** (web app)

This is the kind of feature that *feels* simple enough to skip the mapping
step — which is exactly why it's a good example. Most of the value here is
in the "Expected Result" column, so each AC below shows a **Bad** version
(what tends to get written under time pressure) next to the **Good** version
(what the `ac-evidence-map` skill should produce).

---

## AC-1: Empty email blocks submit with inline error

> Given the signup form, when the user clicks Submit with the email field
> empty, then an inline error appears below the field and the form is not
> submitted.

**Evidence type:** Screenshot (single end-state, no transition described)

**Capture trigger:** Immediately after clicking Submit with the email field
left empty.

**Bad Expected Result:**
> "Shows an error message."

Why it's bad: doesn't say *where*, *what text*, *what color/styling*, or
what the *rest of the form* should do. A screenshot showing literally any
error anywhere would "pass" this.

**Good Expected Result:**
> "A red-bordered text element reading exactly 'Email is required' appears
> directly below the email input, the email input itself gets a red
> 1px border, and no network request is made (page does not navigate or
> reload)."

**Capture method:** Playwright screenshot of the form region after the
click, plus a network-log assertion (no request fired) — covers both the
visual and the "nothing happened" claim.

---

## AC-2: Error clears with fade animation on valid input

> Given the inline error from AC-1 is showing, when the user types a valid
> email address, then the error message fades out.

**Evidence type:** GIF/Video — "fades out" is a transition, so a screenshot
cannot prove this AC even if the end-state screenshot looks fine.

**Capture trigger:** Start recording before the error is showing; type a
valid email character-by-character; stop recording once the error element
is fully removed from the DOM.

**Bad Expected Result:**
> "Error goes away smoothly."

Why it's bad: "smoothly" isn't checkable, and doesn't rule out the error
just *snapping* away (which would technically also make it "go away").

**Good Expected Result:**
> "Within ~300ms of the input becoming a valid email format, the error
> text and the input's red border both transition out via opacity (not an
> instant removal) — at least one intermediate video frame shows the error
> element at partial opacity (neither 0 nor fully visible) before it is
> removed from the DOM."

**Capture method:** Playwright video recording of the interaction,
converted to GIF with ffmpeg if needed for inline review; reviewer checks
an intermediate frame specifically.

---

## AC-3: Successful signup posts to API and shows success toast

> Given valid signup data, when the user clicks Submit, then a POST request
> is sent to `/api/signup` and a success toast is shown.

**Evidence type:** Test output (primary — this is a request/response
assertion) + Screenshot (secondary — confirms the toast renders).

**Capture trigger:** During an integration/e2e test run that fills valid
data and clicks Submit; screenshot taken once the toast is visible.

**Good Expected Result:**
> "Test output shows one POST request to `/api/signup` with a JSON body
> containing the submitted email, and a 2xx response is received.
> Separately, a screenshot taken within 1s of the response shows a toast
> element containing the text 'Account created' in the top-right of the
> viewport."

**Capture method:** Playwright/e2e test run output (request/response log)
+ Playwright screenshot of the toast.

---

## AC-4: API failure shows error toast and preserves entered email

> Given valid signup data, when the API responds with a 500, then an error
> toast is shown and the email field retains the value the user typed.

**Evidence type:** Screenshot + Log excerpt (the 500 response itself is a
backend-observable event worth capturing alongside the UI reaction).

**Capture trigger:** After mocking/forcing a 500 response from `/api/signup`
and submitting valid data.

**Good Expected Result:**
> "Network log shows a 500 response from `/api/signup`. Screenshot taken
> after the response shows: (1) a toast with text containing 'something
> went wrong' (case-insensitive) in the top-right, (2) the email input
> still contains the exact email value the user typed (not cleared or
> reset), (3) the Submit button is re-enabled (not stuck in a loading
> state)."

**Capture method:** Playwright network mock + screenshot + HAR/console log
export.

---

## Filled contract table (summary)

| # | AC | Evidence Type | Capture Trigger | Expected Result | Capture Method | Status |
|---|---|---|---|---|---|---|
| AC-1 | Empty email blocks submit | Screenshot | After clicking Submit with empty email | Red-bordered "Email is required" text directly below email input; input gets red border; no network request fires | Playwright screenshot + network log | Pending |
| AC-2 | Error fades out on valid input | GIF/Video | Recording from error-shown state through typing a valid email until error removed | Error text + red border transition out via opacity over ~300ms; at least one frame shows partial-opacity error before removal | Playwright video → GIF via ffmpeg | Pending |
| AC-3 | Valid signup posts + success toast | Test output + Screenshot | During e2e run, after Submit with valid data | Test log shows POST `/api/signup` with email in body, 2xx response; screenshot within 1s shows "Account created" toast top-right | e2e test output + Playwright screenshot | Pending |
| AC-4 | 500 shows error toast, preserves input | Screenshot + Log | After forcing 500 on `/api/signup` with valid data | Network log shows 500; screenshot shows "something went wrong" toast, email input retains typed value, Submit re-enabled | Playwright network mock + screenshot + HAR export | Pending |

---

## What `ac-evidence-verify` would check later

For AC-2, for example, verification means: open the recorded video/GIF,
pull a frame from roughly the middle of the fade window, and confirm the
error element is rendered at neither full opacity nor fully absent. If the
GIF shows the error simply vanish between two adjacent frames with no
intermediate state, AC-2 is **Failed** — even though "the error did go
away," which is what a less specific Expected Result would have let pass.
