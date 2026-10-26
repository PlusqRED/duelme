import type { GameGuide } from '@/lib/gameGuides';

export const warcraft3Guide: GameGuide = {
  slug: 'warcraft-iii',
  name: 'Warcraft III',
  category: 'STRATEGY',
  copy: {
    en: {
      title: 'Warcraft 3 (WC3) 1v1 for money — USDT duels',
      description:
        'Play a Warcraft III 1v1 for USDT against a real opponent: agree on races and maps, a smart contract holds both stakes, the winner takes the whole pot.',
      lead:
        'A Warcraft III duel is a melee 1v1 — two bases, two races, heroes leading armies — usually played as a best of three. Agree on the races and the maps, both put the same USDT into a smart contract, and the winner of the series takes the whole pot.',
      sections: [
        {
          heading: 'Races and maps',
          text: 'Settle whether each player sticks to one race — Human, Orc, Night Elf or Undead — or may switch between games, and whether Random is allowed. Take the maps from the current W3Champions 1v1 pool, each player striking the ones they want to avoid, and write the races, the maps and the series in the duel’s note.',
        },
        {
          heading: 'Hosting the game',
          text: 'One player creates a private custom game in Reforged on the agreed map, and the other joins it. Warcraft III saves a replay of every game on each player’s computer, so keep the replays of the whole series.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a replay that shows a maphack: then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Warcraft 3 (Варкрафт 3) 1 на 1 на деньги — дуэли',
      description:
        'Сыграй в Warcraft III 1 на 1 на USDT с живым соперником: договорись о расах и картах, смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Дуэль в Warcraft III — мили-игра 1 на 1: две базы, две расы, герои во главе армий, обычно серией до двух побед. Договорись о расах и картах, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель серии забирает весь банк.',
      sections: [
        {
          heading: 'Расы и карты',
          text: 'Реши с соперником, играет ли каждый одной расой — людьми, орками, ночными эльфами или нежитью — или может менять её между играми, и разрешён ли рандом. Карты возьми из текущего пула 1v1 на W3Champions, каждый вычёркивает те, где играть не хочет; запиши расы, карты и серию в заметке к дуэли.',
        },
        {
          heading: 'Игра в Reforged',
          text: 'Один игрок создаёт закрытую пользовательскую игру в Reforged на нужной карте, второй в неё заходит. Варкрафт сохраняет реплей каждой игры у обоих игроков, так что оставь себе реплеи всей серии.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель заявляет победу в DuelMe, соперник подтверждает её или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, мапхак, который видно в реплее: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
