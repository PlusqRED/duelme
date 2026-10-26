// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitch } from '@/components/header/LanguageSwitch';
import { LanguageContext } from '@/i18n/LanguageContext';
import { translator } from '@/i18n/translate';
import type { Language } from '@/i18n/translations';

const replace = vi.fn();

function renderAt(address: string, language: Language) {
  window.history.replaceState(null, '', address);
  render(
    <LanguageContext.Provider value={{ language, ...translator(language) }}>
      <LanguageSwitch />
    </LanguageContext.Provider>
  );
}

async function press(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

beforeEach(() => {
  vi.spyOn(window.location, 'replace').mockImplementation(replace);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  replace.mockReset();
});

describe('LanguageSwitch', () => {
  it('marks the page’s own language', () => {
    renderAt('/ru/games', 'ru');

    expect(screen.getByRole('button', { name: 'RU' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'EN' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('loads the page at its Russian address, keeping the query and an invite’s hash, with no new history entry', async () => {
    renderAt('/games?q=chess#0xabc', 'en');

    await press('RU');

    expect(replace).toHaveBeenCalledWith('/ru/games?q=chess#0xabc');
  });

  it('takes the Russian home page back to the root', async () => {
    renderAt('/ru', 'ru');

    await press('EN');

    expect(replace).toHaveBeenCalledWith('/');
  });

  it('takes a Russian page back to its English address', async () => {
    renderAt('/ru/duel/7#0xabc', 'ru');

    await press('EN');

    expect(replace).toHaveBeenCalledWith('/duel/7#0xabc');
  });

  it('slides the pill to the language pressed at once', async () => {
    renderAt('/games', 'en');

    await press('RU');

    expect(screen.getByRole('button', { name: 'RU' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('stays put when the page’s own language is pressed', async () => {
    renderAt('/ru/games', 'ru');

    await press('RU');

    expect(replace).not.toHaveBeenCalled();
  });
});
