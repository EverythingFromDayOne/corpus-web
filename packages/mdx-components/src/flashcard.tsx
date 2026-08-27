'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
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
};

export type FlashcardProps = {
  id: string;
  title: string;
  cards: FlashcardCard[];
  labels: FlashcardLabels;
};

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function Flashcard({ id, title, cards, labels }: FlashcardProps) {
  const uid = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const total = cards.length;
  if (total === 0) return null;

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(total - 1, next));
    setIndex(clamped);
    const track = trackRef.current;
    const card = track?.children[clamped];
    if (card instanceof HTMLElement) {
      card.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: flashcardScrollBehavior(prefersReducedMotion()),
      });
    }
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLButtonElement>, cardIndex: number) {
    if (!shouldHandleFlipKey(event.key)) return;
    event.preventDefault();
    setFlipped((current) => ({
      ...current,
      [cardIndex]: toggleFlip(current[cardIndex] === true),
    }));
  }

  return (
    <section className="av-flashcard" data-flashcard={id} aria-label={title}>
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
      <div className="av-flashcard-track" ref={trackRef}>
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
    </section>
  );
}
