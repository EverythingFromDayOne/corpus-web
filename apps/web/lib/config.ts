/**
 * Build-time API origin for `apps/web`.
 *
 * `NEXT_PUBLIC_API_URL` is inlined by Next at build time (any `NEXT_PUBLIC_*`
 * is replaced statically in the bundle — runtime `process.env` reads do not
 * work). Set it per-Vercel-environment in the Vercel dashboard:
 *
 *   - Production:  https://api.nxhhuy.tech  (or whatever the deployed origin is)
 *   - Preview:     the preview API origin Vercel assigns
 *   - Development: http://localhost:3001
 *
 * Architecture decision: per-env var (Option B), not a same-origin Next
 * rewrites proxy — see `docs/adr/0004-api-url-per-env-var.md` (ADR-0004) for
 * the full reasoning (matches PR #179's locked CORS/cookie-domain contract;
 * avoids re-deriving it through a proxy hop).
 *
 * Falling back to `''` keeps the disabled-state guard in the only current
 * caller (`sign-in-button.tsx`) meaningful: an unset env surfaces a
 * disabled-style button rather than a broken-URL redirect. A real dev
 * machine that forgets to set the var will see no link to follow, not a
 * link to a wrong origin.
 *
 * New callers should import `apiUrl` from this module rather than reading
 * `process.env['NEXT_PUBLIC_API_URL']` directly, so the inlining behaviour
 * and any future value-shape changes (e.g. forcing a trailing slash, or
 * rejecting unset at build) live in one place.
 */
export const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? '';
