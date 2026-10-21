import { defineSection } from './defineSection';

/** The landing's open duels, its finished duels and the popular games that filter them. */
export const landingListsTranslations = defineSection({
  en: {
    'publicDuels.joinFor': 'Join for {amount} USDT',
    'publicDuels.openNow': 'Open now: {n}',
    'publicDuels.createTitle': 'Want different terms?',
    'publicDuels.createDesc': 'Create your own duel: pick the game and the stake, then share the link.',
    'popularGames.hint': 'Pick a game to see only its duels.',
    'popularGames.filterLabel': 'Show recent duels for one game',
    'recent.pot': 'Pot',
    'recent.only': 'Only {game}',
    'recent.showAll': 'Show all games',
    'recent.stakes': 'Stakes',
    'recent.toWinner': 'To the winner',
    'recent.fee': 'Platform fee: 0 USDT',
    'recent.open': 'Open duel #{id}',
    'recent.none': 'No finished {game} duels yet.',
    'recent.seeOpen': 'See the open duels',
  },
  ru: {
    'publicDuels.joinFor': 'Принять за {amount} USDT',
    'publicDuels.openNow': 'Сейчас открыто: {n}',
    'publicDuels.createTitle': 'Нужны другие условия?',
    'publicDuels.createDesc': 'Создай свою дуэль: выбери игру и ставку, потом отправь ссылку.',
    'popularGames.hint': 'Выбери игру, чтобы оставить только её дуэли.',
    'popularGames.filterLabel': 'Показать недавние дуэли одной игры',
    'recent.pot': 'Банк',
    'recent.only': 'Только {game}',
    'recent.showAll': 'Показать все игры',
    'recent.stakes': 'Ставки',
    'recent.toWinner': 'Победителю',
    'recent.fee': 'Комиссия платформы: 0 USDT',
    'recent.open': 'Открыть дуэль #{id}',
    'recent.none': 'Завершённых дуэлей в {game} пока нет.',
    'recent.seeOpen': 'Смотреть открытые дуэли',
  },
});
