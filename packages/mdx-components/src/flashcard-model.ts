export function nextCardIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, current + 1);
}

export function prevCardIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, current - 1);
}

export function toggleFlip(pressed: boolean): boolean {
  return !pressed;
}

export function shouldHandleFlipKey(key: string): boolean {
  return key === 'Enter' || key === ' ';
}

export function flashcardCardClassName(flipped: boolean): string {
  return flipped ? 'av-flashcard-card is-flipped' : 'av-flashcard-card';
}

export function flashcardFaceAriaHidden(face: 'front' | 'back', flipped: boolean): boolean {
  return face === 'front' ? flipped : !flipped;
}

export function flashcardScrollBehavior(reduceMotion: boolean): ScrollBehavior {
  return reduceMotion ? 'auto' : 'smooth';
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
