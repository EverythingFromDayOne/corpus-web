---
name: nestjs-module-scaffold
description: Use when adding a NestJS module in apps/api. File order.
---

# Scaffolding a new `apps/api` module

Boundaries for what belongs in the API at all, DTO/entity rules, and validation-pipe
defaults are in `.cursor/rules/50-api-nestjs.mdc` — read it first. This skill is the
how-to for the file layout once you've decided the module belongs here.

## File order — write in this sequence

For a new domain `<name>` under `src/modules/<name>/`:

1. **`entities/<name>.entity.ts`** — the TypeORM entity first. It is the shape
   everything else derives from. Decorate with `@Entity()`, explicit `@Column()` types
   (never rely on TypeORM's implicit inference), and a `uuid` PK via
   `@PrimaryGeneratedColumn('uuid')` to match every existing entity (`ScaffoldHealthcheck`,
   `User`).
2. **Migration** — hand-write `src/db/migrations/<epoch-ms>-<Name>.ts` implementing
   `MigrationInterface` next, deriving the SQL from the entity you just wrote. See the
   `typeorm-migrations` skill for the authoring procedure — do not run
   `migration:generate`, it's an intentional exit-1 stub in this repo.
3. **`<name>.service.ts`** — inject the repository via `@InjectRepository(<Entity>)`.
   Business logic lives here, not in the controller. Export types the controller needs
   (e.g. a narrow `interface` for what a Passport strategy or another service consumes)
   from the service file, not a separate types file, unless the type is shared by 3+
   consumers.
4. **DTOs** — one file per request/response shape if the module takes external input,
   e.g. `dto/create-<name>.dto.ts`. Every field gets a `class-validator` decorator.
   DTOs are the only thing a controller method may accept as a parameter or return —
   never the entity. See `.cursor/rules/50-api-nestjs.mdc` Persistence section.
5. **`<name>.controller.ts`** — thin. `@Controller('<name>')`, one method per route,
   delegates to the service, maps the service's return value (often the entity) to a
   DTO before returning. See `nestjs-swagger-decorators` for the required decorator set
   on every method.
6. **`<name>.module.ts`** — wires `TypeOrmModule.forFeature([<Entity>])`, the
   controller(s), the service, and exports the service if another module needs it
   (mirrors `AuthModule`'s `exports: [AuthService]`). Follow the existing
   `static forRoot(): DynamicModule | null` pattern ONLY if the module has an
   optional-env-gated registration story (auth does; most won't) — a plain
   `@Module({...})` static object is the default, don't over-engineer with a factory
   unless you actually need conditional registration.
7. **`<name>.controller.spec.ts`** / **`<name>.service.spec.ts`** — co-located tests,
   named exports, last. Write these against the DTO/entity boundary you just built, not
   against internals.
8. **Register in `app.module.ts`** — add to the root `imports` array. If your module has
   no conditional-registration story, this is a plain import; if it does (env-gated),
   follow `AuthModule`'s spread pattern:
   `...(YourModule.forRoot() ? [YourModule.forRoot() as DynamicModule] : [])`.

## Import direction

Controller → Service → Repository, one-way. A service may inject another module's
exported service (e.g. a future `progress` module injecting `AuthService` to resolve a
user), but never the other module's controller or its entities directly — go through
the exported service so the entity stays encapsulated.

## Reference implementation

`src/modules/auth/` is the fullest worked example in the repo — module, service,
controller, a second controller (`me.controller.ts`) for a distinct route group, a
Passport strategy, a session guard, and a serializer. Read it before scaffolding a new
module; don't reinvent a pattern it already demonstrates.
