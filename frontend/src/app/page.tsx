import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { RecentDuelsSection } from './RecentDuelsSection';
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
      <HeroSection />
      <HowItWorks />
      <RecentDuelsSection />
      <CtaSection />
    </>
  );
}
