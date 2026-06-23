import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SocialLinkError,
  fetchMyProfile,
  setInstagramHandle,
  startSteamLink,
  startTelegramLink,
  unlinkSocial,
} from '../profileApi';

function mockFetch(response: Partial<Response>) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.json?.call(response) ?? {},
    ...response,
  } as Response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchMyProfile', () => {
  it('returns the profile on 200 and sends the bearer token', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ walletAddress: '0xme', nickname: 'gamer' }),
    });

    const profile = await fetchMyProfile('token-abc');

    expect(profile).toMatchObject({ walletAddress: '0xme', nickname: 'gamer' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/profiles/me');
    expect(init.headers.Authorization).toBe('Bearer token-abc');
  });

  it('returns null on 204 (no profile yet) without parsing the body', async () => {
    const json = vi.fn();
    mockFetch({ ok: true, status: 204, json });

    await expect(fetchMyProfile('token')).resolves.toBeNull();
    expect(json).not.toHaveBeenCalled();
  });

  it('returns null on 404', async () => {
    mockFetch({ ok: false, status: 404 });
    await expect(fetchMyProfile('token')).resolves.toBeNull();
  });

  it('throws on other errors', async () => {
    mockFetch({ ok: false, status: 500 });
    await expect(fetchMyProfile('token')).rejects.toThrow('Failed to fetch profile');
  });
});

describe('startSteamLink', () => {
  it('returns the redirect URL on success', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ redirectUrl: 'https://steamcommunity.com/openid/login?foo' }),
    });

    const result = await startSteamLink('token-abc');

    expect(result.redirectUrl).toBe('https://steamcommunity.com/openid/login?foo');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/profiles/me/social/steam/initiate');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer token-abc');
  });

  it('throws SocialLinkError with code on 401', async () => {
    mockFetch({ ok: false, status: 401 });
    await expect(startSteamLink('token')).rejects.toBeInstanceOf(SocialLinkError);
    await expect(startSteamLink('token')).rejects.toMatchObject({ code: 'unauthorized' });
  });
});

describe('startTelegramLink', () => {
  it('posts to telegram initiate', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ redirectUrl: 'https://oauth.telegram.org/auth?x=1' }),
    });

    const result = await startTelegramLink('token');

    expect(result.redirectUrl).toBe('https://oauth.telegram.org/auth?x=1');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/profiles/me/social/telegram/initiate');
  });
});

describe('setInstagramHandle', () => {
  it('PUTs the handle and returns the updated profile', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ walletAddress: '0xabc', socialLinks: { instagram: { handle: 'alice' } } }),
    });

    const profile = await setInstagramHandle('token', '@alice');

    expect(profile.walletAddress).toBe('0xabc');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/profiles/me/social/instagram');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ handle: '@alice' });
  });

  it('throws with invalid code on 400', async () => {
    mockFetch({ ok: false, status: 400 });
    await expect(setInstagramHandle('token', '.bad')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('throws with alreadyLinked on 409', async () => {
    mockFetch({ ok: false, status: 409 });
    await expect(setInstagramHandle('token', 'ok')).rejects.toMatchObject({ code: 'alreadyLinked' });
  });
});

describe('unlinkSocial', () => {
  it.each(['steam', 'telegram', 'instagram'] as const)('DELETEs %s', async (platform) => {
    const fetchMock = mockFetch({ ok: true, status: 204, json: async () => ({}) });
    await unlinkSocial('token', platform);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/profiles/me/social/${platform}`);
    expect(init.method).toBe('DELETE');
  });

  it('throws SocialLinkError on 502', async () => {
    mockFetch({ ok: false, status: 502 });
    await expect(unlinkSocial('token', 'steam')).rejects.toMatchObject({ code: 'unavailable' });
  });
});
