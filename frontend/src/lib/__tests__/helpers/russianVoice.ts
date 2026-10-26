/**
 * Whether Russian text addresses the reader as «вы»: the site says «ты» everywhere. Not named
 * `*.test.ts`, so vitest's `include` glob does not collect it.
 */

/** «Вы» and its forms. */
const FORMAL_PRONOUN = /(?<![а-яё])(?:вы|вас|вам|вами|ваш[а-яё]*)(?![а-яё])/iu;

/** A verb that agrees with «вы» even where it is left out: «попробуйте», «проверьте», «можете», «поделитесь». */
const FORMAL_VERB = /(?<![а-яё])[а-яё]+(?:ите|йте|ьте|ете|ёте)(?:сь)?(?![а-яё])/giu;

/**
 * A noun in the case after «в», «на», «о» or «при» ends like such a verb («в тестнете», «на сайте»,
 * «в личном кабинете»), so a word right after one of them, or after one and an adjective, is no verb.
 */
const AFTER_PREPOSITION = /(?<![а-яё])(?:в|во|на|о|об|обо|при)\s+(?:[а-яё]+(?:ом|ем|ём|ой|ей)\s+)?$/iu;

export function isFormal(text: string): boolean {
  return (
    FORMAL_PRONOUN.test(text) ||
    [...text.matchAll(FORMAL_VERB)].some((verb) => !AFTER_PREPOSITION.test(text.slice(0, verb.index)))
  );
}
