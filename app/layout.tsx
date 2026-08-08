import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Dental Nation — Performance Report',
  description: 'Dental Nation Group · performance reporting platform',
  robots: { index: false, follow: false },
  // Mirrors the live dentalnation.com favicon (server-side proxy with a
  // bundled tooth-and-star fallback) so the dashboard tab matches the brand.
  icons: { icon: '/api/brand/favicon', shortcut: '/api/brand/favicon' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
