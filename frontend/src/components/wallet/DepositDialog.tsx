'use client';

import { DepositPanel } from '@/components/wallet/DepositPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/i18n/useTranslation';

interface DepositDialogProps {
  /** The network to top up on; `null` keeps the dialog closed. */
  chainId: number | null;
  onClose: () => void;
}

/** The wallet menu's "Top up": the deposit panel for the network picked in the menu. */
export function DepositDialog({ chainId, onClose }: DepositDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={chainId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1.5rem)] gap-4 overflow-y-auto p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">{t('deposit.title')}</DialogTitle>
        </DialogHeader>
        {chainId !== null && <DepositPanel chainId={chainId} />}
      </DialogContent>
    </Dialog>
  );
}
