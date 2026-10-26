import type { GameGuide } from '@/lib/gameGuides';

export const rocketLeagueGuide: GameGuide = {
  slug: 'rocket-league',
  name: 'Rocket League',
  category: 'SPORT',
  copy: {
    en: {
      title: 'Rocket League 1v1 for money — USDT duels',
      description:
        'Play Rocket League 1v1 for USDT in a private match: agree on the series, a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'Rocket League has a 1v1 built in, and it is the purest test of mechanics. Agree on the series, both put the same USDT into a smart contract, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the series',
          text: 'A single game can turn on one bounce, so most duels are a best of five or seven. Settle the arena or how it is picked, and write the series length in the duel’s note.',
        },
        {
          heading: 'Setting up the match',
          text: 'One player creates a private match with a name and password, sets the team size to one, and sends both to the other. Pick a region close to both, and take a screenshot of the score after the last game.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the contract pays out on the spot. If a disconnect ruins a game, replay it or dispute the result, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Rocket League 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Rocket League 1 на 1 на USDT в приватном матче: договорись о серии, смарт-контракт держит USDT обоих, победитель забирает весь банк.',
      lead:
        'В Rocket League дуэль 1 на 1 есть прямо в игре, и это самая честная проверка механики. Договорись о серии, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о серии',
          text: 'Одну игру может решить случайный отскок, поэтому обычно играют до трёх или четырёх побед. Реши с соперником арену или как её выбирать и запиши длину серии в заметке к дуэли.',
        },
        {
          heading: 'Как собрать матч',
          text: 'Один игрок создаёт приватный матч с названием и паролем, ставит размер команды на одного и отправляет оба сопернику. Выбери регион поближе к обоим и сделай скриншот счёта после последней игры.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает, и контракт сразу выплачивает деньги. Если игру испортил обрыв связи, переиграй её или оспорь результат: тогда каждый заберёт свою сумму обратно.',
        },
      ],
    },
  },
};
