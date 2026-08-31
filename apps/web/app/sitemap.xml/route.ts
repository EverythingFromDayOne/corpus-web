import { getCatalogView } from '@/lib/catalog';
import { LOCALES } from '@/lib/locales';
import { absoluteUrl } from '@/lib/site';

/**
 * Sitemap index. Emits one URL per locale × surface. Articles and
 * lessons come from the prerendered `catalog.json`; listing chrome and
 * course detail pages are enumerated explicitly. All URLs are absolute
 * (sitemap.org requires absolute href values).
 *
 * Lives at `/sitemap.xml` so Vercel's edge serves it with the right
 * Content-Type. Cached for the build lifetime via the catalog view's
 * `'use cache'` + `cacheLife('max')`.
 */

function xmlEscape(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(): Promise<Response> {
  const view = await getCatalogView();
  const urls: string[] = [];

  for (const locale of LOCALES) {
    // Listing chrome.
    urls.push(absoluteUrl(`/${locale}`));
    urls.push(absoluteUrl(`/${locale}/courses`));
    urls.push(absoluteUrl(`/${locale}/blog`));

    // Course detail pages.
    for (const course of view.courses) {
      urls.push(absoluteUrl(`/${locale}/courses/${course.slug}`));
      for (const item of course.items) {
        urls.push(
          absoluteUrl(`/${locale}/courses/${course.slug}/lessons/${item.articleId}`),
        );
      }
    }

    // Adapting articles.
    for (const article of view.articles) {
      urls.push(
        absoluteUrl(`/${locale}/blog/${article.repo}/${article.articleId}`),
      );
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((loc) => `  <url><loc>${xmlEscape(loc)}</loc></url>`)
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}