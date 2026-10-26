import type { GameGuide } from '@/lib/gameGuides';

export const callOfDutyGuide: GameGuide = {
  slug: 'call-of-duty',
  name: 'Call of Duty',
  category: 'FPS',
  copy: {
    en: {
      title: 'Call of Duty 1v1 for money — CoD duels for USDT',
      description:
        'Play a CoD 1v1 for USDT in a private match: agree on the mode, the map and the weapons, a smart contract holds both stakes, the winner takes the pot.',
      lead:
        'A Call of Duty 1v1 comes down to who wins the gunfight. Agree on the rules, both put the same USDT into a smart contract, play a private match, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Pick the format',
          text: 'A private match with one player a side, to a set number of kills or rounds, is the usual 1v1. Agree on the map, whether loadouts are free or fixed and what is banned, then write it in the duel’s note.',
        },
        {
          heading: 'Setting up the match',
          text: 'One player opens a private match in multiplayer, sets each team to one player and invites the other. Crossplay lets PC and console players meet; take a screenshot of the final scoreboard.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a cheat or a disconnect, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Call of Duty 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Call of Duty 1 на 1 на USDT в приватном матче: договорись о режиме, карте и оружии, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Дуэль 1 на 1 в Call of Duty решает перестрелка. Договорись о правилах, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, играют приватный матч, и победитель забирает всё.',
      sections: [
        {
          heading: 'Выбери формат',
          text: 'Обычная дуэль 1 на 1 — приватный матч по одному игроку в команде до нужного числа убийств или раундов. Договорись о карте, о том, свободные ли сборки, и что запрещено, и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Как собрать матч',
          text: 'Один игрок создаёт приватный матч в мультиплеере, ставит по одному игроку в команде и приглашает соперника. Кроссплей сводит ПК и консоли; сделай скриншот итоговой таблицы.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает выигрыш в DuelMe, соперник подтверждает, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — чит или обрыв связи: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
