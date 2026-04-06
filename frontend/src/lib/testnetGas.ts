export const ARBITRUM_SEPOLIA_APPROVE_MIN_GAS = 120_000n;
export const ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS = 400_000n;
const ARBITRUM_SEPOLIA_FALLBACK_MAX_FEE_PER_GAS = 100_000_000n;
const ARBITRUM_SEPOLIA_FALLBACK_PRIORITY_FEE_PER_GAS = 2_000n;
const TESTNET_GAS_BUFFER_NUMERATOR = 3n;
const TESTNET_GAS_BUFFER_DENOMINATOR = 2n;
const TESTNET_FEE_BUFFER_NUMERATOR = 2n;
const TESTNET_FEE_BUFFER_DENOMINATOR = 1n;

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
