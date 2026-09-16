'use client';

import { useMemo } from 'react';
import { t, type Messages } from '@/lib/i18n';
import { apiUrl } from '@/lib/config';

/**
 * Single Sign-in button for D26 first slice.
 *
 *   - Lives in the topbar (`topbar-tools`), next to the theme toggle.
 *   - Anchor tag, NOT a button: the destination is a server endpoint
 *     that returns a 302 to Google. Doing this from a server-component
 *     `<a href>` keeps it crawlable, keyboard-friendly, and free of
 *     client JS for the click path.
 *   - The href is computed once from `apiUrl` (re-exported from
 *     `apps/web/lib/config.ts`), which reads
 *     `process.env.NEXT_PUBLIC_API_URL` — Next inlines that at build
 *     time. Default to `''` so an unset env shows a disabled-style
 *     button rather than sending the user to a broken URL. See
 *     ADR-0004 for the build-time-inlining / per-Vercel-env-var contract.
 *   - We do NOT make any decision here about "already signed in" —
 *     that's a follow-up PR's job. For this slice, the button is
 *     unconditional. When the server returns a session cookie, the
 *     next page load will show /me is 200; a follow-up PR can swap
 *     the label.
 *   - Localized label: `topbar.signIn` / `topbar.signInAriaLabel`.
 *     Both fall back to English via the t() function.
 */
export function SignInButton({ messages }: { messages: Messages }) {
  const href = useMemo(() => `${apiUrl}/auth/google`, []);
  const disabled = href === '/auth/google';

  return (
    <a
      href={href}
      className={disabled ? 'topbar-signin topbar-signin--disabled' : 'topbar-signin'}
      aria-label={t(messages, 'topbar.signInAriaLabel')}
      aria-disabled={disabled ? 'true' : undefined}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t(messages, 'topbar.signIn')}
    </a>
  );
}
