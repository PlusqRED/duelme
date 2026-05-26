import type { Metadata } from 'next';
import { SideNav } from './SideNav';
import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { TrustSection } from './TrustSection';
import { OnboardingSection } from './OnboardingSection';
import { RecentDuelsSection } from './RecentDuelsSection';
import { PublicDuelsSection } from './PublicDuelsSection';
import { PopularGamesSection } from './PopularGamesSection';
import { ReputationSection } from './ReputationSection';
import { CtaSection } from './CtaSection';
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
      <SideNav />
      <HeroSection />
      <PublicDuelsSection />
      <RecentDuelsSection />
      <PopularGamesSection />
      <HowItWorks />
      <OnboardingSection />
      <TrustSection />
      <ReputationSection />
      <CtaSection />
    </>
  );
}
