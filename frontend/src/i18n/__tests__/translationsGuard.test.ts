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

/** «Вы» and its forms. */
const FORMAL_PRONOUN = /(?<![а-яё])(?:вы|вас|вам|вами|ваш[а-яё]*)(?![а-яё])/iu;

/** A verb that agrees with «вы» even where it is left out: «попробуйте», «проверьте», «можете», «поделитесь». */
const FORMAL_VERB = /(?<![а-яё])[а-яё]+(?:ите|йте|ьте|ете|ёте)(?:сь)?(?![а-яё])/giu;

/**
 * A noun in the case after «в», «на», «о» or «при» ends like such a verb («в тестнете», «на сайте»,
 * «в личном кабинете»), so a word right after one of them, or after one and an adjective, is no verb.
 */
const AFTER_PREPOSITION = /(?<![а-яё])(?:в|во|на|о|об|обо|при)\s+(?:[а-яё]+(?:ом|ем|ём|ой|ей)\s+)?$/iu;

function isFormal(text: string): boolean {
  return (
    FORMAL_PRONOUN.test(text) ||
    [...text.matchAll(FORMAL_VERB)].some((verb) => !AFTER_PREPOSITION.test(text.slice(0, verb.index)))
  );
}

const formal = shrinkingList(
  keys.filter((key) => isFormal(translations.ru[key])),
  STILL_FORMAL_KEYS
);

const FORMAL_EXAMPLES = ['Попробуйте ещё раз', 'Проверьте сеть', 'Вы можете отменить', 'На кнопку нажмите'];
const INFORMAL_EXAMPLES = ['Дуэль в тестнете', 'Ссылка на сайте', 'Ответ в отчёте', 'Всё в личном кабинете'];

describe('translations', () => {
  it('uses every key somewhere', () => {
    expect(keys.filter((key) => !isUsed(key))).toEqual([]);
  });

  it.each(BUILT_KEY_PREFIXES)('still builds keys from %s at runtime', (prefix) => {
    expect(code).toContain(`\`${prefix}\${`);
  });

  it.each(FORMAL_EXAMPLES)('hears «вы» in «%s»', (text) => {
    expect(isFormal(text)).toBe(true);
  });

  it.each(INFORMAL_EXAMPLES)('hears no «вы» in «%s»', (text) => {
    expect(isFormal(text)).toBe(false);
  });

  it('says «ты» in Russian outside the strings still waiting for their screen', () => {
    expect(formal.unlisted).toEqual([]);
  });

  it('lists only strings that still say «вы», so the list only shrinks', () => {
    expect(formal.stale).toEqual([]);
  });
});
