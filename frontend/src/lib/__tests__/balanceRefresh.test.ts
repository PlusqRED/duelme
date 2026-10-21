// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { emitBalanceRefresh, subscribeToSharedRefresh } from '@/lib/balanceRefresh';

const unsubscribes: (() => void)[] = [];

function listen(key: string, heard: string[], name: string) {
  unsubscribes.push(subscribeToSharedRefresh(key, { fresh: () => heard.push(`${name} fresh`), join: () => heard.push(`${name} join`) }));
}

afterEach(() => {
  unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
});

describe('subscribeToSharedRefresh', () => {
  it('testSharedRefreshReadsAfreshOnceAndLetsTheOtherReadersJoin', () => {
    const heard: string[] = [];
    listen('range', heard, 'a');
    listen('range', heard, 'b');

    emitBalanceRefresh();

    expect(heard).toEqual(['a fresh', 'b join']);
  });

  it('testSharedRefreshReadsEachKeyAfresh', () => {
    const heard: string[] = [];
    listen('range:1', heard, 'a');
    listen('range:2', heard, 'b');

    emitBalanceRefresh();

    expect(heard).toEqual(['a fresh', 'b fresh']);
  });

  it('testSharedRefreshReadsAfreshAgainOnTheNextEvent', () => {
    const heard: string[] = [];
    listen('range', heard, 'a');
    listen('range', heard, 'b');

    emitBalanceRefresh();
    emitBalanceRefresh();

    expect(heard).toEqual(['a fresh', 'b join', 'a fresh', 'b join']);
  });

  it('testSharedRefreshStopsListeningOnceUnsubscribed', () => {
    const heard: string[] = [];
    listen('range', heard, 'a');
    unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());

    emitBalanceRefresh();

    expect(heard).toEqual([]);
  });
});
