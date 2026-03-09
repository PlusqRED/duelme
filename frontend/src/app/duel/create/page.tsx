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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <CreateDuelForm />
      </div>
    </>
  );
}
