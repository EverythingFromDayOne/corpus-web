# fix/drawer-signin-popup — ROUND 3: regression tests for the two paths Huy named

## Context

This is Round 3 on the SAME branch (`fix/drawer-signin-popup`, PR #207,
currently 3 fix commits + 1 docs commit: `3757bb9`, `1395d97`, `8456d07`,
`faf4827`, `b51cbc1`). Round 1 fixed the drawer popup self-destruct bug.
Round 2 fixed a cancel-path stuck-state that Round 1 unmasked. Both rounds
were CDP-verified live but have ZERO unit-test coverage. Huy reviewed the
CDP evidence, accepted it, and asked for two specific tests before merging:

> "The popup-blocked branch is the one path nobody can catch by eye: it only
> runs when a browser blocks the popup, and the consequence is a user who
> can't sign in staring at a permanently stuck button. That is exactly the
> bug we just fixed. If it comes back, nothing surfaces it.
>
> And it's cheap: call the handler with window.open stubbed to return null,
> assert processing goes back to false and the label returns to 'Sign in'.
> No browser, no new dependency, no CDP.
>
> Round 3, small:
> - That test.
> - One more in the same file: window.open returns a window, then the popup
>   reports closed → the button returns to 'Sign in' after the debounce.
>   That guards the path you measured at 5525ms, so a future change to the
>   watcher can't silently reopen the stuck state.
> Both drive the real exported handler, not a re-implementation in the test."

**Scope is exactly these two tests. Nothing else.** Do not touch runtime
behavior. Do not add more tests beyond these two. Do not refactor anything
not strictly required to make these two tests drive the REAL handler.

## The constraint that makes this non-trivial: no DOM/React test infra

`apps/web`'s only test runner is Node's built-in `node --test` (see
`apps/web/package.json` `"test"` script:
`TZ=Asia/Ho_Chi_Minh node --import tsx --test test/*.test.ts`). There is
**no jsdom, no happy-dom, no react-test-renderer** installed anywhere in
this repo (confirmed via `grep -rn "jsdom\|react-test-renderer\|happy-dom"
package.json apps/web/package.json` — zero matches). Installing one is
gated by the "Stop and ask" rule in `.cursor/rules/00-session-protocol.mdc`
(new dependency) — **do not add one**. This is not new information: the
existing test file documents the exact same constraint.

### The established pattern for this exact problem: `sign-in-once-per-mount.test.ts`

Read `apps/web/test/chrome/sign-in-once-per-mount.test.ts` in full before
writing anything. It solves the identical problem (need to test logic that
lives inside a React hook-driven module, no DOM renderer available) by:

1. The module (`sign-in-context.tsx`) exports `fetchMe` as a **plain,
   standalone async function** — no hooks, no JSX, no closure over React
   state. It's just a function that calls `fetch` and returns a value.
2. The test imports `fetchMe` directly (`await import('../../components/chrome/sign-in-context')`)
   and calls it as a normal function, stubbing `globalThis.fetch`.
3. The test's own header comment names the trade-off explicitly: this
   doesn't test the *React-mount lifecycle* (that needs a renderer), it
   tests the *lower-level logic* that causes the regression class. That's
   accepted as sufficient, on the record, per Lead's prior dispatch.

**You must follow the same pattern for these two tests.** `handleClick`'s
window-open-null branch and `watchPopup`'s close-detect-then-debounce logic
currently live as closures inside `SignInButton` (a function component using
`useState`/`useContext`) and `SignInProvider` (a function component using
`useState`/`useCallback`/`useRef`) respectively. Neither is callable outside
a React render today. To satisfy "drive the real exported handler, not a
re-implementation in the test", you need to:

- Extract the **pure decision logic** for each path into a standalone,
  exported, hook-free function — the same shape as `fetchMe`.
- The React component/provider then calls that extracted function from
  inside its existing effect/handler, passing in whatever state it currently
  captures via closure (i.e. the extracted function takes explicit
  parameters instead of reading React state via closure).
- The test imports the extracted function directly and calls it, the same
  way the existing test imports and calls `fetchMe`.

