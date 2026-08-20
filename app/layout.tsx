import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Fredoka, Instrument_Sans, JetBrains_Mono, Newsreader, Noto_Sans_TC } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans-latin', display: 'swap' });
const tc = Noto_Sans_TC({ subsets: ['latin'], weight: ['400', '500', '700', '900'], variable: '--font-tc', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono', display: 'swap' });
const display = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const round = Fredoka({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-round', display: 'swap' });

export const metadata: Metadata = {
  title: 'Quant Drill',
  description: '刷完一本 quant 面試題庫',
  // iOS ignores most of the manifest; these are what actually give you a
  // full-screen app after 加到主畫面.
  appleWebApp: {
    capable: true,
    title: 'Quant',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  // Next emits the standardised `mobile-web-app-capable`; older iOS only reads
  // the apple- prefixed one, and it costs nothing to ship both.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const vars = [sans, tc, mono, display, serif, round].map(f => f.variable).join(' ');
  return (
    <html lang="zh-Hant">
      <body className={vars} style={{ ['--font-sans' as string]: `var(--font-sans-latin), var(--font-tc)` }}>
        {children}
      </body>
    </html>
  );
}
