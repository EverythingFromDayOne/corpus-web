import type { RepoId } from '@/lib/repos';
import type { GraphSummary } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';

const POSITIONS: Record<RepoId, { x: number; y: number }> = {
  nextjs: { x: 56, y: 40 },
  react: { x: 220, y: 40 },
  angular: { x: 56, y: 130 },
  nestjs: { x: 220, y: 130 },
};

export function ConceptGraphTeaser({
  graph,
  messages,
}: {
  graph: GraphSummary;
  messages: Messages;
}) {
  const max = Math.max(1, ...graph.edges.map((edge) => edge.count));

  return (
    <section aria-labelledby="graph-heading" className="border-graphite bg-surface rounded-md border p-5">
      <p className="meta">{t(messages, 'home.graphEyebrow')}</p>
      <h2 id="graph-heading" className="mt-2 text-xl">
        {t(messages, 'home.graphHeading')}
      </h2>
      <p className="text-muted mt-2 text-sm">{t(messages, 'home.graphCaption')}</p>
      <svg
        viewBox="0 0 276 180"
        className="mt-6 h-auto w-full"
        role="img"
        aria-label={t(messages, 'home.graphCaption')}
      >
        {graph.edges
          .filter((edge) => edge.from !== edge.to)
          .map((edge) => {
            const from = POSITIONS[edge.from];
            const to = POSITIONS[edge.to];
            const width = 0.75 + (edge.count / max) * 2.5;
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                className="graph-edge text-graphite"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth={width}
              />
            );
          })}
        {graph.nodes.map((node) => {
          const pos = POSITIONS[node.repo];
          const label = t(messages, `corpora.${node.repo}.label`);
          return (
            <g key={node.repo}>
              <circle cx={pos.x} cy={pos.y} r="18" className="fill-raised stroke-graphite" strokeWidth="1" />
              <text
                x={pos.x}
                y={pos.y + 36}
                textAnchor="middle"
                className="fill-muted"
                fontFamily="var(--font-mono)"
                fontSize="10"
              >
                {label} · {node.count}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="meta mt-4 opacity-60">{t(messages, 'placeholders.graphFullView')}</p>
    </section>
  );
}
