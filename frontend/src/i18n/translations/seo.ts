import { defineSection } from './defineSection';

/**
 * What search results and shared links show of each page: its title, under 60 characters with the
 * site's name the layout adds, and its description, under 160, the length a result shows whole. The
 * Russian avoids betting words: a duel is a game of skill between two players, not a bet on one.
 */
export const seoTranslations = defineSection({
  en: {
    'seo.site.description':
      'Play 1v1 duels for USDT in any game: CS2, Dota 2, chess and more. A smart contract holds both stakes and the winner takes the whole pot. 0% fee.',
    'seo.home.title': 'DuelMe — 1v1 duels for USDT in any game, 0% fee',
    'seo.games.title': 'Games for 1v1 duels for USDT',
    'seo.games.description':
      'Pick a game and play a 1v1 duel for USDT: CS2, Dota 2, Valorant, FIFA, chess and more. A smart contract holds the stakes, the winner takes the pot.',
    'seo.game.title': '1v1 duels for USDT in this game',
    'seo.game.description':
      'Open and recent 1v1 duels for USDT in this game. Find an opponent, set the stake and play: the winner takes the whole pot, 0% platform fee.',
    'seo.create.title': 'Create a 1v1 duel for USDT',
    'seo.create.description':
      'Pick a game, set the stake and send your opponent the link. A smart contract holds both stakes and pays the winner the whole pot. 0% platform fee.',
    'seo.public.title': 'Open 1v1 duels for USDT — find an opponent',
    'seo.public.description':
      'Duels waiting for a second player. See the game, the stake and the creator’s reputation, then join: the winner takes the whole pot, 0% fee.',
    'seo.recent.title': 'Recent 1v1 duels for USDT and their results',
    'seo.recent.description':
      'Who played what, who won and how big the pot was: the latest 1v1 duels for USDT on DuelMe, each with its record on the blockchain.',
    'seo.privacy.description':
      'What DuelMe keeps about you, where it is kept and how to change it: the blockchain, signing in, your profile and analytics.',
    'seo.duel.title': 'Duel #{id}: 1v1 for USDT',
    'seo.duel.description':
      'See the game, the stake and the creator’s reputation, then take the challenge. A smart contract holds the pot and pays it to the winner.',
    'seo.profile.title': 'Your profile',
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
      'Дуэли 1 на 1 на USDT в любой игре: CS2, Dota 2, шахматы и другие. USDT обоих игроков держит смарт-контракт, победитель забирает всё. Комиссия 0%.',
    'seo.home.title': 'DuelMe — дуэли 1 на 1 на USDT в любой игре',
    'seo.games.title': 'Игры для дуэлей 1 на 1 на USDT',
    'seo.games.description':
      'Выбери игру и сыграй дуэль 1 на 1 на USDT: CS2, Dota 2, Valorant, FIFA, шахматы и другие. USDT обоих держит смарт-контракт, победитель забирает всё.',
    'seo.game.title': 'Дуэли 1 на 1 на USDT в этой игре',
    'seo.game.description':
      'Открытые и недавние дуэли 1 на 1 на USDT в этой игре. Найди соперника, выбери сумму и играй: победитель забирает весь банк, комиссия 0%.',
    'seo.create.title': 'Создать дуэль 1 на 1 на USDT',
    'seo.create.description':
      'Выбери игру и сумму и отправь сопернику ссылку. USDT обоих держит смарт-контракт и отдаёт победителю весь банк. Комиссия платформы 0%.',
    'seo.public.title': 'Открытые дуэли 1 на 1 на USDT — найди соперника',
    'seo.public.description':
      'Дуэли, которые ждут второго игрока. Посмотри игру, сумму и репутацию автора и присоединяйся: победитель забирает весь банк, комиссия 0%.',
    'seo.recent.title': 'Недавние дуэли 1 на 1 на USDT и их итоги',
    'seo.recent.description':
      'Кто во что играл, кто победил и каким был банк: последние дуэли 1 на 1 на USDT в DuelMe, у каждой есть запись в блокчейне.',
    'seo.privacy.description':
      'Что DuelMe хранит о тебе, где это лежит и как это изменить: блокчейн, вход, профиль и аналитика.',
    'seo.duel.title': 'Дуэль #{id}: 1 на 1 на USDT',
    'seo.duel.description':
      'Посмотри игру, сумму и репутацию автора и прими вызов. Банк держит смарт-контракт и отдаёт его победителю.',
    'seo.profile.title': 'Твой профиль',
    'seo.player.title': 'Профиль игрока',
    'seo.player.description': 'Репутация игрока DuelMe в блокчейне, привязанные аккаунты и история дуэлей 1 на 1.',
    'seo.crumb.home': 'Главная',
    'seo.image.alt': 'DuelMe — дуэли 1 на 1 на USDT, комиссия платформы 0%',
    'seo.image.line': 'Дуэли 1 на 1 на USDT. Победитель забирает весь банк.',
    'seo.image.fee': 'Комиссия 0%',
    'seo.image.escrow': 'Банк в смарт-контракте',
  },
});
