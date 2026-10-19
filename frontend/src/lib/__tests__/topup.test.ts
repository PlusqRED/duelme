import { describe, expect, it } from 'vitest';
import { topUpCopy } from '@/lib/topup';

describe('topUpCopy', () => {
  it('says test money is test money on the test network duels run on, and who pays their fee', () => {
    expect(topUpCopy({ testnet: true, isDuelNetwork: true, isRelayEnabled: true })).toEqual({
      send: 'topup.send.testnet',
      warnings: ['topup.testnet'],
      notes: ['topup.gas'],
    });
  });

  it('warns about the exact token on a real network, and that duels do not run there', () => {
    expect(topUpCopy({ testnet: false, isDuelNetwork: false, isRelayEnabled: true })).toEqual({
      send: 'topup.send.mainnet',
      warnings: ['topup.mainnet', 'topup.notDuels'],
      notes: [],
    });
  });

  it('says duel actions take ETH from the wallet when DuelMe does not pay their fee', () => {
    expect(topUpCopy({ testnet: false, isDuelNetwork: true, isRelayEnabled: false }).notes).toEqual(['topup.gas.self']);
  });

  it('tells a player creating a duel that its settings stay', () => {
    const copy = topUpCopy({ testnet: true, isDuelNetwork: true, isRelayEnabled: true, duel: { isJoining: false } });

    expect(copy.notes).toEqual(['topup.gas', 'topup.kept']);
  });

  it('tells a player joining a duel that topping up holds no seat', () => {
    const copy = topUpCopy({ testnet: true, isDuelNetwork: true, isRelayEnabled: true, duel: { isJoining: true } });

    expect(copy.notes).toEqual(['topup.gas', 'topup.notHeld']);
  });
});
