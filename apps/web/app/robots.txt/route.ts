import { SITE_ORIGIN } from '@/lib/site';

/**
 * robots.txt. Allows all crawlers by default, points them at the
 * sitemap, and disallows the build-shells that show up under Cache
 * Components fallback routes (none today, but the rule is in place for
 * when bracketed `[param]` placeholders get indexed by accident).
 */

const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;

const BODY = `# corpus-web robots.txt
# All adapting articles are public reference prose — open crawl is the
# intent. The sitemap is the canonical enumeration; crawlers that respect
# it will discover every surface in O(1) requests.

User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITEMAP_URL}
`;

export function GET(): Response {
  return new Response(BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}