import type { GameGuide } from '@/lib/gameGuides';

export const pokerGuide: GameGuide = {
  slug: 'poker',
  name: 'Poker',
  category: 'CARD',
  copy: {
    en: {
      title: 'Poker for money — heads-up Hold’em for USDT',
      description:
        'Play heads-up No-Limit Hold’em for USDT against a real opponent, with free chips at the table: a smart contract holds both stakes, the winner takes the pot.',
      lead:
        'A poker duel is heads-up No-Limit Texas Hold’em: two players at one table, and the match ends when one of them has every chip. The chips are free play money; the real stake is the same USDT both put into a smart contract, and the winner takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the structure',
          text: 'Settle equal starting stacks, the blinds and how often they go up, and whether the duel is a single match or the best of three. Heads-up, the button posts the small blind and acts first before the flop — worth knowing if you deal at a real table. Write the structure and both screen names in the duel’s note.',
        },
        {
          heading: 'Setting up the table',
          text: 'Online, one player opens a private game on Poker Now, which plays only for chips with no cash value, sets the agreed stacks and blinds and sends the link. Its session log and hand replay keep every hand, so the last one is easy to show. At a real table, deal from one deck with a witness or a camera on the final hand.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the player out of chips admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a connection lost in the middle of an all-in, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Покер на деньги — хедз-ап холдем на USDT',
      description:
        'Сыграй хедз-ап в безлимитный холдем на USDT с живым соперником, фишки бесплатные: смарт-контракт держит USDT обоих, победитель забирает весь банк.',
      lead:
        'Покерная дуэль — это хедз-ап в безлимитный техасский холдем: два игрока за одним столом, и матч кончается, когда у одного из них все фишки. Фишки бесплатные, а настоящая ставка — одна и та же сумма USDT, которую оба кладут в смарт-контракт, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Договорись о структуре',
          text: 'Назначь одинаковые стартовые стеки, блайнды и то, как часто они растут, и договорись, что решает дуэль: один матч или до двух побед из трёх. В хедз-апе баттон ставит малый блайнд и ходит первым до флопа — это стоит знать, если раздаёшь за живым столом. Запиши структуру и ники обоих в заметке к дуэли.',
        },
        {
          heading: 'Как собрать стол',
          text: 'Онлайн один игрок открывает приватную игру в Poker Now, где играют только на фишки без денежной ценности, ставит договорённые стеки и блайнды и присылает ссылку. Журнал сессии и повтор раздач хранят каждую раздачу, так что последнюю легко показать. За живым столом раздавай из одной колоды, а финальную раздачу пусть видит свидетель или камера.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, обрыв связи посреди олл-ина: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
