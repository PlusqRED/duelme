'use client';

import type { ReactNode } from 'react';
import { Disclosure } from '@/components/sign/Disclosure';
import type { SigningFacts } from '@/components/sign/signingModel';
import { useTranslation } from '@/i18n/useTranslation';
import { explorerLink } from '@/lib/explorer';
import { truncateAddress } from '@/lib/utils';

interface TechnicalDetailsProps {
  facts: SigningFacts;
  chainId: number;
  chainName: string;
}

/** For whoever wants to check before signing: the network, the contract and call, the token and what it may take. */
export function TechnicalDetails({ facts, chainId, chainName }: TechnicalDetailsProps) {
  const { t } = useTranslation();

  return (
    <Disclosure summary={t('sign.details')}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 px-3.5 pb-3.5 text-note">
        <Fact label={t('sign.details.network')}>{chainName}</Fact>
        <Fact label={t('sign.details.contract')}>
          <Address chainId={chainId} address={facts.contract} />
        </Fact>
        <Fact label={t('sign.details.function')}>
          <code className="font-label">{facts.functionName}</code>
        </Fact>
        {facts.token && (
          <Fact label={t('sign.details.token')}>
            <Address chainId={chainId} address={facts.token} />
          </Fact>
        )}
        {facts.allowance && (
          <Fact label={t('sign.details.allowance')}>{t('sign.details.allowance.value', { wager: facts.allowance })}</Fact>
        )}
      </dl>
    </Disclosure>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 font-label text-ink-2">{children}</dd>
    </>
  );
}

function Address({ chainId, address }: { chainId: number; address: `0x${string}` }) {
  const href = explorerLink(chainId, 'address', address);
  const shown = <span className="tabular-nums">{truncateAddress(address)}</span>;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" title={address} className="link">
      {shown}
    </a>
  ) : (
    shown
  );
}
