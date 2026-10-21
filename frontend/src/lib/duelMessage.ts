import { type ContractConfig, getContractConfig } from '@/lib/contractConfig';

const utf8Encoder = new TextEncoder();

/**
 * The message as the contract gets it: without the spaces around it. The create page's counter, its
 * length check and the create call all judge this one string, so a message of spaces is no message
 * and trailing spaces never push a message over the limit.
 */
export function normalizeDuelMessage(value: string): string {
  return value.trim();
}

export function countDuelMessageCharacters(value: string): number {
  return Array.from(value).length;
}

export function isDuelMessageValid(
  value: string,
  { maxMessageCharacters, maxMessageBytes }: ContractConfig = getContractConfig()
): boolean {
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
