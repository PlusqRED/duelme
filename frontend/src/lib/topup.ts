import type { TranslationKey } from '@/i18n/translations';

export interface TopUpCopy {
  /** What to send, on which network. */
  send: TranslationKey;
  /** What keeps money off the wrong network: test money, the exact token, the network duels skip. */
  warnings: TranslationKey[];
  /**
   * The small print: who pays a duel's network fee (only on the network duels run on) and, opened
   * for a duel, that creating keeps its settings or that joining holds no seat.
   */
  notes: TranslationKey[];
}

/**
 * What the top-up window says about a network. Real USDT is named with its network and nothing
 * more: no exchange names, no promise to recover a transfer. Test money is said to be test money,
 * and a network duels do not run on says so, since USDT there never reaches a duel.
 */
export function topUpCopy(view: {
  testnet: boolean;
  isDuelNetwork: boolean;
  isRelayEnabled: boolean;
  duel?: { isJoining: boolean };
}): TopUpCopy {
  const warnings: TranslationKey[] = [view.testnet ? 'topup.testnet' : 'topup.mainnet'];
  const notes: TranslationKey[] = [];
  if (view.isDuelNetwork) {
    notes.push(view.isRelayEnabled ? 'topup.gas' : 'topup.gas.self');
  } else {
    warnings.push('topup.notDuels');
  }
  if (view.duel) {
    notes.push(view.duel.isJoining ? 'topup.notHeld' : 'topup.kept');
  }
  return { send: view.testnet ? 'topup.send.testnet' : 'topup.send.mainnet', warnings, notes };
}
