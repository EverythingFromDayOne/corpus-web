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
