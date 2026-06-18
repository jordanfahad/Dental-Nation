'use client';

/**
 * Dashboard-segment error boundary. Any unhandled error in a tab (/, /impact,
 * …) renders this calm card WITH the surrounding TopNav still intact, instead
 * of taking down the page. Keeps the executive view graceful under failure.
 */
export default function AppSegmentError({
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
        margin: '64px auto',
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
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '10px 0', color: '#111' }}>
        We couldn’t load this view
      </h2>
      <p style={{ fontSize: 14, color: '#3F3F46', lineHeight: 1.55 }}>
        A brief data hiccup — your data is safe. Try again, or switch tabs.
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
