---
name: corpus-adapter
description: "How to write and correct per-corpus frontmatter adapters in packages/content-schema. Use when a frontmatter validation error appears, when auditing a corpus against its adapter spec, when adding a corpus, or when normalising a new frontmatter field. Explains why adapters throw instead of defaulting, and why three sibling repos have no adapter at all."
---

# Writing corpus adapters

Four corpora with different frontmatter field *names* normalise into one `Article` shape.
They differ in naming, not meaning — which is why adapters are built from specs by a
factory rather than hand-written four times.

## The one rule

**Adapters normalise. They never guess.**

A missing or unrecognised required field throws with the repo, the source path, and the
field name, because the fix belongs in the corpus repo or in the spec. A default value here
hides the gap permanently.

```ts
if (!baselineVersion) {
  throw new AdapterError(spec.repo, sourcePath, `missing ${spec.baselineKey}`);
}
```

## The deliberate asymmetry

Unknown `difficulty` **throws**. `status` (carried through as `authoringStage`) is not a
gate at all anymore — see `.cursor/rules/30-content-pipeline.mdc` § "Publication gate" —
so there is nothing to over-hide there; any string or object shape is accepted and typed.

Mis-categorising is silent, and a wrong difficulty badge is never noticed, which is why
`difficulty` still throws on an unrecognised value. Preserve that asymmetry when adding a
field that *does* gate something: ask which direction of error is detectable. A field that
is purely a display label, like `authoringStage`, does not need it.

## Adding a field

1. Add it to the normalised `Article` in `article.ts`
2. Add the raw key to `BaseFrontmatter` if suite-wide, or to a spec's `extend` if per-repo
3. Add a `normalise*` helper in `adapters/shared.ts` that throws on unrecognised values
4. Wire it in `factory.ts`

Never add it to individual corpus files first. The schema follows the corpus.

## Confidence tiers — do not treat these as equal

All four share a documented sibling schema, so the specs are informed guesses — but still
guesses, unverified against the real files until the session 2 audit runs.

Three repos have **no adapter and never will**: `auth`, `authz`, and `websec` are runnable
demo apps with no `docs/` and no frontmatter. `dsa` has none either — it is a planned corpus
with no remote. Registering a repo in `DemoSourceId` or `PlannedRepoId` exists so a `related`
ref pointing at it resolves and warns, rather than hard-failing as an unknown repo.

## Avoid

- Never add a default to make a required field optional
- Never widen an enum to absorb an unexpected value — report it instead
- Never edit a corpus file to satisfy an adapter
- Never remove the filename/id equality check — the id is always the filename slug
- Never delete a `⚠ UNVERIFIED` notice for a claim the audit did not actually verify
- Never write an adapter for a repo that has no `docs/` folder — check before assuming
- Never make `description` optional or derive it from the first paragraph
