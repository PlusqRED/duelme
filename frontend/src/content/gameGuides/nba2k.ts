import type { GameGuide } from '@/lib/gameGuides';

export const nba2kGuide: GameGuide = {
  slug: 'nba-2k',
  name: 'NBA 2K',
  category: 'SPORT',
  copy: {
    en: {
      title: 'NBA 2K 1v1 for money — 2K duels for USDT',
      description:
        'Play NBA 2K head-to-head for USDT: agree on teams and quarter length, a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'One game of NBA 2K, two players, one final buzzer. Agree on the teams and the settings, both put the same USDT into a smart contract, and whoever wins the game takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the game',
          text: 'Settle the quarter length, the difficulty and how teams are picked: the same team, random teams or any current roster. Leave MyTEAM squads out unless both agree, and write the rules in the duel’s note.',
        },
        {
          heading: 'Setting up the game',
          text: 'Invite your opponent from the friends list to an online game against each other. Check that you can reach each other on your platforms before anyone joins the duel, and take a screenshot of the final score.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a cheat or a disconnect, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'NBA 2K 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в NBA 2K один на один на USDT: договорись о командах и длине четвертей, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Одна игра в NBA 2K, два игрока, одна финальная сирена. Договорись о командах и настройках, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель игры забирает всё.',
      sections: [
        {
          heading: 'Договорись об игре',
          text: 'Реши с соперником длину четверти, сложность и как выбираются команды: одна и та же, случайные или любые из текущих составов. Составы MyTEAM лучше оставить в стороне, если оба не согласны, и записать правила в заметке к дуэли.',
        },
        {
          heading: 'Как собрать игру',
          text: 'Пригласи соперника из списка друзей в онлайн-игру друг против друга. Убедись, что можешь пригласить соперника со своей платформы, ещё до того, как кто-то войдёт в дуэль, и сделай скриншот итогового счёта.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает выигрыш в DuelMe, соперник подтверждает, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — чит или обрыв связи: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
