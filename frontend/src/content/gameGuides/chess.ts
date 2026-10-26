import type { GameGuide } from '@/lib/gameGuides';

export const chessGuide: GameGuide = {
  slug: 'chess',
  name: 'Chess',
  category: 'BOARD',
  copy: {
    en: {
      title: 'Play chess for money online — USDT duels',
      description:
        'Play chess for USDT against a real opponent on Lichess or Chess.com: a smart contract holds both stakes and the winner takes the whole pot. 0% fee.',
      lead:
        'Chess is the purest duel there is: two players, one board, no luck. Challenge someone on the site you both play on, put the same USDT into a smart contract, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the match',
          text: 'Pick the time control — blitz 3+2 and rapid 10+0 are the usual ones — and how many games make the duel, say the best of three with colours switching. A draw is worth settling in advance too: replay it, or call off the duel.',
        },
        {
          heading: 'Playing it',
          text: 'Send a direct challenge on Lichess or Chess.com with the agreed time control, and put the usernames in the duel’s note. Every game keeps its own link with every move, so there is no argument about who won.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms, or resigns the duel outright; the pot is then the winner’s, to take out of the contract any time. If the site flags a game for fair play, dispute it, and each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Шахматы на деньги онлайн — дуэли на USDT',
      description:
        'Играй в шахматы на USDT с живым соперником на Lichess или Chess.com: смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Шахматы — самая чистая дуэль: два игрока, одна доска и никакой удачи. Вызови соперника на шахматном сайте, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о матче',
          text: 'Выбери контроль времени — обычно блиц 3+2 или рапид 10+0 — и сколько партий в дуэли, например до двух побед из трёх со сменой цвета. О ничьей тоже лучше договориться заранее: переиграть её или отменить дуэль.',
        },
        {
          heading: 'Как сыграть',
          text: 'Отправь прямой вызов на Lichess или Chess.com с нужным контролем и укажи ники в заметке к дуэли. У каждой партии есть своя ссылка со всеми ходами, так что спорить о победителе не о чем.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Если сайт отметит партию за нарушение честной игры, оспорь результат: каждый заберёт свою сумму обратно.',
        },
      ],
    },
  },
};
