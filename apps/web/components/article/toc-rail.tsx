'use client';

import { useEffect, useState } from 'react';
import type { RailPart } from '@/lib/rail-parts';
import { markComplete, markSeen, readProgress } from '@/lib/progress';
import { useArticleChrome } from './article-shell';

const CIRCUMFERENCE = 2 * Math.PI * 13;

function seenPartCount(seen: Set<string>, parts: Array<{ anchor: string }>): number {
  return parts.reduce((count, part) => (seen.has(part.anchor) ? count + 1 : count), 0);
}

function jumpToPart(anchor: string) {
  document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  const url = new URL(window.location.href);
  url.hash = anchor;
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function TocRail({
  uid,
  parts,
}: {
  uid: string;
  parts: Array<RailPart & { jumpLabel: string }>;
}) {
  const { setPercent } = useArticleChrome();
  const [active, setActive] = useState<string | null>(parts[0]?.anchor ?? null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initial = new Set(readProgress().seen[uid] ?? []);
    setSeen(initial);
  }, [uid]);

  useEffect(() => {
    if (parts.length === 0) {
      setPercent(0);
      return;
    }
    const counted = seenPartCount(seen, parts);
    setPercent(Math.round((counted / parts.length) * 100));
    if (counted === parts.length) markComplete(uid);
  }, [seen, parts, setPercent, uid]);

  useEffect(() => {
    const nodes = parts
      .map((part) => document.getElementById(part.anchor))
      .filter((node): node is HTMLElement => node != null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0]?.target.id;
        if (first) setActive(first);
        setSeen((current) => {
          const next = new Set(current);
          for (const entry of entries) {
            if (entry.isIntersecting || entry.boundingClientRect.top < 80) {
              next.add(entry.target.id);
              markSeen(uid, entry.target.id);
            }
          }
          return next;
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 1] },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [parts, uid]);

  const counted = seenPartCount(seen, parts);
  const percent = parts.length === 0 ? 0 : Math.round((counted / parts.length) * 100);
  const offset = CIRCUMFERENCE * (1 - percent / 100);
  const done = percent === 100 && parts.length > 0;

  return (
    <div className="av-rail">
      <div className="av-stick">
        {parts.map((part) => {
          const classes = ['av-tk'];
          if (seen.has(part.anchor)) classes.push('seen');
          if (active === part.anchor) classes.push('on');
          return (
            <button
              key={part.anchor}
              type="button"
              className={classes.join(' ')}
              aria-label={part.jumpLabel}
              onClick={() => jumpToPart(part.anchor)}
            >
              <span className="av-tk-l">
                <b>{part.eyebrow}</b>
                {part.partTitle}
              </span>
            </button>
          );
        })}
        <div className={`av-ring${done ? ' done' : ''}`}>
          <svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
            <circle className="bg" cx="15" cy="15" r="13" />
            <circle
              className="fg"
              cx="15"
              cy="15"
              r="13"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="av-pc">{percent}%</span>
        </div>
      </div>
    </div>
  );
}
