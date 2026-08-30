type Props = {
  label: string;
  className?: string;
};

export function SectionDivider({ label, className }: Props) {
  return (
    <div
      role="separator"
      aria-label={label}
      className={`flex items-center justify-center gap-3 text-sm text-muted ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className="h-px w-16 rounded-full bg-gradient-to-r from-transparent to-graphite"
      />
      <span
        aria-hidden="true"
        className="h-1 w-1 rounded-full bg-graphite"
      />
      <span className="meta">{label}</span>
      <span
        aria-hidden="true"
        className="h-1 w-1 rounded-full bg-graphite"
      />
      <span
        aria-hidden="true"
        className="h-px w-16 rounded-full bg-gradient-to-l from-transparent to-graphite"
      />
    </div>
  );
}
