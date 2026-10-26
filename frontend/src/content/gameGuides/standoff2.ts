import type { GameGuide } from '@/lib/gameGuides';

export const standoff2Guide: GameGuide = {
  slug: 'standoff-2',
  name: 'Standoff 2',
  category: 'FPS',
  copy: {
    en: {
      title: 'Standoff 2 1v1 for money — USDT duels, 0% fee',
      description:
        'Play a Standoff 2 duel for USDT against a real opponent in a private game: a smart contract holds both stakes, and the winner takes the whole pot.',
      lead:
        'Standoff 2 has its 1v1 built in: the Duel mode, played round by round until one player takes eight. Agree on the map, both put the same USDT into a smart contract, play a private game, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the duel',
          text: 'Duel hands both players the same random weapon kit each round, so the guns are even without any extra rules. Settle the map — Bridge, Pool, Temple or another duel map — and whether one match decides it or the best of three, then write it in the duel’s note.',
        },
        {
          heading: 'Opening a private game',
          text: 'Add each other as friends by player ID; one of you invites the other to the lobby, picks Duel and switches the game from public to private before starting. A private game counts for neither rank nor stats, so take a screenshot of the final table.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a cheat or a dropped connection, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Стандофф 2 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Standoff 2 (Стандофф 2) 1 на 1 на USDT в приватной игре: смарт-контракт держит USDT обоих, победитель забирает весь банк. Комиссия 0%.',
      lead:
        'В Standoff 2 дуэль 1 на 1 уже встроена — режим «Дуэль», раунд за раундом, пока кто-то не возьмёт восемь. Игроки договариваются о карте, оба кладут одну и ту же сумму USDT в смарт-контракт, играют приватную игру, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о дуэли',
          text: 'В «Дуэли» оба игрока каждый раунд получают один и тот же случайный комплект оружия, так что с пушками всё ровно без лишних правил. Реши с соперником карту — Bridge, Pool, Temple или другую дуэльную — и решает ли всё один матч или до двух побед из трёх, и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Как собрать приватную игру',
          text: 'Игроки добавляют друг друга в друзья по ID, один зовёт соперника в лобби, выбирает «Дуэль» и перед стартом меняет публичную игру на приватную. Приватная игра не идёт ни в звание, ни в статистику, поэтому сделай скриншот итоговой таблицы.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — чит или обрыв связи: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
