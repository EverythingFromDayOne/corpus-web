## What does this PR claim, and what checks that claim against reality?

A 1–3 sentence summary of the visible / behavioural change, followed by:

- **Claim 1:** <one sentence>
  - **Check:** <one specific, reproducible verification — a screenshot path, a `pnpm verify:ui-evidence` line, a manual CDP probe, a story link, etc.>
- **Claim 2:** <...>
- ... (as many as the change warrants; usually 1–3 for chrome, up to 5 for substantive features)

This is the first section of every PR. The check column is non-negotiable — "looks good in Vercel preview" or "eyeballed it" is a feeling, not a check. A real check is something another developer can run / look at / open and confirm. UI PRs that touch chrome require `pnpm verify:ui-evidence` output and screenshots in the body (see `.cursor/rules/30-ui-changes.mdc`).

## Description

<the rest of the description goes here — what, why, context, links to issues / dispatches, design references, "what did you consider and reject", etc.>

## Type of change

- [ ] Bug fix (non-breaking; fixes an issue)
- [ ] New feature (non-breaking; adds functionality)
- [ ] Breaking change (existing behaviour changes)
- [ ] Refactor (no functional change)
- [ ] Documentation only
- [ ] Process / tooling (no runtime impact)

## Verified

Replace each dash below with the exact check you ran. Hand-typed or copy-pasted command output is encouraged for non-trivial checks. "Looks good" does not satisfy this column.

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm verify:ui-evidence` (required for UI PRs; paste output below)
- [ ] Other gates relevant to the change: <list them>

## Screenshots (UI PRs only)

- Desktop ≥1280:
- Tablet 768 (if the change targets tablet):
- Mobile 375:
- "Before" contrast (screenshot, or inline diff vs PR's base branch):

## Out of scope

Bulleted list of things considered and **intentionally not** done in this PR. Useful for reviewers to know "we noticed X but didn't include it — that's by design, here's a debt row / follow-up."
