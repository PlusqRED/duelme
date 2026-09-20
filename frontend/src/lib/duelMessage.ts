import { getContractConfig } from '@/lib/contractConfig';

const utf8Encoder = new TextEncoder();

export function countDuelMessageCharacters(value: string): number {
  return Array.from(value).length;
}

export function isDuelMessageValid(value: string): boolean {
  const { maxMessageCharacters, maxMessageBytes } = getContractConfig();
  // Mirror the contract's _validateMessage: it enforces both a code-point and
  // a UTF-8 byte limit, and the byte limit binds once maxMessageCharacters is
  // raised past maxMessageBytes / 4 (worst-case 4 bytes per code point).
  return (
    countDuelMessageCharacters(value) <= maxMessageCharacters &&
    utf8Encoder.encode(value).length <= maxMessageBytes
  );
}

export function hasVisibleDuelMessage(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
