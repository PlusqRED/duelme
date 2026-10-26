import type { GameGuide } from '@/lib/gameGuides';

export const streetFighter6Guide: GameGuide = {
  slug: 'street-fighter-6',
  name: 'Street Fighter 6',
  category: 'FIGHTING',
  copy: {
    en: {
      title: 'Street Fighter 6 money matches for USDT',
      description:
        'Play a Street Fighter 6 set for USDT against a real opponent: agree on the length and controls, a smart contract holds both stakes, the winner takes it all.',
      lead:
        'Street Fighter has always been settled one set at a time. Agree on the set, both put the same USDT into a smart contract, and whoever takes it takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the set',
          text: 'First to three or first to five games is the usual length. Settle whether Modern controls are fine for both sides and whether the loser may switch characters, then write it in the duel’s note.',
        },
        {
          heading: 'Setting up the match',
          text: 'One player opens a custom room and invites the other. Crossplay lets PC and console players meet; play on a wired connection if you can, and take a screenshot of the final score.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the contract pays out on the spot. Dispute only for something serious, like a disconnect that decided a game, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Street Fighter 6 на деньги — дуэли на USDT',
      description:
        'Сыграй сет в Street Fighter 6 на USDT с живым соперником: договорись о длине и управлении, смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'Споры в Street Fighter всегда решали сетом. Договорись о сете, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто его возьмёт, забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о сете',
          text: 'Обычно играют до трёх или до пяти побед. Реши с соперником, подходит ли обоим управление Modern и можно ли проигравшему менять персонажа, и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Как собрать матч',
          text: 'Один игрок открывает свою комнату и приглашает соперника. Кроссплей сводит игроков с ПК и консолей; по возможности играй по кабелю и сделай скриншот итогового счёта.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает, и контракт сразу выплачивает деньги. Оспаривать стоит только серьёзное — например, обрыв связи, который решил игру: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
