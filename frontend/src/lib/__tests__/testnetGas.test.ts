import { describe, expect, it } from 'vitest';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
  getBufferedTestnetFeeParams,
  getBufferedTestnetGasLimit,
  bufferedGasLimit,
  feeParamsFor,
} from '@/lib/testnetGas';
import { SUPPORTED_CHAINS } from '@/lib/constants';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia.id;
const ONE = SUPPORTED_CHAINS.arbitrum.id;

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

describe('bufferedGasLimit and feeParamsFor on the test network', () => {
  it('buffer the gas over its floor and the fees over the base fee', () => {
    expect(bufferedGasLimit(SEPOLIA, 100_000n, ARBITRUM_SEPOLIA_APPROVE_MIN_GAS)).toBe(150_000n);
    expect(feeParamsFor(SEPOLIA, { maxFeePerGas: 20_002_000n, maxPriorityFeePerGas: 2_000n }, 20_006_000n)).toEqual({
      maxFeePerGas: 40_014_000n,
      maxPriorityFeePerGas: 2_000n,
    });
  });
});

describe('bufferedGasLimit and feeParamsFor on mainnet', () => {
  it('populate all three gas params — Privy needs the full set', () => {
    const fees = feeParamsFor(ONE, { maxFeePerGas: 30_000_000n, maxPriorityFeePerGas: 0n, gasPrice: 20_000_000n }, 20_000_000n);

    expect(bufferedGasLimit(ONE, 50_000n, ARBITRUM_SEPOLIA_APPROVE_MIN_GAS)).toBeGreaterThan(0n);
    expect(fees.maxFeePerGas).toBeGreaterThan(0n);
    expect(fees.maxPriorityFeePerGas).toBeGreaterThan(0n);
  });

  it('applies a 1.2x buffer to the gas estimate', () => {
    expect(bufferedGasLimit(ONE, 50_000n, 0n)).toBe(60_000n);
  });

  it('falls back to a 1-wei priority fee when the RPC reports zero — Arbitrum has no MEV', () => {
    expect(feeParamsFor(ONE, { maxFeePerGas: 0n, maxPriorityFeePerGas: undefined }, 0n).maxPriorityFeePerGas).toBe(1n);
  });

  it('floors maxFeePerGas at gasPrice to survive a base-fee spike between estimate and send', () => {
    expect(feeParamsFor(ONE, { gasPrice: 100_000_000n, maxFeePerGas: 0n, maxPriorityFeePerGas: 1n }, 1n).maxFeePerGas).toBe(100_000_000n);
  });

  it('caps at buffered baseFee + priority when that is the highest signal', () => {
    expect(feeParamsFor(ONE, { maxFeePerGas: 1n, maxPriorityFeePerGas: 1n, gasPrice: 1n }, 20_000_000n).maxFeePerGas).toBe(
      30_000_001n // 20_000_000 * 1.5 + 1 priority
    );
  });

  it('does not take the test network\'s floor — eth_estimateGas is reliable on mainnet', () => {
    expect(bufferedGasLimit(ONE, 21_000n, ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS)).toBe(25_200n); // exactly 1.2x, no floor
  });
});
