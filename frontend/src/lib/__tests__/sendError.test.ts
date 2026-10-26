import { describe, expect, it } from 'vitest';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { RelayAnswerLostError, RelayRequestError } from '@/lib/relayApi';
import type { RelayErrorCode } from '@/lib/relayRequest';
import { classifySendError, isRelayDecline, suggestsEth, type SendErrorKind } from '@/lib/sendError';
import { TransactionReplacedError, TransactionRevertedError, WalletNotReadyError } from '@/lib/writeErrors';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia.id;
const ONE = SUPPORTED_CHAINS.arbitrum.id;

function kindOf(error: unknown, chainId: number = ONE): SendErrorKind {
  return classifySendError(error, { chainId }).kind;
}

describe('classifySendError', () => {
  it.each<[RelayErrorCode, SendErrorKind]>([
    ['TRANSFER_USED', 'used'],
    ['TRANSFER_WRONG_DAY', 'day'],
    ['INSUFFICIENT_BALANCE', 'balance'],
    ['INVALID_SIGNATURE', 'signature'],
    ['BUDGET_EXCEEDED', 'budget'],
    ['RATE_LIMITED', 'limited'],
    ['RELAY_PENDING', 'pending'],
    ['RELAYER_UNAVAILABLE', 'unavailable'],
    ['NOT_RELAYABLE', 'unavailable'],
    ['EXECUTION_REVERTED', 'reverted'],
    ['INVALID_REQUEST', 'error'],
  ])('words the relayer\'s %s as %s', (code, kind) => {
    expect(kindOf(new RelayRequestError(code, 'refused'))).toBe(kind);
  });

  it('keeps the relayer\'s own words for the details', () => {
    const failure = classifySendError(new RelayRequestError('TRANSFER_USED', "This wallet's relayed transfer for today has already been sent."), {
      chainId: SEPOLIA,
    });

    expect(failure.detail).toBe("This wallet's relayed transfer for today has already been sent.");
  });

  it('never offers another go at a transfer whose answer was lost', () => {
    expect(classifySendError(new RelayAnswerLostError('no answer'), { chainId: ONE })).toMatchObject({ kind: 'lost', canRetry: false });
  });

  it('tells a wallet that turned the request down', () => {
    expect(kindOf(new Error('User rejected the request.'))).toBe('rejected');
  });

  it('blames the network switch when the wallet would not move', () => {
    expect(classifySendError(new Error('User rejected the request.'), { chainId: ONE, isNetworkSwitch: true }).kind).toBe('network');
  });

  it('tells a wallet with too little ETH for its own fee', () => {
    expect(kindOf(new Error('insufficient funds for gas * price + value: have 0 want 1000'))).toBe('eth');
  });

  it.each([
    ['USD₮0', 'execution reverted: ERC20: transfer amount exceeds balance'],
    ['MockUSDT', 'The contract function "transfer" reverted with the following signature: ERC20InsufficientBalance(address,uint256,uint256)'],
  ])('tells a balance too small for the transfer on %s', (_token, message) => {
    expect(kindOf(new Error(message))).toBe('balance');
  });

  it('tells a mined transfer that reverted, and one replaced in the wallet', () => {
    expect(kindOf(new TransactionRevertedError('TetherToken: from is blocked'))).toBe('reverted');
    expect(kindOf(new TransactionReplacedError())).toBe('replaced');
  });

  it('tells a wallet not ready yet, and a fee the test network turned down', () => {
    expect(kindOf(new WalletNotReadyError())).toBe('walletNotReady');
    expect(kindOf(new Error('max fee per gas less than block base fee'), SEPOLIA)).toBe('gas');
  });

  it('leaves what nobody explains yet as an error to try again', () => {
    expect(classifySendError(new Error('something odd'), { chainId: ONE })).toMatchObject({ kind: 'error', canRetry: true });
  });
});

describe('isRelayDecline', () => {
  it.each<RelayErrorCode>(['BUDGET_EXCEEDED', 'RELAYER_UNAVAILABLE', 'INVALID_SIGNATURE', 'TRANSFER_USED'])(
    'hands the transfer to the wallet after %s',
    (code) => {
      expect(isRelayDecline(new RelayRequestError(code, 'no'))).toBe(true);
    }
  );

  it.each<RelayErrorCode>(['RATE_LIMITED', 'RELAY_PENDING', 'TRANSFER_WRONG_DAY', 'INSUFFICIENT_BALANCE'])(
    'keeps the transfer with the relayer after %s, which another go can fix',
    (code) => {
      expect(isRelayDecline(new RelayRequestError(code, 'no'))).toBe(false);
    }
  );

  it('keeps a transfer whose answer was lost with the relayer, where it cannot go twice', () => {
    expect(isRelayDecline(new RelayAnswerLostError('no answer'))).toBe(false);
  });
});

describe('suggestsEth', () => {
  it('points at ETH only where ETH is the way on', () => {
    expect(suggestsEth('used')).toBe(true);
    expect(suggestsEth('eth')).toBe(true);
    expect(suggestsEth('balance')).toBe(false);
    expect(suggestsEth('lost')).toBe(false);
  });
});
