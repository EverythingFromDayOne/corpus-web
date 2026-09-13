---
name: nestjs-swagger-decorators
description: Use when adding api endpoints. Requires Swagger decorators.
---

# Swagger decorators — every endpoint, no exceptions

`.cursor/rules/50-api-nestjs.mdc` states the rule: `@nestjs/swagger` decorators are
mandatory on every endpoint and DTO, because `packages/api-client` is generated from the
emitted document in CI. An undecorated endpoint is invisible to the web app — this skill
is the checklist for what "decorated" means in practice.

## Per-controller

- `@ApiTags('<domain>')` on the controller class. Tag names are lowercase, match the
  module name (`auth`, `health`), and must also be registered via `.addTag(...)` in the
  `DocumentBuilder` config in `src/main.ts` — an undeclared tag still renders in Swagger
  UI but under "default", which is a smell that someone forgot the `main.ts` wiring.
- `@ApiBearerAuth('session')` on the controller class (not per-method) if every route in
  it requires the session cookie — see `me.controller.ts`. The `'session'` name must
  match the security scheme name registered via `.addBearerAuth(..., 'session')` in
  `main.ts`; this repo repurposes bearer-auth UI for the session cookie by convention
  (documented inline in `main.ts` — Swagger UI convenience only, real callers send a
  `Cookie` header, not an `Authorization` header).

## Per-method

- `@ApiOperation({ summary: '<one-line description>' })` — always. This is the minimum;
  every existing method in the repo has one (`beginGoogleOAuth`, `googleCallback`,
  `logout`, `me`, the two `healthz` checks).
- `@ApiOperation` alone is enough for a route with no request body and a simple
  response. Add `@ApiOkResponse({ type: <ResponseDto> })` or `@ApiCreatedResponse(...)`
  once a method returns a non-trivial DTO shape a client needs typed — none of the
  current auth routes do this yet (they return void/redirect or an inline `MeResponse`
  interface), but the next module that returns a list or a paginated shape should.
- A route guarded by `@UseGuards(SessionAuthGuard)` or `@UseGuards(AuthGuard('google'))`
  does NOT automatically get an auth badge in Swagger UI — the `@ApiBearerAuth('session')`
  decorator is what draws it. Guard + decorator are two separate concerns; forgetting
  the decorator doesn't break auth, it just makes Swagger UI lie about which routes need
  a cookie.

## Per-DTO

- Every DTO class field gets `@ApiProperty()` (or `@ApiPropertyOptional()` for optional
  fields) alongside its `class-validator` decorator. `class-validator` controls runtime
  validation; `@ApiProperty` controls what `packages/api-client`'s generated TypeScript
  type looks like — they are not redundant, both are required.
- Nullable fields (Postgres columns that are `NULL`-able, like `email`/`name`/
  `avatarUrl`/`locale` on `User`) need `@ApiProperty({ nullable: true })` if you expose
  them on a response DTO, or the generated client type won't include `| null`.

## Verifying the document is complete

Hit `/api-json` on a running dev server and confirm the route count and shape match what
you expect — PR #179's verification receipts list "`/api-json` lists 6 routes" as a
concrete check, not an assumption. Do the same after adding a module: count routes
before/after, confirm the new ones appear with the tag and operation summary you wrote.
