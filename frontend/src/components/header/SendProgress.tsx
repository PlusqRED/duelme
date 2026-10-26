'use client';

import { SendRoute } from '@/components/header/SendRoute';
import { ErrorDetails } from '@/components/sign/ErrorDetails';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { WalletNetwork } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import { faucetEthNote, type FaucetOffer } from '@/lib/faucetApi';
import { SEND_ERROR_WORDS, suggestsEth, type SendError } from '@/lib/sendError';
import type { SendStage, Transfer } from '@/lib/sendUsdt';
import { cn, formatTime, formatUSDT, truncateAddress } from '@/lib/utils';

interface SendProgressProps {
  stage: SendStage;
  /** The wallet the money leaves. */
  from: string;
  transfer: Transfer;
  network: WalletNetwork;
  hash?: `0x${string}`;
  /** Why the transfer stopped, once it has. */
  failure: SendError | null;
  /** When the next relayed transfer opens, for an answer that the day's is spent. */
  nextFreeAt: number;
  /** What the faucet offers, for an answer that asks for ETH on the test network. */
  faucetOffer: FaucetOffer;
  /** The wallet in the app, which sends without a prompt of its own: nothing waits on the player. */
  isInAppWallet: boolean;
  onDone: () => void;
  onRetry: () => void;
}

/**
 * A transfer after the form: the way the money goes from your wallet to the address, what is
 * happening, and how it ended — on a failure, what happened and what to do about it, with the raw
 * error folded away to copy.
 */
export function SendProgress({ stage, from, transfer, network, hash, failure, nextFreeAt, faucetOffer, isInAppWallet, onDone, onRetry }: SendProgressProps) {
  const { t, language } = useTranslation();
  const isDone = stage === 'done';
  const isOver = isDone || stage === 'failed';
  const words = SEND_ERROR_WORDS[failure?.kind ?? 'error'];
  const canRetry = failure?.canRetry ?? true;
  const offersEth = failure && suggestsEth(failure.kind) ? faucetEthNote(faucetOffer, language, t) : '';

  return (
    <>
      <SendRoute stage={stage} from={from} to={transfer.to} />
      <div aria-live="polite" className="grid gap-3">
        {!isOver && (
          <p className="flex items-center gap-2.5 text-body-sm font-label text-ink-2">
            <Spinner />
            {stage !== 'confirm' ? t('send.sending', { network: network.name }) : t(confirmKey(transfer, isInAppWallet))}
          </p>
        )}
        {isOver && (
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-2xl p-3.5 font-bold',
              isDone ? 'bg-good-soft text-good-ink' : 'bg-orange-wash text-orange-ink ring-[1.5px] ring-orange-line ring-inset'
            )}
          >
            <Icon name={isDone ? 'check' : 'alert'} className="mt-px size-5 stroke-[2.6]" />
            <div className="grid gap-1">
              <p>
                {isDone
                  ? t('send.done', { amount: formatUSDT(transfer.raw, language), to: truncateAddress(transfer.to) })
                  : t(words.title)}
              </p>
              {!isDone && (
                <p className="text-sm font-normal">
                  {t(words.text, { network: network.name, time: formatTime(nextFreeAt, language) })}
                  {offersEth}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      {!isDone && failure?.detail && <ErrorDetails text={failure.detail} />}
      {isDone && hash && (
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
        <Button size="lg" autoFocus onClick={isDone || !canRetry ? onDone : onRetry} className="w-full">
          {isDone ? t('send.again') : canRetry ? t('action.tryAgain') : t('send.back')}
        </Button>
      )}
    </>
  );
}

/** What the wallet is doing before the transfer is on the network: signing it for DuelMe, or sending it. */
function confirmKey(transfer: Transfer, isInAppWallet: boolean) {
  if (transfer.route === 'relay') {
    return isInAppWallet ? 'send.confirm.relayed.inApp' : 'send.confirm.relayed';
  }
  return isInAppWallet ? 'send.confirm.inApp' : 'send.confirm';
}
