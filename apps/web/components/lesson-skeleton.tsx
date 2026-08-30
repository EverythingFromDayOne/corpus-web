/**
 * Lesson-route content skeleton.
 *
 * Static placeholder rendered as the <Suspense fallback> on
 * /[locale]/courses/[course]/lessons/[slug] while the lesson subtree
 * streams in. Mirrors the hierarchy in
 * prompts/design-spec-2026-08-lessons.md §9 — chrome (eyebrow +
 * heading + subtitle), 3 paragraph skeletons, 2 callouts, 1 table,
 * 1 code-block — all rounded bars in bg-muted, motion-safe so users
 * with prefers-reduced-motion: reduce see static placeholders. The
 * wrapper is aria-hidden because screen readers should not announce
 * skeleton bars as content.
 *
 * Tokens: bg-muted (existing @theme token in packages/ui/src/tokens.css)
 * replaces the spec's bg-lesson-bg-secondary. The three-tier
 * accent-token refactor is deferred (DEBT D28); the lesson-prefixed
 * token block in apps/web/components/article/lesson-tokens.css is not
 * touched here.
 */
export function LessonSkeleton() {
  return (
    <div aria-hidden="true" className="av-inner space-y-6 md:space-y-8">
      {/* Chrome skeleton — eyebrow + heading + subtitle. */}
      <div className="space-y-4">
        <div className="h-4 w-32 max-w-full rounded bg-muted motion-safe:animate-pulse sm:w-40" />
        <div className="space-y-3">
          <div className="h-7 w-11/12 max-w-full rounded bg-muted motion-safe:animate-pulse md:h-9 md:w-3/4" />
          <div className="h-5 w-2/3 max-w-full rounded bg-muted motion-safe:animate-pulse md:w-1/2" />
        </div>
      </div>

      {/* Paragraph skeletons — 3 rows, widths simulating natural text rhythm. */}
      <div className="space-y-4">
        <div className="h-4 w-full max-w-full rounded bg-muted motion-safe:animate-pulse" />
        <div className="h-4 w-5/6 max-w-full rounded bg-muted motion-safe:animate-pulse" />
        <div className="h-4 w-4/6 max-w-full rounded bg-muted motion-safe:animate-pulse" />
      </div>

      {/* Callout-style block #1 — heading + 2 body lines. */}
      <div className="space-y-3">
        <div className="h-7 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted motion-safe:animate-pulse" />
        </div>
      </div>

      {/* Callout-style block #2 — heading + 2 body lines. */}
      <div className="space-y-3">
        <div className="h-7 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-4/6 rounded bg-muted motion-safe:animate-pulse" />
        </div>
      </div>

      {/* Table skeleton — 4 rows × 3 columns. */}
      <div className="overflow-hidden rounded-lg border border-graphite">
        <div className="grid grid-cols-3 gap-2 p-2">
          {[0, 1, 2, 3].map((row) => (
            <div key={`row-${row}`} className="contents">
              <div className="h-4 w-16 rounded bg-muted motion-safe:animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted motion-safe:animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Code-block skeleton — header + 5 body lines. */}
      <div className="overflow-hidden rounded-lg border border-graphite p-3">
        <div className="flex items-center gap-2 pb-3">
          <div className="h-3.5 w-3.5 rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted motion-safe:animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-4/5 rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-3/5 rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-4/5 rounded bg-muted motion-safe:animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}