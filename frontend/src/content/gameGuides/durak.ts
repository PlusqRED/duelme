import type { GameGuide } from '@/lib/gameGuides';

export const durakGuide: GameGuide = {
  slug: 'durak',
  name: 'Durak',
  category: 'CARD',
  copy: {
    en: {
      title: 'Durak for money — the Russian card game for USDT',
      description:
        'Play durak for USDT one on one against a real opponent, throw-in or transfer: a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'Durak — “fool” in Russian — is the card game you play not to lose: whoever is left holding cards at the end is the fool. A duel is a short series of one-on-one games with a 36-card deck, and the winner of the series takes the whole pot of USDT both put into a smart contract.',
      sections: [
        {
          heading: 'Agree on the rules',
          text: 'Pick podkidnoy, the throw-in game, or perevodnoy, where the defender can turn the attack back by adding a card of the same rank. Play with 36 cards, sixes to aces, decide how many games make the duel — say first to three — and whether a game where the last attack is beaten and both hands empty at once is a draw or replayed. Write it all in the duel’s note.',
        },
        {
          heading: 'Setting up the game',
          text: 'The Durak Online app has private games with a password: open one for two, choose the deck and the variant, keep the mode that allows cheating switched off and set the draw option the way the note says. Take a screenshot when the last game ends. With a real deck, play at one table in front of a witness or on camera.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser of the series admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a card slipped back out of the discards at a real table, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Дурак на деньги — подкидной и переводной на USDT',
      description:
        'Сыграй в дурака на USDT один на один с живым соперником, в подкидного или переводного: смарт-контракт держит USDT обоих, победитель забирает всё.',
      lead:
        'В дурака играют не на победу, а чтобы не остаться последним: кто к концу остаётся с картами на руках, тот и дурак. Дуэль — короткая серия партий один на один колодой в 36 карт, и тот, кто возьмёт серию, забирает весь банк USDT, который оба игрока кладут в смарт-контракт.',
      sections: [
        {
          heading: 'Договорись о правилах',
          text: 'Выбери вариант: подкидной или переводной, где отбивающийся может перевести атаку обратно картой того же достоинства. Колода — 36 карт, от шестёрок до тузов; реши с соперником, сколько партий в дуэли, например до трёх побед, и что считать, если последний ход отбит и карты у обоих кончились одновременно: ничью или переигровку. Запиши всё в заметке к дуэли.',
        },
        {
          heading: 'Как собрать игру',
          text: 'В приложении «Дурак Онлайн» есть приватные игры с паролем: открой игру на двоих, выбери колоду и вариант, не включай режим «С шулерами» и выставь «Ничью» так, как записано в заметке. Когда закончится последняя партия, сделай скриншот. С настоящей колодой садись за один стол при свидетеле или под камерой.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, карту, тайком вытянутую из бито за живым столом: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
