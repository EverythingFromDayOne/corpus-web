# Session protocol — for sub-agent task attachments

> **Use this file alongside `prompts/HANDOFF-corpus-web.md` and
> the named task prompt. It is a thin layering — it adds only the
> shape of the response back to the user, on top of the base kit.**

---

## Inputs (always exactly these, in this order)

1. `prompts/HANDOFF-corpus-web.md` — the base kit (~700 lines)
2. **THIS file** — `prompts/HANDOFF-session-protocol.md`
3. **The task prompt** — whatever the user named (e.g.
   `prompts/d20-d24-polish-batch.md`, `prompts/session-N.md`,
   or a free-form task in the user's message)

The order matters. If you're missing #1 or #2, stop and say so.
The base kit cites facts you'll need (file paths, gate commands,
hard rules) and quoting them from memory invites drift.

---

## Output shape — write at the end of your turn

Sub-agents have a tendency to over-explain. The user wants the
working process silenced. Format your final response in exactly
this shape, NOTHING ELSE:

```
## Done
- [highest-level summary line, 1 sentence]
- [branch + commit SHAs + PR URL if any, 1 line]
- [PR state, e.g. "MERGEABLE / UNSTABLE — CI rerunning"]

## What you should see at [URL]
[3–7 bullets of expected visual behavior. Make it inspectable:
what to look at, what to click, what changes.]

## Out of scope (recorded for next session)
[1–5 bullets of anything you noticed but didn't touch, with a
pointer to which DEBT.md row or roadmap section it belongs to.]

## Next
[If the task is incomplete OR opened a clear follow-up, name
the next 1–3 steps. If clean, say "user verification then
squash-merge" and stop.]
```

That is the entire output. No commit hashes enumerated in prose
beyond the headline. No narrative of what you tried that didn't
work. No thinking process. No recap of what the task was.

---

## Hand-back to user

When the task creates a PR or push:

- **DO NOT auto-merge.** Squash-merge is the user's decision
  after visual smoke. Just push the branch and report the PR URL
  in `## Done`.
- DO report the merge-conflict pattern if any (so the user
  knows whether to expect a re-review before the squash button
  unblocks).
- DO recommend one explicit visual-smoke step the user can take
  in their browser to verify (one URL, one paragraph).

---

## When to STOP and ask

Stop and ask the user before any of:

- **Content changes** under `content/<corpus>/...`. Those are
  submodule repos with their own PRs. This isn't your surface.
- **Personal content** of any kind (name, photo, employer,
  contact). Hard-no. See base kit §3 / §8.
- **Destructive** operations: force-push, branch deletion on
  `develop` or `main`, `git reset --hard` of any commit you've
  seen green CI on.
- **New npm dependencies.** Even small ones. Check with user
  first; this is a CDN-light site.
- **Schema/contract changes** that would break `packages/*`
  consumers, including the API client. Even additive changes
  need user confirmation; downstream consumers include the
  NestJS apps in `apps/api`.
- **Cache Components ON/OFF** toggle. See base kit §3.
- **Any invented decision** that crosses a boundary: different
  library, breaking change, content touched, content boundary
  carved, hard rule modified. Stop, name the decision, ask.

When you stop, your final response in this conversation should
also follow the output shape above, but with `## Next` reading:

```
## Next
User decision needed: [name the decision in one sentence].
I will not proceed until you say "go".
```

---

## What you can decide yourself (invented decisions disclosure still required)

- File path inside the existing codebase
- Variable / function / component naming (`PascalCase` for
  components, `camelCase` for variables, `SCREAMING_SNAKE_CASE`
  for constants)
- Tailwind utility composition that doesn't add raw hex
- Whether to write a 3-commit PR or a single commit
- Order of edits within the same logical change
- The body shape of the commit message (subject line is required,
  body is optional but recommended for multi-file work)

All other invented decisions must be disclosed under
`**Invented decisions:**` in your SESSION-LOG entry (per
base kit §7 and §10).

---

## Failure mode log — for next iteration

When the session-end verdict reads "**partially done**" or
"needs user review," add a `## Failure mode` line with one
sentence: what was the gap, what's the smallest fix. This
feeds the next session's planning — the goal is for failure
modes to compound into a corpus of "things sub-agents trip on
in this repo" that eventually justifies more constraints in
the base kit.

End of session protocol.
