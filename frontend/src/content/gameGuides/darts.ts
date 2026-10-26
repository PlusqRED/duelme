import type { GameGuide } from '@/lib/gameGuides';

export const dartsGuide: GameGuide = {
  slug: 'darts',
  name: 'Darts',
  category: 'OFFLINE',
  copy: {
    en: {
      title: 'Darts for money — 501 and cricket duels for USDT',
      description:
        'Play darts for USDT against a real opponent, at one board or online with a camera: a smart contract holds both stakes, the winner takes the pot. 0% fee.',
      lead:
        'A darts duel is a match of 501 or cricket, at one board or over a camera, played to an agreed number of legs. The same USDT from each player waits in a smart contract, and whoever wins the match takes the whole pot.',
      sections: [
        {
          heading: 'Legs, sets and the finish',
          text: 'The standard is 501 with a double out: a leg is won by reaching exactly zero with the last dart in a double or the bull. Agree how many legs or sets win the match and who starts — one dart each at the bull, nearest throws first. In cricket you close 15 to 20 and the bull instead; write the game and its length in the duel’s note.',
        },
        {
          heading: 'One board or two cameras',
          text: 'At one board, a chalker you both accept can keep the score, or a scoring app on a phone beside it, and a video of the board shows every checkout. Apart, DartCounter lets you challenge a friend online, each of you throwing at your own board with a camera on it, and the host can make the camera required. Either way, save the app’s match summary or a photo of the final score on the board.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. Dispute only for something serious, like a camera turned away from the board in the deciding leg, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'Дартс на деньги — дуэли в 501 и крикет на USDT',
      description:
        'Сыграй в дартс на USDT с живым соперником — у одной мишени или онлайн с камерой: смарт-контракт держит USDT обоих, победитель забирает весь банк.',
      lead:
        'Дуэль в дартс — это матч в 501 или в крикет до оговорённого числа легов, у одной мишени или через камеру. Одна и та же сумма USDT от каждого игрока ждёт в смарт-контракте, и победитель матча забирает весь банк.',
      sections: [
        {
          heading: 'Леги, сеты и закрытие',
          text: 'Классика — 501 с закрытием на удвоение: лег выигрывает тот, кто ровно обнулит счёт, бросив последний дротик в удвоение или в булл. Договорись, до скольких легов или сетов идёт матч и кто начинает: каждый бросает по дротику в булл, чей ближе — тот и первый. В крикете вместо этого закрывают сектора от 15 до 20 и булл; запиши игру и длину матча в заметке к дуэли.',
        },
        {
          heading: 'Одна мишень или две камеры',
          text: 'У одной мишени счёт может вести человек, которому доверяют оба, или приложение на телефоне рядом, а видео мишени покажет каждое закрытие. Если игроки далеко друг от друга, в DartCounter можно вызвать друга онлайн: каждый бросает в свою мишень под камерой, а создатель игры может сделать камеру обязательной. В обоих случаях сохрани итоги матча из приложения или фото доски со счётом.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Оспаривать стоит только серьёзное — например, камеру, отвёрнутую от мишени в решающем леге: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
