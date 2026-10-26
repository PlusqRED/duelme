import type { Metadata, Viewport } from 'next';
import { Geologica } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Header } from '@/components/header/Header';
import { Footer } from '@/components/layout/Footer';
import { JsonLd } from '@/components/seo/JsonLd';
import { getTranslation } from '@/i18n/serverTranslation';
import { brandColors } from '@/lib/brandColors';
import { getRelayerStatus } from '@/lib/relayerConfig';
import { SITE_NAME, SITE_URL, TITLE_TEMPLATE } from '@/lib/constants';
import { organizationSchema, webApplicationSchema } from '@/lib/structuredData';

export const dynamic = 'force-dynamic';

const geologica = Geologica({
  variable: '--font-geologica',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

/**
 * What every page shares, in its language. The tags that name one page — its address, the same page
 * in the other language, its share preview, whether search engines list it — are each page's own
 * (`lib/pageMetadata.ts`): set here, they would reach every page that forgot them, home page address
 * included, and a missing page would carry a robots tag beside the one Next.js gives it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('seo.home.title'), template: TITLE_TEMPLATE },
    description: t('seo.site.description'),
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    // The favicon and the home-screen icon come from `app/icon.tsx` and `app/apple-icon.tsx`.
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    verification: {
      yandex: '0277876dfbec9b54',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: brandColors.canvas,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { t, language } = await getTranslation();

  return (
    <html lang={language} className={geologica.variable} data-scroll-behavior="smooth">
      <body>
        {/* Who runs the site and what it is: the same on every page. */}
        <JsonLd data={organizationSchema(t('seo.site.description'))} />
        <JsonLd data={webApplicationSchema(t('seo.site.description'))} />
        <Providers language={language} relayerStatus={getRelayerStatus()}>
          <div className="flex min-h-dvh flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
