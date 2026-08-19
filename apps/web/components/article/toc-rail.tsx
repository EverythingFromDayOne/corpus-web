'use client';

import { useEffect, useRef, useState } from 'react';
import type { ArticleSectionView } from '@/lib/catalog';
import { markComplete, markSeen, readProgress } from '@/lib/progress';
import { useArticleChrome } from './article-shell';

const CIRCUMFERENCE = 2 * Math.PI * 13;

export function TocRail({
  uid,
  sections,
}: {
  uid: string;
  sections: Array<ArticleSectionView & { jumpLabel: string }>;
}) {
  const { setPercent } = useArticleChrome();
  const [active, setActive] = useState<string | null>(sections[0]?.anchor ?? null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const seenRef = useRef(seen);
  seenRef.current = seen;

  useEffect(() => {
    const initial = new Set(readProgress().seen[uid] ?? []);
    setSeen(initial);
  }, [uid]);

  useEffect(() => {
    if (sections.length === 0) {
      setPercent(0);
      return;
    }
    const percent = Math.round((seen.size / sections.length) * 100);
    setPercent(percent);
    if (seen.size === sections.length) markComplete(uid);
  }, [seen, sections.length, setPercent, uid]);

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.anchor))
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
  }, [sections, uid]);

  const percent = sections.length === 0 ? 0 : Math.round((seen.size / sections.length) * 100);
  const offset = CIRCUMFERENCE * (1 - percent / 100);
  const done = percent === 100 && sections.length > 0;

  return (
    <div className="av-rail">
      <div className="av-stick">
        {sections.map((section) => {
          const marker =
            /^(part\s+\d+)/i.exec(section.heading)?.[1] ?? String(section.ordinal + 1).padStart(2, '0');
          const title = section.heading.replace(/^(part\s+\d+)\s+/i, '');
          const classes = ['av-tk'];
          if (seen.has(section.anchor)) classes.push('seen');
          if (active === section.anchor) classes.push('on');
          return (
            <a
              key={section.anchor}
              href={`#${section.anchor}`}
              className={classes.join(' ')}
              aria-label={section.jumpLabel}
            >
              <span className="av-tk-l">
                <b>{marker}</b>
                {title}
              </span>
            </a>
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
