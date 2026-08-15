---
name: corpus-nest-module
description: "Conventions for apps/api, the NestJS 11 service. Use when adding or editing a module, controller, service, DTO, guard, entity, or TypeORM migration, and when deciding whether a piece of functionality belongs in the API at all. Covers answer-key custody, the forbidUnknownValues reversal, and why lessons rows are archived rather than deleted."
---

# apps/api — NestJS 11

## Does this belong here at all

**If the API were down, would reading break?** If yes, it is in the wrong service. The API
owns state — auth, progress, quiz scoring, SRS scheduling, entitlements. Content is
build-time and never passes through it.

`apps/web/app/api/` is a BFF for session cookie proxying only. Zero business logic. If
adding logic there feels faster, you are building two backends.

## Validation — a reversal that breaks assumptions

**Nest forces `forbidUnknownValues: false` on `ValidationPipe`**, which reverses what
`class-validator` does standalone. Tests written against standalone behaviour will pass for
the wrong reason. This was found by article 17 invalidating article 16's headline claim in
`nestjs-concepts`; do not rediscover it.

Every request body gets a DTO with `class-validator` decorators. `whitelist: true`,
`transform: true`.

## Answer-key custody

`quiz_options.is_correct` never reaches a client in `server` mode. The response carries the
verdict and the explanation, never the key.

Route every client payload through `toClientQuiz()` in `@corpus/content-schema`, and add a
serialisation test asserting no `correct` key appears in any client-bound object. This is
exactly the kind of leak that survives code review.

## Persistence

- Migrations only. `synchronize: true` is forbidden in every environment including test
- Controllers return DTOs, never entities
- **Never hard-delete a `lessons` row.** Articles get renamed and moved; `lesson_progress`
  points at them. Archive, and add a `lesson_aliases` row on rename — that table also feeds
  the Next `redirects()` config so old URLs keep working
- A changed `content_hash` flags progress rows for *optional* invalidation, never automatic.
  A typo fix must not wipe a reader's streak

## OpenAPI is not optional

`packages/api-client` is generated from the emitted document. An endpoint or DTO without
`@nestjs/swagger` decorators is invisible to the web app. Never hand-write a fetch call to
the API to work around a missing decorator — add the decorator.

## Avoid

- Never `synchronize: true`
- Never return an entity from a controller
- Never hard-delete a `lessons`, `quiz_attempts`, or `card_reviews` row
- Never put business logic in `apps/web/app/api/`
- Never skip Swagger decorators
- Never assume standalone `class-validator` defaults
- Never add an endpoint that content rendering would depend on
