'use client';

import { usePathname } from 'next/navigation';
import { t, type Messages } from '@/lib/i18n';
import { blogPath, coursesPath, homePath } from '@/lib/routes';
import type { Locale } from '@/lib/locales';

export function NavLinks({ locale, messages }: { locale: Locale; messages: Messages }) {
  const pathname = usePathname();
  const links = [
    { href: homePath(locale), label: t(messages, 'nav.home'), match: (path: string) => path === homePath(locale) },
    {
      href: coursesPath(locale),
      label: t(messages, 'nav.courses'),
      match: (path: string) => path === coursesPath(locale) || path.startsWith(`${coursesPath(locale)}/`),
    },
    {
      href: blogPath(locale),
      label: t(messages, 'nav.articles'),
      match: (path: string) => path === blogPath(locale) || path.startsWith(`${blogPath(locale)}/`),
    },
  ];

  return (
    <nav aria-label={t(messages, 'nav.primary')} className="flex flex-wrap gap-4 text-sm">
      {links.map((link) => {
        const current = link.match(pathname);
        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={current ? 'page' : undefined}
            className={`no-underline ${current ? 'text-signal' : 'text-muted hover:text-display'}`}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
