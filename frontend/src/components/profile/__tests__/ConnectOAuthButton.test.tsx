// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderIn } from '@/lib/__tests__/helpers/renderIn';
import { OAUTH_RETURN_KEY } from '@/lib/oauthReturn';

const start = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock('@/hooks/useSocialLinks', () => ({ useSocialLinks: () => ({ startSteam: start, startTelegram: start }) }));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ error: vi.fn() }) }));

const { ConnectOAuthButton } = await import('@/components/profile/ConnectOAuthButton');

beforeEach(() => {
  start.mutateAsync.mockResolvedValue({ redirectUrl: 'https://steamcommunity.com/openid/login' });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('ConnectOAuthButton', () => {
  it('keeps the page’s language for the return before it leaves for the platform', async () => {
    const keptOnLeaving: (string | null)[] = [];
    vi.spyOn(window.location, 'assign').mockImplementation(() => {
      keptOnLeaving.push(window.sessionStorage.getItem(OAUTH_RETURN_KEY));
    });
    renderIn('ru', <ConnectOAuthButton platform="steam" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(keptOnLeaving).toEqual(['ru']);
  });
});
