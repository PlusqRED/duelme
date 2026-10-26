import type { GameGuide } from '@/lib/gameGuides';

export const tekken8Guide: GameGuide = {
  slug: 'tekken-8',
  name: 'Tekken 8',
  category: 'FIGHTING',
  copy: {
    en: {
      title: 'Tekken 8 for money — FT5 duels for USDT',
      description:
        'Play a Tekken 8 first-to-five for USDT against a real opponent: a smart contract holds both stakes, and the winner of the set takes the whole pot.',
      lead:
        'A fighting game set is a duel already. Agree on the length of the set, both put the same USDT into a smart contract, and whoever takes the set takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the set',
          text: 'First to three or first to five games is the usual length, with each game played to three rounds. Settle whether the loser may switch characters between games and how the stage is picked, and write it in the duel’s note.',
        },
        {
          heading: 'Setting up the match',
          text: 'One player creates an online player match room and invites the other. Play on a wired connection if you can — a set on a shaky one is a set nobody trusts — and take a screenshot of the final score.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it; the contract pays out on the spot. Dispute only for something serious, like a disconnect that decided a game, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Tekken 8 на деньги — дуэли до 5 побед на USDT',
      description:
        'Сыграй в Tekken 8 до пяти побед на USDT с живым соперником: смарт-контракт держит USDT обоих, победитель сета забирает весь банк. Комиссия 0%.',
      lead:
        'Сет в файтинге — это уже дуэль. Договорись о длине сета, оба игрока кладут одну и ту же сумму USDT в смарт-контракт, и тот, кто возьмёт сет, забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о сете',
          text: 'Обычно играют до трёх или до пяти побед, каждая игра — до трёх раундов. Реши с соперником, можно ли проигравшему менять персонажа между играми и как выбирается арена, и запиши это в заметке к дуэли.',
        },
        {
          heading: 'Как собрать матч',
          text: 'Один игрок создаёт комнату для онлайн-матча и приглашает соперника. По возможности играй по кабелю — сету на нестабильной связи никто не поверит — и сделай скриншот итогового счёта.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает, и контракт сразу выплачивает деньги. Оспаривать стоит только серьёзное — например, обрыв связи, который решил игру: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
