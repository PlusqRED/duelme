import { describe, expect, it } from 'vitest';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
  getBufferedTestnetFeeParams,
  getBufferedTestnetGasLimit,
  getBufferedTestnetTransactionParams,
  getMainnetTransactionParams,
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

describe('getMainnetTransactionParams', () => {
  it('returns all three gas params populated — Privy needs the full set', () => {
    const result = getMainnetTransactionParams({
      estimatedGas: 50_000n,
      feeEstimate: { maxFeePerGas: 30_000_000n, maxPriorityFeePerGas: 0n, gasPrice: 20_000_000n },
      baseFeePerGas: 20_000_000n,
    });

    expect(result.gas).toBeGreaterThan(0n);
    expect(result.maxFeePerGas).toBeGreaterThan(0n);
    expect(result.maxPriorityFeePerGas).toBeGreaterThan(0n);
  });

  it('applies a 1.2x buffer to the gas estimate', () => {
    expect(
      getMainnetTransactionParams({
        estimatedGas: 50_000n,
        feeEstimate: { maxFeePerGas: 1n, maxPriorityFeePerGas: 0n },
        baseFeePerGas: 1n,
      }).gas
    ).toBe(60_000n);
  });

  it('falls back to a 1-wei priority fee when the RPC reports zero — Arbitrum has no MEV', () => {
    expect(
      getMainnetTransactionParams({
        estimatedGas: 50_000n,
        feeEstimate: { maxFeePerGas: 0n, maxPriorityFeePerGas: undefined },
        baseFeePerGas: 0n,
      }).maxPriorityFeePerGas
    ).toBe(1n);
  });

  it('floors maxFeePerGas at gasPrice to survive a base-fee spike between estimate and send', () => {
    expect(
      getMainnetTransactionParams({
        estimatedGas: 50_000n,
        feeEstimate: { gasPrice: 100_000_000n, maxFeePerGas: 0n, maxPriorityFeePerGas: 1n },
        baseFeePerGas: 1n,
      }).maxFeePerGas
    ).toBe(100_000_000n);
  });

  it('caps at buffered baseFee + priority when that is the highest signal', () => {
    expect(
      getMainnetTransactionParams({
        estimatedGas: 50_000n,
        feeEstimate: { maxFeePerGas: 1n, maxPriorityFeePerGas: 1n, gasPrice: 1n },
        baseFeePerGas: 20_000_000n,
      }).maxFeePerGas
    ).toBe(30_000_001n); // 20_000_000 * 1.5 + 1 priority
  });

  it('does not need a minimum gas floor — eth_estimateGas is reliable on mainnet', () => {
    expect(
      getMainnetTransactionParams({
        estimatedGas: 21_000n,
        feeEstimate: { maxFeePerGas: 1n, maxPriorityFeePerGas: 0n },
        baseFeePerGas: 1n,
      }).gas
    ).toBe(25_200n); // exactly 1.2x, no floor
  });
});
