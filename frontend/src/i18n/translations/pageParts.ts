import { defineSection } from './defineSection';

/**
 * Words of the parts of ordinary pages that only the server draws — the landing's heading, the games'
 * guides — so they stay out of the browser's dictionary (`pageTranslations.ts`).
 */
export const pagePartsTranslations = defineSection({
  en: {
    'hero.title': '1v1 duels for USDT in any game',
    'game.guideTitle': 'How a duel in {game} goes',
    'games.guidesLabel': 'Guides to duels in popular games',
  },
  ru: {
    'hero.title': 'Дуэли 1 на 1 на USDT в любой игре',
    'game.guideTitle': 'Как проходит дуэль в {game}',
    'games.guidesLabel': 'Как играть дуэли в популярных играх',
  },
});
