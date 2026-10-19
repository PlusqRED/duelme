import { describe, expect, it } from 'vitest';
import { translations, type TranslationKey } from '@/i18n/translations';
import { sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';
import { STILL_FORMAL_KEYS } from './stillFormalKeys';

const keys = Object.keys(translations.en) as TranslationKey[];

const code = sourceFiles(['.ts', '.tsx'])
  .filter((file) => !file.path.startsWith('i18n/translations'))
  .map((file) => file.text)
  .join('\n');

/** Keys a caller puts together from data at runtime: a game's category, the public duels' sort order. */
const BUILT_KEY_PREFIXES = ['category.', 'publicDuels.sort'];

const PLURAL_FORM = /\.(one|few|many|other)$/;

function isQuoted(key: string): boolean {
  return [`'${key}'`, `"${key}"`, `\`${key}\``].some((quoted) => code.includes(quoted));
}

function isUsed(key: string): boolean {
  if (isQuoted(key)) {
    return true;
  }
  if (PLURAL_FORM.test(key) && isQuoted(key.replace(PLURAL_FORM, ''))) {
    return true;
  }
  return BUILT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** «Вы» and its forms, and verbs that agree with it: «попробуйте», «откройте», «поделитесь». */
const FORMAL_ADDRESS = /(?<![а-яё])(?:вы|вас|вам|вами|ваш[а-яё]*|[а-яё]+(?:ите|йте)(?:сь)?)(?![а-яё])/iu;

function isFormal(key: TranslationKey): boolean {
  return FORMAL_ADDRESS.test(translations.ru[key]);
}

describe('translations', () => {
  it('uses every key somewhere', () => {
    expect(keys.filter((key) => !isUsed(key))).toEqual([]);
  });

  it.each(BUILT_KEY_PREFIXES)('still builds keys from %s at runtime', (prefix) => {
    expect(code).toContain(`\`${prefix}\${`);
  });

  it('says «ты» in Russian outside the strings still waiting for their screen', () => {
    const stillFormal = new Set<TranslationKey>(STILL_FORMAL_KEYS);

    expect(keys.filter((key) => isFormal(key) && !stillFormal.has(key))).toEqual([]);
  });

  it('lists only strings that still say «вы», so the list only shrinks', () => {
    expect(STILL_FORMAL_KEYS.filter((key) => !isFormal(key))).toEqual([]);
  });
});
