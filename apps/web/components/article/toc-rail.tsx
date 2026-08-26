'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RailPart } from '@/lib/rail-parts';
import { markComplete, markSeen, readProgress } from '@/lib/progress';
import {
  TOC_BAND_TOP_RATIO,
  TOC_BOTTOM_SLACK_PX,
  remainingScrollPx,
  seenHeadingIds,
  selectActiveHeadingId,
} from '@/lib/toc-spy';
import { useArticleChrome } from './article-shell';

const CIRCUMFERENCE = 2 * Math.PI * 13;

function seenPartCount(seen: Set<string>, parts: Array<{ anchor: string }>): number {
  return parts.reduce((count, part) => (seen.has(part.anchor) ? count + 1 : count), 0);
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
  const pinnedAnchor = useRef<string | null>(null);

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
    pinnedAnchor.current = null;

    const sync = () => {
      const remaining = remainingScrollPx(
        window.scrollY,
        window.innerHeight,
        document.documentElement.scrollHeight,
      );
      const readingLinePx = window.innerHeight * TOC_BAND_TOP_RATIO;
      const headings = nodes.map((node) => ({
        id: node.id,
        top: node.getBoundingClientRect().top,
      }));
      let nextActive = selectActiveHeadingId(headings, {
        readingLinePx,
        remainingScroll: remaining,
      });
      if (pinnedAnchor.current) {
        if (
          remaining <= TOC_BOTTOM_SLACK_PX ||
          nextActive === pinnedAnchor.current
        ) {
          pinnedAnchor.current = null;
        } else {
          nextActive = pinnedAnchor.current;
        }
      }
      if (nextActive) setActive(nextActive);
      const newlySeen = seenHeadingIds(headings, {
        readingLinePx,
        remainingScroll: remaining,
      });
      if (newlySeen.length === 0) return;
      setSeen((current) => {
        const next = new Set(current);
        let changed = false;
        for (const id of newlySeen) {
          if (!next.has(id)) {
            next.add(id);
            markSeen(uid, id);
            changed = true;
          }
        }
        return changed ? next : current;
      });
    };

    // Same band as before — it is only the trigger, not the picker. Changing
    // rootMargin is unnecessary once active is derived from heading tops.
    const observer = new IntersectionObserver(sync, {
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0, 0.25, 1],
    });
    for (const node of nodes) observer.observe(node);

    // Last headings can sit in the band together, or skip it entirely on a
    // jump-to-bottom, so the band observer may not fire again. The page-nav
    // at the end of the article is a sentinel that *triggers* a recompute as
    // more of the outro comes into view (thresholds, not a scroll listener).
    // The picker still uses leftover scroll vs the last heading's distance
    // to the reading line — pnav being visible is not itself "at bottom".
    const endObserver = new IntersectionObserver(sync, {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    });
    const end = document.querySelector('.av-pnav');
    if (end) endObserver.observe(end);

    sync();
    return () => {
      observer.disconnect();
      endObserver.disconnect();
    };
  }, [parts, uid]);

  const jumpToPart = useCallback((anchor: string) => {
    pinnedAnchor.current = anchor;
    setActive(anchor);
    document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
    const url = new URL(window.location.href);
    url.hash = anchor;
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

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
