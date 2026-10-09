type ClipboardWriter = Pick<Clipboard, 'writeText'>;

/**
 * Writes `text` to the clipboard and reports whether it actually landed there. Callers confirm
 * only on `true`: a "Copied" shown for a write that failed sends the player off to paste whatever
 * the clipboard held before — for a deposit address, someone else's address.
 *
 * `navigator.clipboard` is missing outside secure contexts and in some in-app browsers, and
 * `writeText` rejects when the page has no focus or the permission is denied. Both are `false`.
 */
export async function copyText(
  text: string,
  clipboard: ClipboardWriter | undefined = globalThis.navigator?.clipboard,
): Promise<boolean> {
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
