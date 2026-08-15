import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@corpus/mdx-components';
import { source } from '@/lib/source';

const SPIKE_LOCALE = 'en';
const SPIKE_REPO = 'nextjs';
const SPIKE_SLUG = ['concepts', 'caching', 'cache-components-model'] as const;

type PageProps = {
  params: Promise<{ locale: string; repo: string; slug: string[] }>;
};

export function generateStaticParams() {
  return [
    {
      locale: SPIKE_LOCALE,
      repo: SPIKE_REPO,
      slug: [...SPIKE_SLUG],
    },
  ];
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, repo, slug } = await params;
  if (locale !== SPIKE_LOCALE || repo !== SPIKE_REPO) notFound();
  if (slug.join('/') !== SPIKE_SLUG.join('/')) notFound();
  return <ArticleBody slug={slug} />;
}

async function ArticleBody({ slug }: { slug: string[] }) {
  'use cache';
  cacheLife('max');

  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const toc = page.data.toc ?? [];

  return (
    <main>
      <article>
        <MDX components={getMDXComponents()} />
      </article>
      {toc.length > 0 ? (
        <nav>
          <ol>
            {toc.map((item) => (
              <li key={item.url}>
                <a href={item.url}>{item.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </main>
  );
}
