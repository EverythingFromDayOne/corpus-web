/**
 * D75 Round 3 — regression tests for the two paths Huy asked for after
 * reviewing the Round 1/2 CDP evidence on PR #207.
 *
 * Background: Round 1 fixed the drawer popup self-destruct (PR #206).
 * Round 2 fixed a cancel-path stuck-state that Round 1 unmasked. Both
 * rounds were CDP-verified live but had ZERO unit-test coverage.
 *
 * The two paths this file covers:
 *   1. `window.open` returns `null` (browser blocked the popup) →
 *      `processing` MUST stay `false` (so the user can retry) and
 *      `popupBlocked` MUST flip `true` (so the inline "Sign in
 *      blocked" message renders). This was the exact stuck-button
 *      bug Huy was worried about.
 *   2. Popup closes while `processing` is still `true` → after the
 *      5 s post-close debounce, `processing` MUST revert to `false`.
 *      This guards the path CDP-measured at close+5525ms; a future
 *      change to the provider's watcher that silently re-opens the
 *      stuck state must fail here.
 *
 * Faithfulness trade-off (same as
 * `apps/web/test/chrome/sign-in-once-per-mount.test.ts`): faithfully
 * testing the React event-wiring (`handleClick` → `openAuthPopup` →
 * `setProcessing`/`setPopupBlocked`/`watchPopup`) requires a DOM
 * renderer + `react-test-renderer`. Neither is installed in
 * `apps/web`; installing one is gated by the `Stop and ask` rule in
 * `.cursor/rules/00-session-protocol.mdc`. The component's event
 * wiring is verified by manual Vercel click-through (D75.b). This
 * file pins the two extracted pure decision functions that the
 * component consults at runtime — the component itself contains no
 * branching logic for these paths; it forwards the extracted
 * function's result to its setters.
 *
 * Run with `pnpm --filter @corpus/web test` (the existing glob is
 * apps/web/test/*.test.ts which does NOT recursively match this
 * chrome/ subdir per bash default behaviour; the existing
 * sign-in-once-per-mount.test.ts ALSO lives here and has the same
 * caveat — both must be invoked explicitly, e.g.:
 *   cd apps/web && TZ=Asia/Ho_Chi_Minh node --import tsx --test \
 *     test/chrome/sign-in-popup-recovery.test.ts
 * to run just this file. Surfaced as D75.d.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('sign-in popup recovery — D75 Round 3 extracted decision functions', () => {
  describe('resolvePopupOpenOutcome (sign-in-button.tsx, window.open null branch)', () => {
    it('window.open returning null resolves to processing=false, popupBlocked=true', async () => {
      // Late import after any global setup; mirrors the established
      // pattern in `sign-in-once-per-mount.test.ts` so the test can
      // stub `globalThis.fetch`/etc. before the module's closure
      // captures them — even though this function reads no globals
      // (it's pure), the late-import keeps the surface consistent.
      const { resolvePopupOpenOutcome } = await import(
        '../../components/chrome/sign-in-button'
      );
      const result = resolvePopupOpenOutcome(null);
      assert.equal(
        result.processing,
        false,
        'processing must NOT stay stuck true on popup-blocked branch — that was the original stuck-button bug',
      );
      assert.equal(
        result.popupBlocked,
        true,
        'popup-blocked inline message MUST be surfaced — user clicked, nothing happened, needs feedback',
      );
    });

    it('window.open returning a window resolves to processing=true, popupBlocked=false', async () => {
      const { resolvePopupOpenOutcome } = await import(
        '../../components/chrome/sign-in-button'
      );
      // Opaque handle — only truthiness matters to this function.
      // `resolvePopupOpenOutcome` reads `=== null`, so any non-null
      // Window-like object exercises the success branch.
      const fakeWindow = {} as Window;
      const result = resolvePopupOpenOutcome(fakeWindow);
      assert.equal(
        result.processing,
        true,
        'successful popup-open MUST flip processing=true (button label → "Signing in…")',
      );
      assert.equal(
        result.popupBlocked,
        false,
        'successful popup-open MUST clear any stale popup-blocked message from a previous click',
      );
    });
  });

  describe('resolvePostCloseRevert (sign-in-context.tsx, 5 s cancel-path debounce)', () => {
    it('popup closing while processing=true resolves to processing=false (the close+5525ms revert)', async () => {
      const { resolvePostCloseRevert } = await import(
        '../../components/chrome/sign-in-context'
      );
      const result = resolvePostCloseRevert(true);
      assert.equal(
        result.processing,
        false,
        'must revert — this is the path CDP-measured at close+5525ms in Round 2 (cancel-by-user); if the watcher is ever broken to skip the debounce, this turns true',
      );
      assert.equal(
        result.popupObservedClosed,
        false,
        'close-watcher observation flag MUST reset so the next click starts fresh',
      );
    });

    it('popup closing while processing=false (success path already won the race) is a no-op on processing', async () => {
      const { resolvePostCloseRevert } = await import(
        '../../components/chrome/sign-in-context'
      );
      const result = resolvePostCloseRevert(false);
      assert.equal(
        result.processing,
        false,
        'stays false — no double-revert; the postMessage success path already wrote false, this branch must not flip it again (regression guard against the D58-class double-write race)',
      );
      assert.equal(
        result.popupObservedClosed,
        false,
        'close-watcher observation flag is still cleared so the next click can register fresh',
      );
    });
  });
});