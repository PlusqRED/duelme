// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { serverDictionaries } from '@/i18n/serverTranslation';
import { translator } from '@/i18n/translate';
import { renderIn } from '@/lib/__tests__/helpers/renderIn';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES, DEVELOPER_EMAIL, SOURCE_CODE_URL } from '@/lib/constants';
import { contractTestsLabel, emergencyDelayLabel } from '@/lib/contractFacts';
import { explorerLink } from '@/lib/explorer';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ [LANGUAGE_HEADER]: 'ru' }) }));

const { default: HowItWorksPage } = await import('@/app/how-it-works/page');
const { default: SafetyPage } = await import('@/app/safety/page');
const { default: AboutPage } = await import('@/app/about/page');

const ru = serverDictionaries.ru;

afterEach(cleanup);

describe('how it works', () => {
  it('walks a duel through its steps in order', async () => {
    renderIn('ru', await HowItWorksPage());

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      ru['howItWorks.step1.title'],
      ru['howItWorks.step2.title'],
      ru['howItWorks.step3.title'],
      ru['howItWorks.step4.title'],
      ru['howItWorks.step5.title'],
    ]);
  });

  it('ends with the way to a first duel', async () => {
    renderIn('ru', await HowItWorksPage());

    expect(screen.getByRole('link', { name: ru['hero.cta'] }).getAttribute('href')).toBe('/ru/duel/create');
  });
});

describe('safety', () => {
  it('links the contract on the explorer of the network the site runs on', async () => {
    renderIn('ru', await SafetyPage());
    const contract = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];

    expect(screen.getByRole('link', { name: new RegExp(contract) }).getAttribute('href')).toBe(
      explorerLink(DEFAULT_CHAIN_ID, 'address', contract)
    );
  });

  it('says how many tests the contract has, with the word that agrees', async () => {
    renderIn('ru', await SafetyPage());

    // Testing Library reads a no-break space as a plain one.
    const tests = contractTestsLabel(translator('ru').plural, 'ru').replace(/\s/g, ' ');

    expect(screen.getByText((text) => text.startsWith(tests))).toBeTruthy();
  });

  it('says how long the emergency exit waits, as the contract has it', async () => {
    renderIn('ru', await SafetyPage());
    const days = emergencyDelayLabel(translator('ru').plural, 'ru').replace(/\s/g, ' ');

    expect(screen.getByText((text) => text.includes(`не раньше чем через ${days},`))).toBeTruthy();
  });
});

describe('about', () => {
  it('gives the ways to reach the developer', async () => {
    renderIn('ru', await AboutPage());

    expect(screen.getByRole('link', { name: ru['about.contact.email'] }).getAttribute('href')).toBe(`mailto:${DEVELOPER_EMAIL}`);
    expect(screen.getByRole('link', { name: ru['about.contact.source'] }).getAttribute('href')).toBe(SOURCE_CODE_URL);
  });
});
