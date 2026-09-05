# ADR-0003: develop → main promotion strategy — `--no-ff` merge commits

- **Status:** Accepted
- **Date:** 2026-09-04 (originally proposed; accepted 2026-09-04 after PR #161 promotion)
- **Deciders:** huycong2798

## Context

The corpus-web repo's promotion model is "PR from develop → main, merged at the user's call." PR #150, PR #154, PR #156, and PR #157 all followed a squash-merge pattern at the user's discretion. Every squash produced the same operational pain:

1. `git push origin develop` triggers a Vercel Preview deploy.
2. User reviews the Preview, visually validates, opens a PR `develop → main` via `gh pr create --base main`.
3. User squash-merges via `gh pr merge --squash` (or the GitHub UI). The squash commit lands on `main` with a **single squashed commit** that has no relationship to develop's history.
4. Develop is now "N ahead of main, 1 behind." Specifically: develop has all the polish-chain commits, main has one squashed commit whose tree is identical to develop's HEAD at the time of the PR.

The pain surfaces on the *next* promotion. When PR #154 was opened against `origin/main @ 8378947` (the squash of PR #89), the PR carried 102 commits of polish since 8378947 and had **9 merge conflicts** on the in-place canonical files. PR #156 had **6 conflicts**. PR #161 (this promotion) had **3 conflicts**. Every one of those conflicts was caused by the previous squash, not by the new content. Specifically:

- Most conflicts were content differences caused by append-only docs (`SESSION-LOG.md`, `CHANGELOG.md`) growing on develop while main held an older snapshot, plus the in-place canonical files (`progress.md`, `.agents/summary.md`, `docs/DEBT.md`) being edited on develop after main was last frozen.
- Code-file conflicts came from develop landing changes (D20 Shiki, D22 OG image, favicon set, etc.) that main did not yet have, because main was at the prior squash.

Squash-merge was the de-facto strategy for three weeks. It kept `main`'s log reviewable — one commit per feature, atomic, revertible as a unit. The cost was the recurring conflict tax on every promotion.

## Why the de-facto strategy was squash, not merge commits — the mechanism we missed

When this ADR was originally drafted, the "Conflict tax" section framed the problem as "the previous squash caused the next promotion to conflict." That framing was correct, but it identified the *symptom*, not the *cause*.

The actual mechanism was a **branch protection rule** on `main` that nobody had surfaced: `required_linear_history: true`. With `required_linear_history` enabled, GitHub rejects merge commits into `main`, even with `--admin` privileges. The repo-level `allow_merge_commit: true` was set; the branch-protection rule overrode it.

What this meant in practice:

- Every promotion attempt to use `--no-ff` was refused at the GitHub API layer with `GraphQL: Merge commits are not allowed on this repository. (mergePullRequest)`.
- The only merge strategies GitHub allowed on `main` were squash-merge and rebase-merge.
- Squash-merge was the simpler of the two (no upstream rebase step), so it became the de-facto strategy by elimination — not by decision.
- The original ADR-0003 framed the squash vs merge-commit trade-off as a deliberate choice with the user ("user authorizes each promotion's strategy"). It missed that the squash path was being forced by branch protection.

Why this matters: turning `required_linear_history` back on after PR #161 would re-create the exact situation ADR-0003 originally documented as "the symptom" — every future promotion hits the API refusal, every conflict-recurrence cost comes back. The rule is now disabled on `main` and stays disabled.

## Options considered

**A. Switch to `--no-ff` merge commits for promotions.** Develop's history is preserved into main via a merge commit; main's log grows one commit per promotion. Conflict resolution happens at promotion time as it does today, but only once — subsequent promotions share that resolved state because both branches keep moving forward from the merge commit.

- **What it costs:** main's log is no longer atomic-per-feature. A reviewer looking at main sees long chains of session-wraps and polish commits. `git log --first-parent main` mitigates this by following only merge commits, but the noise is real. The "one commit per PR" shape on main is lost.
- **What it buys:** zero re-conflict tax on subsequent promotions. The merge commit on main matches the next develop HEAD by construction (both branches hold the merged tree), so the next PR `develop → main` is a clean fast-forward candidate. Develop and main stay synchronized; `git log origin/main..origin/develop` returns the genuinely new work, not the diff accumulated since the last squash. Audit trail: every promotion shows up as a merge commit with explicit parents.
- **Reversibility:** medium. Once main is on a `--no-ff` chain, going back to squash means rewriting main's history (force-push), which we don't do on `main`. If we change our minds later, we can adopt squash again on the *next* promotion — the history switch is one-way but the strategy is re-decidable per-PR.

**B. Keep squash. Hard-reset develop onto main after each promotion.** Promotion flow:

1. User squash-merges PR via GitHub UI (or `gh pr merge --squash --admin`).
2. After the squash lands on main, run `git checkout develop && git fetch origin && git reset --hard origin/main`. Develop is now an exact copy of main.
3. The next `develop`-only session commits land cleanly on top of main, no accumulated gap, no re-conflict.

- **What it costs:** the discipline step. If a session is mid-flight when the squash lands, the in-progress changes survive locally (working tree has them) but `git status` shows develop "N ahead, 1 behind" because the reset only moves develop's tip. If a session in progress is at `0e2db4c` and main just moved to `abcd123` (the squash), the next push of develop to origin requires `git push --force-with-lease` after the reset — a destructive operation against `origin/develop`. Per session protocol "Destructive operations" is a stop-and-ask trigger.
- **What it buys:** main stays clean — one commit per PR, atomic, revertible as a unit. Develop doesn't accumulate conflict debt. No re-conflict tax. Both branches agree on the canonical state.
- **Reversibility:** low. Once develop is reset onto main, the prior polish-chain commits (e.g. `0e2db4c`, `f41b5c4`, `829a688`, `37c123c`, …) are no longer reachable from develop or main. They survive on remote branches and in `git reflog` for a default of 90 days, but the canonical develop history is the post-squash state.
- **Why this stopped being the answer:** Option B was the original ADR-0003 decision (the document this replaces). In practice, the "discipline step" was forgotten between promotions — `develop` stayed ahead of `main` for three weeks straight because no agent or session re-set it. The conflict tax kept coming back. The hidden mechanism (`required_linear_history`) was forcing squash-merge at the API layer anyway, so the discipline step was happening *implicitly* (the squash made develop diverge, then the reset was the only way to clean it up) — but nobody noticed because the reset was never executed.

**C. Use `--no-ff` only on the next promotion, then re-evaluate.** Pragmatic middle ground — escape the immediate 9-conflict tax without committing to a permanent strategy.

- **What it costs:** indecision; a future promotion must re-litigate.
- **What it buys:** time to observe the operational effect of merge commits on `main` before locking in.
- **Reversibility:** high. Either branch from this state is reachable.

## Decision

**Option A — `--no-ff` merge commits for promotions.**

The original Option B was the right call under a stable operational discipline (always-reset-after-squash). In practice, the discipline broke — develop stayed ahead of main for three weeks, the conflict tax kept recurring, and the underlying mechanism (`required_linear_history`) was forcing squash-merge at the GitHub API layer regardless. Squashing was the symptom-mitigation; merge commits with `required_linear_history` disabled are the root-cause fix.

Switching to merge commits is now possible because the constraint that prevented it has been removed (`required_linear_history` is disabled on `main` and stays disabled per the user's standing decision on PR #161). Once the option is genuinely available, the trade-offs favour Option A:

1. **No silent failure mode.** Option B's discipline step (`git reset --hard origin/main`) was the part that broke in practice — it required remembering to reset after every squash, and agents (per their protocol) push to develop without asking. A strategy that fails silently when someone forgets is the wrong strategy. Option A has no equivalent forgetting step.

2. **Audit trail.** Every promotion shows up as a merge commit with explicit parents (`origin/main` HEAD + `origin/develop` HEAD). `git log --first-parent main` gives the chain of promotions; `git log --graph main` gives the full chain. The previous strategy erased the audit trail on every promotion by collapsing 100+ commits into one squash.

3. **Zero re-conflict tax.** Option A's only recurring cost is at promotion time (3 conflicts on PR #161, vs 6 on PR #156 vs 9 on PR #154). The conflict resolution lives on the merge commit; both branches advance from the merged state.

4. **The user's reasoning.** Quoted from the PR #161 handoff: *"Option B depends on remembering a reset step after every promotion, and agents push to develop without asking. A strategy that fails silently when someone forgets is the wrong [strategy]."*

The protocol:

```
# Promotion flow (user or agent with --admin authorisation):
1. Verify Content gates — D46 must be the only red check (or
   the user has explicitly authorised --admin for the
   remaining reds).
2. On develop, merge origin/main locally; resolve any
   conflicts toward develop (per PR #156 + PR #161 pattern).
3. Commit the resolution on develop; push develop.
4. Open PR develop → main with a per-file conflict-resolution
   table in the body.
5. Merge with: gh pr merge <N> --admin -m -F <body>.
   -m flag = create a merge commit (NOT --squash).
   --admin flag = override branch protection. With
   required_linear_history disabled, this only matters for
   the case where Content gates fail with D46-only.
6. Confirm Vercel deploys main.
7. Run the post-promotion curl checks against the production
   alias (see PR #161 for the four-check pattern).
8. Tag the merge commit per the user's release-naming scheme.
```

## Consequences

**Easier:** every future `develop → main` promotion is a merge-commit PR. Conflict resolution lives on the merge commit; both branches keep moving forward from it. `git log origin/main..origin/develop` always shows "the work since the last promotion." Audit trail: `git log --first-parent main` gives the chain of promotions; `git log --graph main` gives the full chain.

**Harder:** the merge commit on `main` carries all of develop's polish-chain history. Reviewers of `main` see long chains. `git log --first-parent main` is the recommended view for "what shipped at each promotion." The single-commit-per-PR shape on `main` is gone.

**Operational constraints now in place:**

- `branch protection: main.required_linear_history: false` (disabled on PR #161 merge, stays off per user decision).
- `branch protection: main.enforce_admins: true` (unchanged — admins cannot bypass required checks, only merge mechanics).
- `branch protection: main.required_status_checks: []` (no CI gate enforced at the protection layer; gates run via `pnpm verify:*` locally before promotion).
- `repo: allow_merge_commit: true` (already true; was always true).
- `repo: allow_squash_merge: true`, `allow_rebase_merge: true` (unchanged — still permitted, just not the de-facto choice).

**What is NOT reset after a merge:** develop stays ahead of main by the chain of `develop → main` PRs that landed since the last merge. The user has explicitly reserved `git checkout develop && git reset --hard origin/main` for themselves ("Do not reset develop onto main. That one waits for me."). Each promotion adds to develop's chain; `git log origin/main..origin/develop` shows the genuinely new work between promotions.

## Revisit when

Any one of:

- A reader of `git log --first-parent main` complains about the chain being too long to audit (mitigated by the `--first-parent` view but the noise is real).
- A future promotion lands 50+ commits ahead of main and the merge commit becomes unwieldy (use `git merge --squash` on the local merge step, but keep the `--no-ff` GitHub merge).
- The repo starts accepting outside contributions that need merge commits for proper attribution — Option A is already the right default.
- A future operational constraint (Vercel deploy hook, branch-protection policy from the organisation admin) re-introduces the silent-failure mode Option A is designed to avoid.

## Implementation history

- **2026-09-04 (this document):** Status flipped from `proposed` to `Accepted`. `required_linear_history` discovered as the mechanism that forced squash-merge at the GitHub API layer; disabled on `main` via `gh api -X PUT repos/.../branches/main/protection -d '{"required_linear_history": false, ...}'` (the PATCH endpoint returned 404 against this repo; PUT with the full body worked). PR #161 (develop → main, the first `Option A` promotion) merged with `gh pr merge 161 --admin -m -F <body>` on 2026-09-04, producing merge commit `16fecf7` (parents `d38b2a0` + `9f5b99a`).
- **2026-09-04 (earlier session 165 wrap):** ADR originally proposed with `Option B` as the decision. Branch-protection rule not yet understood as the cause; symptom (recurring conflict tax) attributed to "no discipline on the reset step."
- **2026-09-04 (PR #155, chore/session-165-wrap):** First authoring of this ADR.
