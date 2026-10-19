'use client';

import { useRef, useState } from 'react';
import { useExportWallet, usePrivy } from '@privy-io/react-auth';
import { PlayerCard } from '@/components/header/PlayerCard';
import { SendView } from '@/components/header/SendView';
import { WalletButton } from '@/components/header/WalletButton';
import { WalletMoney } from '@/components/header/WalletMoney';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/iconPaths';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { DepositDialog } from '@/components/wallet/DepositDialog';
import { useFaucetFlask } from '@/hooks/useFaucetFlask';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { readingRaw } from '@/lib/walletBalances';
import { EMBEDDED_WALLET_CLIENT_TYPE } from '@/lib/walletSelection';

interface WalletMenuProps {
  /** Checksummed, for showing and copying. */
  address: string;
  walletAddress: `0x${string}`;
  walletClientType: string;
}

type View = 'main' | 'send' | 'back-from-send';

/**
 * The wallet button and everything the wallet does, in its menu: who you are, the balance on each
 * network with Top up and Send, the faucet, the key and signing out. It opens on the network duels
 * run on, and on the wallet's own view whenever it opens.
 */
export function WalletMenu({ address, walletAddress, walletClientType }: WalletMenuProps) {
  const { t } = useTranslation();
  const { logout } = usePrivy();
  const { exportWallet } = useExportWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('main');
  const [pickedId, setPickedId] = useState<number>(DEFAULT_CHAIN_ID);
  const [topUpChainId, setTopUpChainId] = useState<number | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const introFor = useRef<string | null>(null);
  const { networks, refetch } = useWalletBalances(walletAddress);
  const picked = networks.find((network) => network.chain.id === pickedId) ?? networks[0];
  const duelNetwork = networks.find((network) => network.chain.id === DEFAULT_CHAIN_ID) ?? networks[0];
  const faucet = useFaucetFlask(picked.chain.id, readingRaw(picked.usdt));

  function changeOpen(open: boolean) {
    setIsOpen(open);
    if (!open) {
      return;
    }
    setView('main');
    // The quest's cells light up the first time the menu opens for this wallet, not every time.
    setIsEntering(introFor.current !== walletAddress);
    introFor.current = walletAddress;
  }

  // Privy's own windows and the top-up window open over the page, not inside a menu.
  function leaveFor(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={changeOpen}>
        <WalletButton address={address} network={duelNetwork} />
        <PopoverContent title={t('wallet.title')}>
          {view === 'send' ? (
            <SendView
              address={address}
              network={picked}
              faucetOffer={faucet.offer}
              onBack={() => setView('back-from-send')}
            />
          ) : (
            <>
              <PlayerCard
                address={address}
                walletAddress={walletAddress}
                isEntering={isEntering}
                onLeave={() => setIsOpen(false)}
              />
              <WalletMoney
                networks={networks}
                pickedId={picked.chain.id}
                onPick={setPickedId}
                faucet={faucet}
                onRetry={refetch}
                onTopUp={() => leaveFor(() => setTopUpChainId(picked.chain.id))}
                onSend={() => setView('send')}
                isBackFromSend={view === 'back-from-send'}
              />
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-line pt-2">
                {walletClientType === EMBEDDED_WALLET_CLIENT_TYPE && (
                  <FootButton icon="key" onClick={() => leaveFor(() => void exportWallet())}>
                    {t('wallet.export')}
                  </FootButton>
                )}
                <FootButton icon="logout" onClick={() => leaveFor(() => void logout())}>
                  {t('wallet.signOut')}
                </FootButton>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      <DepositDialog chainId={topUpChainId} onClose={() => setTopUpChainId(null)} />
    </>
  );
}

interface FootButtonProps {
  icon: IconName;
  onClick: () => void;
  children: string;
}

function FootButton({ icon, onClick, children }: FootButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 cursor-pointer items-center gap-[7px] text-body-sm font-label text-ink-2 transition-colors hover:text-ink"
    >
      <Icon name={icon} className="size-[18px]" />
      {children}
    </button>
  );
}
