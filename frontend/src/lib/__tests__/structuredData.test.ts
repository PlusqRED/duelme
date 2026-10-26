import { describe, expect, it } from 'vitest';
import { DEVLOG_URL, SITE_NAME, SITE_URL } from '@/lib/constants';
import {
  breadcrumbSchema,
  organizationSchema,
  serializeStructuredData,
  webApplicationSchema,
  websiteSchema,
} from '@/lib/structuredData';

describe('organizationSchema', () => {
  it('names the devlog as the brand’s one other place', () => {
    expect(organizationSchema('About').sameAs).toEqual([DEVLOG_URL]);
  });

  it('points at the logo at its fixed address', () => {
    expect(organizationSchema('About').logo).toMatchObject({ url: `${SITE_URL}/logo.png` });
  });

  it('carries the description it is given', () => {
    expect(organizationSchema('Duels for USDT').description).toBe('Duels for USDT');
  });
});

describe('webApplicationSchema', () => {
  it('is free to use and published by the organization', () => {
    const app = webApplicationSchema('About');

    expect(app.offers).toMatchObject({ price: '0' });
    expect(app.publisher).toEqual({ '@id': organizationSchema('About')['@id'] });
  });

  it('offers no site search action, which Google no longer shows', () => {
    expect(webApplicationSchema('About')).not.toHaveProperty('potentialAction');
  });
});

describe('websiteSchema', () => {
  it('names the site by the brand, not the domain, at the home page’s address', () => {
    expect(websiteSchema()).toMatchObject({ '@type': 'WebSite', name: SITE_NAME, url: SITE_URL });
  });

  it('gives the same other names as the web app', () => {
    expect(websiteSchema().alternateName).toEqual(webApplicationSchema('About').alternateName);
  });

  it('is published by the organization', () => {
    expect(websiteSchema().publisher).toEqual({ '@id': organizationSchema('About')['@id'] });
  });
});

describe('breadcrumbSchema', () => {
  it('numbers the steps from one and makes each path a full address', () => {
    const list = breadcrumbSchema(
      [
        { name: 'Home', path: '/' },
        { name: 'Games', path: '/games' },
      ],
      'en'
    );

    expect(list.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Games', item: `${SITE_URL}/games` },
    ]);
  });

  it('leads each step to its page in the reader’s language', () => {
    const list = breadcrumbSchema(
      [
        { name: 'Главная', path: '/' },
        { name: 'Игры', path: '/games' },
      ],
      'ru'
    );

    expect((list.itemListElement as { item: string }[]).map((step) => step.item)).toEqual([`${SITE_URL}/ru`, `${SITE_URL}/ru/games`]);
  });
});

describe('serializeStructuredData', () => {
  it('adds the schema.org context', () => {
    expect(JSON.parse(serializeStructuredData({ '@type': 'Thing' }))).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Thing',
    });
  });

  it('keeps a name that tries to close the script tag from closing it', () => {
    const text = serializeStructuredData({ name: '</script><script>alert(1)</script>' });

    expect(text).not.toContain('</script>');
    expect(JSON.parse(text).name).toBe('</script><script>alert(1)</script>');
  });
});
