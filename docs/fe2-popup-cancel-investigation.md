# FE-2 — Sign-in popup cancel path investigation

**Branch:** `investigation/signin-popup-cancel` (off `origin/develop @ 1d424b4`)
**Status:** Investigation only. No fix proposed or implemented in this PR.
**Tooling:** `scripts/investigate-signin-popup-cancel.mjs` (committed as `f5c334e`)
**Date:** 2026-09-21
**Tested environment:** local dev (web `http://localhost:3000`, API `http://localhost:3001`), headless Chrome via CDP, no Playwright/Puppeteer.

---

## TL;DR

The cancel path **does not hang**. After the user opens the Sign-in popup and closes it without choosing an account, the chrome UI returns to "Sign in" in **~5.5 seconds** (5 s `POST_CLOSE_DEBOUNCE_MS` + ~0.5 s settle). The button enters a "Processing" state during the open phase and exits cleanly. No popup.closed antipattern breakage was observed in this environment.

Under production COOP (the dispatch's stated concern) the signal may degrade — but **this script cannot reach production**. Huy verifies on https://nxhhuy.tech only.

**Recommendation:** Close FE-2 with NO fix. The cancel path is acceptable on the local dev / Vercel-preview surfaces that the team exercises. If Huy observes a hang or stuck-Processing state on https://nxhhuy.tech after a real cancel, escalate with the production repro and Huy can request a mechanism (timeout / focus-return-to-opener / `Blur` event on popup).

---

## Method

1. Spawn headless Chrome with `--remote-debugging-port=9222`, navigate to `http://localhost:3000/en` at 1280×800.
2. Click `.topbar-signin` via DOM.
3. Listen for `Page.windowOpen` CDP event (the reliable popup-spawn signal in headless mode — `Target.targetCreated` does not always include a `targetId` for `window.open` popups; cross-reference via `GET /json/list`).
4. After an 800 ms settle (`FE2_POPUP_DELAY_MS`), close the popup via `Target.closeTarget`.
5. Poll the opener's `.topbar-signin` button every 200 ms for 12 s, capturing text + `disabled` + `aria-disabled` + className.
6. Probe `popup.closed` reliability by issuing a probe `window.open('about:blank')`, reading `p.closed`, calling `p.close()`, re-reading `p.closed`.

Full script: `scripts/investigate-signin-popup-cancel.mjs` (401 lines).
Full JSON report: `/tmp/fe2-cancel-report.json`.
Run log: `/tmp/fe2-run.log`.

---

## Findings

| Question | Answer |
|---|---|
| Does the popup spawn? | Yes. `Page.windowOpen` event fires **2 ms** after `click()` resolves. URL: `http://localhost:3001/auth/google`. Window name: `google-oauth`. Features: `width=520,height=600,left=402,top=122,resizable` (matches `POPUP_WIDTH`/`POPUP_HEIGHT` in `sign-in-button.tsx:130-131`). |
| Does the popup redirect to Google? | Yes. The popup target's URL becomes `https://accounts.google.com/v3/signin/identifier?...&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=openid+email+profile&...`. The `redirect_uri` correctly points at the local API callback (no `?returnTo=` — see note ①). |
| What UI does the opener show while the popup is open? | The button enters "Processing" state — className becomes `topbar-signin topbar-signin--processing`, label flips to "Sign in" (the i18n string `topbar.signInProcessing` happens to read as `Sign in` in `apps/web/messages/en.json`; verified in observations). Button is `aria-disabled="true"`. |
| What happens after the popup closes (Target.closeTarget)? | The opener's button stays in "Processing" for ~5 s. After **5,513 ms** (5,535 ms on re-run), the button reverts to plain `Sign in` (no `topbar-signin--processing` class), `disabled=false`, `aria-disabled="false"`. |
| Does anything read `popup.closed`? | Yes. `apps/web/components/chrome/sign-in-button.tsx:265-272` — `closeWatcherRef.current = window.setInterval(() => { if (popup.closed) { … setPopupClosed(true); } }, CLOSE_WATCH_INTERVAL_MS)` (250 ms). Lines 193, 366 also touch `popupRef.current.closed` in the cleanup paths. |
| Is `popup.closed` reliable in this environment? | **Yes.** Probe shows `closedImmediately=false` (popup is alive), `closedAfter=true` (after `p.close()`). The CDP `Target.closeTarget` fires `Target.targetDestroyed` 6 ms after the close ack (see run log: close-acked +3605ms, destroyed +3611ms). |
| Is `popup.closed` reliable under production COOP? | **NOT MEASURED** — local dev does not set COOP headers on `/en`. The 250 ms `setInterval` poll is structurally fragile in any environment where the popup's browsing context is isolated from the opener; Huy verifies on https://nxhhuy.tech. |
| Does the cancel path hang? | **No.** UI returns to "Sign in" within 5,535 ms in this environment. `hangDetected: false`. |
| Net dispatch verdict | If Huy's production measurement matches (5 s return, no hang), close FE-2 with no fix. If Huy sees a hang or stuck state, escalate with the production repro before any mechanism decision. |

---

## Raw run log (key events)

```
[+  736ms] chrome-ready
[+  873ms] nav-start {"url":"http://localhost:3000/en"}
[+ 1865ms] nav-loaded
[+ 2667ms] click-signin
[+ 2669ms] popup-created  ← Page.windowOpen event, +2 ms after click
           {"source":"Page.windowOpen",
            "url":"http://localhost:3001/auth/google",
            "windowName":"google-oauth",
            "features":["left=402","top=122","width=520","height=600","resizable"]}
[+ 3599ms] observe-after-popup-delay  ← popup confirmed via /json/list
[+ 3603ms] popup-targetid-resolved  ← /json/list cross-reference
[+ 3603ms] closing-popup {"method":"Target.closeTarget",…}
[+ 3605ms] popup-close-acked
[+ 3611ms] popup-destroyed  ← Target.targetDestroyed fired +6 ms after ack
[+ 9118ms] return-to-signin {"elapsedSinceObserveStartMs":5513}
                     ↑ 5,513 ms after observe-start (=popup-close moment).
                       Matches POST_CLOSE_DEBOUNCE_MS = 5,000.
[+15794ms] probe-popup-closed
[+16924ms] popup-created  ← inline probe window.open
[+17036ms] popup-closed-probe {"ok":true,"closedImmediately":false,"closedAfter":true}
```

---

## What the chrome UI shows during the cancel flow (snapshots from the 12 s observation)

```
t=200ms    className: "topbar-signin topbar-signin--processing"   ← still processing
t=1400ms   className: "topbar-signin topbar-signin--processing"
t=2600ms   className: "topbar-signin topbar-signin--processing"
t=4800ms   className: "topbar-signin topbar-signin--processing"
t=5513ms   className: "topbar-signin"                              ← returned to Sign in
t=5713ms   className: "topbar-signin"
… (steady "Sign in" through t=11923ms)
```

The 5 s plateau is the `POST_CLOSE_DEBOUNCE_MS` debounce in
`sign-in-button.tsx:128` — the `useEffect` at lines 342-354 fires
`revert()` 5 s after `popupClosed` flips and `meState` is still
`signed-out`. This is intentional (per the docstring at lines 290-318):
it guards against the postMessage-vs-cookie race where the popup
already wrote the session cookie but the `oauth-success` postMessage
hasn't reached the opener yet.

---

## Why no fix is proposed

1. **Cancel works.** 5.5 s return is the documented debounce window — not a hang.
2. **The popup.closed antipattern is structural, not a bug** — `sign-in-context.tsx` migrated to a provider-owned `/me` model (PR #185 D58 fix). The 250 ms `closeWatcherRef` poll is the only remaining instance. Per the dispatch's framing, under COOP this poll becomes unreliable (returns stale `false` after the popup's browsing context is isolated). **In this environment, `closedAfter=true` was observed within 6 ms of the close ack**, so the poll is fast enough for a 5 s debounce.
3. **Huy-only verification gap.** COOP headers are not set on `localhost:3000/en`. The dispatch explicitly mentions COOP — that header is only present on the production deployment (https://nxhhuy.tech, agent cannot reach). Any proposed mechanism (timeout, focus returning to opener, postMessage from popup before unload) requires real-user verification on production. Per Huy's "wait for Huy's go" instruction, **no mechanism is committed**.
4. **The fix would be invasive.** Replacing the poll with `window.addEventListener('blur', …)` or a postMessage handshake touches `sign-in-button.tsx` AND `auth/google/callback/page.tsx`. That's a multi-file PR with cross-window-event timing — out of scope for an investigation.

---

## Notes

① The popup URL in this measurement is `http://localhost:3001/auth/google` with **no `?returnTo=` query parameter**. This branch (`investigation/signin-popup-cancel`) was cut from `origin/develop @ 1d424b4`, which predates the FE-1 `dec041f` commit (`fix(chrome): include ?returnTo=window.location.origin on auth URLs`) on PR #199. After PR #199 merges to develop, re-running this script on the resulting tree should show `?returnTo=http%3A%2F%2Flocalhost%3A3000` (or similar) in the popup URL. The investigation's cancel-path findings are independent of that — the popup URL does not affect the cancel latency.

② COOP-reliability testing requires either a production-cookies context (only Huy can reach) or a local server that emits `Cross-Origin-Opener-Policy: same-origin`. The local API at `http://localhost:3001` does not set COOP on `/auth/google`. Huy could add a header temporarily to a `fix/api-readiness-schema-pending`-style branch to reproduce the production COOP environment locally; that's outside the FE-2 scope.

③ The 250 ms `closeWatcherRef` interval (`sign-in-button.tsx:265`) is the same architectural concern as the `mountedRef`/`return null` regressions documented in `.cursor/rules/25-react-provider-event-bus.mdc` (D58, 2026-09-18). The Slice-B migration to provider-owned `/me` removed the **second** antipattern (the per-button 7 s safety-net poll). The popup-close watcher is the **third** remaining background-timer instance in this chrome. Future cleanup candidate if the postMessage handshake from `auth/google/callback/page.tsx` is reliable enough to remove the popup.closed probe entirely.

---

## Out of scope (carry)

- PR #199 (FE-1) merge (Huy).
- PR #198 follow-on (`req.session.returnTo` callback-handler integration test) per Hermes-Lead.
- Cross-thread `cut` skill (gated on post-FE-2 confirmation).
- Production COOP verification (Huy).
- Mechanism decision if Huy observes a production hang (Huy).
