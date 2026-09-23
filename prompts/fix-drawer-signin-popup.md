# fix/drawer-signin-popup — drawer sign-in popup self-destruct + stuck processing state

## Context

Bug reported by Huy on `develop.nxhhuy.tech` at 488px width (mobile drawer):
1. Open the drawer.
2. Tap Sign in → the drawer closes, no popup is visible, nothing else appears to happen.
3. Reopen the drawer → the button is stuck on "Signing in…" forever, unrecoverable.

Desktop sign-in works fine — same `SignInButton` component, no wrapper `onClick`.

## Root cause — CONFIRMED via CDP `Target.targetCreated` / `Target.targetDestroyed` trace (not theory)

`mobile-nav-drawer.tsx:344` wraps the reused `<SignInButton>` in a div whose own
`onClick` closes the drawer:

```tsx
<div onClick={onClose} className="mobile-nav-drawer-signin-wrap">
  <SignInButton messages={messages} />
</div>
```

Click sequence, ALL within the same synthetic React event / commit cycle:

1. Child fires first: `SignInButton.handleClick` → `openAuthPopup()` → `window.open(...)`
   succeeds → a **new page target is created** (verified via CDP: `Target.targetCreated`
   with `openerId` pointing at the drawer's page) → `popupRef.current = popup`,
   `setProcessing(true)`.
2. Click bubbles to the wrapper div → `onClick={onClose}` fires → `setOpen(false)`.
3. React commits both state updates together: the drawer unmounts, and
   `<SignInButton>` unmounts with it.
4. **`SignInButton`'s own unmount-cleanup effect
   (`sign-in-button.tsx:371-379`) runs**:
   ```tsx
   useEffect(() => {
     return () => {
       clearCloseTimer();
       clearCloseWatcher();
       if (popupRef.current && !popupRef.current.closed) {
         popupRef.current.close();   // <-- closes the popup it JUST opened
       }
     };
   }, []);
   ```
   This effect exists to close a *stale* popup when the button unmounts mid-flow
   (e.g. route change while signing in) — legitimate in the topbar's case, where the
   button only unmounts on navigation, never on the same click that opened the popup.
   In the drawer, the wrapper's `onClose` makes the SAME click both open the popup
   AND unmount the button, so this cleanup immediately destroys the popup it
   itself just created.
5. Measured: popup target destroyed **38ms after creation, 24ms after the physical
   click event** — confirmed via CDP `Target.targetDestroyed` for the exact
   `targetId` created by `window.open`. `window.open()` itself always returns a
   non-null `Window` object (never `null`) in this repro — the popup genuinely
   opens; it's actively closed by the button's own cleanup a moment later.
6. `processing` is hoisted to `SignInContext` (`sign-in-context.tsx`, see the A.1
   docstring at the top of that file) specifically so it survives a `<SiteHeader>`
   remount. It also survives this unmount — so `processing=true` persists in the
   context even after `SignInButton` (and the popup) are both gone. Because the
   popup is already closed and `popupRef`/`closeWatcherRef` were cleared by the same
   cleanup effect, nothing ever calls `revert()` — the button is stuck on
   "Signing in…" indefinitely, across every reopen of the drawer, until a full page
   reload.

Also relevant — `sign-in-context.tsx`'s own docstring (lines 61-64) explicitly
assumed **exactly one `<SignInButton>` mount site** ("this is a defensive fallback,
not an expected path"). PR #194 added a second mount site (the drawer) without
revisiting that assumption; this bug is a direct consequence.

## Fix (two independent defects — Huy confirmed both must land in this PR)

### Fix 1 — stop the wrapper's onClose from firing on the SAME click that opens the popup

Do NOT delete the wrapper (`mobile-nav-drawer-signin-wrap`) — it exists so tapping
in that area closes the drawer for every OTHER outcome (e.g. if envDisabled and the
click is a no-op). Keep it. Instead:

- `SignInButton` calls `event.stopPropagation()` in its own click handler so the
  wrapper's `onClick={onClose}` never fires for a real, successful popup-open.
- `SignInButton` accepts a new **optional** prop, `onPopupOpened`, called ONLY after
  `window.open()` returns a non-null popup. The drawer passes its `onClose` as this
  prop. This closes the drawer intentionally, in the right order: popup opens FIRST,
  then (and only then) the drawer closes.
- Because `onPopupOpened` fires asynchronously relative to the click's synthetic
  event (it's a plain function call after `openAuthPopup()` returns, still inside
  the same handler, so still batched in the same commit) — this reproduces the
  SAME unmount-during-open sequence UNLESS the unmount-cleanup effect is also
  fixed (Fix 1b below). Both changes are required together.

### Fix 1b — unmount-cleanup effect must not close a popup it JUST opened

The existing unmount-cleanup effect (`sign-in-button.tsx:371-379`) is correct for
its original purpose (topbar button unmounting mid-flow on a ROUTE CHANGE, not on
the click that opened the popup). The drawer case needs the popup to survive its
own opening button's unmount. Two acceptable implementations — pick whichever
reads cleaner in context, both satisfy the measured bug:

**Option A (preferred) — hand off the popup reference before unmounting.**
When `onPopupOpened` is about to be called (i.e. the button is about to trigger its
own unmount via the drawer closing), do NOT let the unmount-cleanup effect treat
this as a "stale" popup. Use a ref flag (e.g. `handingOffRef.current = true`) set
immediately before calling `onPopupOpened()`, and check it in the cleanup effect:

```tsx
const handingOffRef = useRef(false);

// in openAuthPopup(), right after setProcessing(true):
if (onPopupOpened) {
  handingOffRef.current = true;
  onPopupOpened();
}

// in the unmount-cleanup effect:
useEffect(() => {
  return () => {
    clearCloseTimer();
    clearCloseWatcher();
    if (!handingOffRef.current && popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
  };
}, []);
```

**Option B — skip calling `onPopupOpened` synchronously; defer with a microtask/
rAF so the unmount happens in a LATER commit, decoupled from the popup-owning
component's cleanup.** Only use this if Option A proves awkward — Option A is more
predictable and easier to verify with the CDP target-lifecycle probe used in this
investigation.

Either way: verify with a CDP probe (see Verification below) that the popup
`Target` is NOT destroyed within the first ~2s of being created.

### Fix 2 — stuck "Signing in…" must have an exit, independent of Fix 1

Per Huy: *"If window.open returns null or no popup reference exists, reset
processing immediately and surface something the user can act on. A state with no
exit is the exact class we've spent this week removing."*

Current code (`openAuthPopup`, `sign-in-button.tsx:258-266`):

```tsx
const popup = window.open(buildAuthUrl(authPath), 'google-oauth', features);
if (!popup) {
  // Popup blocked: nothing to revert, nothing to poll. The user must
  // unblock popups and click again. Spec says no error surfaced.
  return;
}
popupRef.current = popup;
setPopupClosed(false);
setProcessing(true);
```

`processing` is never set to `true` in the null-popup branch today, so THIS
specific branch is already safe — but there is currently no user-visible signal
when it's blocked, so the user has no idea a click did anything. Add:

```tsx
const [popupBlocked, setPopupBlocked] = useState(false);

// at the top of handleClick, before opening a new attempt:
function handleClick(event: React.MouseEvent) {
  event.stopPropagation();
  if (envDisabled || processing) return;
  setPopupBlocked(false);
  openAuthPopup();
}

// in openAuthPopup(), the null branch:
const popup = window.open(buildAuthUrl(authPath), 'google-oauth', features);
if (!popup) {
  setPopupBlocked(true);
  return;
}
setPopupBlocked(false);
popupRef.current = popup;
...
```

Auto-clear `popupBlocked` after a few seconds so it doesn't linger forever as a
stale message:

```tsx
useEffect(() => {
  if (!popupBlocked) return;
  const timer = window.setTimeout(() => setPopupBlocked(false), 6000);
  return () => window.clearTimeout(timer);
}, [popupBlocked]);
```

Render the message under/near the button (visually connected, not a toast) when
`popupBlocked` is true — pick the simplest markup consistent with the rest of this
file's inline style (a `<span>` with an existing utility class, or a new small
class in `globals.css` near `.topbar-signin*` — follow the file's existing
patterns, don't invent a new component for one string).

Add the i18n key to `apps/web/messages/en.json` inside the existing `"topbar"`
block (do not create a new top-level block — follow the established nesting):

```json
"topbarSignInPopupBlocked": "Sign-in popup was blocked. Allow popups for this site and try again."
```

(Pick the exact key name to match this file's existing naming convention inside
`topbar` — e.g. `signInPopupBlocked` to match the existing `signIn`,
`signInAriaLabel`, `signInProcessing` siblings. Read the block before adding.)

### What must NOT regress

- Desktop topbar sign-in (`site-header.tsx` → `AuthSurface` → `SignInButton`, no
  wrapper) must behave exactly as before — `onPopupOpened` is `undefined` there, so
  none of this new logic activates (`if (onPopupOpened) { ... }` guards it off).
- The existing `POST_CLOSE_DEBOUNCE_MS` revert-on-cancel path (user opens the real
  popup, later closes it without completing auth) must be untouched by this fix —
  that's a genuinely different code path (`popupClosed` transitions after a REAL
  user-driven popup close, not this synthetic same-click unmount).
- `registerRevert` / `SignInContext` wiring is untouched — do not touch
  `sign-in-context.tsx` for this fix unless a specific defect there is found during
  implementation (none is expected).

## Files

- MODIFIED `apps/web/components/chrome/sign-in-button.tsx` — `stopPropagation`,
  `onPopupOpened` prop, `handingOffRef` guard on the unmount-cleanup effect,
  `popupBlocked` state + auto-clear effect + rendered message.
- MODIFIED `apps/web/components/chrome/mobile-nav-drawer.tsx` — pass
  `onPopupOpened={onClose}` to the drawer's `<SignInButton>` at line 345. Keep the
  wrapper div and its `onClick={onClose}` as-is (still needed for the envDisabled
  no-op click case and as defense-in-depth for anywhere else in that wrap that
  isn't the button itself).
- MODIFIED `apps/web/messages/en.json` — add `topbar.signInPopupBlocked` (or
  whatever exact key name matches the file's convention).
- MODIFIED `apps/web/app/globals.css` — small addition near `.topbar-signin*` for
  the blocked-message styling, IF a new class is needed. Prefer reusing an
  existing utility/class if one already fits.
- MODIFIED `docs/DEBT.md` — extend the existing **D75** row (ui-evidence harness
  gap) with two sub-notes, do NOT open new debt IDs:
  - D75.b: `ui-evidence` only verifies a control exists in the DOM, not that
    tapping it produces any effect (network request, state change, popup). The
    drawer sign-in bug shipped and reached production because no harness step
    clicked the control and observed the result.
  - D75.c: the FE-2 "no hang" investigation (search `docs/DEBT.md` or
    `.agents/SESSION-LOG.md` for the FE-2 reference to find exact wording) ran
    desktop-only, no drawer coverage. Extend that investigation's scope note to
    include the drawer path.
  Land these as part of THIS PR's docs-wrap commit, not a separate PR (Huy's
  explicit instruction: "open them with the fix PR, not separately").

## Preemption — read first

DO NOT use the `clarify` tool. Every decision needed is in this spec. If in doubt
about exact key names or class names, read the existing file and match its
convention — that is not a decision that needs escalation.

## Workflow

1. Read `.agents/summary.md`, `docs/DEBT.md` (D75 row, FE-2 reference),
   `apps/web/components/chrome/sign-in-button.tsx`,
   `apps/web/components/chrome/mobile-nav-drawer.tsx`,
   `apps/web/components/chrome/sign-in-context.tsx` (docstrings only, do not
   modify), `apps/web/messages/en.json` (`topbar` block) FIRST.
2. Load skills: `github-pr-workflow`, `systematic-debugging`,
   `requesting-code-review`.
3. Branch off **develop** (not main — this is a hotfix that must land before the
   v0.2.0 tag, per Huy): `git checkout -b fix/drawer-signin-popup origin/develop`.
4. Implement Fix 1 + Fix 1b together (they're inseparable) — commit.
5. Implement Fix 2 (popupBlocked state + message + i18n key) — commit.
6. Extend D75.b / D75.c in `docs/DEBT.md` — commit (or fold into the docs-wrap
   commit per the repo's normal convention).
7. Run gates: `pnpm --filter @corpus/web typecheck`, `pnpm --filter @corpus/web build`.
   Bypass Turborepo cache for at least one (`cd apps/web && npx --no-install tsc
   --noEmit` if the pnpm-filtered version returns suspiciously fast / fully cached).
8. Push, open PR to **develop** via `gh pr create --body-file`.

## PR body must include (Huy's explicit requirement)

- The console output BEFORE the fix (paste from this investigation — see the
  measurement report at `~/.hermes/handoffs/v0.2.0/drawer-signin-bug-measurement.md`
  if accessible, otherwise ask the dispatching session for the exact console lines)
  and AFTER the fix (capture fresh via a CDP probe or manual devtools session
  against the local dev server with `NEXT_PUBLIC_API_URL` set and the API running
  — see "Verification" below for the exact repro steps).
- A screenshot of the drawer at 488px width after tapping Sign in, with the popup
  visibly open (or, if using local dev with auth-disabled API, evidence that the
  popup target survives — see Verification).

## Verification (what the dispatching session already confirmed you can reuse)

The dispatching session (Lead) already stood up local infra to make this
measurable:
- `apps/api/.env` exists (gitignored) with local Postgres creds, NO Google OAuth
  creds — API boots in **auth-disabled mode**: `/auth/google` and `/me` both 404,
  but `window.open` still succeeds because the URL is still reachable
  (`http://localhost:3001/auth/google?...`) — Chrome doesn't care that the eventual
  response is a 404, the popup still opens as a real page target.
- Start the API: `cd apps/api && NODE_ENV=development node dist/main.js` (needs
  `dist/` built — already present in this worktree; if missing, `pnpm --filter api
  build` first).
- Start the web dev server with the env var: `cd apps/web && NEXT_PUBLIC_API_URL=
  http://localhost:3001 pnpm dev`.
- CDP probe pattern that reproduces + confirms the bug (BEFORE fix) and the repair
  (AFTER fix): launch headless Chrome with `--disable-popup-blocking
  --window-size=488,812`, connect via CDP (`ws://127.0.0.1:9222/devtools/...`),
  enable `Target.setDiscoverTargets`, click `button.mobile-nav-trigger`, locate the
  `<button>` inside `.mobile-nav-drawer-signin-wrap`, dispatch a real
  `Input.dispatchMouseEvent` click (not `.click()` — must be a real trusted-ish
  input event so `window.open` isn't blocked as non-user-gesture), and watch for
  `Target.targetCreated` (with `openerId` pointing at the page) immediately
  followed — BEFORE the fix — by `Target.targetDestroyed` for the same target
  within ~50ms. AFTER the fix, that `Target.targetDestroyed` should NOT occur
  (poll for at least 2s to confirm the popup target survives).
- Full probe scripts are on disk at `~/.hermes/cache/scratch/
  target-lifecycle-probe.mjs` and `~/.hermes/cache/scratch/
  drawer-signin-live-probe.mjs` if the dispatching session's worktree is
  accessible to you — otherwise, rewrite the pattern from this description, it's
  straightforward CDP.
- Also verify manually via the API server logs / browser devtools Network tab:
  after the fix, does a request to `/auth/google` show up (it will 404 in this
  auth-disabled local setup — that's expected and NOT a regression to chase; the
  fix is about the wrapper/unmount interaction, not about auth actually
  succeeding locally).

## Report

Write your final report to `/tmp/drawer-signin-fix-report.md`: PR URL, commit
SHAs, before/after console+target-lifecycle evidence, gate results (typecheck +
build, cache-bypassed), and explicitly confirm: (a) desktop sign-in unaffected,
(b) drawer popup now survives past the wrapper's onClose, (c) popup-blocked branch
now surfaces a message and auto-clears, (d) D75.b/D75.c added to the SAME PR.
