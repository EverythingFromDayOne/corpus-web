# Cursor task — documentation architecture refactor

Run in `corpus-web`, before session 3. Mechanical restructuring plus two small rule
additions. **Do not merge.**

---

## 1. Add the README

`README.md` is provided separately and goes at the repo root unchanged. Verify every
relative link in it resolves to a real path, and correct any that do not — the file
was authored outside the repo and paths are the one thing that could be stale.

## 2. Extract the debt register into `docs/DEBT.md`

The register currently lives inside `progress.md`, which mixes three concerns: phase
status, debt, and a session summary. Debt is the most-consulted artifact in the repo
and has its own lifecycle, so it gets its own file.

Move every debt row out of `progress.md` into `docs/DEBT.md`, preserving IDs exactly.
Do not renumber, do not merge rows, do not drop anything.

Give the new file this shape:

```markdown
# Debt register

Known gaps. IDs are **append-only and never reused** — a closed item keeps its
number and its row, marked closed.

**Highest ID issued: D<n>**

## Open

| ID | Item | Impact if unresolved | Blocks | Opened |
|----|------|----------------------|--------|--------|

## Closed

| ID | Item | Closed by | Date |
|----|------|-----------|------|
```

Then leave in `progress.md` a one-line pointer where the register used to be:
`Debt register moved to docs/DEBT.md.`

`progress.md` keeps phase tables, measured counts, and the session summary list.

## 3. Sharpen the SESSION-LOG / CHANGELOG boundary

Both files are append-only and every session writes to both, currently with heavily
overlapping prose. Halve the duplication by making the split explicit in
`.cursor/rules/00-session-protocol.mdc`:

- **`CHANGELOG.md`** — *what changed*, in release terms. Bullets only, no paragraphs.
  Added / Changed / Removed / Fixed. A reader scanning releases is the audience.
- **`.agents/SESSION-LOG.md`** — *what happened and why*. Reasoning, trade-offs,
  invented decisions, known issues. The next agent is the audience.

Rule of thumb to include verbatim: **if a sentence explains _why_, it belongs only in
the session log; if it states _what_, it belongs only in the changelog.**

## 4. Add the document map to rule 00

Add a "Document authority" section to `.cursor/rules/00-session-protocol.mdc`
carrying the same table as the README, plus this line:

> Every document is authoritative for exactly one thing. When two disagree, each
> wins for its own column. Never sync one to another — `roadmap.md` carries orders
> of magnitude and `progress.md` carries measurements, and collapsing that
> distinction destroys what makes each useful.

Update the FIRST ACTION read list to include `docs/DEBT.md`.

## 5. Fold `.agents/summary.md` into the map

`.agents/` now holds only `summary.md` and `SESSION-LOG.md`, and `summary.md`
overlaps `progress.md` and the README. Decide one of:

- **Keep it** as the agent-facing snapshot, and state in rule 00 exactly what it is
  authoritative for that no other file covers, or
- **Retire it**, moving its unique content into `progress.md` and the README.

Report which you chose and why. Do not decide silently — this is the one judgment
call in the task.

## 6. Protect the new file

Add `docs/DEBT.md` to the "never union-merge" note in `.gitattributes` (as a comment
— it must NOT get a `merge=union` attribute; the point is that it is excluded).

---

## Verify

- Every relative link in `README.md`, `docs/DEBT.md` and rule 00 resolves
- Debt ID count in `docs/DEBT.md` equals the count previously in `progress.md`
- No duplicate IDs, no gaps below the highest issued
- `pnpm agents:build` then `pnpm agents:check` clean
- `lint`, `typecheck`, `test`, `build`, `verify:submodules` pass

Close with the four mandatory doc steps, then `/commit`. Do not merge.
