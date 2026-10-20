import { describe, expect, it } from 'vitest';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import {
  ethNeeded,
  expectedFee,
  formatEthBalance,
  formatEthFee,
  formatEthNeed,
  gasKindOf,
  gasLimitFor,
  quoteFees,
  type FeeQuote,
} from '@/lib/gasNeeds';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia.id;
const ONE = SUPPORTED_CHAINS.arbitrum.id;
const GWEI = 1_000_000_000n;
const QUOTE: FeeQuote = { maxFeePerGas: 40_000_000n, gasPrice: 20_000_000n };

describe('quoteFees', () => {
  it('testQuoteFeesOffersTwiceTheBaseFeeOnTheTestNetwork', () => {
    const quote = quoteFees(SEPOLIA, { maxFeePerGas: 1n, maxPriorityFeePerGas: 0n }, 20_000_000n);

    expect(quote.maxFeePerGas).toBe(40_000_000n);
  });

  it('testQuoteFeesOffersHalfAgainTheBaseFeeOnArbitrumOne', () => {
    const quote = quoteFees(ONE, { maxFeePerGas: 1n, maxPriorityFeePerGas: 0n }, 10_000_000n);

    expect(quote.maxFeePerGas).toBe(15_000_001n);
  });

  it('testQuoteFeesChargesTheBaseFeeAndTheTip', () => {
    const quote = quoteFees(ONE, { maxFeePerGas: GWEI, maxPriorityFeePerGas: 2n }, 10_000_000n);

    expect(quote.gasPrice).toBe(10_000_002n);
  });

  it('testQuoteFeesChargesTheOfferWithoutABaseFee', () => {
    const quote = quoteFees(SEPOLIA, { maxFeePerGas: 1n }, undefined);

    expect(quote.gasPrice).toBe(quote.maxFeePerGas);
  });
});

describe('gasKindOf', () => {
  it('testGasKindOfTellsTheApprove', () => {
    expect(gasKindOf({ part: 'approve', kind: 'transaction' }, 'joinDuel')).toBe('approve');
  });

  it('testGasKindOfTellsCreatingFromJoining', () => {
    expect(gasKindOf({ part: 'move', kind: 'transaction' }, 'createDuel')).toBe('create');
    expect(gasKindOf({ part: 'move', kind: 'transaction' }, 'joinDuel')).toBe('join');
  });

  it('testGasKindOfCallsAnythingElseAMove', () => {
    expect(gasKindOf({ part: 'move', kind: 'transaction' }, null)).toBe('move');
  });
});

describe('gasLimitFor', () => {
  it('testGasLimitForKeepsTheTestNetworksFloorForACreate', () => {
    expect(gasLimitFor('create', SEPOLIA)).toBe(400_000n);
  });

  it('testGasLimitForKeepsTheTestNetworksFloorForAnApprove', () => {
    expect(gasLimitFor('approve', SEPOLIA)).toBe(120_000n);
  });

  it('testGasLimitForKeepsTheTestNetworksDefaultFloorForAMove', () => {
    expect(gasLimitFor('move', SEPOLIA)).toBe(200_000n);
  });

  it('testGasLimitForAddsAFifthOnArbitrumOne', () => {
    expect(gasLimitFor('join', ONE)).toBe(112_443n);
  });
});

describe('expectedFee', () => {
  it('testExpectedFeePricesTheTypicalGasAtTheNetworksPrice', () => {
    expect(expectedFee('approve', QUOTE)).toBe(46_724n * 20_000_000n);
  });
});

describe('ethNeeded', () => {
  it('testEthNeededReservesEachTransactionsLimitAtTheOffer', () => {
    const need = ethNeeded(['approve', 'join'], SEPOLIA, QUOTE);

    expect(need).toBe((120_000n + 200_000n) * 40_000_000n);
  });

  it('testEthNeededIsZeroWithNothingToSend', () => {
    expect(ethNeeded([], SEPOLIA, QUOTE)).toBe(0n);
  });
});

describe('formatEthFee', () => {
  it('testFormatEthFeeKeepsOneSignificantFigure', () => {
    expect(formatEthFee(934_480_000_000n, 'en')).toBe('0.0000009');
  });

  it('testFormatEthFeeWritesARussianComma', () => {
    expect(formatEthFee(3_000_000_000_000n, 'ru')).toBe('0,000003');
  });
});

describe('formatEthNeed', () => {
  it('testFormatEthNeedRoundsUp', () => {
    expect(formatEthNeed(13_400_000_000_000n, 'en')).toBe('0.00002');
  });

  it('testFormatEthNeedKeepsAnExactFigure', () => {
    expect(formatEthNeed(20_000_000_000_000n, 'ru')).toBe('0,00002');
  });
});

describe('formatEthBalance', () => {
  it('testFormatEthBalanceKeepsSixDecimals', () => {
    expect(formatEthBalance(7_736_123_456_000_000n, 'en')).toBe('0.007736');
  });

  it('testFormatEthBalanceRoundsDown', () => {
    expect(formatEthBalance(19_999_000_000_000n, 'en')).toBe('0.000019');
  });

  it('testFormatEthBalanceShowsAnEmptyWalletAsZero', () => {
    expect(formatEthBalance(0n, 'en')).toBe('0');
  });
});
