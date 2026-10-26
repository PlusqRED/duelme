import type { GameGuide } from '@/lib/gameGuides';

export const eaSportsFcGuide: GameGuide = {
  slug: 'ea-sports-fc',
  name: 'EA SPORTS FC',
  category: 'SPORT',
  copy: {
    en: {
      title: 'EA FC and FIFA 1v1 for money — USDT duels',
      description:
        'Play EA SPORTS FC 1v1 for USDT, the way FIFA wagers used to work: a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'One match, two players, the final whistle decides. Agree on the teams and the settings, both put the same USDT into a smart contract, and whoever wins on the pitch takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the match',
          text: 'Settle the half length, whether you play the same team or teams of the same rating, and what happens on a draw — extra time and penalties, or a replay. For more than one match, write the number of games and the aggregate rule in the duel’s note.',
        },
        {
          heading: 'Setting up the game',
          text: 'Add each other as friends and play an Online Friendly. Check that crossplay is on if you are on different platforms, and take a screenshot of the full-time score.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the pot is then the winner’s, to take out of the contract any time. If the connection drops mid-match, replay it or dispute the result, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'EA FC и FIFA 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в EA SPORTS FC 1 на 1 на USDT, как раньше играли в FIFA на деньги: смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Один матч, два игрока, всё решает финальный свисток. Договорись о командах и настройках, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто победит на поле, забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о матче',
          text: 'Реши с соперником длину тайма, играть ли одной командой или командами одного рейтинга и что делать при ничьей — дополнительное время и пенальти или переигровка. Если матчей несколько, запиши их число и правило общего счёта в заметке к дуэли.',
        },
        {
          heading: 'Как собрать игру',
          text: 'Добавь соперника в друзья и сыграй товарищеский матч онлайн. Если платформы разные, проверь, что кроссплей включён, и сделай скриншот итогового счёта.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Если связь оборвалась посреди матча, переиграй его или оспорь результат: тогда каждый заберёт свою сумму обратно.',
        },
      ],
    },
  },
};
