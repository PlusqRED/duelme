import { defineSection } from './defineSection';

/**
 * What search results and shared links show of each page: its title, under 60 characters with the
 * site's name the layout adds, and its description, under 160, the length a result shows whole. The
 * Russian avoids betting words: a duel is a game of skill between two players, not a bet on one.
 */
export const seoTranslations = defineSection({
  en: {
    'seo.site.description':
      'Challenge a friend or a stranger to a 1v1 in CS2, Dota 2, chess or any game. A smart contract holds both USDT stakes and pays the winner. 0% fee.',
    'seo.home.title': 'DuelMe — play 1v1 for money in any game, 0% fee',
    'seo.games.title': 'Games to play 1v1 for money: CS2, CoD, FIFA, chess',
    'seo.games.description':
      'CS2, Call of Duty, EA FC, Dota 2, Valorant, chess and more: pick a game, set a USDT stake and play a friend 1v1. The winner takes the whole pot.',
    'seo.game.title': '{game} 1v1 for money',
    'seo.game.description':
      'Open and recent 1v1 duels for USDT in {game}. Find an opponent, set the stake and play: the winner takes the whole pot, 0% platform fee.',
    'seo.create.title': 'Challenge a friend to a 1v1 for money',
    'seo.create.description':
      'Pick a game, set the USDT stake and send your opponent a link. A smart contract holds both stakes and pays the winner the whole pot. 0% fee.',
    'seo.public.title': 'Open 1v1 money matches: find an opponent',
    'seo.public.description':
      'Duels waiting for a second player: see the game, the USDT stake and the creator’s reputation, then accept. The winner takes the pot, 0% fee.',
    'seo.recent.title': 'Recent 1v1 money matches and results',
    'seo.recent.description':
      'The latest 1v1 duels for USDT: the game, the winner and the size of the pot. Every result is recorded on the Arbitrum blockchain for anyone to check.',
    'seo.privacy.description':
      'What DuelMe keeps about you, where it is kept and how to change it: the blockchain, signing in, your profile and analytics.',
    'seo.duel.title': 'Duel #{id}: 1v1 for USDT',
    'seo.duel.description':
      'See the game, the stake and the creator’s reputation, then take the challenge. A smart contract holds the pot and pays it to the winner.',
    'seo.profile.title': 'Your profile',
    'seo.howItWorks.title': 'How 1v1 matches for money work',
    'seo.howItWorks.description':
      'Every step of a DuelMe duel: create it, play the match, settle the result. A smart contract holds both stakes, the winner takes the pot, 0% fee.',
    'seo.safety.title': 'Is DuelMe safe? How the money is kept',
    'seo.safety.description':
      'The stakes sit in a public, verified smart contract. DuelMe cannot pick a winner, and its one emergency exit is announced on-chain at least {days} ahead.',
    'seo.about.title': 'About DuelMe — 1v1 duels with no platform cut',
    'seo.about.description':
      'Who builds DuelMe, why it takes no fee, where it stands and how to reach its developer.',
    'seo.player.title': 'Player profile',
    'seo.player.description': 'A DuelMe player’s reputation on the blockchain, linked accounts and 1v1 duel history.',
    'seo.crumb.home': 'Home',
    'seo.image.alt': 'DuelMe — 1v1 duels for USDT, 0% platform fee',
    'seo.image.line': 'Play 1v1 for USDT. The winner takes the whole pot.',
    'seo.image.fee': '0% platform fee',
    'seo.image.escrow': 'Stakes held by a smart contract',
  },
  ru: {
    'seo.site.description':
      'Вызови друга или соперника на 1 на 1 в CS2, Dota 2, шахматах или любой другой игре. USDT обоих держит смарт-контракт, победитель забирает всё.',
    'seo.home.title': 'DuelMe — 1 на 1 на деньги в любой игре, комиссия 0%',
    'seo.games.title': 'Игры 1 на 1 на деньги: CS2, Dota 2, шахматы',
    'seo.games.description':
      'CS2, Dota 2, шахматы, FIFA и другие: выбери игру и сумму в USDT и сыграй с другом 1 на 1. Победитель забирает всё, комиссия платформы 0%.',
    'seo.game.title': '{game} 1 на 1 на деньги',
    'seo.game.description':
      'Открытые и недавние дуэли 1 на 1 на USDT в {game}. Найди соперника, выбери сумму и играй: победитель забирает всё, комиссия 0%.',
    'seo.create.title': 'Вызови друга на 1 на 1 на деньги',
    'seo.create.description':
      'Выбери игру и сумму в USDT и отправь сопернику ссылку. Смарт-контракт держит USDT обоих и отдаёт победителю всё. Комиссия платформы 0%.',
    'seo.public.title': 'Открытые вызовы 1 на 1 на деньги',
    'seo.public.description':
      'Вызовы, которые ждут соперника: игра, сумма в USDT и репутация создателя в блокчейне. Прими вызов, и победитель заберёт всё. Комиссия 0%.',
    'seo.recent.title': 'Недавние дуэли 1 на 1 на деньги и итоги',
    'seo.recent.description':
      'Последние дуэли 1 на 1 на USDT: игра, победитель и сумма. Каждый итог записан в блокчейне Arbitrum, и его может проверить кто угодно.',
    'seo.privacy.description':
      'Что DuelMe хранит о тебе, где это лежит и как это изменить: блокчейн, вход, профиль и аналитика.',
    'seo.duel.title': 'Дуэль #{id}: 1 на 1 на деньги',
    'seo.duel.description':
      'Посмотри игру, сумму и репутацию автора и прими вызов. Деньги держит смарт-контракт, он и отдаст их победителю.',
    'seo.profile.title': 'Твой профиль',
    'seo.howItWorks.title': 'Как работают дуэли 1 на 1 на деньги',
    'seo.howItWorks.description':
      'Каждый шаг дуэли в DuelMe: создай её, сыграй матч, засчитай результат. USDT обоих держит смарт-контракт, победитель забирает всё, комиссия 0%.',
    'seo.safety.title': 'Безопасен ли DuelMe и где хранятся деньги',
    'seo.safety.description':
      'Суммы игроков лежат в открытом проверенном смарт-контракте. DuelMe не может выбрать победителя, а аварийный вывод объявляется в блокчейне минимум за {days}.',
    'seo.about.title': 'О DuelMe — дуэли 1 на 1 без доли платформы',
    'seo.about.description': 'Кто делает DuelMe, почему он не берёт комиссию, что уже готово и как связаться с разработчиком.',
    'seo.player.title': 'Профиль игрока',
    'seo.player.description': 'Репутация игрока DuelMe в блокчейне, привязанные аккаунты и история дуэлей 1 на 1.',
    'seo.crumb.home': 'Главная',
    'seo.image.alt': 'DuelMe — дуэли 1 на 1 на USDT, комиссия платформы 0%',
    'seo.image.line': 'Дуэли 1 на 1 на USDT. Победитель забирает весь банк.',
    'seo.image.fee': 'Комиссия 0%',
    'seo.image.escrow': 'Банк в смарт-контракте',
  },
});
