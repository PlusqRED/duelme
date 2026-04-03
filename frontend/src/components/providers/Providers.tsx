'use client';

import { type ReactNode, useCallback } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import type { SetActiveWalletForWagmiType } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig, supportedChains } from '@/lib/wagmi';
import { selectWallet } from '@/lib/walletSelection';
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
        <WagmiProvider config={wagmiConfig} setActiveWalletForWagmi={selectActiveWallet}>
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
