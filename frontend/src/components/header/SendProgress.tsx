'use client';

import { SendRoute } from '@/components/header/SendRoute';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { WalletNetwork } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import { bestErrorDetail } from '@/lib/errorDetails';
import type { SendStage, Transfer } from '@/lib/sendUsdt';
import { cn, formatUSDT, truncateAddress } from '@/lib/utils';

interface SendProgressProps {
  stage: SendStage;
  /** The wallet the money leaves. */
  from: string;
  transfer: Transfer;
  network: WalletNetwork;
  hash?: `0x${string}`;
  error: Error | null;
  /** The wallet in the app, which sends without a prompt of its own: nothing waits on the player. */
  isInAppWallet: boolean;
  onDone: () => void;
  onRetry: () => void;
}

/**
 * A transfer after the form: the way the money goes from your wallet to the address, what is
 * happening, and how it ended.
 */
export function SendProgress({ stage, from, transfer, network, hash, error, isInAppWallet, onDone, onRetry }: SendProgressProps) {
  const { t, language } = useTranslation();
  const isOver = stage === 'done' || stage === 'rejected' || stage === 'failed';
  const detail = stage === 'failed' ? bestErrorDetail(error) : undefined;

  return (
    <>
      <SendRoute stage={stage} from={from} to={transfer.to} />
      <div aria-live="polite" className="grid gap-3">
        {!isOver && (
          <p className="flex items-center gap-2.5 text-body-sm font-label text-ink-2">
            <Spinner />
            {stage !== 'confirm'
              ? t('send.sending', { network: network.name })
              : t(isInAppWallet ? 'send.confirm.inApp' : 'send.confirm')}
          </p>
        )}
        {isOver && (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-2xl p-3.5 font-bold',
              stage === 'done' ? 'bg-good-soft text-good-ink' : 'bg-orange-wash text-orange-ink ring-[1.5px] ring-orange-line ring-inset'
            )}
          >
            <Icon name={stage === 'done' ? 'check' : 'alert'} className="mt-px size-5 stroke-[2.6]" />
            <div className="grid gap-1">
              <p>
                {stage === 'done'
                  ? t('send.done', { amount: formatUSDT(transfer.raw, language), to: truncateAddress(transfer.to) })
                  : t(stage === 'rejected' ? 'send.rejected' : 'send.failed')}
              </p>
              {detail && <p className="text-sm font-normal break-words">{detail}</p>}
            </div>
          </div>
        )}
      </div>
      {stage === 'done' && hash && (
        <a
          href={`${network.explorer}/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="link inline-flex min-h-11 items-center gap-2 justify-self-start text-sm"
        >
          <span className="tabular-nums">{truncateAddress(hash)}</span>
          {t('send.tx')}
          <Icon name="external" className="size-4" />
        </a>
      )}
      {isOver && (
        <Button size="lg" autoFocus onClick={stage === 'done' ? onDone : onRetry} className="w-full">
          {stage === 'done' ? t('send.again') : t('action.tryAgain')}
        </Button>
      )}
    </>
  );
}
