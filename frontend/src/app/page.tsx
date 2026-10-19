import type { Metadata } from 'next';
import { TrustSection } from './TrustSection';
import { OnboardingSection } from './OnboardingSection';
import { RecentDuelsSection } from './RecentDuelsSection';
import { PublicDuelsSection } from './PublicDuelsSection';
import { PopularGamesSection } from './PopularGamesSection';
import { ReputationSection } from './ReputationSection';
import { Closing } from '@/components/landing/Closing';
import { Hero } from '@/components/landing/Hero';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
      'ru-RU': '/',
      'x-default': '/',
    },
  },
};

export default function HomePage() {
  return (
    <>
      {/* FAQ schema lives here (not in root layout) so it's only emitted on the */}
      {/* page that's expected to carry FAQ content per Google's policy. */}
      <JsonLd type="faq" />
      <Hero />
      <PublicDuelsSection />
      <RecentDuelsSection />
      <PopularGamesSection />
      <OnboardingSection />
      <TrustSection />
      <ReputationSection />
      <Closing />
    </>
  );
}
