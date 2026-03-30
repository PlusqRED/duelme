import { SideNav } from './SideNav';
import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { OnboardingSection } from './OnboardingSection';
import { TrustSection } from './TrustSection';
import { RecentDuelsSection } from './RecentDuelsSection';
import { PopularGamesSection } from './PopularGamesSection';
import { HonorSection } from './HonorSection';
import { ReputationSection } from './ReputationSection';
import { CtaSection } from './CtaSection';
import { JsonLd } from '@/components/seo/JsonLd';

export default function HomePage() {
  return (
    <>
      <JsonLd
        type="breadcrumb"
        data={{
          items: [{ name: 'Home', url: '/' }],
        }}
      />
      <SideNav />
      <HeroSection />
      <HowItWorks />
      <RecentDuelsSection />
      <PopularGamesSection />
      <TrustSection />
      <OnboardingSection />
      <HonorSection />
      <ReputationSection />
      <CtaSection />
    </>
  );
}
