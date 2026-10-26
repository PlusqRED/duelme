import { LostPage } from '@/components/layout/LostPage';
import { buttonVariants } from '@/components/ui/button';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { getTranslation } from '@/i18n/serverTranslation';

export default async function NotFound() {
  const { t } = await getTranslation();

  return (
    <LostPage glyphs={['4', '0', '4']} title={t('notFound.title')} text={t('notFound.text')}>
      <LocaleLink href="/" className={buttonVariants({ variant: 'navy' })}>
        {t('notFound.home')}
      </LocaleLink>
      <LocaleLink href="/duels/public" className={buttonVariants({ variant: 'paper' })}>
        {t('recent.seeOpen')}
      </LocaleLink>
    </LostPage>
  );
}
