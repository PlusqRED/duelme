'use client';

import Link from 'next/link';
import { LostPage } from '@/components/layout/LostPage';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

/** A screen that threw while it rendered: the header and footer stay, and the screen can be tried again. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation();

  return (
    <LostPage glyphs={['', '!', '']} title={t('error.title')} text={t('error.text')}>
      <Button variant="navy" onClick={reset}>
        {t('action.tryAgain')}
      </Button>
      <Link href="/" className={buttonVariants({ variant: 'paper' })}>
        {t('notFound.home')}
      </Link>
    </LostPage>
  );
}
