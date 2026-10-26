import type { GameGuide } from '@/lib/gameGuides';

export const leagueOfLegendsGuide: GameGuide = {
  slug: 'league-of-legends',
  name: 'League of Legends',
  category: 'MOBA',
  copy: {
    en: {
      title: 'League of Legends 1v1 for money — USDT duels',
      description:
        'Play a League of Legends 1v1 for USDT: first blood, 100 CS or the first tower wins, a smart contract holds both stakes, the winner takes the whole pot.',
      lead:
        'The classic League of Legends 1v1 ends at the first of three marks: first blood, 100 CS or the first tower. Agree on the map and the champions, both put the same USDT into a smart contract, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Map and champions',
          text: 'Play on Howling Abyss, a single lane with no jungle, or in the mid lane of Summoner’s Rift without stepping into the jungle. Settle the champion — a mirror match is the fairest — whether summoner spells and items are free, and how many games make the duel, then write it in the duel’s note.',
        },
        {
          heading: 'Creating the custom game',
          text: 'Both accounts must be on the same server, such as EUW or NA, because a custom game does not cross servers. One player creates a custom game in Blind Pick, so both can take the same champion, and puts one player on each team. The moment a mark is reached, take a screenshot of the scoreboard.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a kill made outside the lane against the agreed rules: then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Лига легенд (LoL) 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в League of Legends 1 на 1 на USDT: первая кровь, 100 крипов или первая башня, смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Классическая дуэль в League of Legends идёт до первой из трёх целей: первая кровь, 100 крипов или первая башня. Договорись о карте и чемпионах, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Карта и чемпионы',
          text: 'Играют на Воющей бездне — одна линия и никакого леса — или на центральной линии Ущелья призывателей, не заходя в лес. Реши с соперником, на каком чемпионе играть — честнее всего зеркало, — свободны ли заклинания призывателя и предметы и сколько игр в дуэли, и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Как создать пользовательскую игру',
          text: 'Оба аккаунта должны быть на одном сервере, например EUW или EUNE: пользовательская игра не соединяет разные серверы. Один игрок создаёт пользовательскую игру в режиме выбора вслепую (Blind Pick), чтобы оба могли взять одного чемпиона, и ставит по игроку в каждую команду. Как только цель достигнута, сделай скриншот таблицы счёта.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель заявляет победу в DuelMe, соперник подтверждает её или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, убийство, сделанное вне линии вопреки уговору: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
