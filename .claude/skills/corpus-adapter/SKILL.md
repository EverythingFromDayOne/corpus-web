---
name: corpus-adapter
description: "How to write and correct per-corpus frontmatter adapters in packages/content-schema. Use when a frontmatter validation error appears, when auditing a corpus against its adapter spec, when adding a corpus, or when normalising a new frontmatter field. Explains why adapters throw instead of defaulting, and the confidence tiers across the seven corpora."
---

# Writing corpus adapters

Seven corpora with different frontmatter field *names* normalise into one `Article` shape.
They differ in naming, not meaning — which is why adapters are built from specs by a
factory rather than hand-written seven times.

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

Unknown `status` collapses to `draft`. Unknown `difficulty` **throws**.

Over-hiding is recoverable — a finished article that fails to render is loud. Mis-categorising
is silent, and a wrong difficulty badge is never noticed. Preserve this asymmetry when adding
fields: ask which direction of error is detectable.

## Adding a field

1. Add it to the normalised `Article` in `article.ts`
2. Add the raw key to `BaseFrontmatter` if suite-wide, or to a spec's `extend` if per-repo
3. Add a `normalise*` helper in `adapters/shared.ts` that throws on unrecognised values
4. Wire it in `factory.ts`

Never add it to individual corpus files first. The schema follows the corpus.

## Confidence tiers — do not treat these as equal

| Corpora | Basis for the spec |
|---|---|
| `nextjs` `reactjs` `angular` `nestjs` | documented sibling schema — informed guess |
| `auth` `authz` | no recorded convention — hypothesis |
| `websec` | role itself unestablished — placeholder |

`websec` may not be a corpus at all. If the audit shows it is a vulnerable target app whose
code the auth/authz articles extract, **delete its adapter** and register it as a
code-extraction source instead: still submoduled for `verify-code-blocks`, producing no
articles.

## Avoid

- Never add a default to make a required field optional
- Never widen an enum to absorb an unexpected value — report it instead
- Never edit a corpus file to satisfy an adapter
- Never remove the filename/id equality check — the id is always the filename slug
- Never delete a `⚠ UNVERIFIED` notice for a claim the audit did not actually verify
- Never make `description` optional or derive it from the first paragraph
