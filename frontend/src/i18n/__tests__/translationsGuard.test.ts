import { describe, expect, it } from 'vitest';
import { translations, type TranslationKey } from '@/i18n/translations';
import { shrinkingList, sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';
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
  if (BUILT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return true;
  }
  return isQuoted(key) || (PLURAL_FORM.test(key) && isQuoted(key.replace(PLURAL_FORM, '')));
}

/** «Вы» and its forms, and verbs that agree with it: «попробуйте», «откройте», «поделитесь». */
const FORMAL_ADDRESS = /(?<![а-яё])(?:вы|вас|вам|вами|ваш[а-яё]*|[а-яё]+(?:ите|йте)(?:сь)?)(?![а-яё])/iu;

const formal = shrinkingList(
  keys.filter((key) => FORMAL_ADDRESS.test(translations.ru[key])),
  STILL_FORMAL_KEYS
);

describe('translations', () => {
  it('uses every key somewhere', () => {
    expect(keys.filter((key) => !isUsed(key))).toEqual([]);
  });

  it.each(BUILT_KEY_PREFIXES)('still builds keys from %s at runtime', (prefix) => {
    expect(code).toContain(`\`${prefix}\${`);
  });

  it('says «ты» in Russian outside the strings still waiting for their screen', () => {
    expect(formal.unlisted).toEqual([]);
  });

  it('lists only strings that still say «вы», so the list only shrinks', () => {
    expect(formal.stale).toEqual([]);
  });
});
