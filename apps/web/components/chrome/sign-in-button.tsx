'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { t, type Messages } from '@/lib/i18n';
import { apiUrl } from '@/lib/config';

/**
 * Single Sign-in button for D26 sub-slice A (sign-in popup UX).
 *
 * Behaviour:
 *   - Click opens the Google OAuth endpoint in a ~520x600 centered popup
 *     (not a full new tab — the popup UX the rest of D26's slices will sit on).
 *   - While the popup is open, polls `GET /me` every 2 s. Cookie is shared
 *     across windows under the WEB_ORIGIN CORS allow + SameSite=Lax set in
 *     PR #179, so the second window inherits the session as soon as the
 *     callback writes it.
 *   - Shows the disabled "Signing in…" processing state when the popup is
 *     open AND /me returns 401 (auth in flight), OR the popup has closed
 *     but /me was last seen as 401 within the last 5 s (debounce window for
 *     slow callback writes).
 *   - Reverts to the normal "Sign in" label on /me 200, on popup close without
 *     ever seeing 200, or after a 60 s timeout (treat as user-cancelled,
 *     surface no error).
 *
 * Out of scope (per the session 201 spec):
 *   - Avatar dropdown / sign-out / profile page (D26 sub-slice B).
 *   - The pre-existing `href === '/auth/google'` disabled-state guard for
 *     unset `NEXT_PUBLIC_API_URL` stays as-is — that's D55's surface.
 *
 * Localised labels: `topbar.signIn`, `topbar.signInAriaLabel`, and the
 * new `topbar.signInProcessing` ("Signing in…", English-only).
 */
export function SignInButton({ messages }: { messages: Messages }) {
  const authPath = useMemo(() => `${apiUrl}/auth/google`, []);
  // Pre-existing canonical guard: an unset env (D55) surfaces as a broken
  // href of literally "/auth/google", which we disable instead of clicking.
  const envDisabled = authPath === '/auth/google';

  const [processing, setProcessing] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last401AtRef = useRef<number>(0);
  const processingRef = useRef(false);

  useEffect(() => {
    return () => {
      // Defensive cleanup on unmount — interval, timeout, and any leftover
      // popup reference. The popup itself is a separate window the browser
      // owns; closing it on unmount is the documented behaviour.
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (popupRef.current !== null && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
    };
  }, []);

  function stopPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function revert() {
    stopPolling();
    if (popupRef.current !== null && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    last401AtRef.current = 0;
    if (processingRef.current) {
      processingRef.current = false;
      setProcessing(false);
    }
  }

  function startProcessing() {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    last401AtRef.current = 0;
  }

  async function tick() {
    // Popup closed by the user: stop unless we still owe a 5s debounce.
    const popup = popupRef.current;
    if (popup === null || popup.closed) {
      const elapsedSince401 = Date.now() - last401AtRef.current;
      if (last401AtRef.current === 0 || elapsedSince401 >= 5000) {
        revert();
        return;
      }
      // Popup closed but recent 401 — keep polling for the debounce window.
      // Fall through to the fetch below; success or further 401s will resolve.
    }
    try {
      const res = await fetch(`${apiUrl}/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        revert();
        return;
      }
      if (res.status === 401) {
        // Auth in flight OR slow callback write — record the timestamp so the
        // 5 s post-close debounce has a reference.
        last401AtRef.current = Date.now();
        return;
      }
      // Any other status (5xx, etc.) — leave the processing state; the
      // 60 s timeout below will revert. The spec says no error toast.
    } catch {
      // Network blip / CORS issue while polling — keep going, the timeout
      // or a subsequent 200 will resolve. No error toast per spec.
    }
  }

  function handleClick() {
    if (envDisabled || processing) return;

    // Center the popup on the viewport.
    const width = 520;
    const height = 600;
    const left = Math.max(
      0,
      Math.floor((window.outerWidth - width) / 2 + window.screenX),
    );
    const top = Math.max(
      0,
      Math.floor((window.outerHeight - height) / 2 + window.screenY),
    );
    const features =
      `width=${width},height=${height},left=${left},top=${top},` +
      'resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no';

    const popup = window.open(authPath, 'google-oauth', features);
    if (popup === null) {
      // Popup blocked — surface no error per spec; just no-op (the user can
      // unblock and try again, or the disabled-state guard catches missing env).
      return;
    }
    popupRef.current = popup;
    startProcessing();

    // Poll /me every 2 s while the popup is open.
    intervalRef.current = setInterval(() => {
      void tick();
    }, 2000);

    // 60 s elapsed without resolution → treat as user-cancelled, revert quietly.
    timeoutRef.current = setTimeout(() => {
      revert();
    }, 60_000);
  }

  const disabled = envDisabled || processing;
  const className = envDisabled
    ? 'topbar-signin topbar-signin--disabled'
    : processing
      ? 'topbar-signin topbar-signin--processing'
      : 'topbar-signin';

  const label = processing
    ? t(messages, 'topbar.signInProcessing')
    : t(messages, 'topbar.signIn');

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      aria-label={t(messages, 'topbar.signInAriaLabel')}
      aria-disabled={disabled ? 'true' : undefined}
      disabled={disabled}
    >
      <span aria-live="polite">{label}</span>
    </button>
  );
}
