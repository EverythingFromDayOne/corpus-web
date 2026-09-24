'use client';

import type { Messages } from '@/lib/i18n';
import { SignInButton } from './sign-in-button';
import { UserMenu } from './user-menu';
import { useSignIn } from './sign-in-context';

/**
 * D26 sub-slice B — client boundary inside `<SiteHeader>` (Server
 * Component). Renders:
 *  - `null` while the `/me` fetch is in flight (`meState === 'loading'`)
 *  - `<SignInButton>` when `meState === 'signed-out'`
 *  - `<UserMenu>` when `meState === 'signed-in'`
 *
 * The `loading → null` choice prevents the UX flicker that would
 * occur if we briefly showed a "Sign in" button before the user's
 * real session was discovered. The flicker was one of the bugs the
 * slice B prompt specifically called out ("identity should appear
 * once, not flicker between 'Sign in' and avatar").
 *
 * Why a fresh wrapper component instead of branching directly in
 * `<SiteHeader>`: `site-header.tsx` is a Server Component (no
 * `'use client'`). Pulling `useSignIn()` into a Server Component is
 * a build-time error; the wrapper inherits the existing client-
 * component `SignInButton`'s "use client" treatment automatically.
 */

type Props = {
  messages: Messages;
};

export function AuthSurface({ messages }: Props) {
  const { meState } = useSignIn();
  if (meState === 'loading') return null;
  if (meState === 'signed-out') return <SignInButton messages={messages} />;
  return <UserMenu messages={messages} />;
}
