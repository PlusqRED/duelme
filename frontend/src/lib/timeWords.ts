import type { Translator } from '@/i18n/translate';

const DAY_MS = 86_400_000;

/**
 * A duration the contract sets, in words: "1 hour", «2 часа», or minutes when it is not whole
 * hours ("90 minutes"). The number keeps to its word across a line break.
 */
export function durationWords(seconds: number, plural: Translator['plural']): string {
  const hours = seconds / 3600;
  if (Number.isInteger(hours)) {
    return `${hours}\u00a0${plural('time.hours', hours)}`;
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes}\u00a0${plural('time.minutes', minutes)}`;
}

/**
 * When something happened, by the calendar: today, yesterday, or how many days ago. Days are UTC
 * days, so the server says the same thing to every reader.
 */
export function daysAgoWords(then: Date, now: Date, { t, plural }: Translator): string {
  const days = Math.floor(now.getTime() / DAY_MS) - Math.floor(then.getTime() / DAY_MS);
  if (days <= 0) {
    return t('timeAgo.today');
  }
  if (days === 1) {
    return t('timeAgo.yesterday');
  }
  return t('timeAgo.daysAgo', { days: `${days}\u00a0${plural('time.days', days)}` });
}
