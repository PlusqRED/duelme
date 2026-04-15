import { SideNav } from './SideNav';
import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { OnboardingSection } from './OnboardingSection';
import { RecentDuelsSection } from './RecentDuelsSection';
import { PublicDuelsSection } from './PublicDuelsSection';
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
      <OnboardingSection />
      <HonorSection />
      <ReputationSection />
      <PublicDuelsSection />
      <RecentDuelsSection />
      <PopularGamesSection />
      <CtaSection />
    </>
  );
}
