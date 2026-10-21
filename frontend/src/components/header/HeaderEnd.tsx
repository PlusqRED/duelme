'use client';

import dynamic from 'next/dynamic';
import { usePrivy } from '@privy-io/react-auth';
import { LanguageSwitch } from '@/components/header/LanguageSwitch';
import { NavMenu } from '@/components/header/NavMenu';
import { Button } from '@/components/ui/button';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useTranslation } from '@/i18n/useTranslation';

/** Signed in, the wallet still loading: the button's place, held. */
function WalletPlaceholder() {
  return <span aria-hidden="true" className="h-11 w-28 rounded-full border border-line bg-paper" />;
}

// The menu brings the whole write path with it (sending, the faucet, the top-up), which a visitor
// who has not signed in never needs: it loads once someone has.
const WalletMenu = dynamic(() => import('@/components/header/WalletMenu').then((module) => module.WalletMenu), {
  ssr: false,
  loading: WalletPlaceholder,
});

/**
 * The bar's end: the language (in the navigation menu on a phone, to leave room for the balance),
 * the wallet or Sign in, and the navigation menu on a narrow screen.
 */
export function HeaderEnd() {
  return (
    <div className="ml-auto flex items-center gap-2 xs:gap-2.5">
      <LanguageSwitch className="max-xs:hidden" />
      <Account />
      <NavMenu />
    </div>
  );
}

function Account() {
  const { t } = useTranslation();
  const { ready, authenticated, login } = usePrivy();
  const { activeWallet, walletAddress } = useActiveWallet();

  if (!authenticated) {
    return (
      <Button size="sm" onClick={login} disabled={!ready}>
        {t('nav.connectWallet')}
      </Button>
    );
  }
  if (!activeWallet || !walletAddress) {
    return <WalletPlaceholder />;
  }
  return <WalletMenu address={activeWallet.address} walletAddress={walletAddress} walletClientType={activeWallet.walletClientType} />;
}
