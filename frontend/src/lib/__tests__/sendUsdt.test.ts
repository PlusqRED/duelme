import { describe, expect, it } from 'vitest';
import { checkTransfer, parseUsdtAmount, resolveSendRoute, sendStage, type SendDraft, type SendWallet } from '@/lib/sendUsdt';

const OWN = '0x4bfa000000000000000000000000000000076a5a';
const OTHER = '0x1111111111111111111111111111111111111111';
const WALLET: SendWallet = { address: OWN, usdtRaw: 46_700_000n, ethWei: 7_700_000_000_000_000n, route: 'self' };

describe('parseUsdtAmount', () => {
  it.each([
    ['10', 10_000_000n],
    ['4,5', 4_500_000n],
    ['4.123456', 4_123_456n],
    ['.5', 500_000n],
    [' 7 ', 7_000_000n],
    ['0', 0n],
  ])('reads %j', (typed, raw) => {
    expect(parseUsdtAmount(typed)).toBe(raw);
  });

  it.each(['', 'abc', '1.2345678', '1e3', '-1', '1.', '1,000.5', '0x10', 'Infinity'])('refuses %j', (typed) => {
    expect(parseUsdtAmount(typed)).toBeNull();
  });
});

describe('checkTransfer', () => {
  const problemsOf = (draft: SendDraft, wallet: SendWallet = WALLET) => checkTransfer(draft, wallet).problems;

  it('lets a sound transfer through', () => {
    expect(problemsOf({ to: OTHER, amount: '12.5' })).toEqual({});
  });

  it('wants an address', () => {
    expect(problemsOf({ to: '0x1234', amount: '1' }).to).toBe('address');
  });

  it('will not send to the wallet itself, whatever its case', () => {
    expect(problemsOf({ to: OWN.toUpperCase().replace('0X', '0x'), amount: '1' }).to).toBe('self');
  });

  it('wants an amount above zero', () => {
    expect(problemsOf({ to: OTHER, amount: '0' }).amount).toBe('empty');
    expect(problemsOf({ to: OTHER, amount: '' }).amount).toBe('empty');
  });

  it('will not send more than the wallet holds', () => {
    expect(problemsOf({ to: OTHER, amount: '46.700001' }).amount).toBe('tooMuch');
    expect(problemsOf({ to: OTHER, amount: '46.7' }).amount).toBeUndefined();
  });

  it('says the network fee cannot be paid without ETH', () => {
    expect(problemsOf({ to: OTHER, amount: '1' }, { ...WALLET, ethWei: 0n }).eth).toBe('none');
  });

  it('wants no ETH from a wallet whose fee DuelMe pays', () => {
    expect(problemsOf({ to: OTHER, amount: '1' }, { ...WALLET, ethWei: 0n, route: 'relay' })).toEqual({});
  });

  it('stops nothing on a balance it does not know yet', () => {
    expect(problemsOf({ to: OTHER, amount: '1000' }, { ...WALLET, usdtRaw: null, ethWei: null })).toEqual({});
  });

  it('reads the address and the amount a sound draft asks for', () => {
    const TO = '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23';

    expect(checkTransfer({ to: ` ${TO} `, amount: '2,5' }, WALLET).transfer).toEqual({ to: TO, raw: 2_500_000n, route: 'self' });
  });

  it('fixes who pays the fee on the transfer it hands on', () => {
    const wallet: SendWallet = { ...WALLET, ethWei: 0n, route: 'relay' };

    expect(checkTransfer({ to: OTHER, amount: '1' }, wallet).transfer?.route).toBe('relay');
  });

  it.each([
    ['no address', { to: '0x32a3', amount: '1' }, WALLET],
    ['nothing to send', { to: OTHER, amount: '0' }, WALLET],
    ['more than the wallet holds', { to: OTHER, amount: '50' }, WALLET],
    ['no ETH for the fee', { to: OTHER, amount: '1' }, { ...WALLET, ethWei: 0n }],
  ])('has no transfer with %s', (_case, draft, wallet) => {
    expect(checkTransfer(draft, wallet).transfer).toBeNull();
  });
});

describe('resolveSendRoute', () => {
  const ETH = 10n ** 15n;

  it('has DuelMe pay for the day\'s first transfer, with ETH in the wallet or without', () => {
    expect(resolveSendRoute('available', false, 0n)).toBe('relay');
    expect(resolveSendRoute('available', false, ETH)).toBe('relay');
  });

  it('has the wallet pay once the day\'s transfer is used, and where DuelMe does not relay', () => {
    expect(resolveSendRoute('used', false, ETH)).toBe('self');
    expect(resolveSendRoute('used', false, 0n)).toBe('self');
    expect(resolveSendRoute('off', false, ETH)).toBe('self');
  });

  it('leaves a status still being read to the relayer', () => {
    expect(resolveSendRoute('unknown', false, null)).toBe('relay');
  });

  it('has a wallet with ETH pay itself once the relayer said no, so Send still works', () => {
    expect(resolveSendRoute('available', true, ETH)).toBe('self');
  });

  it('keeps asking the relayer for a wallet that said no but has no ETH to pay with', () => {
    expect(resolveSendRoute('available', true, 0n)).toBe('relay');
    expect(resolveSendRoute('unknown', true, null)).toBe('relay');
  });
});

describe('sendStage', () => {
  const idle = { isConfirming: false, isSuccess: false, failure: null };

  it('waits for the wallet to confirm before there is a transaction', () => {
    expect(sendStage(idle)).toBe('confirm');
  });

  it('is on the network once the transaction has a hash', () => {
    expect(sendStage({ ...idle, hash: '0xabc' })).toBe('sending');
  });

  it('is on the network while the embedded wallet broadcasts it', () => {
    expect(sendStage({ ...idle, isConfirming: true })).toBe('sending');
  });

  it('is through once the receipt says so', () => {
    expect(sendStage({ ...idle, hash: '0xabc', isSuccess: true })).toBe('done');
  });

  it('stops once the transfer has a failure, whatever its kind', () => {
    expect(sendStage({ ...idle, hash: '0xabc', failure: { kind: 'reverted', detail: null, canRetry: true } })).toBe('failed');
  });
});
