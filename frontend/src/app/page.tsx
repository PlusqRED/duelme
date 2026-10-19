import type { Metadata } from 'next';
import { TrustSection } from './TrustSection';
import { OnboardingSection } from './OnboardingSection';
import { ReputationSection } from './ReputationSection';
import { Closing } from '@/components/landing/Closing';
import { Hero } from '@/components/landing/Hero';
import { OpenDuels } from '@/components/landing/OpenDuels';
import { RecentDuels } from '@/components/landing/RecentDuels';
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
      <OpenDuels />
      <RecentDuels />
      <OnboardingSection />
      <TrustSection />
      <ReputationSection />
      <Closing />
    </>
  );
}
