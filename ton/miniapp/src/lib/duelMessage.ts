// Frontend mirror of the on-chain UTF-8 message validator.
//
// The contract throws if the message exceeds either limit, so the UI should
// catch the issue locally and surface a friendly error before any signature
// prompt. Both limits intentionally match `MAX_MESSAGE_BYTES` /
// `MAX_MESSAGE_CODEPOINTS` from the Tolk implementation.

import { MAX_MESSAGE_BYTES, MAX_MESSAGE_CODEPOINTS } from "./constants";

export interface MessageValidation {
  byteLength: number;
  codePoints: number;
  errors: Array<"tooManyBytes" | "tooManyCodePoints">;
}

export function validateDuelMessage(message: string): MessageValidation {
  const encoder = new TextEncoder();
  const byteLength = encoder.encode(message).length;
  const codePoints = [...message].length;
  const errors: MessageValidation["errors"] = [];
  if (byteLength > MAX_MESSAGE_BYTES) errors.push("tooManyBytes");
  if (codePoints > MAX_MESSAGE_CODEPOINTS) errors.push("tooManyCodePoints");
  return { byteLength, codePoints, errors };
}

export function isValidDuelMessage(message: string): boolean {
  return validateDuelMessage(message).errors.length === 0;
}
