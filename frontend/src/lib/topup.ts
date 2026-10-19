import type { TranslationKey } from '@/i18n/translations';

/** The address in groups of four after its 0x, to check against the wallet's own piece by piece. */
export function groupAddress(address: string): string {
  return ['0x', ...(address.slice(2).match(/.{1,4}/g) ?? [])].join(' ');
}

export interface TopUpCopy {
  /** What to send, on which network. */
  send: TranslationKey;
  /** What keeps money off the wrong network: test money, the exact token, the network duels skip. */
  warnings: TranslationKey[];
  /** Who pays a duel's network fee, said only on the network duels run on. */
  gas: TranslationKey | null;
}

/**
 * What the top-up window says about a network. Real USDT is named with its network and nothing
 * more: no exchange names, no promise to recover a transfer. Test money is said to be test money,
 * and a network duels do not run on says so, since USDT there never reaches a duel.
 */
export function topUpCopy(network: { testnet: boolean; isDuelNetwork: boolean; isRelayEnabled: boolean }): TopUpCopy {
  const warnings: TranslationKey[] = [network.testnet ? 'topup.testnet' : 'topup.mainnet'];
  if (!network.isDuelNetwork) {
    warnings.push('topup.notDuels');
  }
  return {
    send: network.testnet ? 'topup.send.testnet' : 'topup.send.mainnet',
    warnings,
    gas: network.isDuelNetwork ? (network.isRelayEnabled ? 'topup.gas' : 'topup.gas.self') : null,
  };
}
