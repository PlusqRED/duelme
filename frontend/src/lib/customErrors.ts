import { parseAbi, toFunctionSelector } from 'viem';
import { duelMeAbi } from '@/lib/contracts';

/**
 * Errors the token reverts with that DuelMe's own ABI does not carry. SafeERC20 bubbles them up
 * from a failed `transferFrom`, so a stake the wallet no longer holds surfaces as one of these.
 */
const TOKEN_ERRORS = parseAbi([
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  'error ERC2612ExpiredSignature(uint256 deadline)',
  'error ERC2612InvalidSigner(address signer, address owner)',
]);

/** An ABI's error entry, as much of it as a selector needs. */
interface ErrorEntry {
  type: 'error';
  name: string;
  inputs: readonly { type: string }[];
}

function isErrorEntry(item: (typeof duelMeAbi)[number] | (typeof TOKEN_ERRORS)[number]): item is Extract<typeof item, ErrorEntry> {
  return item.type === 'error';
}

const KNOWN_ERRORS: readonly ErrorEntry[] = [...duelMeAbi, ...TOKEN_ERRORS].filter(isErrorEntry);

const NAMES_BY_SELECTOR = new Map(
  KNOWN_ERRORS.map((error) => [
    toFunctionSelector(`${error.name}(${error.inputs.map((input) => input.type).join(',')})`),
    error.name,
  ])
);

/** A 4-byte selector, alone or at the head of the revert data that carries the error's arguments. */
const REVERT_DATA = /0x([0-9a-f]{8})[0-9a-f]*/gi;

/**
 * The text with every custom error it quotes as revert data named instead: a call decoded without
 * the right ABI says "reverted with the following signature: 0xd93c0665", which tells a player and
 * a developer nothing, where "EnforcedPause" does. Data no known error matches stays as it is.
 */
export function nameCustomErrors(text: string): string {
  return text.replace(REVERT_DATA, (data: string, selector: string) => NAMES_BY_SELECTOR.get(`0x${selector.toLowerCase()}`) ?? data);
}

/** Whether the text quotes a custom error by its selector: the contract refused, in its own words. */
export function quotesCustomError(text: string): boolean {
  return [...text.matchAll(REVERT_DATA)].some(([, selector]) => NAMES_BY_SELECTOR.has(`0x${selector.toLowerCase()}`));
}
