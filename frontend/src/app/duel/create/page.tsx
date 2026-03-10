import type { Metadata } from 'next';
import { CreateDuelForm } from '@/components/duel/CreateDuelForm';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Create a Duel',
  description:
    'Create a PvP gaming duel for USDT. Set your wager, share the link with your opponent, and compete for the pot.',
};

export default function CreateDuelPage() {
  return (
    <>
      <JsonLd
        type="breadcrumb"
        data={{
          items: [
            { name: 'Home', url: '/' },
            { name: 'Create Duel', url: '/duel/create' },
          ],
        }}
      />
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-slate-50 bg-dots">
        {/* Top gradient fade */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-indigo-50/80 to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <CreateDuelForm />
        </div>
      </div>
    </>
  );
}
