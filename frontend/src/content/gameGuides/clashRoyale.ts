import type { GameGuide } from '@/lib/gameGuides';

export const clashRoyaleGuide: GameGuide = {
  slug: 'clash-royale',
  name: 'Clash Royale',
  category: 'STRATEGY',
  copy: {
    en: {
      title: 'Clash Royale 1v1 for money — USDT duels, 0% fee',
      description:
        'Play Clash Royale for USDT against a real opponent: a best-of-three friendly battle, a smart contract holds both stakes, the winner takes the whole pot.',
      lead:
        'A Clash Royale duel is a set of friendly battles, usually the best of three, where card levels are evened out and only the decks and the play count. Both put the same USDT into a smart contract, and whoever wins two games takes the whole pot.',
      sections: [
        {
          heading: 'Decks and the mode',
          text: 'Agree whether each player brings their own deck or both play the same one, whether evolutions and Heroes are allowed, and whether the loser of a game may switch decks. The classic 1v1 is the usual pick, though a friendly battle can also be 3x Elixir or Sudden Death; write the choice in the duel’s note.',
        },
        {
          heading: 'Starting the friendly battle',
          text: 'Add each other with an invite link or a QR code from the Social tab — the link lasts about 12 hours — and send the friendly battle from there. A friendly battle costs no trophies; take a screenshot of the crowns after each game.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner of the set claims the pot on DuelMe and the opponent confirms it, or concedes the set outright; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a disconnect that decided a game, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Клеш Рояль 1 на 1 на деньги — дуэли на USDT',
      description:
        'Сыграй в Clash Royale на USDT с живым соперником: дружеские бои до двух побед, смарт-контракт держит USDT обоих, победитель забирает всё. Комиссия 0%.',
      lead:
        'Дуэль в Clash Royale — это серия дружеских боёв, обычно до двух побед из трёх, где уровни карт уравнены и решают только колоды и игра. Оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто выиграет два боя, забирает весь банк.',
      sections: [
        {
          heading: 'Колоды и режим',
          text: 'Договорись, играет ли каждый своей колодой или оба одной и той же, разрешены ли эволюции и герои и можно ли проигравшему в бою менять колоду. Обычно играют классический бой 1 на 1, но дружеский бой бывает и с тройным эликсиром или внезапной смертью; запиши выбор в заметке к дуэли.',
        },
        {
          heading: 'Как начать дружеский бой',
          text: 'Добавь соперника в друзья по ссылке-приглашению или QR-коду — ссылка действует около 12 часов — и отправь ему вызов на дружеский бой. Дружеский бой не стоит кубков; после каждого боя сделай скриншот корон.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель серии забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, обрыв связи, который решил бой: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
