'use client';

import type { ReactNode } from 'react';
import type { Hex } from 'viem';
import { ErrorDetails } from '@/components/sign/ErrorDetails';
import { SignActions } from '@/components/sign/SignActions';
import type { SigningModel } from '@/components/sign/signingModel';
import { TxLink } from '@/components/sign/SignTicks';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { FlowError } from '@/lib/flowError';
import { formatEthFee } from '@/lib/gasNeeds';
import { errorWords } from '@/lib/signingCopy';
import { cn } from '@/lib/utils';

const BADGES = {
  good: 'bg-good text-paper shadow-[0_0_0_8px_var(--color-good-soft)]',
  sun: 'bg-sun text-ink shadow-[0_0_0_8px_var(--color-sun-soft)]',
  error: 'bg-orange text-paper shadow-[0_0_0_8px_var(--color-orange-soft)]',
} as const;

function Result({ badge, mark, title, children }: { badge: keyof typeof BADGES; mark: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 pt-1.5 pb-1 text-center">
      <span className={cn('grid size-14 animate-pop place-items-center rounded-full text-figure font-extrabold', BADGES[badge])}>
        {mark}
      </span>
      <h3 className="mt-1.5 text-lead font-extrabold">{title}</h3>
      {children}
    </div>
  );
}

function Line({ children }: { children: ReactNode }) {
  return <p className="max-w-[46ch] text-ink-2">{children}</p>;
}

interface SignDoneProps {
  model: SigningModel;
  hash: Hex | null;
}

/** It went through: what changed and what to do next, what the network fee came to when the wallet paid it. */
export function SignDone({ model, hash }: SignDoneProps) {
  const { t, language } = useTranslation();
  const fee = model.signing.feePaidWei;

  return (
    <>
      <Result
        badge={model.copy.sun ? 'sun' : 'good'}
        mark={<Icon name={model.copy.sun ? 'trophy' : 'check'} className="size-7 stroke-[2.6]" />}
        title={model.doneTitle}
      >
        <Line>{model.doneText}</Line>
        {fee > 0n && (
          <p className="inline-flex items-start gap-1.5 text-left text-sm font-label text-pretty text-ink-3">
            <Icon name="fuel" className="mt-px size-4 flex-none" />
            {t('sign.done.fee', { eth: formatEthFee(fee, language) })}
          </p>
        )}
        {hash && <TxLink chainId={model.chainId} hash={hash} />}
      </Result>
      <SignActions centered>
        <Button type="button" size="lg" variant="navy" data-primary onClick={model.onDone}>
          {model.doneButton}
        </Button>
      </SignActions>
    </>
  );
}

interface SignErrorProps {
  model: SigningModel;
  error: FlowError;
  /** The step that stopped was a transaction the wallet sends itself. */
  sentByWallet: boolean;
  onRetry: () => void;
}

/**
 * It stopped: what happened, in orange, and that the money stayed where it was; the raw error under
 * the details. Try again only where another go can help.
 */
export function SignError({ model, error, sentByWallet, onRetry }: SignErrorProps) {
  const { t } = useTranslation();
  const words = errorWords(error.kind, model.copy, sentByWallet);
  const params = { network: model.chainName, wager: model.wager ?? '' };
  // An approve that went through stays, so only the move is left to try again.
  const isKept = model.approved && error.kind !== 'network' && model.wager !== undefined;

  return (
    <>
      <Result badge="error" mark="!" title={t(words.title, params)}>
        <Line>{t(words.text, params)}</Line>
        {words.isSafe && (
          <p className="inline-flex items-center gap-1.5 text-body-sm font-strong text-good-ink">
            <Icon name="shield-check" className="size-[18px]" />
            {t('sign.err.safe')}
          </p>
        )}
        {isKept && (
          <p className="inline-flex items-start gap-1.5 text-left text-sm font-label text-pretty">
            <Icon name="check" className="mt-px size-4 flex-none stroke-[2.6] text-good-ink" />
            {t('sign.err.kept', params)}
          </p>
        )}
        {error.detail && <ErrorDetails text={error.detail} />}
      </Result>
      <SignActions centered>
        {error.canRetry && (
          <Button type="button" size="lg" data-primary onClick={onRetry}>
            <Icon name="replay" />
            {t('sign.retry')}
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          variant={error.canRetry ? 'paper' : 'navy'}
          data-primary={error.canRetry ? undefined : true}
          onClick={model.onClose}
        >
          {model.backLabel}
        </Button>
      </SignActions>
    </>
  );
}
