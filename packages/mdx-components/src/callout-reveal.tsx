'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function calloutShouldReveal(entries: readonly { isIntersecting: boolean }[]): boolean {
  return entries.some((entry) => entry.isIntersecting);
}

export type CalloutRevealProps = {
  className: string;
  'data-callout': string;
  children: ReactNode;
};

/**
 * Client leaf around a server-rendered callout aside. Observes once and
 * disconnects after the first reveal. SSR markup has no `is-revealed` and
 * no `data-observe`, so no-JS readers still see the note.
 */
export function CalloutReveal({ className, children, ...rest }: CalloutRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [observe, setObserve] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }

    if (typeof IntersectionObserver !== 'function') {
      setRevealed(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (calloutShouldReveal(entries)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
    );
    setObserve(true);
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const surface = revealed ? `${className} is-revealed` : className;
  return (
    <aside
      ref={ref}
      className={surface}
      data-callout={rest['data-callout']}
      data-observe={observe ? 'true' : undefined}
    >
      {children}
    </aside>
  );
}
