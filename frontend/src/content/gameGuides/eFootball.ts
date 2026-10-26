import type { GameGuide } from '@/lib/gameGuides';

export const eFootballGuide: GameGuide = {
  slug: 'efootball',
  name: 'eFootball',
  category: 'SPORT',
  copy: {
    en: {
      title: 'eFootball for money — 1v1 duels for USDT',
      description:
        'Play eFootball 1v1 for USDT against a real opponent in a Friend Match: a smart contract holds both stakes, and the winner takes the whole pot. 0% fee.',
      lead:
        'An eFootball duel is a single Friend Match against one opponent you picked, on settings fixed before kick-off. Each of you puts the same USDT into a smart contract, and whoever wins the match takes the whole pot.',
      sections: [
        {
          heading: 'Dream Team or real clubs',
          text: 'First decide what you bring onto the pitch: your own Dream Teams, where the squad with more strong signings starts ahead, or authentic club and national teams of a similar strength. Then settle the match time and what decides a draw — extra time and penalties, or a replay — and write it all in the duel’s note.',
        },
        {
          heading: 'Opening the Friend Match',
          text: 'One of you creates a match room in Friend Match and invites the other. On console and PC the match can cross platforms once cross-platform play is on in the game’s settings; if one of you plays on mobile, check that you can find each other before anyone joins the duel. A screenshot of the score after the final whistle is the proof.',
        },
        {
          heading: 'Settling the result',
          text: 'The winner claims the pot on DuelMe and the opponent confirms it, or the loser admits defeat straight away; the pot is then the winner’s, to take out of the contract any time. If a lost connection cuts the match short, play it again from kick-off or dispute the result, and then each player takes back their own stake.',
        },
      ],
    },
    ru: {
      title: 'eFootball на деньги — дуэли 1 на 1 на USDT',
      description:
        'Сыграй в eFootball 1 на 1 на USDT с живым соперником в Friend Match: смарт-контракт держит USDT обоих, победитель забирает весь банк. Комиссия 0%.',
      lead:
        'Дуэль в eFootball — это один Friend Match против выбранного соперника по настройкам, оговорённым до стартового свистка. Каждый кладёт одну и ту же сумму USDT в смарт-контракт, и победитель матча забирает весь банк.',
      sections: [
        {
          heading: 'Dream Team или реальные клубы',
          text: 'Сначала реши, кем играть: своими Dream Team, где преимущество у того, у кого больше сильных футболистов, или реальными клубами и сборными близкой силы. Потом договорись о длительности матча и о том, что решает ничью — дополнительное время и пенальти или переигровка, — и запиши всё в заметке к дуэли.',
        },
        {
          heading: 'Как открыть Friend Match',
          text: 'Один игрок создаёт комнату в Friend Match и приглашает соперника. На консолях и ПК матч может идти между платформами, если в настройках игры включён кроссплей; если кто-то из двоих играет на телефоне, до входа в дуэль проверь, что можешь найти соперника в игре. Доказательством станет скриншот счёта после финального свистка.',
        },
        {
          heading: 'Как засчитать результат',
          text: 'Победитель забирает банк в DuelMe, соперник подтверждает или сразу признаёт поражение, и банк записывается на победителя: вывести его из контракта можно когда угодно. Если матч прервался из-за связи, сыграй его заново с первой минуты или оспорь результат: тогда каждый забирает свою сумму обратно.',
        },
      ],
    },
  },
};
