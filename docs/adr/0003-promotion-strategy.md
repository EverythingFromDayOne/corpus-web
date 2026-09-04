# ADR-0003: develop → main promotion strategy — squash with discipline, not merge commits

- **Status:** proposed — I decide
- **Date:** 2026-09-04
- **Deciders:** huycong2798

## Context

The corpus-web repo's promotion model is "PR from develop → main, squash-merged." PR #150 (course-hero four-edge mask) and PR #154 (PR #154 / D22 / D20 / D42 destructive merge) both followed this pattern. Both produced the same operational pain:

1. `git push origin develop` triggers a Vercel Preview deploy.
2. User reviews the Preview, visually validates, opens a PR `develop → main` via `gh pr create --base main`.
3. User squash-merges via the GitHub UI. The squash commit lands on `main` with a **single squashed commit** that has no relationship to develop's history.
4. Develop is now "N ahead of main, 1 behind." Specifically: develop has all the polish-chain commits, main has one squashed commit whose tree is identical to develop's HEAD at the time of the PR.

The pain surfaces on the *next* promotion. When PR #154 was opened against `origin/main @ 8378947` (the squash of PR #89), the PR carried 102 commits of polish since 8378947. The PR had 9 merge conflicts on the in-place canonical files (`progress.md`, `.agents/SESSION-LOG.md`, `CHANGELOG.md`, `docs/DEBT.md`, `prompts/design-spec-2026-08-blog.md`, `apps/web/app/[locale]/page.tsx`, `apps/web/app/[locale]/courses/[course]/page.tsx`, `apps/web/app/[locale]/courses/[course]/lessons/[slug]/page.tsx`, `apps/web/components/section-divider.tsx`). Every one of those conflicts was caused by the previous squash, not by the new content. Specifically:

- 7 of 9 conflicts were `.merge_file_left`/`.merge_file_right` content differences caused by append-only docs growing on develop while main held an older snapshot.
- 2 of 9 conflicts were code files where develop had landed D20 Shiki and D22 OG image edits that main did not yet have, because main was at the prior squash.

Squash-merge is a strong design choice. It keeps `main`'s log reviewable — one commit per feature, atomic, can be reverted as a unit. The cost is the recurring 9-conflict tax on every promotion. The recurring tax grows with the gap between main and develop.

The user's handoff notes record that two prior sessions guessed ADR numbers; this is the next unused slot (0000 template, 0001 angular-demos-integration, 0002 demo-labs, then 0003). This ADR lands with the fix because the next promotion will re-conflict if the model does not change.

## Options considered

**A. Switch to `--no-ff` merge commits for promotions.** Develop's history is preserved into main via a merge commit; main's log grows one commit per promotion. Conflict resolution happens at promotion time as it does today, but only once — subsequent promotions share that resolved state because both branches keep moving forward from the merge commit.

- **What it costs:** main's log is no longer atomic-per-feature. A reviewer looking at main sees long chains of session-wraps and polish commits. `git log --first-parent main` mitigates this by following only merge commits, but the noise is real. The "one commit per PR" shape on main is lost.
- **What it buys:** zero re-conflict tax on subsequent promotions. The merge commit on main matches the next develop HEAD by construction (both branches hold the merged tree), so the next PR `develop → main` is a clean fast-forward candidate. Develop and main stay synchronized; `git log origin/main..origin/develop` returns the genuinely new work, not the diff accumulated since the last squash.
- **Reversibility:** medium. Once main is on a `--no-ff` chain, going back to squash means rewriting main's history (force-push), which we don't do on `main`. If we change our minds later, we can adopt squash again on the *next* promotion — the history switch is one-way but the strategy is re-decidable per-PR.

**B. Keep squash. Hard-reset develop onto main after each promotion.** Promotion flow:

1. User squash-merges PR via GitHub UI.
2. After the squash lands on main, run `git checkout develop && git fetch origin && git reset --hard origin/main`. Develop is now an exact copy of main.
3. The next `develop`-only session commits land cleanly on top of main, no accumulated gap, no re-conflict.

- **What it costs:** the discipline step. If a session is mid-flight when the squash lands, the in-progress changes survive locally (working tree has them) but `git status` shows develop "N ahead, 1 behind" because the reset only moves develop's tip. If a session in progress is at `0e2db4c` and main just moved to `abcd123` (the squash), the next push of develop to origin requires `git push --force-with-lease` after the reset — a destructive operation against `origin/develop`. Per session protocol "Destructive operations" is a stop-and-ask trigger.
- **What it buys:** main stays clean — one commit per PR, atomic, revertible as a unit. Develop doesn't accumulate conflict debt. No re-conflict tax. Both branches agree on the canonical state.
- **Reversibility:** low. Once develop is reset onto main, the prior polish-chain commits (e.g. `0e2db4c`, `f41b5c4`, `829a688`, `37c123c`, …) are no longer reachable from develop or main. They survive on remote branches and in `git reflog` for a default of 90 days, but the canonical develop history is the post-squash state.