This must be judged as "the real logic, minimally reshaped to be callable
outside React" — NOT "a parallel reimplementation that happens to test the
same thing". If you extract a function and the component still contains a
second copy of the same branching logic, that is a re-implementation and
fails Huy's bar. The extracted function must be the ONLY place the decision
logic exists; the component/provider must call it, not duplicate it.

## Test 1 — `window.open` returns null → processing reverts, label returns to "Sign in"

**What to extract:** the branch in `openAuthPopup` / `handleClick`
(`apps/web/components/chrome/sign-in-button.tsx`) that currently does,
roughly: call `window.open(...)`, and if the result is falsy, immediately
reset `processing` to `false` and set the popup-blocked message (added in
Round 1, commit `1395d97` — search for `topbar.signInBlocked` /
`setPopupBlocked` / `POPUP_BLOCKED` in that file to find the exact current
shape before touching it).

**Suggested extraction shape** (adapt to what you find in the real code —
this is illustrative, not prescriptive):

```ts
// Pure, hook-free — the ONLY place this decision is made.
// Exported so the test can drive it directly, per the fetchMe pattern.
export function resolvePopupOpenOutcome(openResult: Window | null): {
  processing: boolean;
  popupBlocked: boolean;
} {
  if (openResult === null) {
    return { processing: false, popupBlocked: true };
  }
  return { processing: true, popupBlocked: false };
}
```

