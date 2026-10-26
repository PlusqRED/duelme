import type { Metadata } from 'next';
import { MyProfile } from '@/components/profile/MyProfile';
import { getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({
    path: '/profile',
    title: t('seo.profile.title'),
    description: t('seo.player.description'),
    indexed: false,
  });
}

export default function MyProfilePage() {
  return <MyProfile />;
}
