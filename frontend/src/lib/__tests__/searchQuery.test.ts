import { describe, expect, it } from 'vitest';
import { addressWithSearch, readSearchParam } from '@/lib/searchQuery';

describe('readSearchParam', () => {
  it('reads the search as the address gives it', () => {
    expect(readSearchParam('alice')).toBe('alice');
  });

  it('takes the first of a search given twice', () => {
    expect(readSearchParam(['alice', 'bob'])).toBe('alice');
  });

  it('reads no search as empty', () => {
    expect(readSearchParam(undefined)).toBe('');
  });
});

describe('addressWithSearch', () => {
  const at = { pathname: '/duels/recent', search: '?ref=x', hash: '#top' };

  it('puts the search in the address, keeping the rest of it', () => {
    expect(addressWithSearch(at, 'chess 5')).toBe('/duels/recent?ref=x&q=chess+5#top');
  });

  it('replaces a search already in the address', () => {
    expect(addressWithSearch({ ...at, search: '?q=old' }, 'new')).toBe('/duels/recent?q=new#top');
  });

  it('takes an emptied search out of the address', () => {
    expect(addressWithSearch({ pathname: '/duels/recent', search: '?q=old', hash: '' }, '')).toBe('/duels/recent');
  });
});
