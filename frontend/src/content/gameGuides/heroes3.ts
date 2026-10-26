import type { GameGuide } from '@/lib/gameGuides';

export const heroes3Guide: GameGuide = {
  slug: 'heroes-of-might-and-magic-iii',
  name: 'Heroes of Might and Magic III',
  category: 'STRATEGY',
  copy: {
    en: {
      title: 'Heroes 3 (HoMM 3) 1v1 for money — HotA duels',
      description:
        'Play Heroes of Might and Magic III 1v1 for USDT in the HotA lobby against a real opponent: a smart contract holds both stakes, the winner takes the pot.',
      lead:
        'A Heroes 3 duel is a single game on a freshly generated random map in Horn of the Abyss, played until one side is knocked out or surrenders. Agree on the template, the towns and the timer, both put the same USDT into a smart contract, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Template, towns and timer',
          text: 'The usual templates for a 1v1 are Jebus Cross and Jebus Outcast, played with a chess timer so that no turn drags on. Settle how towns are chosen — at random, or by barter, where gold is bid for the choice — and how many restarts each side gets if the map generates badly, then write it all in the duel’s note.',
        },
        {
          heading: 'Playing in the HotA lobby',
          text: 'One player creates a game in the Horn of the Abyss online lobby with the agreed template and timer, and the other joins it. If the connection drops, the usual rule is to go on from a save made by the player whose turn it was. When one side surrenders or is knocked out, take a screenshot and keep the last save.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a desync that no save could repair: then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Герои 3 (HoMM 3) 1 на 1 на деньги — дуэли в HotA',
      description:
        'Сыграй в Героев Меча и Магии 3 1 на 1 на USDT в лобби HotA с живым соперником: смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Дуэль в Героях 3 — одна партия на свежесгенерированной случайной карте в Horn of the Abyss, пока одна сторона не сдастся или не выбудет. Договорись о шаблоне, замках и таймере, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Шаблон, замки и таймер',
          text: 'Обычные шаблоны для игры 1 на 1 — Jebus Cross и Jebus Outcast, с шахматным таймером, чтобы ни один ход не затягивался. Реши с соперником, как выбираются замки — случайно или торгом, где за выбор ставят золото, — и сколько рестартов есть у каждого, если карта сгенерируется неудачно, и запиши всё в заметке к дуэли.',
        },
        {
          heading: 'Как сыграть в лобби HotA',
          text: 'Один игрок создаёт игру в онлайн-лобби Horn of the Abyss с нужным шаблоном и таймером, второй к ней присоединяется. При разрыве связи обычно продолжают с сохранения, которое делает игрок, чей сейчас ход. Когда одна сторона сдаётся или выбывает, сделай скриншот и оставь последнее сохранение.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель заявляет победу в DuelMe, соперник подтверждает её или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, рассинхрон, который не исправить ни одним сохранением: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
