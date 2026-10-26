import type { GameGuide } from '@/lib/gameGuides';

export const tableTennisGuide: GameGuide = {
  slug: 'table-tennis',
  name: 'Table Tennis',
  category: 'OFFLINE',
  copy: {
    en: {
      title: 'Table tennis for money — ping-pong duels for USDT',
      description:
        'Play table tennis for USDT against a real opponent, at a club, a park table or the office: a smart contract holds both stakes, the winner takes the pot.',
      lead:
        'A table tennis duel is a match at one table, games to 11, until one of you wins the agreed number of games. Two equal USDT stakes sit in a smart contract, and the winner of the match takes the whole pot.',
      sections: [
        {
          heading: 'Games, serves and the length',
          text: 'A game goes to 11 and must be won by two clear points, and the serve passes every two points — every point from 10–10. Agree whether the match is the best of three or five games, and whether serves follow the official rule, a toss of at least 16 cm from an open palm, or anything goes; write it in the duel’s note.',
        },
        {
          heading: 'Where to play, who keeps score',
          text: 'A club table, a concrete one in a park or the one in the office all do, as long as the net sits at its proper height of 15.25 cm. An umpire you both trust can call the score after every point or turn it on a flip scoreboard, and a video shot from the side, with both ends of the table in frame, answers any doubt later.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. A match that rain stopped on an outdoor table has no winner yet: if it is claimed anyway, the other player can dispute it, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Настольный теннис на деньги — пинг-понг на USDT',
      description:
        'Сыграй в настольный теннис на USDT с живым соперником — в клубе, в парке или в офисе: смарт-контракт держит USDT обоих, победитель забирает весь банк.',
      lead:
        'Дуэль в настольный теннис — это матч за одним столом: партии до 11 очков, пока кто-то не выиграет оговорённое число партий. Две равные ставки в USDT лежат в смарт-контракте, и победитель матча забирает весь банк.',
      sections: [
        {
          heading: 'Партии, подачи и длина матча',
          text: 'Партия идёт до 11 очков с перевесом в два, а подача переходит каждые два очка, при 10:10 — после каждого. Договорись, сколько партий в матче — до двух побед из трёх или до трёх из пяти — и соблюдать ли официальное правило подачи: мяч подбрасывается с открытой ладони минимум на 16 см. Запиши это в заметке к дуэли.',
        },
        {
          heading: 'Где играть и кто ведёт счёт',
          text: 'Подойдёт стол в клубе, бетонный стол в парке или тот, что стоит в офисе, — лишь бы сетка была на своей высоте, 15,25 см. Судья, с которым согласны оба, называет счёт после каждого очка или листает табло у сетки, а видео сбоку, где видны обе половины стола, снимет вопросы потом.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. У матча, который прервал дождь на уличном столе, победителя ещё нет: если победу всё же заявят, соперник может её оспорить, и тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
