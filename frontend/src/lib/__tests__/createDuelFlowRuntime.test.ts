// @vitest-environment happy-dom
import { encodeAbiParameters, encodeEventTopics, type TransactionReceipt } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DUELME_ADDRESSES, USDT_ADDRESSES } from '@/lib/constants';
import { duelMeAbi } from '@/lib/contracts';
import type { CreateDuelFlowDraft } from '@/lib/createDuelFlow';
import { readStoredInviteSecret } from '@/lib/invite';

const api = vi.hoisted(() => ({ attachGameToDuel: vi.fn(async () => undefined) }));
vi.mock('@/lib/gameApi', () => ({ attachGameToDuel: api.attachGameToDuel }));

const { buildDuelPath, extractCreatedDuelId, recordCreatedDuel } = await import('@/lib/createDuelFlowRuntime');

const CONTRACT = DUELME_ADDRESSES[DEFAULT_CHAIN.id];
const SECRET = `0x${'ab'.repeat(32)}` as const;
const CREATOR = '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23';
const NOBODY = '0x0000000000000000000000000000000000000000';

function draft(overrides: Partial<CreateDuelFlowDraft> = {}): CreateDuelFlowDraft {
  return {
    rawAmount: 5_000_000n,
    chainId: DEFAULT_CHAIN.id,
    chainName: DEFAULT_CHAIN.name,
    usdtAddress: USDT_ADDRESSES[DEFAULT_CHAIN.id],
    contractAddress: CONTRACT,
    inviteHash: `0x${'00'.repeat(32)}`,
    inviteSecret: null,
    isPublic: true,
    gameName: '',
    gameCategory: null,
    message: '',
    ...overrides,
  };
}

/** A receipt whose only log is the contract's DuelCreated for `duelId`. */
function createdReceipt(duelId: bigint): TransactionReceipt {
  const topics = encodeEventTopics({ abi: duelMeAbi, eventName: 'DuelCreated', args: { duelId, creator: CREATOR, invitedOpponent: NOBODY } });
  const data = encodeAbiParameters(
    [{ type: 'uint256' }, { type: 'bytes32' }, { type: 'string' }],
    [5_000_000n, `0x${'00'.repeat(32)}`, '']
  );
  return { logs: [{ address: CONTRACT, topics, data }] } as unknown as TransactionReceipt;
}

const EMPTY_RECEIPT = { logs: [] } as unknown as TransactionReceipt;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('extractCreatedDuelId', () => {
  it('testExtractCreatedDuelIdReadsTheDuelCreatedEvent', () => {
    const receipt = createdReceipt(7n);

    expect(extractCreatedDuelId(receipt)).toBe('7');
  });

  it('testExtractCreatedDuelIdIsNullWithoutTheEvent', () => {
    expect(extractCreatedDuelId(EMPTY_RECEIPT)).toBeNull();
  });
});

describe('buildDuelPath', () => {
  it('testBuildDuelPathCarriesAPrivateDuelsSecretInTheHash', () => {
    expect(buildDuelPath('7', SECRET)).toBe(`/duel/7#${SECRET}`);
  });

  it('testBuildDuelPathLeavesAPublicDuelBare', () => {
    expect(buildDuelPath('7', null)).toBe('/duel/7');
  });
});

describe('recordCreatedDuel', () => {
  it('testRecordCreatedDuelReturnsTheNewDuelsId', () => {
    const id = recordCreatedDuel({ receipt: createdReceipt(9n), draft: draft(), identityToken: null, onGameAttachFailed: vi.fn() });

    expect(id).toBe(9);
  });

  it('testRecordCreatedDuelKeepsThePrivateSecretUnderTheContract', () => {
    recordCreatedDuel({ receipt: createdReceipt(9n), draft: draft({ inviteSecret: SECRET }), identityToken: null, onGameAttachFailed: vi.fn() });

    expect(readStoredInviteSecret(DEFAULT_CHAIN.id, CONTRACT, 9)).toBe(SECRET);
  });

  it('testRecordCreatedDuelTagsTheGameForASignedInPlayer', () => {
    recordCreatedDuel({ receipt: createdReceipt(9n), draft: draft({ gameName: 'CS2' }), identityToken: 'token', onGameAttachFailed: vi.fn() });

    expect(api.attachGameToDuel).toHaveBeenCalledWith('token', 9, DEFAULT_CHAIN.id, CONTRACT, 'CS2', undefined);
  });

  it('testRecordCreatedDuelFilesANewGameUnderItsCategory', () => {
    recordCreatedDuel({
      receipt: createdReceipt(9n),
      draft: draft({ gameName: 'Rocket League', gameCategory: 'SPORT' }),
      identityToken: 'token',
      onGameAttachFailed: vi.fn(),
    });

    expect(api.attachGameToDuel).toHaveBeenCalledWith('token', 9, DEFAULT_CHAIN.id, CONTRACT, 'Rocket League', 'SPORT');
  });

  it('testRecordCreatedDuelSkipsTheTagWithoutAToken', () => {
    recordCreatedDuel({ receipt: createdReceipt(9n), draft: draft({ gameName: 'CS2' }), identityToken: null, onGameAttachFailed: vi.fn() });

    expect(api.attachGameToDuel).not.toHaveBeenCalled();
  });

  it('testRecordCreatedDuelReportsATagThatCouldNotBeSaved', async () => {
    api.attachGameToDuel.mockRejectedValueOnce(new Error('backend down'));
    const onGameAttachFailed = vi.fn();

    recordCreatedDuel({ receipt: createdReceipt(9n), draft: draft({ gameName: 'CS2' }), identityToken: 'token', onGameAttachFailed });

    await vi.waitFor(() => expect(onGameAttachFailed).toHaveBeenCalledOnce());
  });

  it('testRecordCreatedDuelKeepsNothingWhenTheReceiptNamesNoDuel', () => {
    const id = recordCreatedDuel({ receipt: EMPTY_RECEIPT, draft: draft({ inviteSecret: SECRET, gameName: 'CS2' }), identityToken: 'token', onGameAttachFailed: vi.fn() });

    expect(id).toBeNull();
    expect(api.attachGameToDuel).not.toHaveBeenCalled();
  });
});
