"use client";

import { useTonAddress, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { Address } from "@ton/core";
import { useMemo } from "react";

export interface WalletState {
  isConnected: boolean;
  rawAddress: string | null;
  address: Address | null;
  friendlyAddress: string | null;
  walletName: string | null;
  appName: string | null;
  disconnect: () => Promise<void>;
  openWallet: () => Promise<void>;
}

export function useWallet(): WalletState {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();           // friendly format (EQ.../UQ...)
  const tonAddressRaw = useTonAddress(false);   // raw -1:hex
  const wallet = useTonWallet();

  const address = useMemo(() => {
    if (!tonAddress) return null;
    try {
      return Address.parse(tonAddress);
    } catch {
      return null;
    }
  }, [tonAddress]);

  return {
    isConnected: Boolean(tonAddress),
    rawAddress: tonAddressRaw || null,
    address,
    friendlyAddress: tonAddress || null,
    walletName: wallet?.device?.appName ?? null,
    appName: wallet?.device?.platform ?? null,
    disconnect: async () => {
      await tonConnectUI.disconnect();
    },
    openWallet: async () => {
      await tonConnectUI.openModal();
    },
  };
}
