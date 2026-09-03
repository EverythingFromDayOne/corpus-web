import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/site-header';
import { JsonLd } from '@/components/json-ld';
import { getMessages, t } from '@/lib/i18n';
import { isLocale, LOCALES } from '@/lib/locales';
import { licensePath, homePath } from '@/lib/routes';
import { absoluteUrl } from '@/lib/site';

type PageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Sole carve-out from the no-personal-content rule per the session
 * protocol: a copyright holder name is required under CC BY 4.0. The
 * email lives here as the contact channel for re-use, attribution
 * corrections, and licence questions. Same email also appears in the
 * site footer.
 */
const LICENSE_HOLDER_EMAIL = 'nxhhuy@gmail.com';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const url = absoluteUrl(licensePath(locale));
  return {
    title: t(getMessages(locale), 'license.title'),
    description: t(getMessages(locale), 'license.shortHeading'),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: t(getMessages(locale), 'site.name'),
      title: t(getMessages(locale), 'license.title'),
      description: t(getMessages(locale), 'license.shortHeading'),
      locale,
    },
  };
}

export default async function LicensePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const messages = getMessages(locale);

  return (
    <PageShell messages={messages}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t(messages, 'license.heading'),
          url: absoluteUrl(licensePath(locale)),
          inLanguage: locale,
          isPartOf: {
            '@type': 'WebSite',
            name: t(messages, 'site.name'),
            url: absoluteUrl(homePath(locale)),
          },
          license: 'https://creativecommons.org/licenses/by/4.0/',
        }}
      />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-signal)]">
            {t(messages, 'license.title')}
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-tight text-[var(--color-display)] md:text-5xl">
            {t(messages, 'license.heading')}
          </h1>
        </header>

        <section className="flex flex-col gap-6 text-base leading-relaxed text-[var(--color-body)]">
          <p>{t(messages, 'license.shortHeading')}</p>

          <p>{t(messages, 'license.youMay')}</p>
          <ol className="list-decimal pl-6">
            <li
              dangerouslySetInnerHTML={{ __html: t(messages, 'license.share1') }}
            />
            <li
              dangerouslySetInnerHTML={{ __html: t(messages, 'license.share2') }}
            />
          </ol>

          <h2 className="text-2xl font-semibold text-[var(--color-display)]">
            {t(messages, 'license.codeSamplesHeading')}
          </h2>
          <p>{t(messages, 'license.codeSamplesBody')}</p>

          <h2 className="text-2xl font-semibold text-[var(--color-display)]">
            {t(messages, 'license.adaptedHeading')}
          </h2>
          <p>{t(messages, 'license.adaptedBody')}</p>

          <h2 className="text-2xl font-semibold text-[var(--color-display)]">
            {t(messages, 'license.moreHeading')}
          </h2>
          <p>{t(messages, 'license.moreBody')}</p>
          <p>
            <a
              className="text-[var(--color-signal)] underline decoration-[var(--color-signal-soft)] underline-offset-4 transition-colors hover:decoration-[var(--color-signal)]"
              href="https://creativecommons.org/licenses/by/4.0/"
              rel="license noopener"
            >
              {t(messages, 'license.ccLink')}
            </a>
          </p>

          <h2 className="text-2xl font-semibold text-[var(--color-display)]">
            {t(messages, 'license.contactHeading')}
          </h2>
          <p>{t(messages, 'license.contactBody')}</p>
          <p>
            <a
              className="text-[var(--color-signal)] underline decoration-[var(--color-signal-soft)] underline-offset-4 transition-colors hover:decoration-[var(--color-signal)]"
              href={`mailto:${LICENSE_HOLDER_EMAIL}`}
            >
              {LICENSE_HOLDER_EMAIL}
            </a>
          </p>
        </section>
      </article>
    </PageShell>
  );
}
