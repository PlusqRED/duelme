'use client';

import { OpenSeat } from '@/components/arena/OpenSeat';
import { ReputationGauge } from '@/components/landing/ReputationGauge';
import { PageColumn } from '@/components/layout/PageColumn';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

/** Where every record starts: in the middle of New. */
const FIRST_STEP = { level: 'new', spot: 0.5 } as const;

/**
 * The own profile before signing in: an open seat where the face will be, which takes the reader
 * when they point at it, the way in, and the scale every player starts on.
 */
export function SignedOutProfile({ onSignIn }: { onSignIn: () => void }) {
  const { t } = useTranslation();

  return (
    <PageColumn>
      <div className="group/duel grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[clamp(16px,2.6vw,28px)] gap-y-5 [--face:clamp(84px,11vw,120px)]">
        <OpenSeat you={t('sim.you')} className="size-(--face)" />
        <div className="grid min-w-0 justify-items-start gap-2">
          <h1 className="text-h1 max-xs:text-h2">{t('profile.signedOutTitle')}</h1>
          <p className="max-w-[44ch] text-lg text-ink-2">{t('profile.signInToEdit')}</p>
        </div>
        <Button data-take-seat className="col-span-full justify-self-start" onClick={onSignIn}>
          {t('nav.connectWallet')}
        </Button>
      </div>
      <div className="@container/lab mt-[clamp(28px,4vw,44px)] grid max-w-[640px] gap-2 rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,28px)]">
        <p className="font-strong">{t('profile.startsAt')}</p>
        <ReputationGauge point={FIRST_STEP} change={null} face={<OpenSeat className="size-full border-[1.5px]" />} />
      </div>
    </PageColumn>
  );
}
