import type { GameGuide } from '@/lib/gameGuides';

export const pubgMobileGuide: GameGuide = {
  slug: 'pubg-mobile',
  name: 'PUBG Mobile',
  category: 'FPS',
  copy: {
    en: {
      title: 'PUBG Mobile 1v1 for money — TDM duels for USDT',
      description:
        'Play a PUBG Mobile 1v1 for USDT in a custom room: agree on the guns and the kills, a smart contract holds both stakes, the winner takes the whole pot.',
      lead:
        'A PUBG Mobile 1v1 is Team Deathmatch in a custom room with one player on each side, most often on Warehouse. Agree on the rules, both put the same USDT into a smart contract, and whoever reaches the kill count first takes the whole pot.',
      sections: [
        {
          heading: 'Guns, view and kills',
          text: 'Warehouse keeps every fight close, so the guns decide a lot: agree whether both carry the same loadout, say the M416 only, or pick freely, and whether you play in first or third person. Write the weapons, the view and the kills to reach in the duel’s note.',
        },
        {
          heading: 'Opening the room',
          text: 'A custom room takes a room card to create, so whoever has one hosts: Team Deathmatch on Warehouse, a password, and each player on a team of their own. Send your opponent the room ID and the password, and take a screenshot of the scoreboard when the match ends.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a cheat or a crash that ended the match, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'ПУБГ Мобайл 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в PUBG Mobile 1 на 1 на USDT в своей комнате: договорись об оружии и числе убийств, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Дуэль 1 на 1 в PUBG Mobile — это командный бой (TDM) в своей комнате, по одному игроку с каждой стороны, чаще всего на карте Warehouse. Игроки договариваются о правилах, оба кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто раньше наберёт нужное число убийств, забирает весь банк.',
      sections: [
        {
          heading: 'Оружие, вид и счёт',
          text: 'На Warehouse бой всегда идёт вплотную, так что многое решает оружие: договорись, берут ли оба одну сборку — например, только M416 — или каждый выбирает сам, и от какого лица игра, первого или третьего. Запиши оружие, вид и число убийств в заметке к дуэли.',
        },
        {
          heading: 'Как открыть комнату',
          text: 'Для своей комнаты нужна карточка комнаты, поэтому комнату создаёт тот, у кого она есть: командный бой на Warehouse, пароль и каждый игрок в своей команде. Отправь сопернику ID комнаты и пароль, а когда матч закончится, сделай скриншот таблицы.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — чит или вылет, который оборвал матч: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
