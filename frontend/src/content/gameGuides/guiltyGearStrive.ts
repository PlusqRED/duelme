import type { GameGuide } from '@/lib/gameGuides';

export const guiltyGearStriveGuide: GameGuide = {
  slug: 'guilty-gear-strive',
  name: 'Guilty Gear Strive',
  category: 'FIGHTING',
  copy: {
    en: {
      title: 'Guilty Gear Strive 1v1 for money — USDT duels',
      description:
        'Play a Guilty Gear Strive set for USDT against a real opponent online: a smart contract holds both stakes, the winner of the set takes the whole pot. 0% fee.',
      lead:
        'Strive runs its online play on rollback netcode, which keeps a set between distant players smooth on a decent connection. Each player puts the same USDT into a smart contract before the first round, and the winner of the set takes the whole pot.',
      sections: [
        {
          heading: 'Rounds, characters and the set',
          text: 'The host of a Player Match room sets the match rules, so agree on them before anyone joins: two rounds to win a game on a 99-second timer is the usual tournament setting. Settle how many games make the set and whether the loser may switch characters, and write it in the duel’s note.',
        },
        {
          heading: 'Rooms and platforms',
          text: 'One player creates a private Player Match room and sends its search ID, and the other joins with it. Crossplay brings PlayStation, Xbox and PC players into the same room, but the Switch edition plays only against Switch players, so agree on the platform first. Keep a screenshot of the result screen after the last game.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only something serious, like a game decided by a connection even rollback could not hold together, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Guilty Gear Strive на деньги — дуэли на USDT',
      description:
        'Сыграй сет в Guilty Gear Strive на USDT с живым соперником онлайн: смарт-контракт держит USDT обоих, победитель сета забирает всё. Комиссия 0%.',
      lead:
        'Онлайн в Strive работает на роллбэк-неткоде, и сет между игроками из разных городов идёт плавно, если связь у обоих приличная. Перед первым раундом каждый игрок кладёт одну и ту же сумму USDT в смарт-контракт, и победитель сета забирает весь банк.',
      sections: [
        {
          heading: 'Раунды, персонажи и сет',
          text: 'Правила матча задаёт создатель комнаты в Player Match, поэтому договорись о них заранее: обычная турнирная настройка — игра до двух выигранных раундов с таймером на 99 секунд. Реши с соперником, сколько игр в сете и может ли проигравший менять персонажа, и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Комната и платформы',
          text: 'Один игрок создаёт закрытую комнату в Player Match и отправляет сопернику её номер для поиска (Search ID). Кроссплей сводит в одной комнате игроков на PlayStation, Xbox и ПК, а версия для Switch играет только с Switch, так что сначала договорись о платформе. После последней игры сделай скриншот экрана результатов.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, игру, которую решила связь настолько плохая, что не спасает даже роллбэк: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
