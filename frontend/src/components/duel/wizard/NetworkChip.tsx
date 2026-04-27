'use client';

import { Network } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import type { ChainKey } from '@/lib/defaultChain';

interface NetworkChipProps {
  chainKey: ChainKey;
}

export function NetworkChip({ chainKey }: NetworkChipProps) {
  const { t } = useTranslation();
  const chainName = SUPPORTED_CHAINS[chainKey].name;
  return (
    <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      <Network className="h-3 w-3" />
      {t('wizard.network.chip', { chain: chainName })}
    </div>
  );
}
