import { defineSection } from './defineSection';

/**
 * Words of the parts of ordinary pages that only the server draws — the landing's heading and closing note, the games'
 * guides — so they stay out of the browser's dictionary (`pageTranslations.ts`).
 */
export const pagePartsTranslations = defineSection({
  en: {
    'hero.title': '1v1 duels for USDT in any game',
    'game.guideTitle': 'How a duel in {game} goes',
    'games.guidesLabel': 'Guides to duels in popular games',
    'cta.anyGame':
      'Your game is not among these? When you create a duel, find it in the catalog or add it. It doesn’t have to be a video game: a match in real life or a friendly bet works too.',
  },
  ru: {
    'hero.title': 'Дуэли 1 на 1 на USDT в любой игре',
    'game.guideTitle': 'Как проходит дуэль в {game}',
    'games.guidesLabel': 'Как играть дуэли в популярных играх',
    'cta.anyGame':
      'Твоей игры среди этих нет? При создании дуэли найди её в каталоге или добавь. И это не обязательно видеоигра: подойдёт матч вживую или спор с другом.',
  },
});
