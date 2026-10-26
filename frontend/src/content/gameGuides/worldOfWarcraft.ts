import type { GameGuide } from '@/lib/gameGuides';

export const worldOfWarcraftGuide: GameGuide = {
  slug: 'world-of-warcraft',
  name: 'World of Warcraft',
  category: 'MMO',
  copy: {
    en: {
      title: 'World of Warcraft 1v1 for money — USDT duels',
      description:
        'Duel in World of Warcraft for USDT, in the open world or an arena War Game: a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'A World of Warcraft duel is the game’s own 1v1: a duel flag drops, a short countdown runs, and the fight ends when one player is down to one hit point. Agree on the class, the spec and the series, both put the same USDT into a smart contract, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Version, class and rules',
          text: 'Settle retail or Classic, each player’s class and spec, and a best of three or five. Agree on what is fair between rounds — waiting for long cooldowns to come back, potions or none, gear of a similar item level — and write it all in the duel’s note.',
        },
        {
          heading: 'Where to meet',
          text: 'Both characters need the same region and the same version of the game, and a duel is simplest between characters on one realm; dueling is off in most capital cities and in dungeons. Challenge from the opponent’s portrait or with /duel — in retail, a party leader can also start an arena War Game with /wargame. When a duel ends, the chat names the winner, so take a screenshot of that line.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a round won with something the note ruled out: then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'World of Warcraft (ВоВ) 1 на 1 на деньги — дуэли',
      description:
        'Дуэли в World of Warcraft (ВоВ) на USDT в открытом мире или на арене: смарт-контракт держит USDT обоих, победитель забирает весь банк. Комиссия 0%.',
      lead:
        'Дуэль в World of Warcraft — встроенный в игру бой 1 на 1: падает флаг, идёт короткий отсчёт, и бой заканчивается, когда у одного из игроков остаётся одна единица здоровья. Договорись о классе, специализации и серии, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Версия, класс и правила',
          text: 'Реши с соперником, актуальная это версия или Classic, какой класс и специализация у каждого и сколько боёв в серии — до двух или до трёх побед. Договорись, что честно между раундами: ждать ли длинные перезарядки, можно ли зелья, насколько близким должен быть уровень предметов, — и запиши всё в заметке к дуэли.',
        },
        {
          heading: 'Где встретиться',
          text: 'Оба персонажа должны быть в одном регионе и в одной версии игры, проще всего — на одном сервере; в большинстве столиц и в подземельях дуэли отключены. Вызови соперника через его портрет или командой /duel, а в актуальной версии лидер группы может начать бой на арене через War Games командой /wargame. Когда дуэль заканчивается, чат называет победителя, так что сделай скриншот этой строки.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель заявляет победу в DuelMe, соперник подтверждает её или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, раунд, выигранный тем, что запрещено в заметке: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
