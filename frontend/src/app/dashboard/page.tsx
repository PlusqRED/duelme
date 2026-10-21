import Link from 'next/link';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { getTranslation } from '@/i18n/serverTranslation';

export default async function DashboardPage() {
  const { t } = await getTranslation();

  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-1 pb-18">
      <div className="mt-1.5 mb-[22px] flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <h1 className="text-[clamp(2rem,1.5rem+1.6vw,2.75rem)]/[1.05] tracking-[-0.035em]">{t('nav.dashboard')}</h1>
        <Link href="/duel/create" className={buttonVariants({ className: 'mb-1 max-xs:flex-[1_1_100%]' })}>
          <Icon name="plus" />
          {t('hero.cta')}
        </Link>
      </div>
      <Dashboard />
    </div>
  );
}
