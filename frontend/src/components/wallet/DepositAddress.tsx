'use client';

import { useMemo } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useTranslation } from '@/i18n/useTranslation';
import { buildQrPath, QR_QUIET_ZONE } from '@/lib/addressQr';

interface DepositAddressProps {
  /** The player's own wallet address, exactly as displayed — the QR encodes this string. */
  address: string;
}

/**
 * The full address, selectable in one tap, a Copy button that confirms only a write that landed,
 * and a QR of the same string. Mount it with `key={address}` so a wallet switch never leaves the
 * previous wallet's "Copied" or QR on screen.
 */
export function DepositAddress({ address }: DepositAddressProps) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyFeedback('deposit.copyFailed');

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <AddressQr address={address} label={t('deposit.qrLabel')} />
      <div className="flex w-full min-w-0 flex-col gap-2">
        <span className="text-xs font-medium text-slate-500">{t('deposit.addressLabel')}</span>
        <p
          data-testid="deposit-address"
          className="select-all break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm leading-6 text-slate-900"
        >
          {address}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copy(address)}
          className="h-11 min-w-11 self-start px-4"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? t('wallet.copied') : t('wallet.copy')}
        </Button>
      </div>
    </div>
  );
}

function AddressQr({ address, label }: { address: string; label: string }) {
  const { size, path } = useMemo(() => buildQrPath(address), [address]);
  const box = size + QR_QUIET_ZONE * 2;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${box} ${box}`}
      shapeRendering="crispEdges"
      className="h-44 w-44 shrink-0 rounded-lg border border-slate-200"
    >
      <rect x={-QR_QUIET_ZONE} y={-QR_QUIET_ZONE} width={box} height={box} className="fill-white" />
      <path d={path} className="fill-black" />
    </svg>
  );
}
