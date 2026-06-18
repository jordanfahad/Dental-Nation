'use client';

/**
 * Root-segment error boundary. Catches errors that bubble up from nested
 * layouts/pages (e.g. the app shell) so the boss sees a calm card, never a
 * raw crash screen. Renders inside the root layout (no <html> needed).
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        maxWidth: 460,
        margin: '72px auto',
        padding: 24,
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <p
        style={{
          fontSize: 12,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: '#71717A',
        }}
      >
        Temporarily unavailable
      </p>
      <h2 style={{ fontSize: 19, fontWeight: 600, margin: '10px 0', color: '#111' }}>
        We couldn’t load the dashboard
      </h2>
      <p style={{ fontSize: 14, color: '#3F3F46', lineHeight: 1.55 }}>
        This is usually a brief data hiccup. Your data is safe — please try again.
      </p>
      <button
        onClick={() => reset()}
        style={{
          marginTop: 16,
          padding: '9px 18px',
          borderRadius: 8,
          border: '1px solid #1F3A5F',
          background: '#1F3A5F',
          color: '#fff',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
