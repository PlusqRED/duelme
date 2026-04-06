import { describe, expect, it } from 'vitest';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
  getBufferedTestnetGasLimit,
} from '@/lib/testnetGas';

describe('getBufferedTestnetGasLimit', () => {
  it('applies a 1.5x safety buffer to the estimate', () => {
    expect(getBufferedTestnetGasLimit(100_000n, 0n)).toBe(150_000n);
  });

  it('never returns less than the configured minimum gas floor', () => {
    expect(getBufferedTestnetGasLimit(10_000n, ARBITRUM_SEPOLIA_APPROVE_MIN_GAS)).toBe(
      ARBITRUM_SEPOLIA_APPROVE_MIN_GAS
    );
  });

  it('supports higher gas floors for heavier testnet transactions', () => {
    expect(getBufferedTestnetGasLimit(200_000n, ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS)).toBe(
      ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS
    );
  });
});
