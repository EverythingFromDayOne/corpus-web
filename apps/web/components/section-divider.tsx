type Props = {
  label: string;
  className?: string;
};

/**
 * Decorative section anchor (design-spec §7):
 * `<line> + <dot> + <label> + <dot> + <line>` with subtle blur so the
 * line/dot reads as "luminous" rather than a flat hairline. Used between
 * major sections on `/en` and above the article grid on `/en/blog`.
 *
 * Pure CSS / inline SVG-free — Tailwind v4 utilities + the
 * `--marketing-accent-line` and `--marketing-accent-label-text` tokens
 * (defined in `packages/ui/src/tokens.css`). The label is announced to
 * assistive tech via `role="separator"` + `aria-label`; the dots and
 * lines are decorative (`aria-hidden`).
 */
export function SectionDivider({ label, className }: Props) {
  return (
    <div
      role="separator"
      aria-label={label}
      className={`flex items-center justify-center gap-3 text-sm ${className ?? ''}`}
      style={{ color: 'var(--marketing-accent-label-text)' }}
    >
      <span
        aria-hidden="true"
        className="h-px w-[72px] rounded-[100px] bg-gradient-to-r from-transparent to-[color:var(--marketing-accent-line)]"
        style={{ filter: 'blur(0.5px)' }}
      />
      <span
        aria-hidden="true"
        className="block h-[5px] w-[5px] rounded-full bg-[color:var(--marketing-accent-line)]"
        style={{ filter: 'blur(1px)' }}
      />
      <span className="meta whitespace-nowrap">{label}</span>
      <span
        aria-hidden="true"
        className="block h-[5px] w-[5px] rounded-full bg-[color:var(--marketing-accent-line)]"
        style={{ filter: 'blur(1px)' }}
      />
      <span
        aria-hidden="true"
        className="h-px w-[72px] rounded-[100px] bg-gradient-to-l from-transparent to-[color:var(--marketing-accent-line)]"
        style={{ filter: 'blur(0.5px)' }}
      />
    </div>
  );
}
