import { describe, expect, it } from 'vitest';
import { translations, type TranslationKey } from '@/i18n/translations';
import { isFormal } from '@/lib/__tests__/helpers/russianVoice';
import { sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';

const keys = Object.keys(translations.en) as TranslationKey[];

const code = sourceFiles(['.ts', '.tsx'])
  .filter((file) => !file.path.startsWith('i18n/translations'))
  .map((file) => file.text)
  .join('\n');

/** Keys a caller puts together from data at runtime: a game's category. */
const BUILT_KEY_PREFIXES = ['category.'];

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

  it('keeps every amount on the line of its unit, with a no-break space between them', () => {
    const split = (['en', 'ru'] as const).flatMap((language) =>
      keys.filter((key) => /\} (?:USDT|ETH)\b/.test(translations[language][key])).map((key) => `${language}:${key}`)
    );

    expect(split).toEqual([]);
  });

  it('says «ты» in Russian', () => {
    expect(keys.filter((key) => isFormal(translations.ru[key]))).toEqual([]);
  });
});
