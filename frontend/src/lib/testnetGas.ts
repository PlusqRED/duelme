export const ARBITRUM_SEPOLIA_APPROVE_MIN_GAS = 120_000n;
export const ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS = 400_000n;
const TESTNET_GAS_BUFFER_NUMERATOR = 3n;
const TESTNET_GAS_BUFFER_DENOMINATOR = 2n;

export function getBufferedTestnetGasLimit(
  estimatedGas: bigint,
  minimumGas: bigint
): bigint {
  const bufferedGas =
    (estimatedGas * TESTNET_GAS_BUFFER_NUMERATOR + TESTNET_GAS_BUFFER_DENOMINATOR - 1n) /
    TESTNET_GAS_BUFFER_DENOMINATOR;

  return bufferedGas > minimumGas ? bufferedGas : minimumGas;
}
