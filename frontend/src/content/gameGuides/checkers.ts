import type { GameGuide } from '@/lib/gameGuides';

export const checkersGuide: GameGuide = {
  slug: 'checkers',
  name: 'Checkers',
  category: 'BOARD',
  copy: {
    en: {
      title: 'Checkers for money — draughts duels for USDT',
      description:
        'Play checkers for USDT against a real opponent by Russian, international or English rules: a smart contract holds both stakes, the winner takes the pot.',
      lead:
        'Checkers comes in three main rule sets, and a duel starts by agreeing on one: Russian draughts, international draughts or English checkers. Both then put the same USDT into a smart contract, play the agreed number of games, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the rules',
          text: 'In Russian draughts, on 8×8, men capture backwards and kings fly along the diagonal; international draughts plays much the same on 10×10 with 20 pieces each and makes taking the most pieces compulsory; in English checkers men capture only forward and kings move one square. Settle how many games make the duel, with colours alternating, and whether a draw counts half a point or is replayed. Write it in the duel’s note.',
        },
        {
          heading: 'Where to play',
          text: 'Lidraughts has Play with a friend for international and Russian draughts, and every finished game stays on the site with all its moves, so its link settles any argument. It has no English checkers: for that, pick another site you both use or a real board, with a witness or a camera on the deciding game.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like moves fed by a draughts engine, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Шашки на деньги — русские и международные на USDT',
      description:
        'Сыграй в шашки на USDT с живым соперником — русские, международные или английские: смарт-контракт держит USDT обоих, победитель забирает весь банк.',
      lead:
        'У шашек три главных свода правил, и дуэль начинается с выбора: русские, международные или английские. Потом оба игрока кладут одну и ту же сумму USDT в смарт-контракт, играют договорённое число партий, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о правилах',
          text: 'В русских шашках на доске 8×8 простые бьют назад, а дамка ходит на любое свободное поле по диагонали; международные играются почти так же, но на доске 10×10, по 20 шашек у каждого, и бить там обязательно наибольшее число; в английских простые бьют только вперёд, а дамка ходит на одно поле. Реши с соперником, сколько партий в дуэли, со сменой цвета, и как считать ничью: пол-очка или переигровка. Запиши это в заметке к дуэли.',
        },
        {
          heading: 'Где сыграть',
          text: 'На Lidraughts можно позвать друга на партию в международные или русские шашки, и каждая сыгранная партия остаётся на сайте со всеми ходами — её ссылка снимает любой спор. Английских шашек там нет: для них выбери другой сайт, которым пользуются оба, или садись за настоящую доску при свидетеле или под камерой.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, ходы, подсказанные шашечной программой: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
