import { useState } from 'react';

/**
 * The value, or while it is null the last one that was not. A window closes when what it shows
 * turns null, and then plays its closing animation: showing this keeps its content until it is gone.
 */
export function useLastNonNull<T>(value: T | null): T | null {
  const [last, setLast] = useState(value);
  if (value !== null && value !== last) {
    setLast(value);
  }
  return value ?? last;
}
