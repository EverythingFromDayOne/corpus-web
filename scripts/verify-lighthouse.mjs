#!/usr/bin/env node
/**
 * Stub for the planned Lighthouse budgets gate.
 *
 * The proper implementation is part of D19 in docs/DEBT.md:
 * "Site CI gates missing: verify-a11y, lighthouse-ci, Playwright screenshot
 * diffing on both article routes. Two grid bugs shipped past every existing
 * gate during POC work and were caught only by a human opening the page."
 *
 * Today's job: keep the CI runnable and let developers see a real exit-0
 * signal until D19 is closed. Once D19 lands (Lighthouse CI with budgets
 * for the article + course routes — FCP, LCP, CLS, TBT, plus a perf
 * score floor), this stub should be replaced with the real
 * implementation.
 *
 * The original CI comment that motivates this gate is preserved in
 * .github/workflows/ci.yml next to the call site:
 *
 *   # Not vanity. A site whose thesis is "everyone gets Next.js caching wrong"
 *   # loses the argument if it ships slow.
 *
 * Today's stub is the placeholder that lets the gate exist in CI without
 * being structurally-broken-and-noisy. If you are tempted to delete this
 * stub, please close D19 first.
 */

const budgets = {
  '/en': { perf: 90, fcp: 1500, lcp: 2500, cls: 0.1, tbt: 200 },
  '/en/blog': { perf: 85, fcp: 1800, lcp: 2800, cls: 0.1, tbt: 250 },
  '/en/courses/react-foundations': { perf: 85, fcp: 1800, lcp: 2800, cls: 0.1, tbt: 250 },
};

console.log('[stub:verify:lighthouse] Skipping real Lighthouse run — D19 open.');
console.log('[stub:verify:lighthouse] Would enforce these budgets (per route):');
for (const [route, b] of Object.entries(budgets)) {
  console.log(
    `  ${route}: perf≥${b.perf}, fcp≤${b.fcp}ms, lcp≤${b.lcp}ms, cls≤${b.cls}, tbt≤${b.tbt}ms`,
  );
}
console.log('[stub:verify:lighthouse] Exiting 0. Re-run after D19 closes for real coverage.');
process.exit(0);
