'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useTranslation } from '@/i18n/useTranslation';
import { addressGroups } from '@/lib/utils';

interface AddressGroupsProps {
  address: string;
}

/**
 * The wallet's address in groups of four, to check piece by piece against what the sending wallet
 * shows, and Copy, which copies it whole and says Copied only once the copy landed.
 */
export function AddressGroups({ address }: AddressGroupsProps) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyFeedback('wallet.copyFailed');

  return (
    <>
      <p className="text-note font-label text-ink-3">{t('topup.address')}</p>
      <p className="max-w-full text-base/[1.45] font-bold break-words tabular-nums [word-spacing:0.15em]">
        0x {addressGroups(address).join(' ')}
      </p>
      <Button type="button" variant="paper" size="sm" onClick={() => void copy(address)}>
        <Icon name={copied ? 'check' : 'copy'} className="size-[18px]" />
        {t(copied ? 'wallet.copied' : 'wallet.copy')}
      </Button>
    </>
  );
}
