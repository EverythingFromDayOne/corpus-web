# Automation setup

Shifting the mechanical work off the human. What stays human is stated first, because
that boundary is the point of the whole arrangement.

---

## The review boundary

Automate the mechanics. Keep the judgment.

| Automated | Human |
|---|---|
| Detecting new corpus tags | **Merging.** Nothing auto-merges, ever |
| Bumping submodule pins | **Cosmetic vs substantive** on any `content_hash` change |
| Rebuilding the catalog and diffing it | **Content quality** — is this dek right, delete the duplicate or rewrite it |
| Running every gate | **Looking at rendered output** |
| Opening the PR with the diff in the body | **Scope decisions** |

Two pieces of evidence from the sessions so far, and they point opposite ways:

**For automation** — merging, rebasing, tagging and promoting were done by hand across
four repos, one terminal command at a time. Hours of relay with no judgment in it.

**Against full autonomy** — two grid-layout bugs shipped past lint, typecheck, build and
every gate. Both were found by a human opening the page. No automation catches *"this
looks broken."*

And a third thing worth protecting: **two independent agents have been cross-checking
each other.** Cursor found the `.ts`-extension article, verified a `@types/node`
argument by compiling it against both versions rather than accepting it, and discovered
that "keep the newest duplicate" would have preserved wrong numbers. If one agent both
authors and executes, that check is gone.

---

## 1. Claude Code in Slack

Official, and it removes the terminal relay. Sessions run on Anthropic's
infrastructure under your own Claude account and your connected repositories — **your
Mac does not need to be a server.**

- Add the Claude app to the Slack workspace
- Connect your Claude account from the app's Home tab
- Mention it in `#corpus-web` with a task

You get status updates in the thread, then a summary with **View Session**, **Create
PR**, **Retry as Code** and **Change Repo** buttons. Full transcripts stay at
`claude.ai/code`.

Docs: https://code.claude.com/docs/en/slack

**Billing note:** this runs on your Claude plan, not your Cursor credits. With Cursor
credit low until Aug 30, that alone is a reason to move mechanical work over now.

## 2. `claude-code-action` for GitHub

Gives you `@claude` on issues and PRs, plus scheduled workflows.

**Use the installer rather than hand-written YAML.** From the Claude Code CLI:

```
/install-github-app
```

It sets up the GitHub app, the secrets, and generates a workflow at the version
currently shipping. A hand-written `claude.yml` goes stale on input names and action
versions; the installer does not.

Repo: https://github.com/anthropics/claude-code-action

## 3. `content-watch.yml`

Provided separately. Goes at `.github/workflows/content-watch.yml`.

Daily at 01:00 UTC it checks each of the four submodules, and for any pinned at an
older tag than the corpus's highest semver tag it bumps the pin, rebuilds the catalog
before and after, and opens **one draft PR per drifted submodule** with the article and
`content_hash` diff in the body.

**It requires a PAT** at `secrets.CONTENT_WATCH_TOKEN` with `repo` scope. This is not
optional and not a preference: PRs opened with `GITHUB_TOKEN` do not trigger other
workflows, so the CI gates would never run on the promotion PR — the single thing the
PR exists for.

```bash
gh secret set CONTENT_WATCH_TOKEN --repo EverythingFromDayOne/corpus-web
```

Three choices in it worth knowing about:

- **`sort -V | tail -n1`**, not most-recently-created. A backport tagged today must not
  look newer than the release it was cut from.
- **`max-parallel: 1`**, because the `promote-content` skill requires one submodule per
  PR so a failing gate stays unambiguous.
- **`fail-fast: false`**, so one corpus erroring cannot hide drift in another.

Test it before trusting the schedule:

```bash
gh workflow run "Content watch" --repo EverythingFromDayOne/corpus-web -f submodule=nestjs
```

Expect no PR — `nestjs` is pinned at `v0.3.1`, which is current. Then tag a corpus and
run it again; a draft PR should appear within a minute.

---

## What this does not solve

**Visual regression.** The two grid bugs would still ship. If that matters, the fix is
Playwright screenshots on the article route, compared per PR — worth adding during
session 3 while the layout is being built rather than retrofitted after.

**Content judgment.** 15 untitled react articles and one duplicated angular file need
writing and deciding. No workflow closes those.

**The cross-check.** If both authoring and execution move to one agent, keep a second
one on review — `@claude` reviewing PRs opened by Cursor, or the reverse. The value is
in the independence, not in either agent individually.
