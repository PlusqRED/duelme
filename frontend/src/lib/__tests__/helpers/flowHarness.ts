import type { SetStateAction } from 'react';
import { vi } from 'vitest';

/**
 * A `setFlow` that keeps the guided flow's state in a variable, the way React would, so a test
 * can drive the flow actions and read where they left the flow.
 *
 * Not named `*.test.ts`, so vitest's `include` glob does not collect it.
 */
export function captureFlowState<T>(initial: T | null = null) {
  let flow = initial;

  return {
    setFlow(update: SetStateAction<T | null>) {
      flow = update instanceof Function ? update(flow) : update;
    },
    get flow() {
      return flow;
    },
    set flow(next: T | null) {
      flow = next;
    },
  };
}

/** `useAppToast()` with every method a spy. */
export function mockAppToast() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    transactionError: vi.fn(),
  };
}
