import {
  encodeFunctionData,
  type Abi,
  type Account,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem';
import { erc2771ForwarderAbi } from '@/lib/contracts';
import { MAX_RELAY_REQUEST_GAS, type RelayForwardRequest } from '@/lib/relayRequest';

/**
 * EIP-712 domain name of the deployed ERC2771Forwarder. Must match FORWARDER_NAME in
 * contracts/script/{Deploy,DeployMainnet}.s.sol exactly — a different string produces a
 * different domain and every signature fails `verify` with no other symptom.
 */
export const FORWARDER_NAME = 'DuelMe Forwarder';

const FORWARDER_DOMAIN_VERSION = '1';

/**
 * The signed struct carries a `nonce` that the wire format does not: OpenZeppelin 5.x reads
 * it from {Nonces} at execution time and folds it into the hash through this typehash, so
 * ForwardRequestData has no nonce member. `deadline` is a uint48 here — not the uint256 the
 * EIP-2612 permit deadline uses.
 */
const FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint48' },
    { name: 'data', type: 'bytes' },
  ],
} as const;

/** How long the relayer has to land the request before the signature expires. */
const REQUEST_VALIDITY_SECONDS = 10 * 60;

/**
 * Headroom over the estimate for the forwarded call. The relayed call costs slightly more
 * than the direct one it is estimated from — ERC2771Context slices the 20-byte sender
 * suffix off calldata — and an under-provisioned request reverts the whole relay.
 */
const RELAYED_GAS_MARGIN_NUMERATOR = 5n;
const RELAYED_GAS_MARGIN_DENOMINATOR = 4n;
const RELAYED_GAS_FLOOR = 25_000n;

export interface BuildForwardRequestArgs {
  publicClient: PublicClient;
  walletClient: WalletClient<Transport, Chain | undefined, Account>;
  forwarderAddress: `0x${string}`;
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
}

/**
 * Estimates, signs and packages a forward request for `/api/relay`.
 *
 * Gas is estimated against a direct call from the signer, which is equivalent: DuelMe
 * resolves `_msgSender()` to `msg.sender` when the caller is not the trusted forwarder, so
 * the simulated call takes the same branches the relayed one will.
 */
export async function buildSignedForwardRequest({
  publicClient,
  walletClient,
  forwarderAddress,
  chainId,
  from,
  to,
  abi,
  functionName,
  args,
}: BuildForwardRequestArgs): Promise<RelayForwardRequest> {
  // The signature is produced by walletClient.account but the request is signed *for* `from`.
  // If those ever drift — a wallet switched between render and click — the forwarder recovers
  // a different address and `verify` just returns false with nothing to explain it.
  if (walletClient.account.address.toLowerCase() !== from.toLowerCase()) {
    throw new Error('Wallet account changed — reconnect and try again');
  }

  const data = encodeFunctionData({ abi, functionName, args });

  const [estimatedGas, nonce] = await Promise.all([
    publicClient.estimateGas({ account: from, to, data }),
    publicClient.readContract({
      address: forwarderAddress,
      abi: erc2771ForwarderAbi,
      functionName: 'nonces',
      args: [from],
    }),
  ]);

  const gas = relayedCallGas(estimatedGas);
  const deadline = Math.floor(Date.now() / 1000) + REQUEST_VALIDITY_SECONDS;

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain: {
      name: FORWARDER_NAME,
      version: FORWARDER_DOMAIN_VERSION,
      chainId: BigInt(chainId),
      verifyingContract: forwarderAddress,
    },
    types: FORWARD_REQUEST_TYPES,
    primaryType: 'ForwardRequest',
    message: { from, to, value: 0n, gas, nonce, deadline, data },
  });

  return {
    from,
    to,
    value: '0',
    gas: gas.toString(),
    deadline,
    data,
    signature,
  };
}

export function relayedCallGas(estimatedGas: bigint): bigint {
  const padded =
    (estimatedGas * RELAYED_GAS_MARGIN_NUMERATOR) / RELAYED_GAS_MARGIN_DENOMINATOR + RELAYED_GAS_FLOOR;

  return padded > MAX_RELAY_REQUEST_GAS ? MAX_RELAY_REQUEST_GAS : padded;
}
