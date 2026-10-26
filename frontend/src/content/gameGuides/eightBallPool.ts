import type { GameGuide } from '@/lib/gameGuides';

export const eightBallPoolGuide: GameGuide = {
  slug: '8-ball-pool',
  name: '8 Ball Pool',
  category: 'SPORT',
  copy: {
    en: {
      title: '8 Ball Pool for money — 1v1 duels for USDT',
      description:
        'Play 8 Ball Pool against a friend for USDT: a smart contract holds both stakes, and the winner of the match takes the whole pot. 0% fee.',
      lead:
        'An 8 Ball Pool duel is a short match against a friend you challenge in the game, played game after game until one of you reaches the agreed number of wins. The same amount of USDT from each of you goes into a smart contract, and the winner of the match takes the whole pot.',
      sections: [
        {
          heading: 'How many games, which cue',
          text: 'A single game can turn on one scratch while shooting at the eight, so a duel is better played as the best of three, five or seven. Cues in the game differ in force, aim, spin and time, so agree whether any cue goes, and write the number of games and the cue rule in the duel’s note.',
        },
        {
          heading: 'Challenging your friend',
          text: 'Add each other with the Unique ID on your profiles, check that you both run the same version of the game — a phone can challenge only a phone, and a browser only a browser — and challenge from your friends list. Any coins the table puts up stay inside the game: the duel’s stake is the USDT on DuelMe. Take a screenshot of the result after every game.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a modified app that draws a longer aim line, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: '8 Ball Pool на деньги — дуэли 1 на 1 на USDT',
      description:
        'Сыграй в 8 Ball Pool с другом на USDT: смарт-контракт держит USDT обоих, победитель матча забирает весь банк. Комиссия 0%.',
      lead:
        'Дуэль в 8 Ball Pool — короткий матч с другом, которого ты вызываешь прямо в игре: партия за партией, пока кто-то не наберёт оговорённое число побед. Ставки обеих сторон, одна и та же сумма в USDT, лежат в смарт-контракте, и победитель матча забирает весь банк.',
      sections: [
        {
          heading: 'Сколько партий и какой кий',
          text: 'Одну партию может решить биток, упавший в лузу при ударе по восьмёрке, поэтому матч лучше играть до двух, трёх или четырёх побед. Кии в игре различаются силой, прицелом, вращением и временем на удар, так что договорись, можно ли играть любым, и запиши число партий и правило о кие в заметке к дуэли.',
        },
        {
          heading: 'Как вызвать друга',
          text: 'Добавь соперника в друзья по уникальному ID из профиля, проверь, что версия игры у обоих одна и та же — телефон вызывает только телефон, а браузер только браузер, — и брось вызов из списка друзей. Монеты, которые ставит стол, остаются частью игры, а ставка дуэли — это USDT в DuelMe. После каждой партии делай скриншот результата.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, взломанное приложение с удлинённой линией прицела: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
