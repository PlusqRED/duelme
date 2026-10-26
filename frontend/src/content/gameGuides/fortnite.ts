import type { GameGuide } from '@/lib/gameGuides';

export const fortniteGuide: GameGuide = {
  slug: 'fortnite',
  name: 'Fortnite',
  category: 'FPS',
  copy: {
    en: {
      title: 'Fortnite 1v1 for money — box fights for USDT',
      description:
        'Play a Fortnite 1v1 for USDT against a real opponent: box fights or zone wars, a smart contract holds both stakes, the winner takes the whole pot. 0% fee.',
      lead:
        'A Fortnite 1v1 is a box fight, a build fight or zone wars on a Creative island, played to a score you agree on. Both put the same USDT into a smart contract, and whoever takes the rounds takes the whole pot.',
      sections: [
        {
          heading: 'Pick the island and the score',
          text: 'A box fight starts each round in a small walled room, a build fight in the open, and zone wars keep you moving ahead of the storm. Agree on the island and its code, Build or Zero Build, the rounds that win it — first to five or seven — and the loadout, then write it all in the duel’s note.',
        },
        {
          heading: 'Getting onto one island',
          text: 'One of you invites the other to a party, and the party leader finds the island by its code in the search and launches it. An island made for two players keeps strangers out of the match; when the last round ends, take a screenshot of the final score.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or concedes straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a cheat or an island that broke mid-match, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Фортнайт 1 на 1 на деньги — бокс-файты на USDT',
      description:
        'Сыграй в Fortnite 1 на 1 на USDT с живым соперником: бокс-файт или зон-варс, смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Дуэль 1 на 1 в Fortnite — это бокс-файт, билд-файт или зон-варс на острове из творческого режима до оговорённого счёта. Оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто берёт раунды, забирает весь банк.',
      sections: [
        {
          heading: 'Выбери остров и счёт',
          text: 'Бокс-файт начинает каждый раунд в тесной закрытой комнате, билд-файт — на открытом месте, а зон-варс заставляет уходить от бури. Договорись об острове и его коде, о режиме — со строительством или без, — о числе раундов для победы, например до пяти или семи, и об оружии, и запиши всё это в заметке к дуэли.',
        },
        {
          heading: 'Как попасть на один остров',
          text: 'Один игрок зовёт соперника в группу, а лидер группы находит остров по коду через поиск и запускает его. Остров на двоих не пускает в матч посторонних; после последнего раунда сделай скриншот итогового счёта.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — чит или остров, который сломался посреди матча: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
