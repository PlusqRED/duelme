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
      <DialogContent className="min-[560px]:w-[min(620px,calc(100vw-32px))]">
        <DialogHeader>
          <DialogTitle>{t('deposit.title')}</DialogTitle>
        </DialogHeader>
        {chainId !== null && <DepositPanel chainId={chainId} />}
      </DialogContent>
    </Dialog>
  );
}
