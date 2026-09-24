'use client';

import { forwardRef } from 'react';
import { t, type Messages } from '@/lib/i18n';

/**
 * Mobile-only hamburger trigger for the topbar.
 *
 * Rendered inside the .topbar-tools row and only visible at <=640px.
 * The desktop topbar already exposes nav links, search trigger, theme
 * toggle, and sign-in/account controls in one row — on mobile we
 * collapse everything except the logo and this trigger behind a
 * slide-in drawer (MobileNavDrawer).
 *
 * Icon style: line-art, no fill, no decoration. Matches the existing
 * theme toggle + search trigger so the topbar reads as a single
 * visual language across the three tools. Decision logged in the
 * header-redesign PR body.
 *
 * Open-state and focus-management live in the parent (SiteHeader,
 * client) so a single useState can coordinate the trigger's
 * `aria-expanded` and the drawer's `aria-modal`. The parent's ref
 * is forwarded onto the rendered <button> so the drawer can restore
 * focus to the trigger on close.
 *
 * We intentionally do NOT keep open-state here so the trigger can
 * be unmounted cleanly when the route changes (the SiteHeader
 * remount-on-route pattern means state is `closed` on every
 * navigation, matching the spec's `closed <-> opened` requirement
 * with no persisted state across routes).
 */
type MobileNavTriggerProps = {
  readonly messages: Messages;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly controlsId: string;
};

export const MobileNavTrigger = forwardRef<
  HTMLButtonElement,
  MobileNavTriggerProps
>(function MobileNavTrigger(
  { messages, open, onToggle, controlsId },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className="mobile-nav-trigger"
      aria-label={t(messages, 'topbar.mobileNavOpen')}
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onToggle}
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
        <line x1="3" y1="6" x2="17" y2="6" />
        <line x1="3" y1="10" x2="17" y2="10" />
        <line x1="3" y1="14" x2="17" y2="14" />
      </svg>
    </button>
  );
});
