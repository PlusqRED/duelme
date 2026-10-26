import type { GameGuide } from '@/lib/gameGuides';

export const mortalKombat1Guide: GameGuide = {
  slug: 'mortal-kombat-1',
  name: 'Mortal Kombat 1',
  category: 'FIGHTING',
  copy: {
    en: {
      title: 'Mortal Kombat 1 money matches — USDT duels, 0% fee',
      description:
        'Play a Mortal Kombat 1 set for USDT against a real opponent: agree on fighters and Kameos, a smart contract holds both stakes, the winner takes the whole pot.',
      lead:
        'In Mortal Kombat 1 each player brings a main fighter and a Kameo, a partner called in mid-fight to assist. A duel is a set between those two pairs: both put the same USDT into a smart contract, and whoever wins the set takes the whole pot.',
      sections: [
        {
          heading: 'Fighters, Kameos and the length',
          text: 'Agree on the length first — a first to five, say, or a first to ten for a longer set. Settle whether the loser of a game may change their fighter or Kameo while the winner keeps both, and write the length and that rule in the duel’s note.',
        },
        {
          heading: 'Getting into a private match',
          text: 'One player opens Private from the Versus menu, chooses online and invites the other. Players on PlayStation 5, Xbox Series X|S and PC can meet once both turn crossplay on in the online settings; the Switch version is left out of it. Record the set, or take a screenshot of the score after the last game.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only something serious, like a desync that decided a game, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Mortal Kombat 1 (Мортал Комбат 1) на деньги в USDT',
      description:
        'Сыграй сет в Mortal Kombat 1 на USDT с живым соперником: договорись о бойцах и камео, смарт-контракт держит USDT обоих, победитель забирает весь банк.',
      lead:
        'В Mortal Kombat 1 каждый игрок выходит с основным бойцом и камео — напарником, которого зовут на помощь посреди боя. Дуэль — это сет между такими парами: оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто возьмёт сет, забирает весь банк.',
      sections: [
        {
          heading: 'Бойцы, камео и длина сета',
          text: 'Сначала договорись о длине сета — например, до пяти побед или, для сета подлиннее, до десяти. Реши с соперником, может ли проигравший игру сменить бойца или камео, пока победитель играет теми же, и запиши всё это в заметке к дуэли.',
        },
        {
          heading: 'Приватный матч и кроссплей',
          text: 'Один игрок открывает приватный режим в меню версуса, выбирает онлайн и приглашает соперника. Игроки на PlayStation 5, Xbox Series X|S и ПК встречаются через кроссплей, если оба включат его в настройках онлайна; версия для Switch в нём не участвует. Запиши сет на видео или сделай скриншот счёта после последней игры.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, рассинхрон, который решил игру: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
