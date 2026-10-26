import type { Metadata } from 'next';
import { Closing } from '@/components/landing/Closing';
import { Faq } from '@/components/landing/Faq';
import { GettingStarted } from '@/components/landing/GettingStarted';
import { Hero } from '@/components/landing/Hero';
import { OpenDuels } from '@/components/landing/OpenDuels';
import { RecentDuels } from '@/components/landing/RecentDuels';
import { ReputationLab } from '@/components/landing/ReputationLab';
import { Safety } from '@/components/landing/Safety';
import { JsonLd } from '@/components/seo/JsonLd';
import { getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';
import { websiteSchema } from '@/lib/structuredData';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/', title: { absolute: t('seo.home.title') }, description: t('seo.site.description') });
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteSchema()} />
      <Hero />
      <OpenDuels />
      <RecentDuels />
      <GettingStarted />
      <Safety />
      <ReputationLab />
      <Faq />
      <Closing />
    </>
  );
}
