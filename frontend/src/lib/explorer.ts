import { SUPPORTED_CHAINS } from '@/lib/constants';

/** A transaction's or an address's page on the chain's explorer, or null for a chain the app does not know. */
export function explorerLink(chainId: number, kind: 'tx' | 'address', value: string): string | null {
  const chain = Object.values(SUPPORTED_CHAINS).find((entry) => entry.id === chainId);
  return chain ? `${chain.explorer}/${kind}/${value}` : null;
}
