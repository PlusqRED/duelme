import { BaseError, ContractFunctionRevertedError, HttpRequestError, UserRejectedRequestError } from 'viem';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { classifyFlowError, flowError, rawErrorText } from '@/lib/flowError';
import { PermitDomainMismatchError } from '@/lib/permitSignature';
import { RelayAnswerLostError, RelayRequestError } from '@/lib/relayApi';
import { TransactionReplacedError, TransactionRevertedError, WalletNotReadyError } from '@/lib/writeErrors';

const SEPOLIA = { chainId: SUPPORTED_CHAINS.arbitrumSepolia.id };
const ONE = { chainId: SUPPORTED_CHAINS.arbitrum.id };
const FEE_CAP = 'max fee per gas less than block base fee: maxfeepergas: 20002000 basefee: 20006000';

describe('classifyFlowError — the relay', () => {
  it.each([
    ['BUDGET_EXCEEDED', 'budget'],
    ['RATE_LIMITED', 'limited'],
    ['RELAY_PENDING', 'pending'],
    ['RELAYER_UNAVAILABLE', 'unavailable'],
    ['INVALID_SIGNATURE', 'unavailable'],
    ['NOT_RELAYABLE', 'unavailable'],
    ['INVALID_REQUEST', 'error'],
  ] as const)('testClassifyFlowErrorReadsTheRelayCode %s', (code, kind) => {
    const error = new RelayRequestError(code, 'The relay said so.');

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe(kind);
  });

  it('testClassifyFlowErrorCallsALostAnswerLost', () => {
    const error = new RelayAnswerLostError('The relayer did not answer in time.');

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('lost');
  });

  it('testClassifyFlowErrorOffersNoRetryAfterALostAnswer', () => {
    const error = new RelayAnswerLostError('No answer came back from the relayer.');

    const classified = classifyFlowError(error, ONE);

    expect(classified.canRetry).toBe(false);
  });

  it('testClassifyFlowErrorKeepsTheRelaysWordsForTheDetails', () => {
    const error = new RelayRequestError('BUDGET_EXCEEDED', 'Daily gas allowance is used up.');

    const classified = classifyFlowError(error, ONE);

    expect(classified.detail).toBe('Daily gas allowance is used up.');
  });

  it('testClassifyFlowErrorOffersNoRetryAfterTheDaysLimit', () => {
    const error = new RelayRequestError('BUDGET_EXCEEDED', 'Daily gas allowance is used up.');

    const classified = classifyFlowError(error, ONE);

    expect(classified.canRetry).toBe(false);
  });

  it('testClassifyFlowErrorOffersARetryWhileTheLastActionConfirms', () => {
    const error = new RelayRequestError('RELAY_PENDING', 'Still being confirmed.');

    const classified = classifyFlowError(error, ONE);

    expect(classified.canRetry).toBe(true);
  });

  it('testClassifyFlowErrorCallsARevertedRelayTheContractsRefusal', () => {
    const error = new RelayRequestError('EXECUTION_REVERTED', 'The duel action would revert: wager below minimum');

    const classified = classifyFlowError(error, ONE);

    expect(classified).toEqual({
      kind: 'reverted',
      detail: 'The duel action would revert: wager below minimum',
      canRetry: false,
    });
  });

  it('testClassifyFlowErrorRecognisesTheTokenRefusingThePermit', () => {
    const error = new RelayRequestError('EXECUTION_REVERTED', 'The duel action would revert: permit failed');

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('permit');
    expect(classified.canRetry).toBe(false);
  });

  it('testClassifyFlowErrorRecognisesAPermitDomainMismatch', () => {
    const error = new PermitDomainMismatchError('0xtoken');

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('permit');
  });
});

describe('classifyFlowError — writes that never ran', () => {
  it('testClassifyFlowErrorGivesTheContractsReasonForARevert', () => {
    const error = new TransactionRevertedError('Duel not in Created state');

    const classified = classifyFlowError(error, ONE);

    expect(classified).toEqual({ kind: 'reverted', detail: 'execution reverted: Duel not in Created state', canRetry: false });
  });

  it('testClassifyFlowErrorCallsAReasonlessRevertARefusalToo', () => {
    const error = new TransactionRevertedError(undefined);

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('reverted');
  });

  it('testClassifyFlowErrorTellsAReplacedTransactionFromARejection', () => {
    const error = new TransactionReplacedError();

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('replaced');
    expect(classified.canRetry).toBe(true);
  });

  it('testClassifyFlowErrorSaysTheWalletIsNotReady', () => {
    const error = new WalletNotReadyError();

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('walletNotReady');
  });

  it('testClassifyFlowErrorCallsAnEstimateThatRevertsTheContractsRefusal', () => {
    const error = new ContractFunctionRevertedError({ abi: [], functionName: 'joinDuel', message: 'Duel not in Created state' });

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('reverted');
    expect(classified.detail).toContain('Duel not in Created state');
  });

  it('testClassifyFlowErrorNamesACustomErrorInsteadOfItsSelector', () => {
    const error = new ContractFunctionRevertedError({ abi: [], functionName: 'joinDuel', data: '0xd93c0665' });

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('reverted');
    expect(classified.detail).toBe('The contract function "joinDuel" reverted with the following signature:\nEnforcedPause');
  });
});

