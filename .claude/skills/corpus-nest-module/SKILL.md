---
name: corpus-nest-module
description: "Conventions for apps/api, the NestJS 11 service. Use when adding or editing a module, controller, service, DTO, guard, entity, or TypeORM migration, and when deciding whether a piece of functionality belongs in the API at all. Covers local-only quiz scoring, the forbidUnknownValues seeded default, and why lessons rows are archived rather than deleted."
---

# apps/api — NestJS 11

## Does this belong here at all

**If the API were down, would reading break?** If yes, it is in the wrong service. The API
owns state — auth, progress, quiz attempt records, SRS scheduling. Content is
build-time and never passes through it.

`apps/web/app/api/` is a BFF for session cookie proxying only. Zero business logic. If
adding logic there feels faster, you are building two backends.

## Validation — a seeded default that breaks assumptions

**Since `@nestjs/common` 9.3.2, `ValidationPipe` seeds `forbidUnknownValues: false`** as
an overridable default. Tests written against standalone `class-validator` behaviour will
pass for the wrong reason. This was found by article 17 invalidating article 16's headline
claim in `nestjs-concepts`; do not rediscover it.

Every request body gets a DTO with `class-validator` decorators. `whitelist: true`,
`transform: true`.

## Quiz scoring is local-only

Scoring is `mode: 'local'` only (roadmap §7.4). The answer key ships in the client bundle
by design; scores are advisory. There is no `'server'` mode and no key-hiding path. Do
not add a serialisation test that asserts the key is absent from the client — that was
the dropped server-scoring design. The `quiz` module records attempts; it does not score
them.

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
