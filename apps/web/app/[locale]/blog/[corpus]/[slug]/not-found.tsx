import Link from 'next/link';
import { getMessages, t } from '@/lib/i18n';
import { isLocale, LOCALES, type Locale } from '@/lib/locales';
import { blogPath, homePath } from '@/lib/routes';

type Props = {
  params: Promise<{ locale: string; corpus: string; slug: string }> | undefined;
};

// Fallback values used when `params` is undefined — Next 16 prerenders the
// `not-found.tsx` at build time with no params to materialise a generic 404
// response for slugs that don't appear in `generateStaticParams`. Render the
// chrome in the default locale and skip the slug-specific copy.
const fallbackLocale: Locale = LOCALES[0];
const fallbackSlug = '…';

export default async function ArticleNotFound({ params }: Props) {
  const resolved = params ? await params : null;
  const locale = resolved?.locale && isLocale(resolved.locale) ? (resolved.locale as Locale) : fallbackLocale;
  const corpus = resolved?.corpus ?? 'corpus';
  const slug = resolved?.slug ?? fallbackSlug;
  const messages = getMessages(locale);

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-meta text-[color:var(--color-muted)]">
        {corpus}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {t(messages, 'notFound.title')}
      </h1>
      <p className="mt-4 text-[color:var(--color-body)]">
        D39-DEBUG-MARKER-ARTICLE — {t(messages, 'notFound.body', { corpus, slug })}
      </p>
      <nav className="mt-8 flex justify-center gap-3 text-sm">
        <Link
          href={blogPath(locale)}
          className="rounded border border-[color:var(--color-graphite)] px-4 py-2 hover:bg-[color:var(--color-surface)]"
        >
          {t(messages, 'notFound.browseAll')}
        </Link>
        <Link
          href={homePath(locale)}
          className="rounded border border-[color:var(--color-graphite)] px-4 py-2 hover:bg-[color:var(--color-surface)]"
        >
          {t(messages, 'breadcrumb.home')}
        </Link>
      </nav>
    </main>
  );
}