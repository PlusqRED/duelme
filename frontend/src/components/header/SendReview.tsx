'use client';

import type { ReactNode } from 'react';
import { QuietButton } from '@/components/header/QuietButton';
import { SendRoute } from '@/components/header/SendRoute';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Note } from '@/components/ui/note';
import type { WalletNetwork } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import type { Transfer } from '@/lib/sendUsdt';
import { formatUSDT } from '@/lib/utils';

interface SendReviewProps {
  /** The wallet the money leaves. */
  from: string;
  transfer: Transfer;
  network: WalletNetwork;
  onSend: () => void;
  onEdit: () => void;
}

/**
 * The last look at a transfer before it goes: the amount, the address written out whole and the
 * network. The wallet in the app sends without a prompt of its own, so this is where a wrong
 * address is caught, and the transfer goes only from here.
 */
export function SendReview({ from, transfer, network, onSend, onEdit }: SendReviewProps) {
  const { t, language } = useTranslation();
  const amount = formatUSDT(transfer.raw, language);

  return (
    <>
      <SendRoute stage="review" from={from} to={transfer.to} />
      <dl className="grid gap-3 rounded-tile border border-line px-4 py-3.5">
        <Row label={t('send.amount')}>
          <span className="text-figure/[1.1] font-extrabold tracking-[-0.03em] tabular-nums">
            {amount}
            <small className="ml-1 text-sm font-label tracking-normal text-ink-3">USDT</small>
          </span>
        </Row>
        <Row label={t('send.to')}>
          <span className="font-bold break-all tabular-nums">{transfer.to}</span>
        </Row>
        <Row label={t('send.review.network')}>
          <span className="font-bold">{network.name}</span>
        </Row>
      </dl>
      <Note icon="alert">{t('send.check')}</Note>
      <Button size="lg" autoFocus onClick={onSend} className="w-full">
        <Icon name="send" className="size-[18px]" />
        {t('send.button', { amount })}
      </Button>
      <QuietButton icon="pen" onClick={onEdit} className="-mt-1 justify-self-center">
        {t('send.review.edit')}
      </QuietButton>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
