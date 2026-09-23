/**
 * resolveReturnOrigin — pick a safe origin for an OAuth redirect.
 *
 * The candidate is whatever the caller has on hand — a `?returnTo=`
 * query value, the `Referer` header's origin, or an explicit override.
 * The allowlist is the trimmed, comma-separated `WEB_ORIGIN` env list
 * (production: `https://nxhhuy.tech,https://develop.nxhhuy.tech`).
 *
 * Returns the candidate's origin iff it is an EXACT match against an
 * entry in the allowlist. Anything else — unlisted, malformed, the
 * look-alike `https://nxhhuy.tech.evil.com` — falls back to the first
 * allowed origin and is NEVER echoed back. Path and query are stripped;
 * only the origin survives.
 *
 * `startsWith` is forbidden here: it passes `https://nxhhuy.tech.evil.com`
 * and makes the API an open redirect. Use `URL.origin` and a strict
 * `===` against the allowlist entries, both already trimmed.
 *
 * Pure: no I/O, no env reads, no mutation. Same input → same output.
 * That makes it testable with `node --test` and no supertest.
 *
 * Returns a `string` that is GUARANTEED to be one of the allowed
 * origins — never the input, never an arbitrary URL. Callers do not
 * need a post-validation step.
 */
export function resolveReturnOrigin(
  candidate: string | null | undefined,
  allowlist: string | readonly string[],
): string {
  const allowed = normaliseAllowlist(allowlist);
  if (allowed.length === 0) {
    // No allowlist configured. The first WEB_ORIGIN split was empty,
    // the env var was unset, or the operator mis-configured. Returning
    // a hard-coded string would lie. Throw — callers handle it by
    // surfacing 500; the env is broken.
    throw new Error(
      'resolveReturnOrigin: allowlist is empty — WEB_ORIGIN must contain at least one origin',
    );
  }
  const fallback = allowed[0]!;
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return fallback;
  }
  let origin: string;
  try {
    origin = new URL(candidate).origin;
  } catch {
    return fallback;
  }
  // EXACT match — not startsWith, not includes. The allowlist entries
  // are already origins (scheme + host + port) so `===` is sufficient.
  return allowed.includes(origin) ? origin : fallback;
}

/**
 * Split a comma-separated allowlist string and trim each entry.
 * Public so the auth controller's callback/logout can hand it a
 * `WEB_ORIGIN` string directly without re-implementing the trim.
 */
export function normaliseAllowlist(allowlist: string | readonly string[]): string[] {
  // Explicit narrowing before `.split()` so the ternary's `string`
  // branch is reachable without a runtime branch (some `noImplicitAny`
  // configs flag the union). `readonly string[]` does not have
  // `.split`, only `string` does.
  const raw: readonly string[] =
    typeof allowlist === 'string' ? allowlist.split(',') : allowlist;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}