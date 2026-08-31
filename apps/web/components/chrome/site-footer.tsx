import { licensePath } from '@/lib/routes';
import { getMessages, t } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';

type SiteFooterProps = {
  locale: Locale;
};

/**
 * Site footer. Sole carve-out from the no-personal-content rule per
 * the session protocol: a copyright holder email is required under CC
 * BY 4.0 for licence and re-use questions. The same email also lives
 * on /en/license. No other personal data appears here.
 */
const LICENSE_HOLDER_EMAIL = 'nxhhuy@gmail.com';

export function SiteFooter({ locale }: SiteFooterProps) {
  const messages = getMessages(locale);
  return (
    <footer className="border-t border-[var(--color-graphite)] mt-24 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 text-sm text-[var(--color-body)] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <a
          href={`mailto:${LICENSE_HOLDER_EMAIL}`}
          className="text-[var(--color-signal)] underline decoration-[var(--color-signal-soft)] underline-offset-4 transition-colors hover:decoration-[var(--color-signal)]"
        >
          {t(messages, 'license.footerContact', { email: LICENSE_HOLDER_EMAIL })}
        </a>
        <a
          href={licensePath(locale)}
          className="text-[var(--color-body)] transition-colors hover:text-[var(--color-display)]"
        >
          {t(messages, 'license.footerLicenseLink')}
        </a>
      </div>
    </footer>
  );
}
