import { defineSection } from './defineSection';

/**
 * The landing's questions before a first duel, answered in plain view: what people search for when
 * they wonder whether a duel for money is safe, put in the words a search result can show.
 */
export const faqTranslations = defineSection({
  en: {
    'faq.title': 'Questions before your first duel',
    'faq.subtitle': 'What players ask most about the money, the rules and the result.',
    'faq.what.q': 'What is DuelMe?',
    'faq.what.a':
      'A place to play 1v1 duels for USDT in any game. Both players put the same amount into a smart contract on Arbitrum, play the match wherever they usually play, and the winner takes the whole pot.',
    'faq.games.q': 'Which games can I play a duel in?',
    'faq.games.a':
      'Any game where two players can both see who won: CS2, Dota 2, chess, EA SPORTS FC, fighting games and many more. If yours is not in the catalog, name it when you create a duel, and it joins.',
    'faq.winner.q': 'Who decides how a duel ended?',
    'faq.winner.a':
      'The players. The winner claims the pot and the opponent confirms; from then the pot is the winner’s, to take out of the contract any time. The loser can also concede straight away. Every duel counts in both players’ reputation, which anyone can check before taking a challenge.',
    'faq.dispute.q': 'What if we disagree on the result?',
    'faq.dispute.a':
      'The opponent can dispute a claim. Nobody wins a disputed duel: each player takes back their own stake, and reputation stays the same. If the opponent does not answer in time, each player takes their stake back too, and the silence counts as an abandoned duel.',
    'faq.middleman.q': 'How is this different from a middleman?',
    'faq.middleman.a':
      'A middleman holds the money and decides who gets it, so everything rests on trusting them. On DuelMe a smart contract holds it and pays out only what both players agree on, or gives each stake back. Nobody can quietly run off with the pot.',
    'faq.fee.q': 'Does DuelMe take a cut?',
    'faq.fee.a': 'No. The platform fee is 0%: the winner gets both stakes in full, and DuelMe makes nothing on a duel.',
    'faq.custody.q': 'Can DuelMe take the money or pick the winner?',
    'faq.custody.a':
      'Not quietly. The stakes are held by a public, verified smart contract, and nothing in it lets DuelMe choose a winner. Its one emergency exit can move money, stakes included, but each use is announced on the blockchain first and can be carried out {days} later at the earliest.',
    'faq.wallet.q': 'Do I need a crypto wallet?',
    'faq.wallet.a':
      'No. Sign in with email or Google and a wallet is created for you; you can connect your own instead, now or later. Fund it with USDT on Arbitrum, and you are ready to play.',
  },
  ru: {
    'faq.title': 'Вопросы перед первой дуэлью',
    'faq.subtitle': 'О чём чаще всего спрашивают игроки: деньги, правила и результат.',
    'faq.what.q': 'Что такое DuelMe?',
    'faq.what.a':
      'Место, где играют дуэли 1 на 1 на USDT в любой игре. Оба игрока кладут одну и ту же сумму в смарт-контракт на Arbitrum, играют матч там, где привыкли, и победитель забирает весь банк.',
    'faq.games.q': 'В каких играх можно играть дуэли?',
    'faq.games.a':
      'В любой игре, где оба видят итог: CS2, Dota 2, шахматы, EA SPORTS FC, файтинги и многие другие. Если твоей игры нет в каталоге, назови её при создании дуэли, и она там появится.',
    'faq.winner.q': 'Кто решает, чем кончилась дуэль?',
    'faq.winner.a':
      'Сами игроки. Победитель заявляет победу, соперник подтверждает, и банк сразу записывается на победителя: вывести его из контракта можно когда угодно. Проигравший может и сам признать поражение. Каждая дуэль идёт в репутацию обоих, а её видно любому перед тем, как принять вызов.',
    'faq.dispute.q': 'Что если мы не согласны с результатом?',
    'faq.dispute.a':
      'Соперник может оспорить заявку на победу. В оспоренной дуэли нет победителя: каждый забирает свою сумму, репутация не меняется. Если соперник не ответит вовремя, каждый тоже заберёт свою сумму, а молчание засчитают как брошенную дуэль.',
    'faq.middleman.q': 'Чем это лучше игры через гаранта?',
    'faq.middleman.a':
      'Гарант держит деньги и сам решает, кому их отдать, так что всё держится на доверии к нему. В DuelMe деньги держит смарт-контракт: он выплачивает только то, с чем согласны оба игрока, или возвращает каждому его сумму. Тихо сбежать с банком тут некому.',
    'faq.fee.q': 'Берёт ли DuelMe комиссию?',
    'faq.fee.a': 'Нет. Комиссия платформы — 0%: победитель получает обе суммы целиком, и DuelMe ничего не зарабатывает на дуэли.',
    'faq.custody.q': 'Может ли DuelMe забрать деньги или выбрать победителя?',
    'faq.custody.a':
      'Не тайком. Деньги держит открытый проверенный смарт-контракт, и в нём нет способа выбрать победителя за игроков. Единственный аварийный вывод может сдвинуть деньги, в том числе суммы игроков, но каждый вывод сначала объявляется в блокчейне и выполняется не раньше чем через {days}.',
    'faq.wallet.q': 'Нужен ли криптокошелёк?',
    'faq.wallet.a':
      'Нет. Войди через почту или Google, и кошелёк создастся сам; можно подключить и свой, сразу или позже. Пополни его на USDT в сети Arbitrum, и можно играть.',
  },
});
