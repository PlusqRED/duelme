import { describe, expect, it } from 'vitest';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
  getBufferedTestnetFeeParams,
  getBufferedTestnetGasLimit,
  getBufferedTestnetTransactionParams,
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

describe('getBufferedTestnetFeeParams', () => {
  it('keeps the fee cap above a buffered base fee', () => {
    expect(
      getBufferedTestnetFeeParams(
        {
          maxFeePerGas: 20_002_000n,
          maxPriorityFeePerGas: 2_000n,
        },
        20_006_000n
      )
    ).toEqual({
      maxFeePerGas: 40_014_000n,
      maxPriorityFeePerGas: 2_000n,
    });
  });

  it('keeps a higher estimated fee cap when the RPC estimate is already safer', () => {
    expect(
      getBufferedTestnetFeeParams(
        {
          maxFeePerGas: 50_000_000n,
          maxPriorityFeePerGas: 2_000n,
        },
        20_006_000n
      ).maxFeePerGas
    ).toBe(50_000_000n);
  });

  it('uses a safe max-fee fallback when the block omits base fee data', () => {
    expect(getBufferedTestnetFeeParams({}, null)).toEqual({
      maxFeePerGas: 100_000_000n,
      maxPriorityFeePerGas: 2_000n,
    });
  });
});

describe('getBufferedTestnetTransactionParams', () => {
  it('combines buffered gas and buffered fee params', () => {
    expect(
      getBufferedTestnetTransactionParams({
        estimatedGas: 100_000n,
        minimumGas: ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
        feeEstimate: {
          maxFeePerGas: 20_002_000n,
          maxPriorityFeePerGas: 2_000n,
        },
        baseFeePerGas: 20_006_000n,
      })
    ).toEqual({
      gas: 150_000n,
      maxFeePerGas: 40_014_000n,
      maxPriorityFeePerGas: 2_000n,
    });
  });
});
