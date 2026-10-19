import { describe, expect, it } from 'vitest';
import { parseTransfer, parseUsdtAmount, sendProblems, sendStage, type SendWallet } from '@/lib/sendUsdt';

const OWN = '0x4bfa000000000000000000000000000000076a5a';
const OTHER = '0x1111111111111111111111111111111111111111';
const WALLET: SendWallet = { address: OWN, usdtRaw: 46_700_000n, ethWei: 7_700_000_000_000_000n };

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

describe('sendProblems', () => {
  it('lets a sound transfer through', () => {
    expect(sendProblems({ to: OTHER, amount: '12.5' }, WALLET)).toEqual({});
  });

  it('wants an address', () => {
    expect(sendProblems({ to: '0x1234', amount: '1' }, WALLET).to).toBe('address');
  });

  it('will not send to the wallet itself, whatever its case', () => {
    expect(sendProblems({ to: OWN.toUpperCase().replace('0X', '0x'), amount: '1' }, WALLET).to).toBe('self');
  });

  it('wants an amount above zero', () => {
    expect(sendProblems({ to: OTHER, amount: '0' }, WALLET).amount).toBe('empty');
    expect(sendProblems({ to: OTHER, amount: '' }, WALLET).amount).toBe('empty');
  });

  it('will not send more than the wallet holds', () => {
    expect(sendProblems({ to: OTHER, amount: '46.700001' }, WALLET).amount).toBe('tooMuch');
    expect(sendProblems({ to: OTHER, amount: '46.7' }, WALLET).amount).toBeUndefined();
  });

  it('says the network fee cannot be paid without ETH', () => {
    expect(sendProblems({ to: OTHER, amount: '1' }, { ...WALLET, ethWei: 0n }).eth).toBe('none');
  });

  it('stops nothing on a balance it does not know yet', () => {
    expect(sendProblems({ to: OTHER, amount: '1000' }, { ...WALLET, usdtRaw: null, ethWei: null })).toEqual({});
  });
});

describe('sendStage', () => {
  const idle = { isConfirming: false, isSuccess: false, error: null };

  it('shows the form until the transfer is sent off', () => {
    expect(sendStage(false, idle)).toBe('form');
  });

  it('waits for the wallet to confirm before there is a transaction', () => {
    expect(sendStage(true, idle)).toBe('confirm');
  });

  it('is on the network once the transaction has a hash', () => {
    expect(sendStage(true, { ...idle, hash: '0xabc' })).toBe('sending');
  });

  it('is on the network while the embedded wallet broadcasts it', () => {
    expect(sendStage(true, { ...idle, isConfirming: true })).toBe('sending');
  });

  it('is through once the receipt says so', () => {
    expect(sendStage(true, { ...idle, hash: '0xabc', isSuccess: true })).toBe('done');
  });

  it('tells a transfer turned down in the wallet from one that failed', () => {
    expect(sendStage(true, { ...idle, error: new Error('User rejected the request.') })).toBe('rejected');
    expect(sendStage(true, { ...idle, error: new Error('insufficient funds for gas') })).toBe('failed');
  });

  it('shows the form again however the last transfer ended', () => {
    expect(sendStage(false, { ...idle, error: new Error('User rejected the request.') })).toBe('form');
  });
});

describe('parseTransfer', () => {
  const TO = '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23';

  it('reads the address and the amount a draft asks for', () => {
    expect(parseTransfer({ to: ` ${TO} `, amount: '2,5' })).toEqual({ to: TO, raw: 2_500_000n });
  });

  it('has no transfer without an address', () => {
    expect(parseTransfer({ to: '0x32a3', amount: '1' })).toBeNull();
  });

  it('has no transfer of nothing', () => {
    expect(parseTransfer({ to: TO, amount: '0' })).toBeNull();
    expect(parseTransfer({ to: TO, amount: '' })).toBeNull();
  });
});
