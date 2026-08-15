---
name: corpus-session
description: "Opening and closing a work session in corpus-web from a committed prompt file. Use at the start of any session invoked as "follow prompts/session-N.md", and when closing a session. Covers the mandatory read order, scope restatement, the invented-decisions disclosure requirement, and authoring the next session prompt."
---

## Procedure

1. Follow FIRST ACTION in `.cursor/rules/00-session-protocol.mdc` — read the five context
   files before touching anything else.
2. Read `prompts/session-N.md`. It is the authoritative task list. Anything not in it is
   out of scope.
3. **Restate the scope back** before starting: the numbered task list, the files you
   expect to touch, and anything in the prompt you find ambiguous. Do not start work on an
   ambiguous item — ask.
4. Work the tasks in order. Do not reorder, do not batch ahead.
5. If a task turns out to be underspecified mid-session, stop that task, note it, and
   continue with the next. Do not invent content to fill the gap.
6. Close with the four mandatory doc steps, then `/commit`.
7. Author `prompts/session-N+1.md` as the last file written, capturing what is next and
   any debt this session created.

## Invocation from Slack

```
@Cursor follow prompts/session-N.md
```

The channel has this repo as its default. If the agent cannot find the prompt file, it is
on the wrong repo or the wrong branch — stop and say so rather than guessing.
