'use client';

import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  flashcardCardClassName,
  flashcardFaceAriaHidden,
  flashcardScrollBehavior,
  nextCardIndex,
  prefersReducedMotion,
  prevCardIndex,
  shouldHandleFlipKey,
  toggleFlip,
} from './flashcard-model';
import { WidgetRise } from './widget-rise';

export type FlashcardCard = {
  front: string;
  back: string;
};

export type FlashcardLabels = {
  eyebrow: string;
  previous: string;
  next: string;
  progress: string;
  front: string;
  back: string;
  /* polish/sydexa-card-deck (PR #143): the two strings below power the
     sydexa-style hint glyphs. `flipHint` is the "tap to flip" caption
     that lives at the bottom of each card. `swipeHint` is a separate
     hint surfaced on mobile via the `aria-describedby` link for
     keyboard/AT users — sighted users see the affordance from the
     gesture itself, AT users need an explicit cue. */
  flipHint?: string;
  swipeHint?: string;
};

export type FlashcardProps = {
  id: string;
  title: string;
  cards: FlashcardCard[];
  labels: FlashcardLabels;
};

/* polish/sydexa-card-deck (PR #143): pointer-driven horizontal swipe
   constants. Threshold tuned to read as an intentional swipe on both
   pointer (mouse + touch) input. `SWIPE_PX = 60` is ~15% of a 375 px
   mobile viewport; `SWIPE_VELOCITY = 0.3 px/ms` catches fast flicks
   that don't accumulate enough pixel distance before release. */
const SWIPE_PX = 60;
const SWIPE_VELOCITY = 0.3;

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function Flashcard({ id, title, cards, labels }: FlashcardProps) {
  const uid = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  /* polish/react-jsx-key-hygiene: hooks must run unconditionally.
     React's `rules-of-hooks` lint rule flags any hook called after
     an early-return guard because the hook order can desync across
     renders (stable input → differing call counts). Decoupling the
     `total` constant from `cards.length` so all hook calls happen
     before any `if (total === 0) return null;` guard. The
     `goTo` callback deps now reference `cards.length` directly
     (no early-return behaviour, no hook-order coupling). */
  const total = cards.length;
  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      setIndex(clamped);
      /* polish/flashcard-ambient-and-prevnext-fix (PR #144):
         removed the inline `--flashcard-track-translate` CSS
         variable write (PR #143). That write fought with
         `scroll-snap-type: x mandatory` on the track and was the
         root cause of the empty-card glitch the user reported on
         iPhone Safari. Now we only rely on scroll-snap +
         `scrollIntoView` — both aligned. The cursor's
         `scroll-behavior` is unchanged: respects `prefers-reduced-motion`. */
      const track = trackRef.current;
      if (track) {
        const card = track.children[clamped];
        if (card instanceof HTMLElement) {
          card.scrollIntoView({
            inline: 'center',
            block: 'nearest',
            behavior: flashcardScrollBehavior(prefersReducedMotion()),
          });
        }
      }
    },
    [total],
  );

  if (total === 0) return null;

  function onCardKeyDown(event: KeyboardEvent<HTMLButtonElement>, cardIndex: number) {
    if (!shouldHandleFlipKey(event.key)) return;
    event.preventDefault();
    setFlipped((current) => ({
      ...current,
      [cardIndex]: toggleFlip(current[cardIndex] === true),
    }));
  }

  /* polish/sydexa-card-deck (PR #143): pointer-based horizontal swipe.
     `pointerdown` records the start position + timestamp; `pointermove`
     reads delta + velocity at release. Catches both touch and mouse
     pointers uniformly via the Pointer Events API. The track-level
     handler is attached to the wrapper, not the card, so a tap on a
     card still reaches the card's onClick (flip) and is not
     misclassified as a swipe. Vertical scrolls (`|dy| > |dx|` early
     or `pointercancel`) are ignored so the deck doesn't fight page
     scroll. */
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY, t: event.timeStamp };
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll, ignore
    const dt = Math.max(1, event.timeStamp - start.t);
    const velocity = Math.abs(dx) / dt; // px/ms
    if (Math.abs(dx) < SWIPE_PX && velocity < SWIPE_VELOCITY) return;
    if (dx < 0) {
      goTo(nextCardIndex(index, total));
    } else {
      goTo(prevCardIndex(index, total));
    }
  }

  function onPointerCancel() {
    swipeStartRef.current = null;
  }

  /* polish/sydexa-card-deck (PR #143): describedby for AT users.
     `aria-describedby` (not `aria-label`) keeps the deck's accessible
     name on the wrapping <section> while this hint supplements it. */
  const hintId = `${uid}-hint`;
  const describedById = labels.swipeHint ? hintId : undefined;

  return (
    <WidgetRise>
      <section
        className="av-flashcard"
        data-flashcard={id}
        aria-label={title}
        {...(describedById ? { 'aria-describedby': describedById } : {})}
      >
        <header className="av-flashcard-hd">
          <span>{labels.eyebrow}</span>
          <span>{title}</span>
          <span>{format(labels.progress, { current: index + 1, total })}</span>
        </header>
        <div className="av-flashcard-nav">
          <button
            type="button"
            className="av-flashcard-arrow"
            aria-label={labels.previous}
            disabled={index === 0}
            onClick={() => goTo(prevCardIndex(index, total))}
          >
            ‹
          </button>
          <button
            type="button"
            className="av-flashcard-arrow"
            aria-label={labels.next}
            disabled={index >= total - 1}
            onClick={() => goTo(nextCardIndex(index, total))}
          >
            ›
          </button>
        </div>
        <div
          className="av-flashcard-track"
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {cards.map((card, cardIndex) => {
            const pressed = flipped[cardIndex] === true;
            const name = `${uid}-${cardIndex}`;
            return (
              <button
                key={name}
                type="button"
                className={flashcardCardClassName(pressed)}
                aria-pressed={pressed}
                aria-label={pressed ? labels.back : labels.front}
                onClick={() =>
                  setFlipped((current) => ({
                    ...current,
                    [cardIndex]: toggleFlip(current[cardIndex] === true),
                  }))
                }
                onKeyDown={(event) => onCardKeyDown(event, cardIndex)}
              >
                <span
                  className="av-flashcard-face av-flashcard-front"
                  aria-hidden={flashcardFaceAriaHidden('front', pressed)}
                >
                  {card.front}
                  {labels.flipHint && (
                    <span
                      className="av-flashcard-flip-hint"
                      aria-hidden="true"
                    >
                      ✦ {labels.flipHint}
                    </span>
                  )}
                </span>
                <span
                  className="av-flashcard-face av-flashcard-back"
                  aria-hidden={flashcardFaceAriaHidden('back', pressed)}
                >
                  {card.back}
                </span>
              </button>
            );
          })}
        </div>
        {labels.swipeHint ? (
          <p id={hintId} className="av-flashcard-swipe-hint">
            {labels.swipeHint}
          </p>
        ) : null}
      </section>
    </WidgetRise>
  );
}
