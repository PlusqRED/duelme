import type { GameGuide } from '@/lib/gameGuides';

export const superSmashBrosUltimateGuide: GameGuide = {
  slug: 'super-smash-bros-ultimate',
  name: 'Super Smash Bros. Ultimate',
  category: 'FIGHTING',
  copy: {
    en: {
      title: 'Super Smash Bros. Ultimate money matches for USDT',
      description:
        'Play a Super Smash Bros. Ultimate set for USDT against a real opponent: agree on stocks and stages, a smart contract holds both stakes, the winner takes it all.',
      lead:
        'A Smash money match is a set of stock battles, at its best with both players side by side at one Switch. Agree on the ruleset and the stages, both put the same USDT into a smart contract, and the winner of the set takes the whole pot.',
      sections: [
        {
          heading: 'The ruleset and stage striking',
          text: 'The usual competitive ruleset is three stocks, a seven-minute timer, and items, hazards and the Final Smash meter off; at a timeout, more stocks wins, then lower damage. For game one, players strike stages in turn from an agreed starter list until one is left, and after each game the winner bans and the loser picks. Write the ruleset, the stage list and the set length in the duel’s note.',
        },
        {
          heading: 'Side by side on one Switch',
          text: 'Smash is best played offline: two players at one Switch, each on their own controller, free of the input delay online play adds. If you play online, one player creates a Battle Arena with a password and the other joins by its ID, which needs Nintendo Switch Online. Save the replay from the results screen after each game, so a close call can be watched again.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only something serious, like a game played with items on against the note, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Super Smash Bros. Ultimate на деньги — Смэш 1 на 1',
      description:
        'Сыграй сет в Super Smash Bros. Ultimate на USDT с живым соперником: договорись о жизнях и аренах, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Дуэль в Смэше — это серия боёв на жизни, и лучше всего её играть рядом, за одним Switch. Договорись о правилах и аренах, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель серии забирает весь банк.',
      sections: [
        {
          heading: 'Правила и вычёркивание арен',
          text: 'Обычные турнирные правила — три жизни, таймер на семь минут, без предметов, опасностей на аренах и шкалы Final Smash; если время вышло, побеждает тот, у кого больше жизней, а при равенстве — у кого меньше урона. Первую игру играют на арене, которая остаётся, когда игроки по очереди вычёркивают арены из оговорённого стартового списка; дальше победитель игры запрещает арены, а проигравший выбирает. Запиши правила, список арен и длину серии в заметке к дуэли.',
        },
        {
          heading: 'Рядом, за одним Switch',
          text: 'Смэш лучше всего играть офлайн: два игрока за одним Switch, у каждого свой контроллер, и никакой задержки ввода, которую добавляет онлайн. Если играть по сети, один игрок создаёт комнату Battle Arena с паролем, а соперник заходит по её ID — для этого нужна подписка Nintendo Switch Online. После каждой игры сохрани повтор на экране результатов, чтобы спорный момент можно было пересмотреть.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, игру с предметами, которые заметка запрещает: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
