import type { ArticleSectionView } from './catalog';

const PART_HEADING = /^(part\s+\d+)\s+(.*)$/i;

export type RailPart = ArticleSectionView & {
  eyebrow: string;
  partTitle: string;
};

/**
 * Rail ticks follow the article and listing POCs: one tick per *part*,
 * not per heading. Catalog `sections` include depth-2 and depth-3
 * headings; only depth 2 is a part.
 */
export function railParts(
  sections: ArticleSectionView[],
  partEyebrow: (n: number) => string,
): RailPart[] {
  return sections
    .filter((section) => section.depth === 2)
    .map((section, index) => {
      const match = PART_HEADING.exec(section.heading.trim());
      return {
        ...section,
        eyebrow: match?.[1] ?? partEyebrow(index + 1),
        partTitle: match?.[2] ?? section.heading,
      };
    });
}
