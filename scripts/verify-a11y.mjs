#!/usr/bin/env node
/**
 * Stub for the planned accessibility test gate.
 *
 * The proper implementation is tracked as D19 in docs/DEBT.md:
 * "Site CI gates missing: verify-a11y, lighthouse-ci, Playwright screenshot
 * diffing on both article routes. Two grid bugs shipped past every existing
 * gate during POC work and were caught only by a human opening the page.
 * Tension to resolve when picked up: axe's WCAG 2.2 `target-size` rule
 * fails the rail's 18×2px ticks, so "axe clean" and "matches the POC"
 * may be mutually exclusive."
 *
 * Today's job: keep the CI runnable and let developers see a real exit-0
 * signal until D19 is closed. Once D19 lands (axe-core integration with
 * explicit rule exemptions for the rail ticks, plus Playwright on the
 * article routes), this stub should be replaced with the real
 * implementation. The whole point of the stub is to be obviously-stubby
 * (clear messages + non-zero risk of leaving it in by accident).
 *
 * Until then: every PR's "Accessibility and performance" check is a
 * no-op-as-far-as-accessibility-goes but is still useful as a wiring
 * smoke test (the job installs deps, builds the app, and proves the
 * route patterns the axe-on-PR step will eventually sample exist).
 */

const samples = [
  '/en',
  '/en/blog',
  '/en/courses',
  '/en/blog/react/suspense',
];

console.log('[stub:verify:a11y] Skipping real a11y check — D19 open.');
console.log(`[stub:verify:a11y] Would sample ${samples.length} route(s):`);
for (const route of samples) {
  console.log(`  - ${route}`);
}
console.log('[stub:verify:a11y] Exiting 0. Re-run after D19 closes for real coverage.');
process.exit(0);
