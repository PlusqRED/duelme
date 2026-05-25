export const ARBITRUM_SEPOLIA_APPROVE_MIN_GAS = 120_000n;
export const ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS = 400_000n;
const ARBITRUM_SEPOLIA_FALLBACK_MAX_FEE_PER_GAS = 100_000_000n;
const ARBITRUM_SEPOLIA_FALLBACK_PRIORITY_FEE_PER_GAS = 2_000n;
const TESTNET_GAS_BUFFER_NUMERATOR = 3n;
const TESTNET_GAS_BUFFER_DENOMINATOR = 2n;
const TESTNET_FEE_BUFFER_NUMERATOR = 2n;
const TESTNET_FEE_BUFFER_DENOMINATOR = 1n;

// Mainnet (Arbitrum One) uses tighter buffers — production gas estimates are
// reliable, and overpaying wastes user ETH. We still buffer enough to cover
// chain reorgs / fee bumps between estimate and submission.
const MAINNET_GAS_BUFFER_NUMERATOR = 6n;
const MAINNET_GAS_BUFFER_DENOMINATOR = 5n; // 1.2x
const MAINNET_FEE_BUFFER_NUMERATOR = 3n;
const MAINNET_FEE_BUFFER_DENOMINATOR = 2n; // 1.5x baseFee headroom

type TestnetFeeEstimate = {
  gasPrice?: bigint | null;
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
};

type TestnetFeeParams = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

type TestnetTransactionParams = TestnetFeeParams & {
  gas: bigint;
};

export function getBufferedTestnetGasLimit(
  estimatedGas: bigint,
  minimumGas: bigint
): bigint {
  const bufferedGas =
    (estimatedGas * TESTNET_GAS_BUFFER_NUMERATOR + TESTNET_GAS_BUFFER_DENOMINATOR - 1n) /
    TESTNET_GAS_BUFFER_DENOMINATOR;

  return bufferedGas > minimumGas ? bufferedGas : minimumGas;
}

export function getBufferedTestnetFeeParams(
  feeEstimate: TestnetFeeEstimate,
  baseFeePerGas: bigint | null | undefined
): TestnetFeeParams {
  const maxPriorityFeePerGas =
    feeEstimate.maxPriorityFeePerGas ?? ARBITRUM_SEPOLIA_FALLBACK_PRIORITY_FEE_PER_GAS;
  const bufferedBaseFeePerGas =
    baseFeePerGas === null || baseFeePerGas === undefined
      ? undefined
      : (baseFeePerGas * TESTNET_FEE_BUFFER_NUMERATOR +
          TESTNET_FEE_BUFFER_DENOMINATOR -
          1n) /
        TESTNET_FEE_BUFFER_DENOMINATOR;
  const bufferedMaxFeePerGas =
    bufferedBaseFeePerGas === undefined
      ? ARBITRUM_SEPOLIA_FALLBACK_MAX_FEE_PER_GAS
      : bufferedBaseFeePerGas + maxPriorityFeePerGas;
  const maxFeePerGas = maxBigInt(
    feeEstimate.maxFeePerGas,
    feeEstimate.gasPrice,
    bufferedMaxFeePerGas,
    maxPriorityFeePerGas
  );

  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

export function getBufferedTestnetTransactionParams({
  estimatedGas,
  minimumGas,
  feeEstimate,
  baseFeePerGas,
}: {
  estimatedGas: bigint;
  minimumGas: bigint;
  feeEstimate: TestnetFeeEstimate;
  baseFeePerGas: bigint | null | undefined;
}): TestnetTransactionParams {
  return {
    gas: getBufferedTestnetGasLimit(estimatedGas, minimumGas),
    ...getBufferedTestnetFeeParams(feeEstimate, baseFeePerGas),
  };
}

// Mainnet variant — same shape as the testnet helper but without a minimum-gas
// floor (Arbitrum One eth_estimateGas is reliable) and with smaller fee headroom.
//
// IMPORTANT: this is also the workaround for Privy embedded wallets, which
// otherwise sign transactions with all-zero gas params and broadcast fails. By
// passing gas / maxFeePerGas / maxPriorityFeePerGas explicitly to writeContract,
// we bypass Privy's internal prepareTransactionRequest path entirely.
export function getMainnetTransactionParams({
  estimatedGas,
  feeEstimate,
  baseFeePerGas,
}: {
  estimatedGas: bigint;
  feeEstimate: TestnetFeeEstimate;
  baseFeePerGas: bigint | null | undefined;
}): TestnetTransactionParams {
  const gas =
    (estimatedGas * MAINNET_GAS_BUFFER_NUMERATOR +
      MAINNET_GAS_BUFFER_DENOMINATOR -
      1n) /
    MAINNET_GAS_BUFFER_DENOMINATOR;

  // Arbitrum One has no MEV/priority fees — the sequencer doesn't reorder, so
  // eth_maxPriorityFeePerGas legitimately returns 0n. Floor at 1 wei because
  // some wallets (and Privy's serializer) reject zero-priority transactions.
  // Note: ?? is wrong here — it would leave 0n untouched.
  const reportedPriority = feeEstimate.maxPriorityFeePerGas;
  const maxPriorityFeePerGas =
    reportedPriority !== undefined && reportedPriority !== null && reportedPriority > 0n
      ? reportedPriority
      : 1n;

  const bufferedBaseFeePerGas =
    baseFeePerGas === null || baseFeePerGas === undefined
      ? undefined
      : (baseFeePerGas * MAINNET_FEE_BUFFER_NUMERATOR +
          MAINNET_FEE_BUFFER_DENOMINATOR -
          1n) /
        MAINNET_FEE_BUFFER_DENOMINATOR;

  // Floor maxFeePerGas at whatever the node reports as gasPrice to avoid
  // "max fee per gas less than block base fee" rejections during base-fee spikes.
  const maxFeePerGas = maxBigInt(
    bufferedBaseFeePerGas === undefined ? undefined : bufferedBaseFeePerGas + maxPriorityFeePerGas,
    feeEstimate.maxFeePerGas,
    feeEstimate.gasPrice,
  );

  return { gas, maxFeePerGas, maxPriorityFeePerGas };
}

function maxBigInt(...values: Array<bigint | null | undefined>) {
  let max: bigint | undefined;

  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    if (max === undefined || value > max) {
      max = value;
    }
  }

  return max ?? 0n;
}
