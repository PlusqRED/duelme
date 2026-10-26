import type { GameGuide } from '@/lib/gameGuides';

export const dota2Guide: GameGuide = {
  slug: 'dota-2',
  name: 'Dota 2',
  category: 'MOBA',
  copy: {
    en: {
      title: 'Dota 2 1v1 mid for money — USDT duels',
      description:
        'Play a Dota 2 1v1 mid for USDT: agree on the heroes and the win condition, a smart contract holds both stakes, and the winner takes the whole pot.',
      lead:
        'The classic Dota 2 duel is one lane, two heroes and a clear finish line. Agree on the rules, both put the same USDT into a smart contract, and the winner of the mid takes the whole pot.',
      sections: [
        {
          heading: 'The usual rules',
          text: 'Most 1v1s are played to two kills or the first tower, often as a mirror match so neither hero has the edge. Settle the hero, whether runes and neutral creeps count, and how many games make the duel, then write it in the duel’s note.',
        },
        {
          heading: 'Setting up the lobby',
          text: 'One player creates a custom lobby with the 1v1 Solo Mid mode, picks a server close to both and invites the other. When the game ends, take a screenshot of the scoreboard.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or concedes first; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a disconnect or a cheat: then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Дота 2 1 на 1 на деньги — дуэль на миду',
      description:
        'Сыграй в Dota 2 1 на 1 на миду на USDT: договорись о героях и условии победы, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Классическая дуэль в Dota 2 — одна линия, два героя и понятный финиш. Игроки договариваются о правилах, оба кладут одну и ту же сумму USDT в смарт-контракт, и победитель мида забирает весь банк.',
      sections: [
        {
          heading: 'Обычные правила',
          text: 'Чаще всего играют до двух убийств или до первой вышки, нередко на одинаковых героях, чтобы ни у кого не было преимущества. Реши с соперником героя, считаются ли руны и лесные крипы, сколько игр в дуэли, и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Как собрать лобби',
          text: 'Один игрок создаёт своё лобби с режимом 1v1 Solo Mid, выбирает сервер поближе к обоим и приглашает соперника. Когда игра закончится, сделай скриншот итоговой таблицы.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сам признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — обрыв связи или чит: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