**C. Use `--no-ff` only on the next promotion, then re-evaluate.** Pragmatic middle ground — escape the immediate 9-conflict tax without committing to a permanent strategy.

- **What it costs:** indecision; a future promotion must re-litigate.
- **What it buys:** time to observe the operational effect of merge commits on `main` before locking in.
- **Reversibility:** high. Either branch from this state is reachable.

## Decision

**Option B — keep squash, hard-reset develop onto main after each promotion.** Rationale:

1. The user's whole repo's operating model is "main = one atomic commit per PR." That's the explicit guidance in the corpus-web-context skill ("NEVER touch `main`; user promotes") and in `AGENTS.md`'s document-authority table (`roadmap.md` "Stable. Changes only on an approved scope change"). A merge-commit chain on main contradicts this. Switching to merge commits (Option A) is a structural change that the user has not authorised; promoting with merge commits requires a separate decision per-PR.

2. The "discipline step" is one command (`git fetch origin && git reset --hard origin/main`) per promotion. It happens *after* the squash lands and *before* the next develop-only commit session starts. The window for "mid-flight sessions" is the period between "main has the new squash" and "I start the next develop session" — which is usually zero, because the user reviews and merges before opening a new task. The destructive `git push --force-with-lease` is needed only when develop has unpushed commits at reset time; in the current operating model, the develop tip gets pushed at end-of-session, the squash happens, then develop is reset — no force-push needed.

3. The conflict tax on subsequent promotions goes to zero. After `git reset --hard origin/main`, develop equals main exactly. The next `develop → main` PR is fast-forward.

The protocol:

```
# After user squash-merges a PR on GitHub:
git fetch origin
git checkout develop
git reset --hard origin/main
git status  # clean, develop == origin/main
```

When a session commits to develop and pushes, the push is a fast-forward because develop is at `origin/main`. No `--force-with-lease`. When the next promotion happens, develop is one commit ahead (the new work), main is at develop's previous tip — the PR diff is clean.

## Consequences

**Easier:** every future `develop → main` promotion is a single-commit fast-forward PR. No 9-conflict tax. `git log origin/main..origin/develop` always shows "the work since the last promotion," which is what the user actually wants to see.

**Harder:** the reset is a discipline step that must happen after every squash-merge. If the user merges a PR and then asks the agent to start a new develop-only session without first doing the reset, the agent will see "N ahead, 1 behind" and may try to push develop without resetting — which fails (non-fast-forward) or succeeds with `--force-with-lease`, depending on which side of the divergence develop is on. The agent should detect this divergence on session start and stop: `if git rev-parse origin/main != git merge-base origin/main origin/develop; then echo "develop has diverged from main — reset required"; stop; fi`.

**No longer possible without revisiting:** carrying the polish-chain commit history on develop between promotions. Each polish session's commits land on develop, get promoted as a single squash, then drop out of develop's reachable history (they survive on remote branches). This is the explicit trade-off of squash-merge. If the user wants the chain preserved, switch to Option A.

**Reversal cost:** low to switch to Option A in the future, zero to re-confirm Option B. The reset step is one command. If the user prefers merge commits later, we change the promotion action from "squash via GitHub UI" to "`gh pr merge --merge`" and the same reset step applies afterwards. History divergence between Option A and Option B histories is a non-issue: each promotion is independent.

**The argument this makes:** main's value is its atomicity — one commit per feature, revert as a unit. The polish-chain commits on develop are operational, not semantic. They document *how* the work was done; the squash captures *what* shipped. The 9-conflict tax was the operational debt leaking into the semantic log. Resetting onto main is the explicit acknowledgement that "what shipped" is what main holds, and develop's job is to build the next "what ships."

## Revisit when

Any one of:

- The reset discipline breaks more than once (e.g. two sessions in a row need `--force-with-lease` because develop has unpushed commits at reset time). The model is not surviving contact with the workflow — switch to Option A.
- A reader of `git log main` complains about the chain being too long to audit (only relevant if we change to Option A later).
- A future promotion lands 5+ commits ahead of main and the user wants the chain preserved on main for traceability — switch to Option A.
- The repo starts accepting outside contributions that need merge commits for proper attribution — Option A is the right default; revisit if this happens.
