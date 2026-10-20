'use client';

import type { ReactNode } from 'react';
import { NeedsList, type EthNeed, type UsdtNeed } from '@/components/sign/NeedsList';
import { SignActions } from '@/components/sign/SignActions';
import { SignList, type ItemFee } from '@/components/sign/SignList';
import type { SigningModel } from '@/components/sign/signingModel';
import { TechnicalDetails } from '@/components/sign/TechnicalDetails';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { Note } from '@/components/ui/note';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from '@/i18n/useTranslation';

/** What the main button does instead of signing while the wallet lacks something. */
export interface CheckFix {
  label: string;
  icon: IconName;
  /** The faucet is answering: the button stays where it is, with a spinner. */
  busy: boolean;
  onFix: () => void;
}

interface SignCheckProps {
  model: SigningModel;
  fees: (ItemFee | null)[];
  usdt?: UsdtNeed;
  eth?: EthNeed;
  fix: CheckFix | null;
  onStart: () => void;
}

/**
 * Before the wallet is asked anything: what each signature or transaction does, what the wallet
 * needs for it, the facts as chips, and the details for whoever checks. The main button signs, or
 * first gets what is missing.
 */
export function SignCheck({ model, fees, usdt, eth, fix, onStart }: SignCheckProps) {
  const { t } = useTranslation();
  const isSelf = model.route === 'self';
  const count = model.items.length;

  return (
    <>
      <h3 className="text-lg font-extrabold">{t(isSelf ? 'sign.check.title.self' : 'sign.check.title')}</h3>
      <SignList items={model.items} fees={fees} />
      {(usdt || eth) && <NeedsList usdt={usdt} eth={eth} />}
      {model.blockedReason && (
        <Note icon="alert" tone="bad">
          {model.blockedReason}
        </Note>
      )}
      <p className="flex flex-wrap gap-1.5">
        <Fact icon="check" good>
          {t('sign.fee')}
        </Fact>
        <Fact icon="fuel">{t(isSelf ? 'sign.gas.self' : 'sign.gas')}</Fact>
        <Fact icon="pen">
          {isSelf
            ? t(count === 1 ? 'sign.count.tx.one' : 'sign.count.tx.many', { n: count })
            : t(count === 1 ? 'sign.count.one' : 'sign.count.many', { n: count })}
        </Fact>
      </p>
      <TechnicalDetails facts={model.facts} chainId={model.chainId} chainName={model.chainName} />
      <SignActions>
        {fix ? (
          <Button
            type="button"
            size="lg"
            data-primary
            onClick={fix.busy ? undefined : fix.onFix}
            aria-disabled={fix.busy || undefined}
            className="aria-disabled:cursor-default"
          >
            {fix.busy ? <Spinner /> : <Icon name={fix.icon} />}
            {fix.label}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            variant={model.copy.sun ? 'sun' : 'navy'}
            data-primary
            disabled={!model.canContinue}
            focusableWhenDisabled
            onClick={onStart}
          >
            <Icon name={model.copy.icon} />
            {model.button}
          </Button>
        )}
        <Button type="button" size="lg" variant="paper" onClick={model.onClose}>
          {t('sign.notNow')}
        </Button>
      </SignActions>
    </>
  );
}

function Fact({ icon, good = false, children }: { icon: IconName; good?: boolean; children: ReactNode }) {
  return (
    <Chip className={good ? 'h-7 gap-[5px] bg-good-soft px-2.5 text-good-ink' : 'h-7 gap-[5px] px-2.5'}>
      <Icon name={icon} className="size-[15px]" />
      {children}
    </Chip>
  );
}
