import type { Messages } from '@/lib/i18n';
import { t } from '@/lib/i18n';

type Props = {
  url: string;
  title: string;
  messages: Messages;
};

export function ShareButtons({ url, title, messages }: Props) {
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const tw = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <div
      role="group"
      aria-label={t(messages, 'article.share.label')}
      className="mt-4 flex flex-wrap gap-2"
    >
      <a
        href={fb}
        target="_blank"
        rel="noopener noreferrer"
        className="border-graphite hover:border-signal text-muted hover:text-signal inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm no-underline transition-colors duration-200"
      >
        <span aria-hidden="true">f</span>
        <span>{t(messages, 'article.share.facebook')}</span>
      </a>
      <a
        href={tw}
        target="_blank"
        rel="noopener noreferrer"
        className="border-graphite hover:border-signal text-muted hover:text-signal inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm no-underline transition-colors duration-200"
      >
        <span aria-hidden="true">𝕏</span>
        <span>{t(messages, 'article.share.twitter')}</span>
      </a>
    </div>
  );
}
