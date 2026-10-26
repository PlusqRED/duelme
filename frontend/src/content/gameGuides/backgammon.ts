import type { GameGuide } from '@/lib/gameGuides';

export const backgammonGuide: GameGuide = {
  slug: 'backgammon',
  name: 'Backgammon',
  category: 'BOARD',
  copy: {
    en: {
      title: 'Backgammon and nardy for money — USDT duels',
      description:
        'Play backgammon or long nardy for USDT against a real opponent, a match to an agreed score: a smart contract holds both stakes, and the winner takes the pot.',
      lead:
        'A backgammon duel is a match to a set number of points: the dice can swing a single game, but skill tells over the match. Agree on the length, both put the same USDT into a smart contract, and whoever reaches the score first takes the whole pot.',
      sections: [
        {
          heading: 'Pick the game and the score',
          text: 'Say which game it is: backgammon, which Russian players call short nardy, or long nardy, where both sides move the same way from a single stack of fifteen and nobody can hit. Set the match length, say five or seven points, and the scoring: a gammon or a mars counts double, and in backgammon decide whether the doubling cube is in play, with the Crawford rule if it is. Write it in the duel’s note.',
        },
        {
          heading: 'Setting up the board',
          text: 'Backgammon Galaxy has Play a Friend for a private match; for long nardy, pick an app you both use that has private rooms. The app rolls the dice there, so a screenshot of the final match score is the proof. Over a real board, roll from a cup and play in front of a witness or a camera.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the player behind concedes the match straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like loaded dice at a real board, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Нарды на деньги — длинные и короткие на USDT',
      description:
        'Сыграй в длинные или короткие нарды на USDT с живым соперником, матч до нужного счёта: смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Дуэль в нарды — это матч до заданного числа очков: отдельную партию могут решить кости, а матч решает умение. Договорись о длине матча, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и кто первым наберёт счёт, тот забирает весь банк.',
      sections: [
        {
          heading: 'Выбери игру и счёт',
          text: 'Сначала реши, во что играть: короткие нарды — это классический бэкгаммон, а в длинных обе стороны ходят в одном направлении от «головы» в пятнадцать шашек, и бить нельзя. Назначь длину матча, например до пяти или семи очков, и правила счёта: марс идёт за два очка, а в коротких реши, есть ли кубик удвоения и правило Кроуфорда. Запиши это в заметке к дуэли.',
        },
        {
          heading: 'Как собрать доску',
          text: 'В Backgammon Galaxy можно позвать друга на приватный матч через Play a Friend; для длинных нард выбери приложение с приватными комнатами, которым пользуются оба. Кости там бросает приложение, так что доказательством станет скриншот итогового счёта матча. За настоящей доской бросай кости из стаканчика и играй при свидетеле или под камерой.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, шулерские кости за настоящей доской: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