describe('classifyFlowError — the wallet and the network', () => {
  it('testClassifyFlowErrorCallsAWalletRefusalRejected', () => {
    const error = new UserRejectedRequestError(new Error('User rejected the request.'));

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('rejected');
    expect(classified.canRetry).toBe(true);
  });

  it('testClassifyFlowErrorCallsAFailedSwitchTheNetworkKind', () => {
    const error = new UserRejectedRequestError(new Error('User rejected the request.'));

    const classified = classifyFlowError(error, { ...ONE, isNetworkSwitch: true });

    expect(classified.kind).toBe('network');
  });

  it('testClassifyFlowErrorBlamesTheTestNetworkForAGasRefusal', () => {
    const error = new Error('Execution reverted for an unknown reason. intrinsic gas too low');

    const classified = classifyFlowError(error, SEPOLIA);

    expect(classified.kind).toBe('gas');
    expect(classified.canRetry).toBe(true);
  });

  it('testClassifyFlowErrorBlamesTheTestNetworkForARefusedFeeCap', () => {
    const error = new Error(`the contract function "approve" reverted with the following reason: ${FEE_CAP}`);

    const classified = classifyFlowError(error, SEPOLIA);

    expect(classified.kind).toBe('gas');
  });

  it('testClassifyFlowErrorKnowsTheTestNetworkByItsIdNotItsName', () => {
    const error = new Error(`the contract function "approve" reverted with the following reason: ${FEE_CAP}`);

    const classified = classifyFlowError(error, ONE);

    expect(classified.kind).toBe('error');
  });

  it('testClassifyFlowErrorLooksPastViemsUnknownRevertWrapper', () => {
    const error = new Error('Execution reverted for an unknown reason. nonce too low');

    const classified = classifyFlowError(error, ONE);

    expect(classified).toEqual({ kind: 'error', detail: 'Execution reverted for an unknown reason. nonce too low', canRetry: true });
  });

  it('testClassifyFlowErrorKeepsAnUnexplainedErrorWithItsWords', () => {
    const error = new Error('Allowance refetch failed');

    const classified = classifyFlowError(error, ONE);

    expect(classified).toEqual({ kind: 'error', detail: 'Allowance refetch failed', canRetry: true });
  });
});

describe('rawErrorText', () => {
  it('testRawErrorTextLeavesOutTheCalldataAndTheRequestBodyToo', () => {
    const secret = '5'.repeat(64);
    const error = new BaseError('Execution reverted for an unknown reason.', {
      metaMessages: [`Estimate Gas Arguments:\n  from:  0x2222222222222222222222222222222222222222\n  data:  0xabcdef${secret}`, `Request body: {"method":"eth_estimateGas","params":[{"data":"0xabcdef${secret}"}]}`],
    });

    const text = rawErrorText(error);

    expect([text?.includes('Estimate Gas Arguments:'), text?.includes(secret)]).toEqual([true, false]);
  });

  it('testRawErrorTextKeepsTheRequestsMethodWhichTellsTheEstimateFromTheSend', () => {
    const signed = `0x02f8${'7'.repeat(200)}`;
    const error = new BaseError('HTTP request failed.', {
      metaMessages: [`Request body: {"jsonrpc":"2.0","id":4,"method":"eth_sendRawTransaction","params":["${signed}"]}`],
    });

    const text = rawErrorText(error);

    expect(text).toBe('HTTP request failed.\nRequest method: eth_sendRawTransaction');
  });

  it('testRawErrorTextLeavesOutTheCallsArgumentsWhichCanHoldAnInviteSecret', () => {
    const secret = `0x${'5'.repeat(64)}`;
    const error = new BaseError('The contract function "joinDuel" reverted.', {
      metaMessages: ['Contract Call:', `  address:   0x1111111111111111111111111111111111111111\n  function:  joinDuel(uint256, bytes32)\n  args:              (7, ${secret})`],
    });

    const text = rawErrorText(error);

    expect([text?.includes('joinDuel(uint256, bytes32)'), text?.includes(secret)]).toEqual([true, false]);
  });

  it('testRawErrorTextKeepsAnHttpFailuresStatusAndAddress', () => {
    const error = new HttpRequestError({ url: 'https://rpc.example', status: 503, body: { method: 'eth_sendRawTransaction' } });

    const text = rawErrorText(error);

    expect(text).toBe('HTTP request failed.\nStatus: 503\nURL: https://rpc.example\nRequest method: eth_sendRawTransaction');
  });

  it('testRawErrorTextHasNothingToSayForANonError', () => {
    const text = rawErrorText({});

    expect(text).toBeNull();
  });

  it('testRawErrorTextShortensADump', () => {
    const text = rawErrorText(new Error('x'.repeat(4000)));

    expect(text?.length).toBe(1501);
  });
});

describe('flowError', () => {
  it('testFlowErrorOffersNoRetryForOwnDuel', () => {
    const error = flowError('ownDuel');

    expect(error).toEqual({ kind: 'ownDuel', detail: null, canRetry: false });
  });
});
