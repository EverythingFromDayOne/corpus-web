import type { Messages } from '@/lib/i18n';
import { t } from '@/lib/i18n';

type IconName = 'cap' | 'book' | 'sparkle';

type IconProps = {
  name: IconName;
};

// Inline SVG icons — 24×24, stroke uses currentColor.
// Vendored in this file (instead of importing from lucide-react) because
// lucide-react is not in apps/web deps; the project's no-new-npm-deps
// rule outweighs the spec's "use lucide-react" instruction. Glyphs are
// traced from the lucide-react set to stay visually compatible.
function Icon({ name }: IconProps) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'cap') {
    return (
      <svg {...common}>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
      </svg>
    );
  }
  if (name === 'book') {
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="m9 10 2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

type Props = {
  messages: Messages;
};

export function AudienceCards({ messages }: Props) {
  const cards: Array<{ icon: IconName; title: string; body: string }> = [
    {
      icon: 'cap',
      title: t(messages, 'home.audience.card1.title'),
      body: t(messages, 'home.audience.card1.body'),
    },
    {
      icon: 'book',
      title: t(messages, 'home.audience.card2.title'),
      body: t(messages, 'home.audience.card2.body'),
    },
    {
      icon: 'sparkle',
      title: t(messages, 'home.audience.card3.title'),
      body: t(messages, 'home.audience.card3.body'),
    },
  ];

  return (
    <section className="ls-audience" aria-labelledby="audience-heading">
      <p className="meta ls-aud-eyebrow">{t(messages, 'home.audience.heading')}</p>
      <div className="ls-aud-grid">
        {cards.map((card) => (
          <article key={card.title} className="ls-aud-card">
            <div className="ls-aud-icon" aria-hidden="true">
              <Icon name={card.icon} />
            </div>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
