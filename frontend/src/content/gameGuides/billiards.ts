import type { GameGuide } from '@/lib/gameGuides';

export const billiardsGuide: GameGuide = {
  slug: 'billiards',
  name: 'Billiards',
  category: 'OFFLINE',
  copy: {
    en: {
      title: 'Billiards and pool for money — 1v1 USDT duels',
      description:
        'Play pool or Russian pyramid for USDT against a real opponent at a real table: a smart contract holds both stakes, the winner takes the whole pot. 0% fee.',
      lead:
        'A billiards duel is a race at one table — pool, 8-ball or 9-ball, or Russian pyramid — until one of you takes the agreed number of racks. You both stake the same USDT in a smart contract, and the winner of the race takes the whole pot.',
      sections: [
        {
          heading: 'Agree on the game and the race',
          text: 'Name the game — 8-ball, 9-ball or Russian pyramid, where a frame goes to whoever pockets eight balls first — and the race, say first to five. Settle who breaks first, by a lag or a coin, and whether the winner of a rack breaks next or you take turns, then write in the duel’s note what a foul gives: ball in hand anywhere on the table, or only behind the head string.',
        },
        {
          heading: 'At the table',
          text: 'Play in a club or a bar, and pick the table in advance: a pyramid table is bigger than a bar’s pool table, with pockets barely wider than the balls. Record the race on a phone propped where it sees the whole cloth, keep the count on the bead counter over the table, and ask a regular at the club who knows you both to watch the last racks.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. If one of you claims a race that the club’s closing time cut short, the other can dispute it, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Бильярд на деньги — пул и пирамида на USDT',
      description:
        'Сыграй в бильярд на USDT с живым соперником — в пул или русскую пирамиду: смарт-контракт держит USDT обоих, победитель забирает весь банк. Комиссия 0%.',
      lead:
        'Дуэль в бильярд — это игра за одним столом до оговорённого числа побед: русская пирамида или пул, восьмёрка либо девятка. Оба игрока ставят одну и ту же сумму USDT в смарт-контракт, и победитель забирает весь банк.',
      sections: [
        {
          heading: 'Какая игра и до скольких побед',
          text: 'Назови игру — свободная пирамида, она же «американка», московская пирамида или пул — и до скольких побед идёт матч; в пирамиде партия длится до восьми забитых шаров. Реши, кто разбивает первым и разбивает ли дальше победитель партии или игроки по очереди, и запиши в заметке к дуэли, чем наказывается фол: штрафным шаром или битком с руки.',
        },
        {
          heading: 'Где и как играть',
          text: 'Играют в бильярдном клубе или в баре, и стол лучше выбрать заранее: у пирамиды он больше барного пула, а лузы едва шире шара. Снимай матч с телефона, поставленного так, чтобы в кадр попадало всё сукно, счёт партий веди на счётах над столом, а завсегдатая клуба, которого знают оба, попроси посмотреть последние партии.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Если кто-то заявит победу в матче, который оборвало закрытие клуба, другой может оспорить результат: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
