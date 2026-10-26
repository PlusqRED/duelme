import type { GameGuide } from '@/lib/gameGuides';

export const magicTheGatheringGuide: GameGuide = {
  slug: 'magic-the-gathering',
  name: 'Magic: The Gathering',
  category: 'CARD',
  copy: {
    en: {
      title: 'Magic: The Gathering for money — USDT duels',
      description:
        'Play Magic: The Gathering for USDT against a real opponent on MTG Arena or at a table: a smart contract holds both stakes, the winner takes the whole pot.',
      lead:
        'A Magic duel is one match between two decks, usually the best of three games with sideboards. Agree on the format, both put the same USDT into a smart contract, and whoever takes the match takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the format',
          text: 'Name the format — Standard, Pioneer, Historic or Timeless on Arena, Modern or Pioneer at a table — and whether decks stay secret or the lists are swapped in advance. The usual match is the best of three with a 15-card sideboard, and by tournament rules the loser of each game chooses to play or draw in the next. Write the format, the length and both Arena usernames in the duel’s note.',
        },
        {
          heading: 'Setting up the match',
          text: 'On MTG Arena, add each other by the full username with its five-digit number and send a Direct Challenge from the friends list, best of one or best of three, then take a screenshot of the result. For paper Magic, sit down at one table with a witness or film the games.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a card outside the agreed format found in a paper deck, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Magic: The Gathering на деньги — дуэли на USDT',
      description:
        'Сыграй в Magic: The Gathering на USDT с живым соперником в MTG Arena или за столом: смарт-контракт держит USDT обоих, победитель забирает весь банк.',
      lead:
        'Дуэль в Magic — это один матч двух колод, обычно до двух побед из трёх с сайдбордом. Договорись о формате, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто возьмёт матч, забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о формате',
          text: 'Назови формат — Standard, Pioneer, Historic или Timeless в Arena, Modern или Pioneer за столом — и реши, держать ли колоды в секрете или обменяться списками заранее. Обычный матч — до двух побед из трёх с сайдбордом на 15 карт, и по турнирным правилам проигравший партию выбирает, ходить ли первым в следующей. Запиши формат, длину матча и ники в Arena в заметке к дуэли.',
        },
        {
          heading: 'Как собрать матч',
          text: 'В MTG Arena добавь соперника в друзья по полному нику с пятизначным номером и отправь Direct Challenge из списка друзей — до одной победы или до двух из трёх, — а потом сделай скриншот результата. В бумажную Magic играй за одним столом при свидетеле или снимай партии на видео.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, карту вне договорённого формата в бумажной колоде: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
