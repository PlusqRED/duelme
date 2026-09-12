'use client';

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import type { SetActiveWalletForWagmiType } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { wagmiConfig, supportedChains } from '@/lib/wagmi';
import { selectWallet } from '@/lib/walletSelection';
import { useContractConfig } from '@/hooks/useContractConfig';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

/** Clears the React Query cache when the Privy user changes (logout / account switch). */
function QueryCacheManager() {
  const { user } = usePrivy();
  const qc = useQueryClient();
  const prevUserIdRef = useRef(user?.id);

  useEffect(() => {
    const currentId = user?.id;
    if (prevUserIdRef.current && prevUserIdRef.current !== currentId) {
      qc.clear();
    }
    prevUserIdRef.current = currentId;
  }, [user?.id, qc]);

  return null;
}

/** Keeps the shared contractConfig store synced with on-chain parameters app-wide. */
function ContractConfigLoader() {
  useContractConfig();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const selectActiveWallet = useCallback<SetActiveWalletForWagmiType>(
    ({ wallets, user }) => selectWallet(wallets, user) ?? undefined,
    []
  );

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#4F46E5',
          logo: undefined,
        },
        loginMethods: ['google', 'email', 'wallet'],
        defaultChain: supportedChains[0],
        supportedChains: [...supportedChains],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users',
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <QueryCacheManager />
        <WagmiProvider config={wagmiConfig} setActiveWalletForWagmi={selectActiveWallet}>
          <ContractConfigLoader />
          <LanguageProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
            <Toaster position="top-center" />
          </LanguageProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
