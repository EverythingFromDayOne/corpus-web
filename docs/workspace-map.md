# AGENTS.md — /Users/huynguyen/Documents/Self

## 1. Repos

### AngularDemos
- **Path:** `Self/AngularDemos`
- **Purpose:** Angular demo applications, deployed independently to ng21. and ng15.nxhhuy.tech. Angular 21 is the Native Federation host and embeds v15. Deliberately NOT a submodule of corpus-web (roadmap §17.14) — it is an application, not content.
- **Stack:** Node package (`package.json` name: `angular-demos`); Angular 21 Nx workspace (`angular.json`, `@angular/core` ^21.2.0, `apps/` and `libs/` layout); CI at `.github/workflows/ci.yml`.
- **Key paths:** `apps/`, `libs/`, `tools/`, `prompts/`, `.agents/`, `.cursor/`, `.grapuco/`, `.github/workflows/ci.yml`
- **When to look here:** Independently deployed Angular 21/15 demo apps (Native Federation host embedding v15). Not a corpus-web submodule and not content.
- **Git:** origin `https://github.com/EverythingFromDayOne/AngularDemos.git`, branch `development`

### angular-concepts
- **Path:** `Self/angular-concepts`
- **Purpose:** Angular v22 content corpus. English translation and modernization of "100 Days of Angular". Submoduled into corpus-web at content/angular.
- **Stack:** Node package (`package.json` name: `angular-concepts`); CI at `.github/workflows/verify.yml`
- **Key paths:** `docs/`, `prompts/`, `scripts/`
- **When to look here:** Author or edit the Angular v22 corpus ("100 Days of Angular" translation/modernization). Mounted at corpus-web/content/angular.
- **Git:** origin `https://github.com/EverythingFromDayOne/angular-concepts.git`, branch `master`

### corpus-web
- **Path:** `Self/corpus-web`
- **Purpose:** The Next.js 16.3 monorepo behind nxhhuy.tech. Publishes verified reference articles from the four content corpora. Also holds apps/api (NestJS) and the shared packages.
- **Stack:** Node monorepo (`package.json` name: `corpus-web`; `pnpm-workspace.yaml` and `turbo.json` present, pnpm + Turborepo); CI at `.github/workflows/ci.yml` and `.github/workflows/content-watch.yml`
- **Key paths:** `apps/`, `packages/`, `content/` (submodule mount point — see Relationships), `curation/`, `docs/`, `scripts/`, `tooling/`, `prompts/`, `.agents/`, `.claude/`, `.cursor/`
- **When to look here:** Work on nxhhuy.tech, apps/api, or the shared packages. Not where corpus articles are authored.
- **Git:** origin `https://github.com/EverythingFromDayOne/corpus-web.git`, branch `main`

### demo-attacked-web
- **Path:** `Self/demo-attacked-web`
- **Purpose:** Deliberately vulnerable demo lab for websec topics. Not a corpus. D10: must not share a cookie domain with the main site.
- **Stack:** TODO (no `package.json` found; no `.github/workflows`)
- **Key paths:** `clickjacking/`, `command-injection/`, `csrf/`, `event-loop-blocking/`, `idor/`, `jwt-attacks/`, `mass-assignment/`, `nosql-injection/`, `path-traversal/`, `prototype-pollution/`, `reverse-tabnabbing/`, `sql-injection/`, `ssrf/`, `xss/`, `prompts/`
- **When to look here:** Websec demo labs. Not a corpus; do not share a cookie domain with the main site (D10).
- **Git:** origin `https://github.com/EverythingFromDayOne/demo-attacked-web.git`, branch `master`

### demo-auth-concepts
- **Path:** `Self/demo-auth-concepts`
- **Purpose:** Working demo lab for authentication patterns. Not a corpus, no adapter, no home on the site yet (D9).
- **Stack:** TODO (no `package.json` found; no `.github/workflows`)
- **Key paths:** `access-refresh/`, `api-key/`, `basic-digest/`, `jwt-bearer/`, `magic-links/`, `mfa-totp/`, `oauth2-oidc/`, `passkeys-webauthn/`, `session/`, `sso/`, `prompts/`
- **When to look here:** Authentication pattern demos. Not a corpus; no adapter and no site home yet (D9).
- **Git:** origin `https://github.com/EverythingFromDayOne/demo-auth-concepts.git`, branch `master`

### demo-authz-concepts
- **Path:** `Self/demo-authz-concepts`
- **Purpose:** Working demo lab for authorization patterns. Not a corpus, no adapter, no home on the site yet (D9).
- **Stack:** TODO (no `package.json` found; no `.github/workflows`)
- **Key paths:** `abac/`, `audit-logging/`, `field-level/`, `jwt-claims/`, `multitenancy/`, `oauth/`, `privilege-escalation/`, `rbac/`, `resource-ownership/`, `service-to-service/`, `prompts/`
- **When to look here:** Authorization pattern demos. Not a corpus; no adapter and no site home yet (D9).
- **Git:** origin `https://github.com/EverythingFromDayOne/demo-authz-concepts.git`, branch `master`

