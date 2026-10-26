'use client';

import { LostPage } from '@/components/layout/LostPage';
import { Button, buttonVariants } from '@/components/ui/button';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { useTranslation } from '@/i18n/useTranslation';

/** A screen that threw while it rendered: the header and footer stay, and the screen can be tried again. */
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useTranslation();

  return (
    <LostPage glyphs={['', '!', '']} title={t('error.title')} text={t('error.text')}>
      <Button variant="navy" onClick={retry}>
        {t('action.tryAgain')}
      </Button>
      <LocaleLink href="/" className={buttonVariants({ variant: 'paper' })}>
        {t('notFound.home')}
      </LocaleLink>
    </LostPage>
  );
}
