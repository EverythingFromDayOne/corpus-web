# fix/drawer-signin-popup — ROUND 2: cancel path stuck after Fix 1/1b handoff

## Context

Round 1 (commits `3757bb9`, `1395d97`, `8456d07` on this same branch, PR #207)
fixed the original bug: the drawer's popup no longer self-destructs 38ms after
opening. CDP-confirmed via `Target.targetCreated`/`targetDestroyed` — no destroy
event, popup genuinely survives and navigates to `/auth/google`.

**But the dispatching session's own independent CDP verification (going past what
Round 1 tested) found a NEW regression introduced by that same fix: the cancel
path is now broken.**

## The regression — CDP-confirmed, not theory

Reproduction (488px viewport, drawer open, `NEXT_PUBLIC_API_URL` set, local API
running auth-disabled):

1. Tap Sign in in the drawer → popup opens at `/auth/google?...` (survives, per
   Round 1's fix — confirmed).
2. Manually close the popup (simulating the user cancelling, e.g. via CDP
   `Target.closeTarget` — same effect as the user clicking the popup's close
   button before completing OAuth).
3. Reopen the drawer, poll the button label for 8+ seconds.
4. **Result: button stays "Signing in…", disabled, forever.** Never reverts.
   Confirmed via repeated polls at t+1.2s through t+8.9s post-close, all showing
   `{"text":"Signing in…","disabled":true}`.

Before Round 1's fix, this exact scenario couldn't happen — the popup was already
dead within 38ms of opening, so there was no live popup left to cancel. Round 1's
fix (making the popup survive the handoff) makes the popup live long enough for a
real user cancel to matter, and that path has no recovery.

## Root cause

Two effects in `sign-in-button.tsx` are scoped to the `<SignInButton>` component
instance and stop functioning the moment it unmounts (which now happens
immediately after handoff, by design):

1. **The close-watcher interval** (`sign-in-button.tsx` around line 344,
   `closeWatcherRef.current = window.setInterval(() => { if (popup.closed) { ...
   setPopupClosed(true); } }, CLOSE_WATCH_INTERVAL_MS)`) polls `popup.closed` at
   250ms and, on transition, sets the LOCAL `popupClosed` state. Two more local
   effects react to `popupClosed` (fetch `/me` via `refresh()`, then schedule a 5s
   debounce `revert()` if still signed-out). All of this — the state, the two
   effects — belongs to the component instance. After unmount, calling
   `setPopupClosed` is a no-op (React 18 silently ignores state updates on
   unmounted components) — even if the interval itself kept running, the chain it
   drives is dead.

2. **`registerRevert(null)` on unmount** (a separate effect, unconditional, not
   guarded by `handingOffRef`) unregisters the button's `revert` callback from
   `SignInContext` at the exact moment of handoff — right when it would be needed
   most (there's no other button mounted to re-register once the popup eventually
   resolves one way or the other).

The `oauth-success` postMessage listener (which DOES live at the always-mounted
`SignInProvider` level, `sign-in-context.tsx` lines 224-253) still works and still
calls `revertRef.current()` (or falls back to `setProcessing(false)`) on a
**successful** sign-in. But there is no equivalent provider-level mechanism for
"the popup was closed WITHOUT success" — that detection has always lived in the
button's local close-watcher, which is exactly what breaks on handoff.

## Constraint that shapes the fix

Round 1 was told "do not touch `sign-in-context.tsx` unless a specific defect is
found." One has now been found: the close-detection logic needs to survive past
the handing-off button's unmount, and the only thing that survives is the
provider. **You are authorized to touch `sign-in-context.tsx` for this round.**

## Fix direction (principal engineer's analysis — implement carefully, verify with
CDP before declaring done)

The cleanest architecture: move popup **close-detection** (not the popup opening
itself, not the popup reference's ownership for the purpose of Fix 1/1b's
handoff) up to the `SignInProvider`, so it survives independent of which
`<SignInButton>` instance (if any) is currently mounted.

Suggested shape (adapt as needed — you have full context, don't over-fit to this
exact code, verify against the ACTUAL current file contents on this branch):

1. Add a `watchPopup(popup: Window) => void` (or similarly-named) method to
   `SignInContextValue` in `sign-in-context.tsx`. Internally, the provider runs
   its OWN `setInterval` polling `popup.closed` at the same 250ms cadence,
   independent of any button's mount state. On detecting close:
   - If `processing` is already `false` (a success already flipped it via the
     postMessage handler, which is likely to win the race since the callback page
     posts the message BEFORE closing itself), do nothing — no-op, avoids a
     spurious double-revert.
   - Otherwise, call `refresh()` (existing provider method) and, if the
     subsequent `/me` still resolves `signed-out`, revert `processing` to `false`
     after the same `POST_CLOSE_DEBOUNCE_MS` (5000ms) window the button used to
     own locally — keep the existing debounce constant/behavior, just relocate
     the OWNER of the timer, not its behavior. (Read the existing
     `POST_CLOSE_DEBOUNCE_MS` constant and the two-effect popupClosed→refresh→
     debounce-revert dance in `sign-in-button.tsx` closely before you relocate
     it — preserve the exact behavior for the topbar's existing non-handoff path
     too, since this same code path is shared.)
   - Clear its own interval when the popup closes (one-shot per registered
     popup) or when a NEW popup is registered (only one popup is ever
     meaningfully open at a time — same invariant the button enforced locally).

2. `<SignInButton>`'s `openAuthPopup()` calls `watchPopup(popup)` (or equivalent)
   INSTEAD OF (or possibly in addition to, if you decide local tracking is still
   useful for the non-handoff / topbar path — your call, but avoid double-firing
   the revert logic from two independent watchers racing each other) owning the
   interval itself.

