import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Static OG / Twitter card image (1200×630 — Slack, Discord, Twitter, LinkedIn
// all consume this size; Slack & Discord both resize down from this).
//
// Single static design — no per-article variation. Article counts are
// pinned to the values present at the last catalogue measurement
// (196 / 18 / 2) so the rendered PNG is stable across deploys even if
// the live counts drift by ±1.
//
// Mirrors the home-hero palette discipline: `--color-ink` ground
// + warm `--color-signal-soft` bloom upper-right + cool `--color-cool`
// glow lower-left. All three hex values are derived from the same
// `@theme` tokens in `packages/ui/src/tokens.css` (D28) so the OG card
// and the live hero read as the same surface family, not a parallel
// palette. No `color-mix()` here because Satori (the engine behind
// `next/og`) only accepts literal colours in `style.backgroundImage`.
//
// Fonts: `Archivo` (display) and `IBM Plex Mono` (eyebrow + counters),
// bundled locally at `apps/web/public/og-fonts/` so the build is
// deterministic — Google Fonts gstatic URLs are hashed per build and
// 404 if pinned across versions. Both fonts are also declared in
// `apps/web/app/layout.tsx` via `next/font/google` for the live site;
// the OG card uses the same family so the headline reads identically.
//
// Pinned counts: the catalogue measurement is 196 adapting articles
// across 4 corpora, 18 lessons, 2 courses. These update only when the
// `progress.md` census refreshes; revisit at the next `pnpm build`
// cycle to keep the OG card in sync.

export const size = { width: 1200, height: 630 } as const;
export const contentType = 'image/png';
export const alt =
  'corpus.web — every claim resolves. A verified reference corpus: 196 articles across 4 corpora.';

// No `export const dynamic` here: Cache Components (nextConfig.cacheComponents
// = true) forbids route segment config `dynamic`. The `opengraph-image.tsx`
// file convention is implicitly static by default — Next.js generates the
// PNG once at build time and serves the cached bytes for every request.

export default async function OpengraphImage() {
  const [archivoBold, ibmPlexMono] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/og-fonts/Archivo-Bold.ttf')),
    readFile(path.join(process.cwd(), 'public/og-fonts/IBMPlexMono-Regular.ttf')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0e141b',
          backgroundImage:
            'radial-gradient(ellipse 720px 480px at 100% 0%, rgba(242,199,130,0.30) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 680px 440px at 0% 100%, rgba(106,169,216,0.22) 0%, transparent 60%)',
          padding: '72px 80px',
          color: '#e7edf4',
          fontFamily: 'Archivo, system-ui, sans-serif',
        }}
      >
        {/* Top row: eyebrow + wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '20px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#7c8b9c',
          }}
        >
          <span>Four corpora · one graph</span>
          <span style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ color: '#e4a548' }}>corpus</span>
            <span>.web</span>
          </span>
        </div>

        {/* Centre: title + thesis */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            maxWidth: '900px',
          }}
        >
          <div
            style={{
              fontSize: '116px',
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: '-0.025em',
              backgroundImage:
                'linear-gradient(180deg, #e7edf4 0%, #e4a548 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
            }}
          >
            Every claim resolves.
          </div>
          <div
            style={{
              fontSize: '28px',
              lineHeight: 1.4,
              color: '#b9c5d2',
              display: 'flex',
              maxWidth: '900px',
            }}
          >
            Every claim traces to official docs, framework source, or a measurement someone ran.
          </div>
        </div>

        {/* Bottom row: census + organisation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '22px',
            color: '#b9c5d2',
          }}
        >
          <div style={{ display: 'flex', gap: '32px' }}>
            <span>
              <span style={{ color: '#e4a548' }}>196</span>
              <span style={{ color: '#7c8b9c', marginLeft: '8px' }}>articles</span>
            </span>
            <span>
              <span style={{ color: '#e4a548' }}>4</span>
              <span style={{ color: '#7c8b9c', marginLeft: '8px' }}>corpora</span>
            </span>
            <span>
              <span style={{ color: '#e4a548' }}>18</span>
              <span style={{ color: '#7c8b9c', marginLeft: '8px' }}>lessons</span>
            </span>
          </div>
          <span style={{ color: '#7c8b9c', letterSpacing: '0.04em' }}>
            EverythingFromDayOne
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Archivo',
          data: archivoBold,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'IBM Plex Mono',
          data: ibmPlexMono,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  );
}
