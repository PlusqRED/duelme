'use client';

import { Avatar } from '@/components/identity/Avatar';
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
  onDone: () => void;
  onRetry: () => void;
}

/**
 * A transfer after the form: the way the money goes from your wallet to the address, what is
 * happening, and how it ended.
 */
export function SendProgress({ stage, from, transfer, network, hash, error, onDone, onRetry }: SendProgressProps) {
  const { t, language } = useTranslation();
  const isOver = stage === 'done' || stage === 'rejected' || stage === 'failed';
  const detail = stage === 'failed' ? bestErrorDetail(error) : undefined;

  return (
    <>
      <Route stage={stage} from={from} to={transfer.to} />
      <div aria-live="polite" className="grid gap-3">
        {!isOver && (
          <p className="flex items-center gap-2.5 text-body-sm font-label text-ink-2">
            <Spinner />
            {stage === 'confirm' ? t('send.confirm') : t('send.sending', { network: network.name })}
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

interface RouteProps {
  stage: SendProgressProps['stage'];
  from: string;
  to: string;
}

/**
 * Your wallet, the track and the address. The plane crosses while the transfer is on the network
 * and lands on a check, or stays home when the transfer did not go.
 */
function Route({ stage, from, to }: RouteProps) {
  const isDone = stage === 'done';
  const isStopped = stage === 'rejected' || stage === 'failed';

  return (
    <div aria-hidden="true" className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center rounded-tile bg-canvas px-3 py-2.5">
      <Avatar address={from} tone="ink" className="size-10" />
      <span
        className={cn(
          'relative mx-2 h-[30px] before:absolute before:inset-x-0 before:top-1/2 before:border-t-2 before:transition-colors',
          isDone ? 'before:border-solid before:border-good' : 'before:border-dashed before:border-line-strong'
        )}
      >
        <span
          className={cn(
            'absolute inset-0',
            stage === 'sending' && 'animate-plane-fly',
            isDone && 'translate-x-[calc(100%-30px)]'
          )}
        >
          <span
            className={cn(
              'grid size-[30px] place-items-center rounded-full text-paper',
              isStopped ? 'bg-ink-3' : 'bg-ink',
              isDone && 'animate-plane-land'
            )}
          >
            <Icon name="send" className="size-4" />
          </span>
        </span>
      </span>
      <span className="relative">
        <Avatar address={to} tone="paper" className="size-10" />
        {(isDone || isStopped) && (
          <span
            className={cn(
              'absolute -right-[5px] -bottom-[5px] grid size-5 place-items-center rounded-full border-2 border-canvas text-paper',
              isDone ? 'animate-pop bg-good [animation-delay:0.2s]' : 'bg-orange'
            )}
          >
            <Icon name={isDone ? 'check' : 'x'} className="size-3 stroke-3" />
          </span>
        )}
      </span>
    </div>
  );
}
