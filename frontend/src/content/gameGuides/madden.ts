import type { GameGuide } from '@/lib/gameGuides';

export const maddenGuide: GameGuide = {
  slug: 'madden-nfl',
  name: 'Madden NFL',
  category: 'SPORT',
  copy: {
    en: {
      title: 'Madden 1v1 for money — head-to-head for USDT',
      description:
        'Play Madden head-to-head for USDT against a real opponent: agree on quarter length and teams, a smart contract holds both stakes, the winner takes it all.',
      lead:
        'Madden is a head-to-head game already. Agree on the settings, both put the same USDT into a smart contract, play one game online, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the game',
          text: 'Settle the quarter length, the skill level and whether you both take the same team or any team. A game can end level after overtime, so agree on a replay for a tie, and write it all in the duel’s note.',
        },
        {
          heading: 'Setting up the game',
          text: 'Add each other as friends and start an online head-to-head game. Check that you can find each other in the game before anyone joins the duel, and take a screenshot of the final score.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a cheat or a disconnect, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Madden 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Madden 1 на 1 на USDT с живым соперником: договорись о длине четвертей и командах, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Madden — уже игра один на один. Договорись о настройках, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, играют одну игру онлайн, и победитель забирает всё.',
      sections: [
        {
          heading: 'Договорись об игре',
          text: 'Реши с соперником длину четверти, уровень сложности и играть ли одной командой или любыми. Игра может закончиться вничью и после овертайма, так что договорись о переигровке и запиши всё в заметке к дуэли.',
        },
        {
          heading: 'Как собрать игру',
          text: 'Добавь соперника в друзья и начни с ним онлайн-игру один на один. Проверь, что соперник виден тебе в игре, ещё до того, как кто-то войдёт в дуэль, и сделай скриншот итогового счёта.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает выигрыш в DuelMe, соперник подтверждает, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — чит или обрыв связи: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
