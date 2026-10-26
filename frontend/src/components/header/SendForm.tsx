'use client';

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Note } from '@/components/ui/note';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { USDT_DECIMALS } from '@/lib/constants';
import { faucetEthNote, type FaucetOffer } from '@/lib/faucetApi';
import { checkTransfer, type FreeTransferStatus, type SendDraft, type SendProblems, type Transfer } from '@/lib/sendUsdt';
import { formatEth, formatTime, formatUSDT } from '@/lib/utils';
import { readingFigure, readingRaw } from '@/lib/walletBalances';
import type { WriteRoute } from '@/lib/writeRoute';

const TO_PROBLEM: Record<NonNullable<SendProblems['to']>, TranslationKey> = {
  address: 'send.err.address',
  self: 'send.err.self',
};

/** The id of the line that says what is wrong with a field, which the field points to. */
function errorId(fieldId: string): string {
  return `${fieldId}-error`;
}

interface SendFormProps {
  address: string;
  network: NetworkBalances;
  faucetOffer: FaucetOffer;
  /** Who pays the transfer's fee now: DuelMe's relayer, once a day, or the wallet in ETH. */
  route: WriteRoute;
  /** Whether today's relayed transfer is still there, and when the next one opens. */
  freeTransfer: { status: FreeTransferStatus; nextAt: number };
  draft: SendDraft;
  onDraft: (draft: SendDraft) => void;
  onSubmit: (transfer: Transfer) => void;
}

/**
 * Where to and how much. Its checks wait for the first try to go on, then follow every keystroke;
 * nothing is sent from here, the transfer is looked over first.
 */
export function SendForm({ address, network, faucetOffer, route, freeTransfer, draft, onDraft, onSubmit }: SendFormProps) {
  const { t, language } = useTranslation();
  const ids = useId();
  const toId = `${ids}-to`;
  const amountId = `${ids}-amount`;
  const toInput = useRef<HTMLInputElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const [isTried, setIsTried] = useState(false);
  const usdtRaw = readingRaw(network.usdt);
  const check = checkTransfer(draft, { address, usdtRaw, ethWei: readingRaw(network.eth), route });
  const problems = isTried ? check.problems : {};

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsTried(true);
    if (check.problems.to) {
      toInput.current?.focus();
    } else if (check.problems.amount) {
      amountInput.current?.focus();
    } else if (check.transfer) {
      onSubmit(check.transfer);
    }
  }

  function sendAll() {
    if (usdtRaw !== null) {
      onDraft({ ...draft, amount: formatUnits(usdtRaw, USDT_DECIMALS) });
    }
    amountInput.current?.focus();
  }

  const toError = problems.to && t(TO_PROBLEM[problems.to]);
  const amountError =
    problems.amount === 'empty'
      ? t('send.err.empty')
      : problems.amount === 'tooMuch' && usdtRaw !== null
        ? t('send.err.amount', { amount: formatUSDT(usdtRaw, language) })
        : undefined;
  const ethError =
    freeTransfer.status === 'used'
      ? t('send.err.eth.used', { network: network.chain.name, time: formatTime(freeTransfer.nextAt, language) })
      : t('send.err.eth', { network: network.chain.name });
  const feeNote =
    route === 'relay' ? t('send.fee.relayed') : t('send.fee', { eth: readingFigure(network.eth, (wei) => formatEth(wei, language)) });

  return (
    <form noValidate onSubmit={submit} className="grid gap-3">
      <Field id={toId} label={t('send.to')} error={toError}>
        <Input
          ref={toInput}
          id={toId}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('send.to.placeholder')}
          value={draft.to}
          onChange={(event) => onDraft({ ...draft, to: event.target.value })}
          aria-invalid={toError ? true : undefined}
          aria-describedby={toError ? errorId(toId) : undefined}
          className="text-body-sm tabular-nums"
        />
      </Field>
      <Field id={amountId} label={t('send.amount')} error={amountError}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <Input
            ref={amountInput}
            id={amountId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={draft.amount}
            onChange={(event) => onDraft({ ...draft, amount: event.target.value })}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={amountError ? errorId(amountId) : undefined}
            className="tabular-nums"
          />
          <span className="text-sm font-label text-ink-3">USDT</span>
          <button
            type="button"
            onClick={sendAll}
            className="min-h-11 min-w-[52px] cursor-pointer rounded-full border-[1.5px] border-line-strong bg-paper px-3 text-sm font-bold text-ink hover:border-ink-3"
          >
            {t('send.max')}
          </button>
        </div>
      </Field>
      <Note icon={problems.eth ? 'alert' : 'fuel'} tone={problems.eth ? 'bad' : 'quiet'}>
        {problems.eth ? ethError + faucetEthNote(faucetOffer, language, t) : feeNote}
      </Note>
      <Button type="submit" size="lg" className="mt-1 w-full">
        {t('send.next')}
        <Icon name="chevron-right" />
      </Button>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-label">
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId(id)} className="text-sm font-label text-orange-ink">
          {error}
        </p>
      )}
    </div>
  );
}
