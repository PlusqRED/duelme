import type { GameGuide } from '@/lib/gameGuides';

export const mobileLegendsGuide: GameGuide = {
  slug: 'mobile-legends-bang-bang',
  name: 'Mobile Legends: Bang Bang',
  category: 'MOBA',
  copy: {
    en: {
      title: 'Mobile Legends 1v1 for money — MLBB USDT duels',
      description:
        'Play a Mobile Legends 1v1 for USDT in a custom match: agree on the hero and the finish, a smart contract holds both stakes, the winner takes the whole pot.',
      lead:
        'A Mobile Legends: Bang Bang 1v1 is one lane of the Land of Dawn, two heroes and a finish you agree on. Both put the same USDT into a smart contract, play a custom match, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Settle the finish and the heroes',
          text: 'Pick the finish — first blood, the first turret or two kills — and keep the fight to the mid lane. Agree on the heroes — a mirror pick is the fairest — on items, emblems and the battle spell, and on whether the jungle is off limits, then write it in the duel’s note.',
        },
        {
          heading: 'Setting up the custom match',
          text: 'One player opens Custom, creates a room on the Classic map and invites the other from the friends list, one hero on each side. A custom match touches neither rank nor hero mastery; take a screenshot of the final screen.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a disconnect or a cheat, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Мобайл Легенд 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Mobile Legends (MLBB) 1 на 1 на USDT в своём матче: договорись о героях и условии победы, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Дуэль 1 на 1 в Mobile Legends: Bang Bang — это одна линия Land of Dawn, два героя и финиш, о котором игроки договариваются заранее. Оба кладут одну и ту же сумму USDT в смарт-контракт, играют свой матч, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Финиш и герои',
          text: 'Выбери финиш — первая кровь, первая башня или два убийства — и держи бой на средней линии. Договорись о героях — честнее всего взять одинаковых, — о предметах, эмблемах и боевом заклинании и о том, можно ли заходить в лес, и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Как собрать свой матч',
          text: 'Один игрок открывает пользовательский режим, создаёт комнату на классической карте и приглашает соперника из списка друзей, по одному герою с каждой стороны. Такой матч не влияет ни на ранг, ни на мастерство героя; сделай скриншот итогового экрана.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — обрыв связи или чит: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
