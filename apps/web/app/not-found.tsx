import Link from 'next/link';

/**
 * App-wide not-found page. Next.js falls through to this for routes that
 * don't match any segment-level `not-found.tsx`. The dynamic segment
 * routes ([locale]/blog/[corpus]/[slug], [locale]/courses/[course]/lessons/[slug])
 * use their own segment-level not-found.tsx files; this acts as the
 * outermost fallback.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', color: '#171717', background: '#fff' }}>
        <main style={{ maxWidth: '32rem', margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600, margin: 0 }}>
            Not found
          </h1>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            The page you&rsquo;re looking for doesn&rsquo;t exist.
          </p>
          <nav style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
            <Link
              href="/en"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                border: '1px solid #171717',
                borderRadius: '0.375rem',
                color: '#171717',
                textDecoration: 'none',
              }}
            >
              Go home
            </Link>
          </nav>
        </main>
      </body>
    </html>
  );
}
