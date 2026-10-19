'use client';

import { usePrivy } from '@privy-io/react-auth';
import { LanguageSwitch } from '@/components/header/LanguageSwitch';
import { NavMenu } from '@/components/header/NavMenu';
import { WalletMenu } from '@/components/header/WalletMenu';
import { Button } from '@/components/ui/button';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * The bar's end: the language (in the navigation menu on a phone, to leave room for the balance),
 * the wallet or Sign in, and the navigation menu on a narrow screen.
 */
export function HeaderEnd() {
  const { t } = useTranslation();
  const { ready, authenticated, login } = usePrivy();
  const { activeWallet, walletAddress } = useActiveWallet();

  return (
    <div className="ml-auto flex items-center gap-2 xs:gap-2.5">
      <LanguageSwitch className="max-xs:hidden" />
      {authenticated && activeWallet && walletAddress ? (
        <WalletMenu address={activeWallet.address} walletAddress={walletAddress} walletClientType={activeWallet.walletClientType} />
      ) : authenticated ? (
        // Signed in, the wallet still loading: the button's place, held.
        <span aria-hidden="true" className="h-11 w-28 rounded-full border border-line bg-paper" />
      ) : (
        <Button size="sm" onClick={login} disabled={!ready}>
          {t('nav.connectWallet')}
        </Button>
      )}
      <NavMenu />
    </div>
  );
}
