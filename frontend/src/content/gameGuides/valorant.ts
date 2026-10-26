import type { GameGuide } from '@/lib/gameGuides';

export const valorantGuide: GameGuide = {
  slug: 'valorant',
  name: 'Valorant',
  category: 'FPS',
  copy: {
    en: {
      title: 'Valorant 1v1 for money — USDT duels',
      description:
        'Play a Valorant 1v1 for USDT: agree on the map, agents and rounds, a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'A Valorant 1v1 strips the game down to aim and decisions. Agree on the rules, both put the same USDT into a smart contract, play a custom game, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Pick the format',
          text: 'Most 1v1s are first to a set number of rounds on one map, either guns only or with agents and abilities agreed in advance — a mirror pick is the fairest. Write the map, the score to reach and what is allowed in the duel’s note.',
        },
        {
          heading: 'Setting up the game',
          text: 'One player opens a custom game, invites the other and puts each of you on a team. Choose a server that suits you both, and take a screenshot of the scoreboard once the agreed score is reached.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the contract pays out on the spot. Dispute only for something serious, like a cheat or a disconnect, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Валорант 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Valorant 1 на 1 на USDT: договорись о карте, агентах и раундах, смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Дуэль 1 на 1 в Valorant — это только аим и решения. Игроки договариваются о правилах, оба кладут одну и ту же сумму USDT в смарт-контракт, играют своё лобби, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Выбери формат',
          text: 'Обычно играют до нужного числа раундов на одной карте — только на оружии или с заранее оговорёнными агентами и умениями, честнее всего на одинаковых. Запиши карту, счёт и что разрешено в заметке к дуэли.',
        },
        {
          heading: 'Как собрать игру',
          text: 'Один игрок создаёт пользовательскую игру, приглашает соперника и разводит обоих по разным командам. Выбери сервер, удобный обоим, и сделай скриншот таблицы, когда кто-то наберёт нужный счёт.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает, и контракт сразу выплачивает деньги. Оспаривать стоит только серьёзное — чит или обрыв связи: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
