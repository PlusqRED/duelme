'use client';

import { useRef } from 'react';
import { AddressGroups } from '@/components/topup/AddressGroups';
import { AddressQr } from '@/components/topup/AddressQr';
import { TopUpBalance } from '@/components/topup/TopUpBalance';
import { TopUpFaucet } from '@/components/topup/TopUpFaucet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Note } from '@/components/ui/note';
import { useLastNonNull } from '@/hooks/useLastNonNull';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useUsdtBalance } from '@/hooks/useUsdtBalance';
import type { WalletNetwork } from '@/hooks/useWalletBalances';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { AVAILABLE_CHAINS, DEFAULT_CHAIN } from '@/lib/constants';
import { resolveBalanceStatus, type BalanceStatus } from '@/lib/deposit';
import { topUpCopy } from '@/lib/topup';

/** A duel flow's own balance read, so the window and the flow show one answer from one poll. */
export interface FlowBalance {
  balance: BalanceStatus;
  retry: () => void;
}

interface TopUpWindowProps {
  /** Checksummed: shown, copied and put in the QR code as it is. */
  address: string;
  walletAddress: `0x${string}`;
  /** The network to top up on; null keeps the window closed. */
  chainId: number | null;
  /** Opened for a duel: what it takes, in USDT's smallest unit. */
  neededRaw?: bigint;
  /** Joining: topping up holds no seat, so the window says so. */
  isJoining?: boolean;
  flowBalance?: FlowBalance;
  onClose: () => void;
}

/**
 * The site's one top-up window: the wallet's address as a QR code and in groups of four, what to
 * send on which network and what not to, the test faucet, and the balance there, counting up as a
 * transfer lands. Opened for a duel, it also says what the duel needs and whether that is covered.
 */
export function TopUpWindow({ chainId, onClose, ...body }: TopUpWindowProps) {
  // The window plays its closing animation after `chainId` is null: it keeps the last network.
  const shownChainId = useLastNonNull(chainId);
  const popup = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={chainId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        ref={popup}
        className="[--dialog-width:620px]"
        // The faucet when there is one to ask, the way back otherwise: never the Copy button.
        initialFocus={() => popup.current?.querySelector<HTMLElement>('[data-initial-focus]') ?? true}
      >
        {shownChainId !== null && <TopUpBody network={topUpNetwork(shownChainId)} onClose={onClose} {...body} />}
      </DialogContent>
    </Dialog>
  );
}

/** The build's entry for the network to top up on. Every caller takes it from the build's list. */
function topUpNetwork(chainId: number): WalletNetwork {
  const network = AVAILABLE_CHAINS.find((chain) => chain.id === chainId);
  if (!network) {
    throw new Error(`Top-up asked for chain ${chainId}, which this build does not list`);
  }
  return network;
}

interface TopUpBodyProps extends Omit<TopUpWindowProps, 'chainId'> {
  network: WalletNetwork;
}

function TopUpBody({ address, walletAddress, network, neededRaw, isJoining = false, flowBalance, onClose }: TopUpBodyProps) {
  const { t } = useTranslation();
  const { isRelayEnabled } = useRelayerStatus(network.id);
  const ownRead = useUsdtBalance(network.id, walletAddress, !flowBalance);
  const balance = flowBalance?.balance ?? resolveBalanceStatus(ownRead.read, { chainId: network.id, walletAddress });
  const copy = topUpCopy({ testnet: network.testnet, isDuelNetwork: network.id === DEFAULT_CHAIN.id, isRelayEnabled });
  const isForDuel = neededRaw !== undefined;
  const notes = [copy.gas, isForDuel && 'topup.kept', isJoining && 'topup.notHeld'].filter(
    (key): key is TranslationKey => !!key
  );

  return (
    <>
      <DialogHeader className="flex-row items-center gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-[14px] bg-ink text-paper shadow-[0_3px_0_var(--color-ink-edge)]">
          <Icon name="wallet" className="size-[22px]" />
        </span>
        <span className="grid min-w-0 gap-0.5">
          <DialogTitle>{t('topup.title')}</DialogTitle>
          <DialogDescription>
            {network.testnet ? t('topup.sub.testnet', { network: network.name }) : network.name}
          </DialogDescription>
        </span>
      </DialogHeader>
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3.5 xs:grid-cols-[148px_minmax(0,1fr)] xs:gap-[18px]">
        <AddressQr address={address} label={t('topup.qr')} />
        <div className="grid min-w-0 justify-items-start gap-2">
          <AddressGroups address={address} />
          <p className="text-body-sm text-ink-2">{t(copy.send, { network: network.name })}</p>
          {copy.warnings.map((key) => (
            <Note key={key} icon="alert" tone="bad">
              {t(key, { network: DEFAULT_CHAIN.name })}
            </Note>
          ))}
        </div>
      </div>
      <TopUpFaucet key={network.id} chainId={network.id} />
      <TopUpBalance
        networkName={network.name}
        balance={balance}
        onRetry={flowBalance?.retry ?? ownRead.refetch}
        neededRaw={neededRaw}
      />
      {notes.length > 0 && (
        <div className="grid gap-1">
          {notes.map((key) => (
            <p key={key} className="text-sm text-ink-3">
              {t(key, { network: network.name })}
            </p>
          ))}
        </div>
      )}
      {/* On a phone the way back stays in reach at the bottom of the sheet, however long it is. A
          sticky box stops short of its scroller's padding, so it reaches past the sheet's 22px. */}
      <div className="max-xs:sticky max-xs:-bottom-[22px] max-xs:z-5 max-xs:-mx-1 max-xs:-mb-[22px] max-xs:bg-linear-to-b max-xs:from-paper/0 max-xs:to-paper max-xs:to-[22%] max-xs:px-1 max-xs:pt-3.5 max-xs:pb-[calc(18px+env(safe-area-inset-bottom))]">
        <Button type="button" size="lg" onClick={onClose} data-initial-focus className="w-full">
          {t(isForDuel ? 'topup.back' : 'topup.done')}
        </Button>
      </div>
    </>
  );
}
