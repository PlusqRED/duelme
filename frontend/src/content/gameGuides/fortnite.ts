import type { GameGuide } from '@/lib/gameGuides';

export const fortniteGuide: GameGuide = {
  slug: 'fortnite',
  name: 'Fortnite',
  category: 'FPS',
  copy: {
    en: {
      title: 'Fortnite 1v1 for money — box fight duels',
      description:
        'Play a Fortnite 1v1 for USDT on a box fight or build fight map: a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'Box fights and build fights are where a Fortnite 1v1 is won. Pick the map, both put the same USDT into a smart contract, and the first to the agreed score takes the whole pot.',
      sections: [
        {
          heading: 'Pick the map and the score',
          text: 'Most duels are played on a 1v1 box fight, build fight or zone wars island, first to a set number of rounds. Agree on build or zero build, then put the island code and the score to reach in the duel’s note.',
        },
        {
          heading: 'Setting up the match',
          text: 'One player opens the island from its code and invites the other to the party. Pick a region close to both, so neither fights on a bad ping, and take a screenshot of the scoreboard when the score is reached.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the contract pays out on the spot. Dispute only for something serious, like a cheat or a crash, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Фортнайт 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Fortnite 1 на 1 на USDT на карте для бокс-файтов или билд-файтов: смарт-контракт держит USDT обоих, победитель забирает весь банк.',
      lead:
        'Дуэль 1 на 1 в Fortnite решают бокс-файты и билд-файты. Выбери карту, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и первый, кто наберёт оговорённый счёт, забирает весь банк.',
      sections: [
        {
          heading: 'Выбери карту и счёт',
          text: 'Обычно играют на острове для бокс-файтов, билд-файтов или zone wars до нужного числа раундов. Договорись о режиме — со строительством или без — и запиши код острова и счёт в заметке к дуэли.',
        },
        {
          heading: 'Как собрать матч',
          text: 'Один игрок открывает остров по коду и зовёт соперника в группу. Выбери регион поближе к обоим, чтобы никто не играл с плохим пингом, и сделай скриншот счёта в конце.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает, и контракт сразу выплачивает деньги. Оспаривать стоит только серьёзное — чит или вылет игры: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
