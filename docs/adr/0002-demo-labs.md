# ADR-0002: Treat the three demo labs as linked applications, not corpora

- **Status:** proposed — needs a decision before Phase 1 item 13
- **Date:** 2026-08-15
- **Deciders:** pending

## Context

Three repos were registered as content corpora on the strength of their names and their
position beside the `*-concepts` suite:

- `demo-auth-concepts`
- `demo-authz-concepts`
- `demo-attacked-web`

The session 1 audit found no `docs/` folder and no frontmatter in any of them. They are
**runnable demo applications**, not markdown corpora. They produce zero articles and have
no adapter.

Two signals were available before the audit and were read wrongly. The `demo-` prefix
describes what the repo *is*, not merely where it came from. And `demo-attacked-web`
carries seven security alerts where every sibling carries one — the profile of a
deliberately vulnerable target application. The audit existed to catch exactly this, and did.

What remains undecided is not what they are, but what the site does with them.

## Options considered

**A. Drop them entirely.** Remove the submodules; the site never mentions them. Cost: zero.
Buys: nothing. Loses three working demonstrations of security concepts, which is the one
subject area in the suite with no article coverage at all.

**B. Link out.** `/en/demos` lists them; links open wherever they are deployed. Cost: near
zero, plus deploying them somewhere. Buys: the work becomes visible.

**C. Deploy to subdomains and iframe under `/en/demos/*`.** Exactly the treatment ADR-0001
gives the Angular demos: own deploys, own repos, embedded in shell chrome. Cost: three
deploys plus a route. Buys: one navigation model across every demo on the site.

**D. Keep them submoduled as code-extraction sources.** Only justified if articles extract
verbatim code from them the way the framework corpora extract from their demo modules.
Nothing does today.

## Decision

**Option C, with a precondition.** Deploy the three to subdomains and embed them under
`/en/demos/*` alongside the Angular demos, once each is confirmed to run standalone.

Until then they are **not submodules of this repo**. Session 1 added all seven candidates;
three of those pins should be removed. A submodule that produces no articles and is not
extracted from adds clone time to every CI run and every developer checkout for no benefit.

`demo-attacked-web` needs one extra consideration before deployment: it is deliberately
vulnerable. It must not be deployed on a subdomain sharing a cookie domain with
`nxhhuy.tech`, because an XSS demo that can read a session cookie for the main site is no
longer a demo. Give it a separate domain, or scope it so `.nxhhuy.tech` cookies are
unreachable.

## Consequences

**Easier:** one navigation model for every demo. The security subject area gets
representation without writing a corpus for it. The corpus pipeline stays clean — four
corpora, four adapters, no special cases.

**Harder:** three more deploys to maintain. Each needs a smoke check, or the site links to
something broken.

**Reversal cost:** low. C → B is deleting an iframe. C → D means re-adding submodules and
building extraction, which is a real project.

**Open:** whether any existing article in the four corpora already links to these repos.
If so, those refs currently resolve as `demoTargets` and warn — correct behaviour, but it
would mean the articles already assume a destination that does not exist yet.

## Revisit when

An article needs to extract verbatim code from one of these apps; or a fourth demo lab
appears and the per-demo deploy cost stops being worth it; or the security material grows
enough to justify a real corpus, at which point these become its demo sources.
