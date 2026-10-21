import Link from 'next/link';
import { LostPage } from '@/components/layout/LostPage';
import { buttonVariants } from '@/components/ui/button';
import { getTranslation } from '@/i18n/serverTranslation';

export default async function NotFound() {
  const { t } = await getTranslation();

  return (
    <LostPage glyphs={['4', '0', '4']} title={t('notFound.title')} text={t('notFound.text')}>
      <Link href="/" className={buttonVariants({ variant: 'navy' })}>
        {t('notFound.home')}
      </Link>
      <Link href="/duels/public" className={buttonVariants({ variant: 'paper' })}>
        {t('recent.seeOpen')}
      </Link>
    </LostPage>
  );
}
