// @vitest-environment happy-dom
import { cleanup } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderIn } from '@/lib/__tests__/helpers/renderIn';
import { OAUTH_RETURN_KEY } from '@/lib/oauthReturn';

const nav = vi.hoisted(() => ({ query: 'steam=success', replace: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.query),
  useRouter: () => ({ replace: nav.replace }),
}));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toast }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));

const { OAuthCallbackHandler } = await import('@/components/profile/OAuthCallbackHandler');

const leave = vi.fn();

beforeEach(() => {
  window.history.replaceState(null, '', `/profile?${nav.query}`);
  vi.spyOn(window.location, 'replace').mockImplementation(leave);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  leave.mockReset();
  nav.replace.mockReset();
  toast.success.mockReset();
  window.sessionStorage.clear();
});

describe('OAuthCallbackHandler', () => {
  it('takes a player who left in Russian back to the Russian profile, with the result', () => {
    window.sessionStorage.setItem(OAUTH_RETURN_KEY, 'ru');

    renderIn('en', <OAuthCallbackHandler />);

    expect(leave).toHaveBeenCalledWith('/ru/profile?steam=success');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('moves once and toasts nothing here when the effect runs twice', () => {
    window.sessionStorage.setItem(OAUTH_RETURN_KEY, 'ru');

    renderIn('en', <StrictMode><OAuthCallbackHandler /></StrictMode>);

    expect([leave.mock.calls.length, toast.success.mock.calls.length, nav.replace.mock.calls.length]).toEqual([1, 0, 0]);
  });

  it('toasts the result in the language the player left in, and clears the address', () => {
    window.sessionStorage.setItem(OAUTH_RETURN_KEY, 'ru');

    renderIn('ru', <OAuthCallbackHandler />);

    expect(leave).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledOnce();
    expect(nav.replace).toHaveBeenCalledWith('/ru/profile');
  });
});
