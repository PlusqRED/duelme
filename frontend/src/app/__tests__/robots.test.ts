import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import { SITE_URL } from '@/lib/constants';

describe('robots', () => {
  const rules = robots().rules;
  const rule = Array.isArray(rules) ? rules[0] : rules;

  it('keeps crawlers out of the page server’s API and a player’s own pages, in every language', () => {
    expect(rule.disallow).toEqual(['/api/', '/dashboard', '/ru/dashboard']);
  });

  it('lets them read everything else, the backend’s reads the pages render with included', () => {
    expect(rule.allow).toEqual(['/', '/api/v1/']);
  });

  it('points them at the sitemap', () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('names no host, a directive Yandex dropped in 2018', () => {
    expect(robots()).not.toHaveProperty('host');
  });
});
