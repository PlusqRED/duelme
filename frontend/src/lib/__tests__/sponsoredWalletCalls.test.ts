import type { Abi } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import { duelMeAbi } from '@/lib/contracts';
import { getSponsoredTransactionConfig } from '@/lib/sponsoredTransactionConfig';
import { SponsorshipUnavailableError } from '@/lib/sponsoredTransactionErrors';
import {
  sendSponsoredWalletCalls,
  supportsSponsoredWalletCalls,
} from '@/lib/sponsoredWalletCalls';
import {
  PIMLICO_TEST_ARBITRUM_POLICY,
  pimlicoTestEnv,
} from './sponsorshipTestEnv';

const CHAIN_ID = SUPPORTED_CHAINS.arbitrum.id;
const ENV = pimlicoTestEnv();
const TX_HASH = '0xcd96707e59322b0e7966e0003a7c927226fd3c3f41199417d5e071abde846139' as const;

interface WalletClientOverrides {
  sendCalls?: ReturnType<typeof vi.fn>;
  waitForCallsStatus?: ReturnType<typeof vi.fn>;
}

function makeArgs(overrides: WalletClientOverrides = {}) {
  const sendCalls = overrides.sendCalls ?? vi.fn().mockResolvedValue({ id: '0x1' });
  const waitForCallsStatus =
    overrides.waitForCallsStatus ??
    vi.fn().mockResolvedValue({
      status: 'success',
      receipts: [{ transactionHash: TX_HASH }],
    });

  return {
    sendCalls,
    waitForCallsStatus,
    args: {
      walletClient: { sendCalls, waitForCallsStatus } as never,
      chainId: CHAIN_ID,
      address: DUELME_ADDRESSES[CHAIN_ID],
      abi: duelMeAbi as Abi,
      functionName: 'joinDuel',
      args: [
        1n,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      ] as const,
      env: ENV,
    },
  };
}

let consoleError: MockInstance;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('supportsSponsoredWalletCalls', () => {
  it('requires an explicit paymasterService.supported flag', () => {
    expect(supportsSponsoredWalletCalls(undefined)).toBe(false);
    expect(supportsSponsoredWalletCalls({})).toBe(false);
    expect(
      supportsSponsoredWalletCalls({ paymasterService: { supported: false } })
    ).toBe(false);
    expect(
      supportsSponsoredWalletCalls({ paymasterService: { supported: true } })
    ).toBe(true);
  });
});

describe('sendSponsoredWalletCalls', () => {
  it('sends the call with the Pimlico paymasterService capability and returns the tx hash', async () => {
    const { sendCalls, waitForCallsStatus, args } = makeArgs();
    const onSubmitted = vi.fn();

    const txHash = await sendSponsoredWalletCalls({ ...args, onSubmitted });

    expect(txHash).toBe(TX_HASH);
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(waitForCallsStatus).toHaveBeenCalledWith({ id: '0x1', timeout: 120_000 });

    const sendCallsArg = sendCalls.mock.calls[0][0];
    expect(sendCallsArg.chain.id).toBe(CHAIN_ID);
    expect(sendCallsArg.calls).toHaveLength(1);
    expect(sendCallsArg.calls[0].to).toBe(DUELME_ADDRESSES[CHAIN_ID]);
    expect(sendCallsArg.capabilities.paymasterService.url).toBe(
      getSponsoredTransactionConfig(CHAIN_ID, ENV)?.bundlerUrl
    );
    expect(sendCallsArg.capabilities.paymasterService.context).toEqual({
      sponsorshipPolicyId: PIMLICO_TEST_ARBITRUM_POLICY,
    });
  });

  it('refuses writes outside the sponsorship allowlist without touching the wallet', async () => {
    const { sendCalls, args } = makeArgs();

    await expect(
      sendSponsoredWalletCalls({ ...args, functionName: 'rescueETH' })
    ).rejects.toBeInstanceOf(SponsorshipUnavailableError);
    expect(sendCalls).not.toHaveBeenCalled();
  });

  it('refuses when sponsorship env is not configured', async () => {
    const { sendCalls, args } = makeArgs();

    await expect(
      sendSponsoredWalletCalls({ ...args, env: {} })
    ).rejects.toBeInstanceOf(SponsorshipUnavailableError);
    expect(sendCalls).not.toHaveBeenCalled();
  });

  it('wraps a pre-broadcast paymaster failure as SponsorshipUnavailableError (self-paid fallback allowed)', async () => {
    const { args } = makeArgs({
      sendCalls: vi.fn().mockRejectedValue(new Error('paymaster deposit too low')),
    });

    await expect(sendSponsoredWalletCalls(args)).rejects.toBeInstanceOf(
      SponsorshipUnavailableError
    );
  });

  it('never classifies a post-broadcast failure as SponsorshipUnavailableError (a retry could double-execute)', async () => {
    const failure = new Error('bundler dropped the user operation');
    const { args } = makeArgs({
      waitForCallsStatus: vi.fn().mockRejectedValue(failure),
    });

    await expect(sendSponsoredWalletCalls(args)).rejects.toBe(failure);
  });

  it.each([
    [
      'an on-chain revert',
      { status: 'failure', statusCode: 500, receipts: [{ status: 'reverted', transactionHash: TX_HASH }] },
      'Gasless transaction reverted on-chain.',
    ],
    [
      'a non-revert bundle failure',
      { status: 'failure', statusCode: 500, receipts: [] },
      'Gasless transaction failed (status code 500).',
    ],
  ])('surfaces %s as a plain error, not a sponsorship failure', async (_label, result, message) => {
    const { args } = makeArgs({
      waitForCallsStatus: vi.fn().mockResolvedValue(result),
    });

    const promise = sendSponsoredWalletCalls(args);
    await expect(promise).rejects.toThrow(message);
    await expect(promise).rejects.not.toBeInstanceOf(SponsorshipUnavailableError);
  });

  it('rethrows user rejections untouched', async () => {
    const rejection = new Error('User rejected the request.');
    const { args } = makeArgs({
      sendCalls: vi.fn().mockRejectedValue(rejection),
    });

    await expect(sendSponsoredWalletCalls(args)).rejects.toBe(rejection);
  });
});
