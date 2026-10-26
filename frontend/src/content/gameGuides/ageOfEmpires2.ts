import type { GameGuide } from '@/lib/gameGuides';

export const ageOfEmpires2Guide: GameGuide = {
  slug: 'age-of-empires-ii',
  name: 'Age of Empires II',
  category: 'STRATEGY',
  copy: {
    en: {
      title: 'Age of Empires II 1v1 for money — USDT duels',
      description:
        'Play an Age of Empires II 1v1 for USDT on Arabia or Arena against a real opponent: a smart contract holds both stakes, the winner takes the pot. 0% fee.',
      lead:
        'An Age of Empires II duel is a 1v1 that runs from the Dark Age until one player resigns, usually as a short series. Agree on the maps and the civilisations, both put the same USDT into a smart contract, and the winner of the series takes the whole pot.',
      sections: [
        {
          heading: 'Maps and civilisations',
          text: 'Most 1v1s are played on Arabia, an open map, while on Arena each base starts behind stone walls and an early rush rarely gets through. Settle whether civilisations are picked freely, drafted in turns or random, and write the maps, the civilisation rule and the series — a best of three or five — in the duel’s note.',
        },
        {
          heading: 'Hosting the lobby',
          text: 'One player hosts an unranked lobby with the agreed map and settings and invites the other; tick Hide Civilizations when the picks are blind. Turn on Record Game as well, so the match is saved as a recording: a resignation ends the game, and the recording keeps it.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a game cut short by an out-of-sync error: then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Age of Empires II 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Age of Empires II (Эпоха империй 2) 1 на 1 на USDT на Arabia или Arena: смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Дуэль в Age of Empires II — игра 1 на 1 от Тёмных веков до сдачи одного из игроков, обычно короткой серией. Договорись о картах и цивилизациях, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель серии забирает весь банк.',
      sections: [
        {
          heading: 'Карты и цивилизации',
          text: 'Большинство игр 1 на 1 проходит на открытой карте Arabia, а на Arena каждая база начинается за каменными стенами, и ранний раш редко доходит до цели. Реши с соперником, выбираются ли цивилизации свободно, по драфту или случайно, и запиши карты, правило о цивилизациях и длину серии — до двух или до трёх побед — в заметке к дуэли.',
        },
        {
          heading: 'Как создать лобби',
          text: 'Один игрок создаёт нерейтинговое лобби с нужной картой и настройками и приглашает соперника; если цивилизации выбираются вслепую, включи их скрытие. Включи и запись игры, чтобы матч сохранился: сдача заканчивает игру, и она останется на записи.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель заявляет победу в DuelMe, соперник подтверждает её или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, игру, оборванную рассинхронизацией: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
