import { defineSection } from './defineSection';

/** The pages that explain DuelMe: how a duel goes, how the money is kept, and who runs it. */
export const infoPagesTranslations = defineSection({
  en: {
    'footer.about': 'About',
    'footer.pages': 'About DuelMe',

    'howItWorks.title': 'How a duel on DuelMe works',
    'howItWorks.intro':
      'A duel is a 1v1 match in any game, played for USDT. Both players put in the same amount, a smart contract on Arbitrum holds it while they play, and the winner takes the whole pot. Here is every step, and what happens when something goes wrong.',
    'howItWorks.stepsTitle': 'Step by step',
    'howItWorks.step1.title': 'Sign in and add USDT',
    'howItWorks.step1.text':
      'Sign in with email or Google and a wallet is created for you, or connect your own. Add USDT on Arbitrum. DuelMe pays the network fee for creating, joining and settling duels while its relayer runs; when it does not, a little ETH covers it.',
    'howItWorks.step2.title': 'Create a duel',
    'howItWorks.step2.text':
      'Pick the game and the amount, and write the rules — the map, the mode, the score to reach — in the duel’s note. Leave the duel open to anyone, or make it private and send one person the link. Your USDT goes into the contract.',
    'howItWorks.step3.title': 'Your opponent joins',
    'howItWorks.step3.text':
      'The opponent sees the game, the amount, the note and your reputation, and joins with the same amount; now the contract holds both. Until someone joins, you can cancel and take yours back, and an invited player can decline.',
    'howItWorks.step4.title': 'Play the match',
    'howItWorks.step4.text':
      'The match is played in the game itself, as agreed: a private lobby, a friendly, a direct challenge. DuelMe is not in the match; it holds the money and records how the duel ended.',
    'howItWorks.step5.title': 'Settle the result',
    'howItWorks.step5.text':
      'The winner claims the pot and the opponent confirms: the whole pot is the winner’s at once, kept in the contract until they take it out. The loser can also concede straight away. And if both agree to call the duel off, each takes back their own stake.',
    'howItWorks.trouble.title': 'When players disagree',
    'howItWorks.trouble.text':
      'A claim can be disputed for something serious, like a cheat or a dropped connection. Nobody wins a disputed duel: each player takes back their own stake, and reputation stays the same. If the opponent does not answer a claim in time, each player takes their stake back too, and the silence counts as an abandoned duel.',
    'howItWorks.reputation.title': 'Reputation',
    'howItWorks.reputation.text':
      'Every duel closed cleanly counts as honored and every ignored one as abandoned, both on the blockchain. The score is cautious: a long reliable record counts for more than a few lucky first duels. Check it before you take a challenge.',
    'howItWorks.fee.title': 'What it costs',
    'howItWorks.fee.text': 'Nothing. DuelMe takes 0% of a duel: the winner gets both stakes in full.',

    'safety.title': 'How DuelMe keeps the money safe',
    'safety.intro':
      'DuelMe never holds your money itself. The stakes sit in a smart contract on Arbitrum whose code anyone can read, and what the contract cannot do matters as much as what it does.',
    'safety.contract.title': 'A public, verified contract',
    'safety.contract.text':
      'The contract’s source is published and verified on Arbiscan under the MIT license, and built on OpenZeppelin v5. Every move of every stake is on the blockchain for anyone to check.',
    'safety.contract.link': 'The contract on Arbiscan',
    'safety.limits.title': 'What DuelMe can and cannot do',
    'safety.limits.text':
      'Nothing in the contract lets DuelMe pick a winner. It can move money only through one emergency exit, which reaches players’ stakes too: each use has to be announced on the blockchain first and can be carried out {days} later at the earliest, so everyone would see it coming.',
    'safety.payouts.title': 'Your winnings are yours to take',
    'safety.payouts.text':
      'A pot you won or a stake that came back waits in the contract under your address until you withdraw it, whenever you like. Nobody sends it for you, and nobody can hold it back.',
    'safety.tests.title': 'Tested in the open',
    'safety.tests.text':
      '{tests} run the whole life of a duel and cover {coverage} of the contract’s lines. The contract has not had a paid external audit yet: weigh that before you play for more than you can afford to lose.',
    'safety.wallet.title': 'Your wallet',
    'safety.wallet.text':
      'The wallet made at sign-in is secured by Privy, and its access can move fully under your control later. You can also play from your own wallet from the start.',
    'safety.players.title': 'What is still up to the players',
    'safety.players.text':
      'The contract keeps the money safe, not the match fair. A result is what both players agree on, so check the opponent’s reputation, write the rules in the duel’s note, and keep a screenshot of the result.',

    'about.title': 'About DuelMe',
    'about.intro':
      'DuelMe is a place to play 1v1 duels for USDT in any game, with no platform taking a cut. One developer builds it, in the open.',
    'about.why.title': 'Why it exists',
    'about.why.text':
      'Playing someone for money usually means a site that keeps a cut of every pot and holds your balance on its own books. DuelMe puts the money in a smart contract instead and takes nothing, so skill pays the players, not the platform.',
    'about.who.title': 'Who runs it',
    'about.who.text':
      'DuelMe has no company or investors behind it yet: its developer builds it, runs it and answers for it. It is not run for profit: there is no fee, and no plan to add one.',
    'about.status.title': 'Where it stands',
    'about.status.text':
      'Duels work today on Arbitrum, and the rest is still being built. Decisions and devlogs are posted in the open, and the code is public.',
    'about.contact.title': 'Get in touch',
    'about.contact.email': 'Write to the developer',
    'about.contact.devlog': 'Devlog on Telegram',
    'about.contact.source': 'Source code on GitHub',
  },
  ru: {
    'footer.about': 'О проекте',
    'footer.pages': 'О DuelMe',

    'howItWorks.title': 'Как проходит дуэль в DuelMe',
    'howItWorks.intro':
      'Дуэль — это матч 1 на 1 в любой игре на USDT. Оба игрока вносят одну и ту же сумму, смарт-контракт в сети Arbitrum держит её, пока идёт игра, и победитель забирает весь банк. Здесь каждый шаг и что бывает, если что-то пошло не так.',
    'howItWorks.stepsTitle': 'Шаг за шагом',
    'howItWorks.step1.title': 'Войди и пополни USDT',
    'howItWorks.step1.text':
      'Войди через почту или Google — кошелёк создастся сам — или подключи свой. Пополни его на USDT в сети Arbitrum. Сетевую комиссию за создание, вход и закрытие дуэли платит DuelMe, пока работает его релейер; если он выключен, хватит немного ETH.',
    'howItWorks.step2.title': 'Создай дуэль',
    'howItWorks.step2.text':
      'Выбери игру и сумму и запиши правила — карту, режим, счёт — в заметке к дуэли. Оставь дуэль открытой для всех или сделай приватной и отправь ссылку одному человеку. Твои USDT уходят в контракт.',
    'howItWorks.step3.title': 'Соперник входит',
    'howItWorks.step3.text':
      'Соперник видит игру, сумму, заметку и твою репутацию и входит с той же суммой — теперь контракт держит обе. Пока второго игрока нет, дуэль можно отменить и забрать свою сумму, а приглашённый игрок может отказаться.',
    'howItWorks.step4.title': 'Сыграй матч',
    'howItWorks.step4.text':
      'Матч идёт в самой игре, как договорились: приватное лобби, товарищеский матч, прямой вызов. DuelMe в матче не участвует: он держит деньги и записывает, чем кончилась дуэль.',
    'howItWorks.step5.title': 'Засчитай результат',
    'howItWorks.step5.text':
      'Победитель заявляет победу, соперник подтверждает, и весь банк сразу записывается на победителя: он ждёт в контракте, пока его не выведут. Проигравший может и сам признать поражение. А если оба согласны отменить дуэль, каждый забирает свою сумму.',
    'howItWorks.trouble.title': 'Если игроки не согласны',
    'howItWorks.trouble.text':
      'Заявку на победу можно оспорить из-за серьёзного — чита или обрыва связи. В оспоренной дуэли нет победителя: каждый забирает свою сумму, репутация не меняется. Если соперник не ответит на заявку вовремя, каждый тоже заберёт свою сумму, а молчание засчитают как брошенную дуэль.',
    'howItWorks.reputation.title': 'Репутация',
    'howItWorks.reputation.text':
      'Каждая честно закрытая дуэль засчитывается как выполненная, каждая проигнорированная — как брошенная, и всё это хранится в блокчейне. Счёт осторожный: долгая надёжная история весит больше пары удачных первых дуэлей. Проверь её, прежде чем принять вызов.',
    'howItWorks.fee.title': 'Сколько это стоит',
    'howItWorks.fee.text': 'Ничего. DuelMe берёт 0% с дуэли: победитель получает обе суммы целиком.',

    'safety.title': 'Как DuelMe защищает деньги',
    'safety.intro':
      'DuelMe никогда не держит твои деньги сам. Суммы игроков лежат в смарт-контракте в сети Arbitrum, код которого может прочитать любой, и то, чего контракт сделать не может, важно не меньше того, что он делает.',
    'safety.contract.title': 'Открытый проверенный контракт',
    'safety.contract.text':
      'Исходный код контракта опубликован и проверен на Arbiscan под лицензией MIT и построен на OpenZeppelin v5. Каждое движение каждой суммы видно в блокчейне, проверить может любой.',
    'safety.contract.link': 'Контракт на Arbiscan',
    'safety.limits.title': 'Что DuelMe может, а что нет',
    'safety.limits.text':
      'В контракте нет способа выбрать победителя. Двигать деньги DuelMe может только через единственный аварийный вывод, который достаёт и до сумм игроков: каждый вывод нужно сначала объявить в блокчейне, и выполнить его можно не раньше чем через {days}, так что это увидят все.',
    'safety.payouts.title': 'Выигрыш забираешь ты',
    'safety.payouts.text':
      'Выигранный банк или вернувшаяся сумма ждёт в контракте на твоём адресе, пока ты не выведешь её, когда захочешь. Никто не отправляет её за тебя и никто не может её задержать.',
    'safety.tests.title': 'Проверено открыто',
    'safety.tests.text':
      '{tests} прогоняют всю жизнь дуэли и покрывают {coverage} строк контракта. Платного внешнего аудита у контракта пока не было: учитывай это и не играй на сумму, которую жалко потерять.',
    'safety.wallet.title': 'Твой кошелёк',
    'safety.wallet.text':
      'Кошелёк, созданный при входе, защищает Privy, а доступ к нему позже можно полностью забрать под свой контроль. Можно и с самого начала играть со своего кошелька.',
    'safety.players.title': 'Что остаётся за игроками',
    'safety.players.text':
      'Контракт защищает деньги, а не честность матча. Результат — это то, с чем согласны оба игрока, поэтому смотри репутацию соперника, записывай правила в заметке к дуэли и сохраняй скриншот результата.',

    'about.title': 'О DuelMe',
    'about.intro':
      'DuelMe — место, где играют дуэли 1 на 1 на USDT в любой игре и платформа не берёт свою долю. Его открыто делает один разработчик.',
    'about.why.title': 'Зачем он нужен',
    'about.why.text':
      'Сыграть с кем-то на деньги обычно значит пойти на сайт, который оставляет себе часть каждого банка и держит твой баланс у себя. DuelMe вместо этого кладёт деньги в смарт-контракт и ничего не берёт, чтобы скилл платил игрокам, а не платформе.',
    'about.who.title': 'Кто за ним стоит',
    'about.who.text':
      'Компании и инвесторов за DuelMe пока нет: разработчик сам его делает, ведёт и за него отвечает. Он работает не ради прибыли: комиссии нет и не планируется.',
    'about.status.title': 'Что уже есть',
    'about.status.text':
      'Дуэли уже работают в сети Arbitrum, остальное ещё в разработке. Решения и девлоги публикуются открыто, код тоже открыт.',
    'about.contact.title': 'Связаться',
    'about.contact.email': 'Написать разработчику',
    'about.contact.devlog': 'Девлог в Telegram',
    'about.contact.source': 'Исходный код на GitHub',
  },
});
