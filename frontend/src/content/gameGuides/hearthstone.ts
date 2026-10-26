import type { GameGuide } from '@/lib/gameGuides';

export const hearthstoneGuide: GameGuide = {
  slug: 'hearthstone',
  name: 'Hearthstone',
  category: 'CARD',
  copy: {
    en: {
      title: 'Hearthstone for money — 1v1 duels for USDT',
      description:
        'Play Hearthstone for USDT against a real opponent in friendly challenges: agree on the series, a smart contract holds both stakes, the winner takes it all.',
      lead:
        'A Hearthstone duel is a series of friendly challenges, usually the best of three or five. Agree on the rules, both put the same USDT into a smart contract, and whoever takes the series takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the series',
          text: 'Pick Standard or Wild and the length of the series. A friendly challenge is a single game, so the series rules are yours to set: Conquest, where each of your decks must win a game, or one deck each for the whole series. Write the format, the length, the classes and both BattleTags in the duel’s note.',
        },
        {
          heading: 'Setting up the games',
          text: 'Add each other on Battle.net, log in to the same region — Americas, Europe or Asia — and start every game as a friendly challenge from the friends list. Take a screenshot after each game, since the score of the series is kept by the two of you.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a deck that was not in the agreed lineup, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Hearthstone на деньги — дуэли 1 на 1 на USDT',
      description:
        'Сыграй в Hearthstone на USDT с живым соперником через дружеский вызов: договорись о серии, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Дуэль в Hearthstone — это серия дружеских вызовов, обычно до двух побед из трёх или до трёх из пяти. Договорись о правилах, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто возьмёт серию, забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о серии',
          text: 'Выбери стандартный или вольный формат и длину серии. Дружеский вызов — это одна игра, так что правила серии задают сами игроки: Conquest, где каждая колода должна выиграть по разу, или одна колода на всю серию. Запиши формат, длину, классы и BattleTag обоих в заметке к дуэли.',
        },
        {
          heading: 'Как собрать игры',
          text: 'Добавь соперника в друзья в Battle.net, зайди в тот же регион — Америка, Европа или Азия — и начинай каждую игру дружеским вызовом из списка друзей. После каждой игры делай скриншот: счёт серии ведут сами игроки.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, колоду, которой не было в заявленном составе: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