### mfe-demo-wepack
- **Path:** `Self/mfe-demo-wepack`
- **Purpose:** TODO. Not a git repository; no remote, not on GitHub.
- **Stack:** Node package (`package.json` name: `mfe-demo-wepack`); `.angular/` present; no `.github/workflows`
- **Key paths:** `projects/`, `dist/`
- **When to look here:** TODO (depends on purpose)
- **Git:** **Not a git repository** — no remote/branch (no `.git` directory found; not on GitHub)

### mfe-native-federation
- **Path:** `Self/mfe-native-federation`
- **Purpose:** TODO
- **Stack:** Node package (`package.json` name: `mfe-native-federation`); Angular CLI project (`angular.json`, `@angular-architects/native-federation`); no `.github/workflows`
- **Key paths:** `projects/`
- **When to look here:** TODO (depends on purpose)
- **Git:** origin `https://github.com/EverythingFromDayOne/mfe-native-federation.git`, branch `development`

### mfe-react
- **Path:** `Self/mfe-react`
- **Purpose:** Four-way micro-frontend decision artifact. The same cart scenario across webpack-mf, native-federation, pnpm-monorepo and nx-monorepo. Not a workspace; each demo installs from its own root. Zero Angular.
- **Stack:** Node package (`package.json` name: `mfe-react`); no `.github/workflows`
- **Key paths:** `native-federation/`, `nx-monorepo/` (git submodule), `pnpm-monorepo/`, `webpack-mf/`
- **When to look here:** Compare the four MFE approaches (webpack-mf, native-federation, pnpm-monorepo, nx-monorepo) for the same cart scenario. Not a workspace; each demo installs from its own root.
- **Git:** origin `https://github.com/EverythingFromDayOne/mfe-react.git`, branch `main`

### nestjs-concepts
- **Path:** `Self/nestjs-concepts`
- **Purpose:** NestJS 11 content corpus. Submoduled into corpus-web at content/nestjs.
- **Stack:** Node package (`package.json` name: `nestjs-concepts`); no `.github/workflows`
- **Key paths:** `architecture/`, `async/`, `auth/`, `data/`, `demos/`, `foundations/`, `observability/`, `performance/`, `recipes/`, `request-lifecycle/`, `scripts/`, `testing/`, `validation/`, `prompts/`
- **When to look here:** Author or edit the NestJS 11 corpus. Mounted at corpus-web/content/nestjs.
- **Git:** origin `https://github.com/EverythingFromDayOne/nestjs-concepts.git`, branch `main`

### nextjs-concepts
- **Path:** `Self/nextjs-concepts`
- **Purpose:** Next.js 16.3 content corpus, Cache Components baseline. Submoduled into corpus-web at content/nextjs.
- **Stack:** Node package (`package.json` name: `nextjs-concepts`); CI at `.github/workflows/verify.yml`
- **Key paths:** `demos/`, `docs/`, `scripts/`, `prompts/`, `.cursor/`
- **When to look here:** Author or edit the Next.js 16.3 corpus (Cache Components baseline). Mounted at corpus-web/content/nextjs.
- **Git:** origin `https://github.com/EverythingFromDayOne/nextjs-concepts.git`, branch `main`

### react-concepts
- **Path:** `Self/react-concepts`
- **Purpose:** React 19.2 content corpus, 38 concept articles plus recipes. Submoduled into corpus-web at content/react.
- **Stack:** TODO (no `package.json` found; no `.github/workflows`)
- **Key paths:** `architecture/`, `concurrent/`, `ecosystem/`, `effects/`, `forms/`, `foundations/`, `recipes/`, `rendering/`, `server/`, `state/`, `prompts/`
- **When to look here:** Author or edit the React 19.2 corpus (concept articles plus recipes). Mounted at corpus-web/content/react.
- **Git:** origin `https://github.com/EverythingFromDayOne/react-concepts.git`, branch `master`

## 2. Relationships

`corpus-web` mounts the following repos as git submodules (per `corpus-web/.gitmodules` and `git submodule status`):

| Submodule path | Source repo URL | Pinned ref (commit) | Tag shown |
|---|---|---|---|
| `content/nextjs` | `https://github.com/EverythingFromDayOne/nextjs-concepts.git` | `a19616ff958bbc298646ab96783f402eb5f1dbc8` | `v0.3.1` |
| `content/react` | `https://github.com/EverythingFromDayOne/react-concepts.git` | `daf5b568d6917361cf0a026ef57dd38ba2b63658` | `v0.5.0` |
| `content/angular` | `https://github.com/EverythingFromDayOne/angular-concepts.git` | `bdef6aecea08a7cf0ea5b2d42ab59b820e61c3f9` | `v0.3.1` |
| `content/nestjs` | `https://github.com/EverythingFromDayOne/nestjs-concepts.git` | `abae66f6c483f7ce02c876789f4ee8f6901e19bc` | `v0.3.2` |

## 3. Rules

- Content edits happen at Self/<repo>. Never edit corpus-web/content/* — those are pinned build inputs.
- corpus-web/docs/DEBT.md is the authoritative debt register. IDs are append-only; highest issued is D28.
- progress.md, roadmap.md and .agents/summary.md are edited in place and conflict rather than union-merge. Resolve by keeping both sides.
- Nothing auto-merges. corpus-commit forbids pushing to main.
- Every repo except the mfe-* ones has a prompts/ directory holding session prompts.
