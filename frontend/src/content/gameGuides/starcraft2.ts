import type { GameGuide } from '@/lib/gameGuides';

export const starcraft2Guide: GameGuide = {
  slug: 'starcraft-ii',
  name: 'StarCraft II',
  category: 'STRATEGY',
  copy: {
    en: {
      title: 'StarCraft II 1v1 for money — USDT duels',
      description:
        'Play a StarCraft II 1v1 series for USDT on ladder maps: a smart contract holds both stakes, and the winner of the series takes the whole pot. 0% fee.',
      lead:
        'StarCraft II was built around the 1v1. Agree on the series and the maps, both put the same USDT into a smart contract, and the winner of the series takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the series',
          text: 'A best of three on current ladder maps is the usual duel, with the loser of each game picking the next map. Settle the races — fixed or free to switch — and write the series and the map pool in the duel’s note.',
        },
        {
          heading: 'Setting up the game',
          text: 'Play on the same region: accounts on Americas, Europe and Asia do not meet. One player creates a custom game on the map and invites the other; replays are saved on both sides, so keep the last one.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or concedes the duel first; the pot is then the winner’s, to take out of the contract any time. A dropped game can be replayed, or the result disputed, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'StarCraft II 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй серию в StarCraft II 1 на 1 на USDT на ладдерных картах: смарт-контракт держит USDT обоих, победитель серии забирает всё. Комиссия 0%.',
      lead:
        'StarCraft II создан для игры 1 на 1. Договорись о серии и картах, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель серии забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о серии',
          text: 'Обычная дуэль — до двух побед на картах текущего ладдера, следующую карту выбирает проигравший. Реши с соперником, фиксированы ли расы, и запиши серию и пул карт в заметке к дуэли.',
        },
        {
          heading: 'Как собрать игру',
          text: 'Играть нужно в одном регионе: аккаунты Америки, Европы и Азии не пересекаются. Один игрок создаёт пользовательскую игру на карте и приглашает соперника; реплей сохраняется у обоих, так что оставь последний.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Сорвавшуюся игру можно переиграть или оспорить результат: тогда каждый заберёт свою сумму обратно.',
        },
      ],
    },
  },
};
