export const MAX_DUEL_MESSAGE_CHARACTERS = 32;

export function countDuelMessageCharacters(value: string): number {
  return Array.from(value).length;
}

export function isDuelMessageValid(value: string): boolean {
  return countDuelMessageCharacters(value) <= MAX_DUEL_MESSAGE_CHARACTERS;
}

export function hasVisibleDuelMessage(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