3. Decide carefully: does the TOPBAR path (no `onPopupOpened`, button never hands
   off, unmounts only on route change) still need this? If the provider now owns
   ALL close-detection uniformly, the button's local `closeWatcherRef` +
   `popupClosed` state + the two local effects driving refresh/debounce become
   fully redundant and should be REMOVED (not left as dead parallel code — KISS/
   DRY, one owner for this responsibility, not two watchers racing). If you keep
   any local logic for a reason, document exactly why in a comment — don't leave
   an unexplained partial migration.

4. The existing `handingOffRef` guard on the unmount-cleanup effect
   (`sign-in-button.tsx` — skips `popupRef.current.close()` when handing off) is
   still correct and should stay — Fix 1/1b's core mechanism (stopPropagation +
   `onPopupOpened` callback + not-closing-the-popup-on-handoff-unmount) is NOT
   being reverted. This round only fixes what happens to the popup's close
   detection AFTER a successful handoff.

5. `registerRevert(null)` on unmount: once close-detection moves to the
   provider, decide whether this still needs a `handingOffRef` guard or becomes
   moot (if the provider's own `watchPopup` mechanism doesn't depend on
   `revertRef` at all for the handoff case, unregistering revert on unmount is
   fine — `revertRef` was specifically for the OTHER direction: postMessage
   success calling back into the button's local cleanup, which no longer has
   local state to clean up once you've moved things to the provider). Work out
   the correct interaction; don't leave two competing revert paths.

## What must NOT regress (same as Round 1, still applies)

- Fix 1/1b's core result: popup survives the drawer's onClose. Re-verify this
  is STILL true after your changes — don't reintroduce the original bug while
  fixing the cancel path.
- Desktop topbar sign-in must behave identically to before ANY of these hotfix
  changes (Round 1 or Round 2) from the user's perspective: click → popup opens
  → cancel (close popup without completing) → button reverts to "Sign in" within
  the existing debounce window → click → success → button shows signed-in state.
  Verify this explicitly; it's the path most likely to regress if you migrate the
  debounce logic carelessly.
- The `oauth-success` postMessage success path (already provider-level, should
  need zero changes) — verify it still works after your edit, since you're
  editing the same file.
- Fix 2 (popup-blocked inline message, `1395d97`) is untouched by this — it's
  the null-`window.open` branch, unrelated to close-detection.

## Preemption — read first

DO NOT use the `clarify` tool. This spec describes a confirmed regression with a
directional fix; the exact implementation shape (which fields move, exact
interval-management code) is an engineering decision within your judgment, not a
decision that needs escalation. If genuinely torn between two reasonable
approaches, pick the one that removes duplicate logic (KISS/DRY: one owner for
close-detection) and document why in the commit message.

## Workflow

1. You are already on branch `fix/drawer-signin-popup` in this worktree
   (`/Users/huynguyen/Documents/Self/corpus-web-fe1tagname`), which already has
   Round 1's 3 commits + PR #207 open against it. Continue on the SAME branch —
   do not cut a new one.
2. Read `apps/web/components/chrome/sign-in-context.tsx` (full file, not just the
   excerpts in this spec) and `apps/web/components/chrome/sign-in-button.tsx`
   (full file) before writing any code — both have shifted since Round 1's
   commits landed.
3. Implement the fix. Commit separately from Round 1's commits (do not amend/
   rebase Round 1's history) — a new commit, e.g.
   `fix(sign-in): move popup close-detection to provider so it survives drawer handoff`.
4. Run gates: `pnpm --filter @corpus/web typecheck`, `pnpm --filter @corpus/web
   lint`, `pnpm --filter @corpus/web build`, and the test suite (`cd apps/web &&
   TZ=Asia/Ho_Chi_Minh node --import tsx --test test/*.test.ts` — 113 tests
   passed pre-this-change, must still pass).
5. **Verify with CDP, don't just claim it.** Local infra (API + web dev server)
   should already be running in this worktree from the dispatching session's
   verification pass — check `lsof -iTCP:3001 -sTCP:LISTEN` and `lsof -iTCP:3000
   -sTCP:LISTEN` first; if down, restart per the Round 1 prompt's Verification
   section. Reuse or adapt
   `~/.hermes/cache/scratch/target-lifecycle-probe.mjs` (confirms popup survives
   handoff — must still pass) and
   `~/.hermes/cache/scratch/verify-cancel-path.mjs` (confirms cancel path now
   recovers — THIS is the new thing to prove; currently fails, must flip to
   passing). If the cancel-path probe script isn't present, rewrite it: open
   drawer, click sign-in, locate the popup target via `GET /json` (`type ===
   'page'`, `url` includes `/auth/google`), close it via `GET
   /json/close/<id>`, then poll the reopened drawer's button label for up to 8s
   — it MUST revert to "Sign in" within the existing debounce window (verify the
   exact constant name/value in the current code, likely ~5s + polling overhead).
6. Push the new commit to the SAME branch (`fix/drawer-signin-popup`) —
   `git push` (no `--force`, this is a fast-forward addition to existing pushed
   history, not a rewrite).
7. Update the PR body (`gh pr edit 207 --body-file ...` or via `gh pr comment
   207`) with the new commit's before/after cancel-path CDP evidence.

## Report

Append to (do not overwrite) `/tmp/drawer-signin-fix-report.md`: what changed,
why, the exact commit SHA, full gate results (typecheck/lint/build/test, all 4,
real exit codes), and BOTH CDP probes' before/after output — the handoff-survival
probe (must still pass) and the cancel-path probe (must now pass, previously
failed). Do not report "fixed" without pasting the actual probe output showing
the button reverting to "Sign in" after a simulated cancel.
