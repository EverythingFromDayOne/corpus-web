'use client';

import { useEffect, useId, useRef } from 'react';
import { t, type Messages } from '@/lib/i18n';
import { SignInButton } from './sign-in-button';

/**
 * Mobile-only navigation drawer.
 *
 * Rendered at <=640px when the user activates the hamburger trigger
 * (MobileNavTrigger). Provides a single column with: nav links,
 * search shortcut, theme toggle, language switcher placeholder,
 * sign-in / sign-out, and a future-utilities slot.
 *
 * A11y contract (matches the header-redesign spec):
 *   - role="dialog" + aria-modal="true"
 *   - aria-labelledby points at the drawer title for screen readers
 *   - focus is moved into the drawer on open and trapped inside it
 *     while open (Tab cycles within the panel; Shift+Tab does the
 *     reverse). On close, focus returns to the trigger that opened it.
 *   - Escape, the visible close button, and a backdrop click all
 *     close the drawer
 *   - prefers-reduced-motion: slides are reduced to an instant open
 *     (handled in globals.css via @media block — the panel keeps its
 *     `translate-x` value but the transition is zero-duration)
 *
 * State lives in the parent (SiteHeader, client). The drawer is
 * unmounted entirely when `open` is false so we don't pay the cost
 * of a hidden focus trap on desktop, and so the route-change
 * remount guarantees `closed` on every navigation (no persisted
 * state across routes).
 *
 * Body scroll lock: while the drawer is open we set
 * `document.body.style.overflow = 'hidden'` and restore the prior
 * value on close / unmount. This prevents the underlying page from
 * scrolling behind the panel on iOS Safari where body lock requires
 * it explicitly.
 *
 * Sign-in reuse: we render the existing <SignInButton> inside the
 * drawer so the popup/cookie/polling/postMessage machinery in
 * sign-in-context.tsx is reused as-is. The drawer's `onClose`
 * fires after the user clicks so we don't leave the panel painted
 * behind the popup.
 *
 * Sign-out is a plain `<a href>` to `${apiUrl}/auth/logout`, matching
 * the live route and the existing UserMenu contract. We do NOT
 * duplicate UserMenu's `<details>` dropdown inside the drawer — the
 * drawer is a navigation surface, not a settings menu, and the
 * avatar dropdown's positioning doesn't translate to the panel.
 * Instead we show the user's name + email and a single "Sign out"
 * link, which is the only control the dropdown exposes anyway.
 */

type MobileNavDrawerProps = {
  readonly messages: Messages;
  readonly open: boolean;
  readonly onClose: () => void;
  /** Ref to the trigger element — used to restore focus on close. */
  readonly triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** Slug -> href map for nav links, mirrored from the desktop row. */
  readonly navHrefs: ReadonlyArray<{ readonly slug: string; readonly href: string }>;
  readonly signedInName?: string | undefined;
  readonly signedInEmail?: string | undefined;
  readonly signOutHref: string;
  readonly onOpenSearch?: () => void;
  readonly onToggleTheme?: () => void;
  readonly themeLabel: string;
  readonly languageLabel: string;
};

type Focusable = HTMLElement & { focus: () => void };

function focusables(root: HTMLElement): Focusable[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
  );
}

export function MobileNavDrawer({
  messages,
  open,
  onClose,
  triggerRef,
  navHrefs,
  signedInName,
  signedInEmail,
  signOutHref,
  onOpenSearch,
  onToggleTheme,
  themeLabel,
  languageLabel,
}: MobileNavDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  // Body scroll lock + close on Escape + focus management.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const items = focusables(panel);
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const first = items[0]!;
        const last = items[items.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !panel.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !panel.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKey);

    // Move focus into the panel after mount so screen readers
    // announce the dialog title first.
    const panel = panelRef.current;
    // Snapshot the trigger ref inside the effect so the cleanup
    // reads the same node it was paired with at mount time, even if
    // the parent later re-renders and the ref's `.current` moves.
    const triggerEl = triggerRef.current;
    if (panel) {
      const items = focusables(panel);
      // Prefer the close button (first focusable) so the user can
      // immediately Escape; fall back to the first nav link.
      const target = items[0] ?? panel;
      // rAF lets the open animation kick in without stealing focus
      // before the panel paints.
      const id = requestAnimationFrame(() => target.focus());
      return () => {
        cancelAnimationFrame(id);
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = prevOverflow;
        // Restore focus to the trigger so keyboard users land where
        // they left off.
        triggerEl?.focus();
      };
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      triggerEl?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  const isSignedIn = Boolean(signedInName || signedInEmail);

  return (
    <div
      className="mobile-nav-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="mobile-nav-drawer-backdrop"
        onClick={onClose}
        aria-label={t(messages, 'topbar.mobileNavClose')}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className="mobile-nav-drawer-panel"
        tabIndex={-1}
      >
        <div className="mobile-nav-drawer-head">
          <h2 id={titleId} className="mobile-nav-drawer-title">
            {t(messages, 'topbar.mobileNavTitle')}
          </h2>
          <button
            type="button"
            className="mobile-nav-drawer-close"
            aria-label={t(messages, 'topbar.mobileNavClose')}
            onClick={onClose}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        <nav className="mobile-nav-drawer-list" aria-label={t(messages, 'nav.primary')}>
          {navHrefs.map(({ slug, href }) => (
            <a key={slug} href={href} className="mobile-nav-drawer-link" onClick={onClose}>
              {t(messages, `nav.${slug}` as 'nav.home')}
            </a>
          ))}
        </nav>

        <div className="mobile-nav-drawer-foot">
          <button
            type="button"
            className="mobile-nav-drawer-action"
            onClick={() => {
              onOpenSearch?.();
              onClose();
            }}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{t(messages, 'placeholders.searchTriggerLabel')}</span>
          </button>

          <button
            type="button"
            className="mobile-nav-drawer-action"
            onClick={onToggleTheme}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
              <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
              <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
              <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" />
            </svg>
            <span>{themeLabel}</span>
          </button>

          <button
            type="button"
            className="mobile-nav-drawer-action mobile-nav-drawer-action--placeholder"
            aria-disabled="true"
            disabled
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3a14 14 0 0 1 0 18" />
              <path d="M12 3a14 14 0 0 0 0 18" />
            </svg>
            <span>{languageLabel}</span>
            <span className="mobile-nav-drawer-soon">{t(messages, 'placeholders.comingSoon')}</span>
          </button>

          {isSignedIn ? (
            <>
              <div className="mobile-nav-drawer-account">
                {signedInName ? (
                  <span className="mobile-nav-drawer-account-name">{signedInName}</span>
                ) : null}
                {signedInEmail ? (
                  <span className="mobile-nav-drawer-account-email">{signedInEmail}</span>
                ) : null}
              </div>
              <a
                href={signOutHref}
                className="mobile-nav-drawer-action mobile-nav-drawer-action--signout"
                onClick={onClose}
              >
                {t(messages, 'topbar.signOutLabel')}
              </a>
            </>
          ) : (
            <div onClick={onClose} className="mobile-nav-drawer-signin-wrap">
              <SignInButton messages={messages} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
