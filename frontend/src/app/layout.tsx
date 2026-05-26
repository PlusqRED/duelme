import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import {
  SEO_DESCRIPTION_EN,
  SEO_KEYWORDS,
  SEO_TITLE_EN,
  SEO_TITLE_TEMPLATE,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

// `alternates` (canonical + hreflang) is intentionally NOT set at the root
// layout: Next.js merges metadata top-down, so child routes that don't
// override would inherit the homepage canonical/hreflang. Each route sets
// its own; hreflang lives only on the homepage until language-specific URLs
// exist.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SEO_TITLE_EN,
    template: SEO_TITLE_TEMPLATE,
  },
  description: SEO_DESCRIPTION_EN,
  applicationName: SITE_NAME,
  keywords: [...SEO_KEYWORDS],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'games',
  classification: 'Crypto Gaming, PvP, Blockchain, Web3',
  openGraph: {
    title: SEO_TITLE_EN,
    description: SEO_DESCRIPTION_EN,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ru_RU'],
    // OG image auto-injected from `app/opengraph-image.tsx` (Next.js File Convention).
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TITLE_EN,
    description: SEO_DESCRIPTION_EN,
    // Twitter image auto-injected from `app/twitter-image.tsx`.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // Favicon is auto-registered by Next.js File Convention (`app/favicon.ico`).
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
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
        {/* Organization + WebApplication are global brand identity — safe on every page. */}
        {/* FAQ is intentionally NOT here: it must live only on the page where the */}
        {/* matching content is visible (homepage). See `app/page.tsx`. */}
        <JsonLd type="organization" />
        <JsonLd type="webApplication" />
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
