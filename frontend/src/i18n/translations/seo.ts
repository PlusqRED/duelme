import { defineSection } from './defineSection';

/**
 * What search results and shared links show of each page: its title, under 60 characters with the
 * site's name the layout adds, and its description, under 160, the length a result shows whole. The
 * Russian avoids betting words: a duel is a game of skill between two players, not a bet on one.
 */
export const seoTranslations = defineSection({
  en: {
    'seo.site.description':
      'Play 1v1 for money in any game — CS2, Dota 2, chess and more — with a friend or anyone. A smart contract holds both USDT stakes; the winner takes all. 0% fee.',
    'seo.home.title': 'DuelMe — play 1v1 for money in any game, 0% fee',
    'seo.games.title': 'Games for 1v1 duels for USDT',
    'seo.games.description':
      'Pick a game and play a 1v1 duel for USDT: CS2, Dota 2, Valorant, FIFA, chess and more. A smart contract holds the stakes, the winner takes the pot.',
    'seo.game.title': '{game}: 1v1 duels for USDT',
    'seo.game.description':
      'Open and recent 1v1 duels for USDT in {game}. Find an opponent, set the stake and play: the winner takes the whole pot, 0% platform fee.',
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
    'seo.howItWorks.title': 'How 1v1 duels for USDT work',
    'seo.howItWorks.description':
      'Every step of a DuelMe duel: create it, play the match, settle the result. A smart contract holds both stakes, the winner takes the pot, 0% fee.',
    'seo.safety.title': 'Is DuelMe safe? How the money is kept',
    'seo.safety.description':
      'The stakes sit in a public, verified smart contract that DuelMe cannot use to pick a winner or move money. What it guarantees, and what it cannot.',
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
      'Играй 1 на 1 на деньги в любой игре — CS2, Dota 2, шахматы — с другом или с кем угодно. USDT обоих держит смарт-контракт, победитель забирает всё.',
    'seo.home.title': 'DuelMe — играй 1 на 1 на деньги в любой игре',
    'seo.games.title': 'Игры для дуэлей 1 на 1 на USDT',
    'seo.games.description':
      'Выбери игру и сыграй дуэль 1 на 1 на USDT: CS2, Dota 2, Valorant, FIFA, шахматы и другие. USDT обоих держит смарт-контракт, победитель забирает всё.',
    'seo.game.title': '{game}: дуэли 1 на 1 на USDT',
    'seo.game.description':
      'Открытые и недавние дуэли 1 на 1 на USDT в {game}. Найди соперника, выбери сумму и играй: победитель забирает весь банк, комиссия 0%.',
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
    'seo.howItWorks.title': 'Как работают дуэли 1 на 1 на USDT',
    'seo.howItWorks.description':
      'Каждый шаг дуэли в DuelMe: создай её, сыграй матч, засчитай результат. USDT обоих держит смарт-контракт, победитель забирает банк, комиссия 0%.',
    'seo.safety.title': 'Безопасен ли DuelMe и где хранятся деньги',
    'seo.safety.description':
      'Суммы игроков лежат в открытом проверенном смарт-контракте, через который DuelMe не может выбрать победителя или сдвинуть деньги. Что он гарантирует, а что нет.',
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
