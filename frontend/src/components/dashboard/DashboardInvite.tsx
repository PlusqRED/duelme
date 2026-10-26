import type { ReactNode } from 'react';
import { BrandMark } from '@/components/identity/BrandMark';
import { buttonVariants } from '@/components/ui/button';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { useTranslation } from '@/i18n/useTranslation';

interface DashboardInviteProps {
  title: string;
  text: string;
  /** The way in: sign in for a guest, create a duel for a wallet with none yet. */
  action: ReactNode;
}

/** The page with no duels to show: what it would hold, the way in, and the public duels beside it. */
export function DashboardInvite({ title, text, action }: DashboardInviteProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="invite-title"
      className="grid justify-items-center gap-3 rounded-[28px] border border-line bg-paper px-[clamp(20px,4vw,40px)] py-[clamp(32px,6vw,56px)] text-center"
    >
      <BrandMark size="lg" />
      <h2 id="invite-title" className="mt-1.5 text-[clamp(1.5rem,1.2rem+1vw,2rem)] tracking-[-0.03em]">
        {title}
      </h2>
      <p className="max-w-[46ch] text-ink-2">{text}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-2.5 max-xs:self-stretch max-xs:*:flex-[1_1_100%]">
        {action}
        <LocaleLink href="/duels/public" className={buttonVariants({ variant: 'paper', size: 'lg' })}>
          {t('nav.publicDuels')}
        </LocaleLink>
      </div>
    </section>
  );
}
