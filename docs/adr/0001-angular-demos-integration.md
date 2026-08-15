# ADR-0001: Integrate the Angular demos by iframe, not cross-framework Module Federation

- **Status:** proposed — pending decision on roadmap §16 Q7
- **Date:** 2026-08-15
- **Deciders:** pending

## Context

`AngularDemos` is a separate Nx 22 monorepo that already deploys two applications:

- Angular 21 at `ng21.nxhhuy.tech` — esbuild, standalone, signals, Tailwind 4, and
  currently a **Native Federation host** with an empty manifest (`{}`, no remotes)
- Angular 15 at `ng15.nxhhuy.tech` — isolated install, webpack, zone.js, NgModules,
  embedded inside the v21 app **by iframe**, because v15 cannot emit ESM

That repo's own planned next steps name "a Next.js shell at `nxhhuy.tech`, with Angular 21
becoming an NF remote or iframe embed." This project is that shell, so the decision lands
here.

Two facts constrain it:

1. **Angular 21 is currently the federation host.** Making Next the host inverts the
   relationship and means rebuilding the federation setup on both sides, in a repo whose
   rules already flag `tsconfig.federation.json` as fragile — modifying it "breaks the
   entire build and causes blank page 404 errors on all Angular chunks."
2. **`reactjs-concepts` article 37 concluded** that micro-frontends are an organisational
   solution with a rough four-front-end-team threshold, and that most teams regret early
   adoption. It also recorded that on Vite 8 / Rolldown, Module Federation is not native
   yet, and that cross-framework composition is the hardest variant.

## Options considered

**A. Link out.** `/en/demos` lists both apps and opens the subdomains in a new tab.
Cost: near zero. Buys: nothing technically, but nothing breaks. Chrome is inconsistent and
the demos read as separate properties.

**B. iframe under `/en/demos/[app]`.** Next renders shell chrome — breadcrumb, sidebar,
theme — around an iframe of the subdomain. Cost: ~1 day, plus a `postMessage` channel if
the shell needs the iframe's height or route. Buys: consistent chrome, one navigation
model, honest about the boundary. Notably, this is **the same mechanism `AngularDemos`
already uses internally** to embed v15 inside v21, so it introduces no new concept.

**C. Cross-framework Native Federation.** Next hosts Angular 21 as a federated remote.
Cost: high and ongoing — invert the host relationship, share-scope configuration across two
framework runtimes, two bundlers, and a fragile federation tsconfig; every Angular or Next
major becomes a coupled upgrade. Buys: a genuinely impressive demo, when it works.

**D. Next.js Multi-Zones.** Rejected fastest. Zones are a routing-layer answer for
splitting *Next* apps; they do not compose an Angular app at all. Listed because it is the
first thing that gets suggested and it does not address the problem.

## Decision

**Option B.** `/en/demos/angular-21` and `/en/demos/angular-15` render the existing
subdomain apps in an iframe inside shell chrome. The apps keep their own deploys, their own
repo, and their own build toolchains. This ADR ships alongside as the explanation.

## Consequences

**Easier:** one navigation model and one theme across everything at `nxhhuy.tech`. The
Angular repo keeps its constraints — including the rule against reverting its Native
Federation host setup — untouched. Either side can upgrade independently.

**Harder:** the iframe boundary is real. No shared routing state, no shared auth session
into the Angular apps without explicit `postMessage` plumbing, and scroll containment needs
handling. Deep-linking into an Angular route requires a URL contract between shell and
frame.

**No longer possible without revisiting:** shared runtime dependencies between the shell
and the Angular apps. They ship their own React and Angular respectively, and always will
under this decision.

**Reversal cost:** low in one direction, high in the other. B → C is a rebuild of the
federation layer on both sides. B → A is deleting a route.

**The argument this makes:** micro-frontend architecture and Module Federation are the
strongest differentiator in this portfolio — Athena, a private registry, teams across three
countries. The way seniority shows in that area is a documented decision *not* to federate
where federation is not warranted, with the threshold named. A brittle cross-framework demo
on a solo project would contradict the corpus's own published conclusion, and a reviewer who
reads both would notice.

## Revisit when

Any one of: a third framework needs embedding; the shell must share an auth session with
the Angular apps; Rolldown-native Module Federation reaches stable and Next.js ships
first-class support for consuming non-React remotes; or the demos need to appear composed
on a single page rather than one-per-route.
