import { beforeEach, describe, expect, it } from 'vitest';
import { RelayerBusyError, resetRelayerQueue, withRelayerLock } from '@/lib/relayerQueue';

beforeEach(() => {
  resetRelayerQueue();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('withRelayerLock', () => {
  it('never runs two relays at once', async () => {
    let running = 0;
    let maxConcurrent = 0;

    await Promise.all(
      Array.from({ length: 5 }, () =>
        withRelayerLock(async () => {
          running += 1;
          maxConcurrent = Math.max(maxConcurrent, running);
          await Promise.resolve();
          running -= 1;
        })
      )
    );

    expect(maxConcurrent).toBe(1);
  });

  it('preserves submission order', async () => {
    const order: number[] = [];

    await Promise.all(
      [1, 2, 3].map((n) =>
        withRelayerLock(async () => {
          order.push(n);
        })
      )
    );

    expect(order).toEqual([1, 2, 3]);
  });

  it('hands the lock on after a failure instead of poisoning the chain', async () => {
    const failing = withRelayerLock(async () => {
      throw new Error('broadcast failed');
    });

    await expect(failing).rejects.toThrow('broadcast failed');
    await expect(withRelayerLock(async () => 'ok')).resolves.toBe('ok');
  });

  it('returns the runner result to its own caller', async () => {
    const [a, b] = await Promise.all([
      withRelayerLock(async () => 'first'),
      withRelayerLock(async () => 'second'),
    ]);

    expect([a, b]).toEqual(['first', 'second']);
  });

  it('sheds load once the queue is full rather than growing without bound', async () => {
    const gate = deferred<void>();
    const held = Array.from({ length: 8 }, () => withRelayerLock(() => gate.promise));

    await expect(withRelayerLock(async () => 'overflow')).rejects.toBeInstanceOf(RelayerBusyError);

    gate.resolve();
    await Promise.all(held);

    // Draining the queue makes room again.
    await expect(withRelayerLock(async () => 'ok')).resolves.toBe('ok');
  });
});
