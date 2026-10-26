// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { translations } from '@/i18n/translations';
import { DEFAULT_CHAIN_ID, DUELME_ADDRESSES, DEVELOPER_EMAIL, SOURCE_CODE_URL } from '@/lib/constants';
import { explorerLink } from '@/lib/explorer';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ [LANGUAGE_HEADER]: 'ru' }) }));

const { default: HowItWorksPage } = await import('@/app/how-it-works/page');
const { default: SafetyPage } = await import('@/app/safety/page');
const { default: AboutPage } = await import('@/app/about/page');

const ru = translations.ru;

function renderRu(page: ReactNode) {
  render(<LanguageProvider language="ru">{page}</LanguageProvider>);
}

afterEach(cleanup);

describe('how it works', () => {
  it('walks a duel through its steps in order', async () => {
    renderRu(await HowItWorksPage());

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      ru['howItWorks.step1.title'],
      ru['howItWorks.step2.title'],
      ru['howItWorks.step3.title'],
      ru['howItWorks.step4.title'],
      ru['howItWorks.step5.title'],
    ]);
  });

  it('ends with the way to a first duel', async () => {
    renderRu(await HowItWorksPage());

    expect(screen.getByRole('link', { name: ru['hero.cta'] }).getAttribute('href')).toBe('/ru/duel/create');
  });
});

describe('safety', () => {
  it('links the contract on the explorer of the network the site runs on', async () => {
    renderRu(await SafetyPage());
    const contract = DUELME_ADDRESSES[DEFAULT_CHAIN_ID];

    expect(screen.getByRole('link', { name: new RegExp(contract) }).getAttribute('href')).toBe(
      explorerLink(DEFAULT_CHAIN_ID, 'address', contract)
    );
  });

  it('says how many tests the contract has, with the word that agrees', async () => {
    renderRu(await SafetyPage());

    expect(screen.getByText(/^294 теста прогоняют/)).toBeTruthy();
  });
});

describe('about', () => {
  it('gives the ways to reach the developer', async () => {
    renderRu(await AboutPage());

    expect(screen.getByRole('link', { name: ru['about.contact.email'] }).getAttribute('href')).toBe(`mailto:${DEVELOPER_EMAIL}`);
    expect(screen.getByRole('link', { name: ru['about.contact.source'] }).getAttribute('href')).toBe(SOURCE_CODE_URL);
  });
});
