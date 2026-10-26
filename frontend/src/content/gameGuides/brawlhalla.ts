import type { GameGuide } from '@/lib/gameGuides';

export const brawlhallaGuide: GameGuide = {
  slug: 'brawlhalla',
  name: 'Brawlhalla',
  category: 'FIGHTING',
  copy: {
    en: {
      title: 'Brawlhalla 1v1 for money — USDT duels, 0% fee',
      description:
        'Play a Brawlhalla 1v1 for USDT against a real opponent on any platform: a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'Brawlhalla is free to play with crossplay across PC, consoles and phones, so any opponent is a room number away. A duel is a 1v1 in a private room: both put the same USDT into a smart contract, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Stocks, gadgets and Legends',
          text: 'The common 1v1 setup is three stocks, an eight-minute timer and gadgets off, so only the weapons that drop onto the stage decide fights. Settle the stages, how many games make the set and whether the loser may change Legend — and with it the two weapons they fight with — then write it in the duel’s note.',
        },
        {
          heading: 'Opening a private room',
          text: 'One player opens Custom Game Room, creates a private room and sends the room number; the other joins with it from any platform. The room’s region shows in its name, so set one close to both, and take a screenshot of the results after the last game.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only something serious, like games played on a region the note does not name, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Brawlhalla (Бравлхалла) на деньги — дуэли на USDT',
      description:
        'Сыграй в Brawlhalla 1 на 1 на USDT с живым соперником с любой платформы: смарт-контракт держит USDT обоих, победитель забирает весь банк. Комиссия 0%.',
      lead:
        'Brawlhalla — бесплатная игра с кроссплеем между ПК, консолями и телефонами, так что платформа соперника не важна. Дуэль — это 1 на 1 в приватной комнате: оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Жизни, гаджеты и легенды',
          text: 'Обычная настройка для 1 на 1 — три жизни, таймер на восемь минут и без гаджетов, чтобы в бою решало только оружие, которое падает на карту. Договорись о картах, о числе игр в серии и о том, может ли проигравший сменить легенду — а с ней и два её оружия, — и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Приватная комната',
          text: 'Один игрок открывает Custom Game Room, создаёт приватную комнату и отправляет сопернику её номер; войти по нему можно с любой платформы. Регион видно в названии комнаты — выбери тот, что ближе к обоим, и после последней игры сделай скриншот результатов.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, игры в регионе, которого нет в заметке: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
