import { afterEach, describe, expect, it, vi } from 'vitest';
import { translator } from '@/i18n/translate';
import { faucetGift, faucetOffer, getFaucetStatus, parseFaucetStatus, type FaucetStatus } from '@/lib/faucetApi';

afterEach(() => {
  vi.restoreAllMocks();
});

const ON = { enabled: true, claimed: false, chainId: 421614, usdtAmountRaw: '100000000', ethAmountWei: '1000000000000000' };

describe('parseFaucetStatus', () => {
  it('reads a running faucet, amounts as whole numbers', () => {
    expect(parseFaucetStatus(ON)).toEqual({
      enabled: true,
      claimed: false,
      chainId: 421614,
      usdtAmountRaw: 100_000_000n,
      ethAmountWei: 1_000_000_000_000_000n,
    });
  });

  it('reads a faucet that is off, whatever else is null', () => {
    expect(
      parseFaucetStatus({ enabled: false, claimed: null, chainId: null, usdtAmountRaw: null, ethAmountWei: null })
    ).toEqual({ enabled: false });
  });

  it.each([
    null,
    'on',
    {},
    { ...ON, claimed: 'no' },
    { ...ON, chainId: '421614' },
    { ...ON, usdtAmountRaw: 100 },
    { ...ON, ethAmountWei: '1e15' },
    { ...ON, usdtAmountRaw: '-1' },
  ])('refuses %j', (body) => {
    expect(parseFaucetStatus(body)).toBeNull();
  });
});

describe('getFaucetStatus', () => {
  it('asks for the signed-in wallet with its token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(ON));

    await expect(getFaucetStatus('token')).resolves.toMatchObject({ enabled: true, claimed: false });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/faucet/status', { headers: { Authorization: 'Bearer token' } });
  });

  it('fails on an error answer instead of guessing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 502 }));

    await expect(getFaucetStatus('token')).rejects.toThrow('502');
  });

  it('fails on an answer it cannot read', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ enabled: 'yes' }));

    await expect(getFaucetStatus('token')).rejects.toThrow('shape');
  });
});

describe('faucetOffer', () => {
  const running: FaucetStatus = {
    enabled: true,
    claimed: false,
    chainId: 421614,
    usdtAmountRaw: 100_000_000n,
    ethAmountWei: 1_000_000_000_000_000n,
  };

  it('offers a claim on the network the faucet runs on', () => {
    expect(faucetOffer(running, 421614)).toEqual({
      kind: 'ready',
      usdtAmountRaw: 100_000_000n,
      ethAmountWei: 1_000_000_000_000_000n,
    });
  });

  it('says a claim is made once the wallet has it', () => {
    expect(faucetOffer({ ...running, claimed: true }, 421614).kind).toBe('claimed');
  });

  it('offers nothing on another network, while the faucet is off, or before the status is known', () => {
    expect(faucetOffer(running, 42161)).toEqual({ kind: 'none' });
    expect(faucetOffer({ enabled: false }, 421614)).toEqual({ kind: 'none' });
    expect(faucetOffer(undefined, 421614)).toEqual({ kind: 'none' });
  });
});

describe('faucetGift', () => {
  const offer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1_000_000_000_000_000n } as const;

  it('names both tokens in the reader’s language', () => {
    expect(faucetGift({ ...offer, usdtAmountRaw: 1_500_000_000n }, 'ru', translator('ru').t)).toBe('1\u00a0500\u00a0USDT и 0,001\u00a0ETH');
  });

  it('leaves out the ETH an earlier claim already sent', () => {
    expect(faucetGift({ ...offer, ethAmountWei: 0n }, 'en', translator('en').t)).toBe('100\u00a0USDT');
  });
});
