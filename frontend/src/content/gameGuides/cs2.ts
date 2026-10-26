import type { GameGuide } from '@/lib/gameGuides';

export const cs2Guide: GameGuide = {
  slug: 'cs2',
  name: 'CS2',
  category: 'FPS',
  copy: {
    en: {
      title: 'CS2 1v1 for money — USDT duels, 0% fee',
      description:
        'Play a CS2 1v1 for USDT against a real opponent: agree on the map and the rounds, a smart contract holds both stakes, the winner takes the whole pot.',
      lead:
        'Challenge anyone to a CS2 1v1. You agree on the map and the rules, both put the same USDT into a smart contract, play it out in your own match, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'A format that settles it',
          text: 'An aim map to a set number of kills, or first to ten rounds on a 1v1 arena from the Workshop, keeps a duel short and fair. Write the map, the score to reach and the weapons in the duel’s note, so the terms stay on the duel itself.',
        },
        {
          heading: 'Setting up the match',
          text: 'One of you hosts a private match or a community 1v1 server and invites the other from the friends list. Pick a region that suits you both, so neither plays on a bad ping, and keep the final scoreboard on screen long enough to take a screenshot.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the contract pays out on the spot. A result can be disputed only for something serious, like a cheat or a crashed server, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'CS2 (КС 2) 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в КС 2 1 на 1 на USDT с живым соперником: договорись о карте и раундах, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Вызови любого на дуэль 1 на 1 в CS2. Игроки договариваются о карте и правилах, оба кладут одну и ту же сумму USDT в смарт-контракт, играют матч, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Формат, который решает',
          text: 'Аим-карта до нужного числа убийств или до десяти раундов на 1v1-арене из Мастерской — короткая и честная дуэль. Запиши карту, счёт и оружие в заметке к дуэли, и условия останутся на самой дуэли.',
        },
        {
          heading: 'Как собрать матч',
          text: 'Один игрок создаёт приватный матч или заходит на 1v1-сервер сообщества и зовёт соперника из списка друзей. Выбери регион, удобный обоим, чтобы никто не играл с плохим пингом, и сохрани скриншот итоговой таблицы.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает, и контракт сразу выплачивает деньги. Оспорить результат стоит только из-за серьёзного — чита или упавшего сервера: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
