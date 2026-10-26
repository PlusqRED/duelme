import type { Metadata } from 'next';
import { Closing } from '@/components/landing/Closing';
import { GettingStarted } from '@/components/landing/GettingStarted';
import { Hero } from '@/components/landing/Hero';
import { OpenDuels } from '@/components/landing/OpenDuels';
import { RecentDuels } from '@/components/landing/RecentDuels';
import { ReputationLab } from '@/components/landing/ReputationLab';
import { Safety } from '@/components/landing/Safety';

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
      <Hero />
      <OpenDuels />
      <RecentDuels />
      <GettingStarted />
      <Safety />
      <ReputationLab />
      <Closing />
    </>
  );
}
