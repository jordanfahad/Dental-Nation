'use client';

/**
 * Ultimate safety net. Catches any error thrown in the ROOT layout/app that no
 * nearer boundary handled, and renders a calm fallback INSTEAD of the raw
 * "Application error: a server-side exception has occurred" screen. Must render
 * its own <html>/<body>. Inline styles only, so it shows even if CSS fails.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          background: '#FAFAFA',
          color: '#111',
          margin: 0,
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <p
              style={{
                fontSize: 12,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: '#71717A',
                margin: 0,
              }}
            >
              Dental Nation
            </p>
            <h1 style={{ fontSize: 21, fontWeight: 600, margin: '12px 0 8px' }}>
              This view is temporarily unavailable
            </h1>
            <p style={{ fontSize: 14, color: '#3F3F46', lineHeight: 1.55, margin: 0 }}>
              A brief hiccup loading the latest data. Your data is safe — please refresh.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: 18,
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #1F3A5F',
                background: '#1F3A5F',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
