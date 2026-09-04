/**
 * roadmap-manifest.mjs
 *
 * Parses a submodule's `roadmap.md` into a Set of basename slugs that are
 * planned-but-unwritten articles. Mirrors the role `parseRoadmapManifest`
 * plays inside each submodule's own `scripts/verify-links.mjs`, but at the
 * corpus-web layer so the root `verify-links` can promote `unresolved`
 * targets to `planned` for the same reason the submodule scripts do:
 * forward refs to roadmap-enumerated articles are not defects, they are
 * writing order.
 *
 * Per-repo section detection is by heading text, not section number, so
 * a renumber in any submodule's roadmap doesn't silently flip refs
 * between WARN and FAIL. Recognised inventory section headings:
 *
 *   concept: "Article inventory" | "Concept articles" (case-insensitive substring)
 *   recipe:  "Recipe tracks"     | "Planned recipes"
 *
 * Inside a concept section, every backticked token shaped like
 * `foo/bar` or `foo/bar/baz` is collected as a basename. Inside a recipe
 * section, only numbered-list items contribute — the track-name lists
 * (e.g. `1. \`caching/\``) are intentionally ignored, because they name
 * tracks, not articles, and a ref to a track slug is not a forward ref
 * to any specific article.
 *
 * Returns `Set<string>` of basename slugs, with leading `recipes/`
 * stripped to match what the adapter stores on `ArticleRef.articleId`.
 *
 * If the file is missing or unparseable, returns an empty Set and emits
 * one WARN line so the operator knows the gate is running with no
 * planned-classification — refs that should WARN will FAIL instead,
 * which is the existing behaviour and is safe.
 */
import { existsSync, readFileSync } from 'node:fs';

const CONCEPT_HEADING = /article inventory|concept articles/i;
const RECIPE_HEADING = /recipe tracks|planned recipes/i;
const NUMBERED_ITEM = /^\s*\d+\.\s+/;
// Slug-shaped backticked token: lowercase-start, lowercase/digits/hyphens,
// zero-or-more `/segment` parts. Anchored on `[a-z0-9]` to exclude
// uppercase, `@`, `.`, `(` prose tokens (`@Entity`, `useState`,
// `1.1.x`, `[text](../path/file.md#anchor)`). Matches both bare
// basenames (`providers-and-di`) and slash-paths
// (`foundations/typescript-for-nest`).
const BACKTICKED_SLUG = /`([a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*)`/g;
// Section headings only — `###` and deeper are subsections inside an
// already-active inventory. Anchored on exactly `## ` + non-`#`
// (so `### Wave 1 — the spine` does not match and clobber `activeSection`).
const SECTION_HEADING = /^##\s+[^#]/;

/**
 * Expected manifest size range per repo. Used by `assertManifestSizes`
 * to fail the build if over-collection or under-collection has slipped
 * in. The bounds are wider than the live count by a comfortable margin
 * (typically 2-3x), so a wave landing does not invalidate them — only a
 * silent parser drift will. Repos without a roadmap (angular today) get
 * an upper bound of 0.
 *
 * Live sizes as of 2026-09-04:
 *   nextjs=83, nestjs=64, react=43, angular=0 (no roadmap.md).
 * Update these bounds when a wave of articles lands that materially
 * changes the manifest size.
 */
export const MANIFEST_BOUNDS = {
  nextjs: { min: 30, max: 200 },
  nestjs: { min: 30, max: 200 },
  react: { min: 20, max: 200 },
  angular: { min: 0, max: 0 },
};

export function parseRoadmapManifest(roadmapPath) {
  const manifest = new Set();
  if (!existsSync(roadmapPath)) {
    console.warn(
      `verify-links: roadmap not found at ${roadmapPath}; planned-forward classification disabled`,
    );
    return manifest;
  }
  const text = readFileSync(roadmapPath, 'utf8');
  const lines = text.split(/\r?\n/);

  // The next inventory section we enter. Set to 'concept' or 'recipe' as
  // we encounter the matching heading; cleared (set back to null) on any
  // other `## N.` heading so we don't bleed across sections.
  let activeSection = null;

  for (const line of lines) {
    const heading = line.match(SECTION_HEADING);
    if (heading) {
      activeSection = CONCEPT_HEADING.test(line)
        ? 'concept'
        : RECIPE_HEADING.test(line)
          ? 'recipe'
          : null;
      continue;
    }
    if (activeSection === null) continue;

    // In a recipe section, only numbered-list items qualify. The
    // track-name lists (e.g. `1. \`caching/\``) are deliberately ignored:
    // they name tracks, not articles, and a ref to a track slug is not
    // a forward ref to any specific article.
    if (activeSection === 'recipe' && !NUMBERED_ITEM.test(line)) continue;

    for (const m of line.matchAll(BACKTICKED_SLUG)) {
      const slug = m[1];
      const basename = slug.split('/').pop();
      manifest.add(basename);
    }
  }
  return manifest;
}

/**
 * Verify each repo's manifest falls within the expected range. Emits a
 * hard FAIL for any over- or under-collection so a parser drift is
 * caught at the same `pnpm verify:links` invocation, not silently at
 * the next corpus bump.
 *
 * Returns `{ ok: boolean, sizes: Record<RepoId, number> }`. The
 * `sizes` map is also useful for the run-time log line emitted by
 * `scripts/verify-links.mjs`.
 */
export function assertManifestSizes(manifestsByRepo) {
  const sizes = {};
  let ok = true;
  for (const [repo, bounds] of Object.entries(MANIFEST_BOUNDS)) {
    const size = manifestsByRepo[repo]?.size ?? 0;
    sizes[repo] = size;
    if (size < bounds.min || size > bounds.max) {
      console.error(
        `verify-links: MANIFEST-SIZE-CHECK FAIL — ${repo} manifest has ${size} ` +
          `basename(s); expected range [${bounds.min}, ${bounds.max}]. ` +
          `Under-collection makes the gate noisier (forward refs FAIL); over-collection ` +
          `makes it silently quieter (real breakage classifies as planned). ` +
          `If this is a real corpus change, update MANIFEST_BOUNDS in ` +
          `scripts/lib/roadmap-manifest.mjs.`,
      );
      ok = false;
    }
  }
  return { ok, sizes };
}
