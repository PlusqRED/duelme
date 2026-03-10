import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JsonLd } from '@/components/seo/JsonLd';

export const dynamic = 'force-dynamic';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DuelMe \u2014 P2P Gaming Duels for USDT',
    template: '%s | DuelMe',
  },
  description:
    'Challenge anyone to a PvP gaming duel for USDT. Create a duel, share the link, play your game, and claim your winnings. Powered by smart contracts on Arbitrum & Polygon.',
  metadataBase: new URL('https://duelme.fun'),
  openGraph: {
    title: 'DuelMe \u2014 P2P Gaming Duels for USDT',
    description:
      'Challenge anyone to a PvP gaming duel for USDT. Smart contract escrow. Instant payouts.',
    url: 'https://duelme.fun',
    siteName: 'DuelMe',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DuelMe \u2014 P2P Gaming Duels for USDT',
    description:
      'Challenge anyone to a PvP gaming duel for USDT. Smart contract escrow. Instant payouts.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAFAFA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <JsonLd type="website" />
        <Providers>
          <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