The component then calls this from inside `handleClick`/`openAuthPopup` and
applies the returned values via its existing `setProcessing` /
`setPopupBlocked` (or whatever the current state setter names are — check
the file, do not assume these exact names match Round 1's code). Do not
change what the component actually does — only pull the branching decision
out into a testable pure function that the component consults instead of
inlining the `if` block.

**Test:**

```ts
// apps/web/test/chrome/sign-in-once-per-mount.test.ts (SAME FILE — see
// "Where the tests go" below) or a new file — your call, see that section.

it('window.open returning null resolves to processing=false, popupBlocked=true', async () => {
  const { resolvePopupOpenOutcome } = await import('../../components/chrome/sign-in-button');
  const result = resolvePopupOpenOutcome(null);
  assert.equal(result.processing, false, 'processing must NOT stay stuck true');
  assert.equal(result.popupBlocked, true, 'popup-blocked message must be surfaced');
});

it('window.open returning a window resolves to processing=true, popupBlocked=false', async () => {
  const { resolvePopupOpenOutcome } = await import('../../components/chrome/sign-in-button');
  const fakeWindow = {} as Window; // opaque handle — only truthiness matters to this function
  const result = resolvePopupOpenOutcome(fakeWindow);
  assert.equal(result.processing, true);
  assert.equal(result.popupBlocked, false);
});
```

(Second case included so the extracted function's full branch coverage is
tested, not just the null path — still counts as "that test" from Huy's
list; it's the same function, opposite branch.)

## Test 2 — popup opens, then reports closed → button returns to "Sign in" after the debounce

**What to extract:** the debounce logic currently in `watchPopup`
(`apps/web/components/chrome/sign-in-context.tsx`, commit `faf4827`) —
specifically the part that: (a) polls `popup.closed` at
`CLOSE_WATCH_INTERVAL_MS` (250ms), (b) on detecting `closed === true`, waits
`POST_CLOSE_DEBOUNCE_MS` (5000ms) before reverting `processing` to `false`
(unless the success path already flipped it).

This one is harder to make hook-free because it's inherently time-based and
currently uses `window.setInterval`/`setTimeout` closures over component
refs. Do NOT try to extract the entire `watchPopup` function verbatim — that
would drag `useRef`/`useState` along with it. Instead:

- Extract the **pure state-transition logic**: given "popup is closed" and
  "processing is currently true", what should happen after the debounce
  fires? This is likely already a tiny piece of logic
  (`if (!processingRef.current) return; setProcessing(false); ...`) that
  can be pulled into a standalone function taking the current `processing`
  value as a parameter and returning what the new state should be — same
  shape as Test 1's extraction.
- For the TIMING behavior (poll interval + debounce actually elapsing), use
  Node's fake timers or a manually-injectable clock, NOT real 5-second
  `setTimeout` waits in the test (that would make the suite slow and flaky).
  Node's built-in `node:test` supports `mock.timers` (`node:test`'s
  `t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })` — check
  your Node version supports it; this repo's `apps/web` runs on the
  project's pinned Node version, verify via `node --version` before relying
  on `mock.timers`). If `mock.timers` isn't available/reliable, an
  acceptable fallback is to extract the **decision function** (see above)
  and test IT directly without going through real timers at all — i.e. call
  the extracted "what happens when debounce fires" function directly with
  `processing=true` as input, assert it returns `processing: false`. This
  still satisfies "drive the real exported handler, not a re-implementation"
  because the component/provider calls that same extracted function when
  its real `setTimeout` fires — you're just not also re-testing that
  `setTimeout` itself works (that's the JS runtime's job, not yours).

**Suggested extraction shape** (again illustrative — adapt to the real
code):

```ts
// Pure, hook-free.
export function resolvePostCloseRevert(currentlyProcessing: boolean): {
  processing: boolean;
} {
  if (!currentlyProcessing) {
    // Success path already won the race — no-op, matches the
    // `processingRef.current` guard in watchPopup's interval callback.
    return { processing: currentlyProcessing };
  }
  return { processing: false };
}
```

**Test:**

```ts
it('popup closing while processing=true resolves to processing=false (the 5525ms-measured revert)', async () => {
  const { resolvePostCloseRevert } = await import('../../components/chrome/sign-in-context');
  const result = resolvePostCloseRevert(true);
  assert.equal(result.processing, false, 'must revert — this is the path CDP-measured at close+5525ms');
});

it('popup closing while processing=false (success path already won the race) is a no-op', async () => {
  const { resolvePostCloseRevert } = await import('../../components/chrome/sign-in-context');
  const result = resolvePostCloseRevert(false);
  assert.equal(result.processing, false, 'stays false — no double-revert, guards the D58 double-revert race class');
});
```

If you find a cleaner way to drive this that exercises the REAL 250ms
poll + 5000ms debounce timing (e.g. `mock.timers` works cleanly on this
repo's Node version), prefer that over the simplified extraction above —
it's a stronger test. Use your judgment; document which approach you took
and why in the commit message. The one hard requirement: whichever shape
you pick, it must be the code the component ACTUALLY calls at runtime, not
a parallel copy.

## Where the tests go

Two options, your call:
1. Add both new `it(...)` blocks to the existing
   `apps/web/test/chrome/sign-in-once-per-mount.test.ts` file (rename the
   outer `describe` if it no longer accurately scopes to "D58 chrome-flow
   smoke" — e.g. broaden to "sign-in chrome-flow regression tests" since it
   now covers more than D58).
2. New file `apps/web/test/chrome/sign-in-popup-recovery.test.ts` following
   the exact same imports/style as the existing file.

Prefer option 2 (new file) unless the existing file's `describe` block is a
natural fit — keeps each file's blast radius small and the existing D58
pin's history clean. Your call; state which you picked and why.

## Hard constraints — do not violate

- **Both tests must import and call the REAL extracted function from the
  REAL component/provider file** — `sign-in-button.tsx` and
  `sign-in-context.tsx` respectively. Do not write a mock/stub
  reimplementation of the logic inside the test file. This is Huy's
  explicit bar: "Both drive the real exported handler, not a
  re-implementation in the test."
- **Do not change any runtime behavior.** The extraction must be a pure
  refactor: pull the existing `if`/branch logic into a named exported
  function, call that function from the exact same call site with the exact
  same inputs, apply the exact same state-setter calls with its output.
  Zero behavior change.
- **After the refactor, re-verify BOTH CDP paths still hold** — do not trust
  the unit tests alone to prove the refactor is behavior-preserving for the
  live-browser case. Bring up the local infra exactly as prior rounds did:
  - `apps/api`: copy `.env` from an existing worktree if needed (DB creds
    `corpus / corpus_dev_only / corpus_api` on `:5432`, see
    `docker-compose.yml` / `.env.example`), `pnpm --filter api build`, run
    `node dist/main.js` on `:3001`.
  - `apps/web`: `NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev` on
    `:3000`.
  - Chrome headless on `:9222` with `--disable-popup-blocking
    --window-size=488,812`.
  - Re-run `~/.hermes/cache/scratch/target-lifecycle-probe.mjs` (handoff
    survival — must show zero `Target.targetDestroyed` for the popup
    target) and `~/.hermes/cache/scratch/timing-breakdown-probe.mjs`
    (cancel-path revert timing — must land at ~5525ms ± a few hundred ms,
    NOT drift to 11s+ or regress to "never revert"). Both scripts already
    exist and worked in Round 1/2 — do not rewrite them, just re-run them.
  - Paste the real probe output in your final report. Do not claim "still
    passes" without pasting the actual console output.
- **Gates:** `pnpm --filter @corpus/web typecheck`, `pnpm --filter @corpus/web lint`,
  `pnpm --filter @corpus/web build`, and
  `cd apps/web && TZ=Asia/Ho_Chi_Minh node --import tsx --test test/*.test.ts`
  must all exit 0. Paste the test summary line showing the new tests ran
  and passed (e.g. `# pass N`).
- **Commit on the SAME branch** (`fix/drawer-signin-popup`), do not create a
  new branch or new PR. This is still PR #207.
- **Debt row:** open `D75.d` (append-only, current highest is `D75.c`,
  confirm via `head -10 docs/DEBT.md` before writing — do not assume the ID
  is still `D75.c` if something changed it). Content: the remainder of the
  click→popup→auth-state path still has no regression coverage beyond these
  two extracted-function tests — specifically: (a) the full React
  event-handler wiring (does clicking the actual rendered button call
  `handleClick` at all — untested, no DOM renderer available), (b) the real
  250ms-poll/5000ms-debounce timing end-to-end (only tested via the
  extracted decision function, not via real timers, unless you used
  `mock.timers` successfully — adjust this row's wording based on what you
  actually did), (c) the `onSignInStarted`/`stopPropagation`
  drawer-close-ordering fix from Round 1 (CDP-verified, zero unit coverage).
  Cite the real file paths and line numbers. This is a genuine, currently-true
  gap — do not undersell or oversell it.
- **PR body:** append a section (do not remove/rewrite existing content)
  titled "Round 3 — regression test coverage" noting, verbatim in spirit:
  *"The only sign-in test that existed before this PR was
  `sign-in-once-per-mount.test.ts`, covering `fetchMe`'s mount guard. The
  entire click → popup → auth-state path had zero regression coverage.
  Round 3 adds two extracted-function tests covering the window.open-null
  path and the post-close-debounce revert path; the rest (React event-wiring,
  real timer behavior, Round 1's stopPropagation ordering) is tracked as
  D75.d."* Adjust exact wording once you know what Round 3 actually shipped,
  but the substance (only 1 test existed before, entire path uncovered,
  Round 3 covers 2 specific paths, rest is D75.d) must be there — Huy asked
  for this note explicitly.
- **Session log:** append a `## Session 226c` entry to `.agents/SESSION-LOG.md`
  in the same style as the existing `## Session 226` / `## Session 226b`
  entries (read them first for the exact format/sections used).

## What NOT to touch

- No changes to `mobile-nav-drawer.tsx`, `globals.css`, `messages/en.json`
  beyond what's already committed in Rounds 1/2.
- No new npm/pnpm dependencies. No jsdom/react-test-renderer.
- No changes to `POST_CLOSE_DEBOUNCE_MS` / `CLOSE_WATCH_INTERVAL_MS` values.
- No changes to the D75/D75.b/D75.c rows already in `docs/DEBT.md` — only
  append D75.d.

## Report format

At the end, write a self-report (to `/tmp/drawer-signin-fix-round3-report.md`
is fine, matches prior rounds) covering: which extraction shape you used for
each test and why, whether `mock.timers` worked or you used the simplified
decision-function approach, the full gate output (typecheck/lint/build/test),
the full CDP re-verification output for BOTH probes (paste it, don't
summarize it), the exact commit hash(es), and confirmation the PR body +
DEBT.md + SESSION-LOG.md are updated and pushed.
