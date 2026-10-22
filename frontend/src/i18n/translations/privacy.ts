import { defineSection } from './defineSection';

/** The analytics banner, the choice on the privacy page, and the privacy page itself. */
export const privacyTranslations = defineSection({
  en: {
    'footer.privacy': 'Privacy',

    'analytics.banner.label': 'Analytics',
    'analytics.banner.title': 'Help us make DuelMe better',
    'analytics.banner.text':
      'We count visits and presses without knowing who you are, on our own server. If you allow it, we also tie them to your account and record sessions, to see where things break.',
    'analytics.banner.more': 'What exactly',
    'analytics.banner.allow': 'Allow',
    'analytics.banner.deny': 'Anonymous only',

    'analytics.choice.granted': 'Allowed: analytics knows your account and records your sessions.',
    'analytics.choice.denied': 'Anonymous only: analytics does not know who you are.',
    'analytics.choice.unset': 'No answer yet: analytics does not know who you are.',
    'analytics.choice.off': 'This copy of the site runs without analytics.',

    'privacy.title': 'Privacy',
    'privacy.updated': 'Last updated: 22 October 2026',
    'privacy.intro':
      'What DuelMe keeps about you, where it is kept, and how to change it. DuelMe has no company behind it yet: its developer runs it and answers for it.',
    'privacy.chain.title': 'On the blockchain',
    'privacy.chain.text':
      'Duels live in a smart contract on Arbitrum. Your wallet address, your duels, stakes and results, and the messages put on duels are public there, and nobody can delete them, us included.',
    'privacy.account.title': 'Signing in',
    'privacy.account.text':
      'Signing in and the in-app wallet are Privy’s: it handles your Google account or email and secures the wallet. DuelMe gets your Privy id and your wallet address. What Privy handles falls under its own policy.',
    'privacy.account.link': 'Privy’s privacy policy',
    'privacy.profile.title': 'Your profile',
    'privacy.profile.text':
      'The nickname, status, about text and games you fill in, and the Steam, Telegram or Instagram accounts you link, are kept on our server and shown on your public profile. You change or remove them on the profile page.',
    'privacy.analytics.title': 'Analytics',
    'privacy.analytics.text':
      'We count how DuelMe is used with Rybbit, which runs on our own server: nothing goes to an analytics company. For everyone: the pages opened and the links followed to other sites, the buttons pressed and the text on them, text copied from a page, which fields are filled in (not what is typed), errors, how signing a duel went (which duel, its stake, the error if any), the page’s speed, the browser and device, and the country and city worked out from the IP address, which is not kept. None of it is tied to your account, though a duel named there can be looked up on the blockchain, players included.',
    'privacy.analytics.consent':
      'If you allow it, it is also tied to your Privy id and wallet address, and your sessions are recorded: what the screen showed and where you pressed, with what you type into fields hidden. Recordings are deleted after 30 days.',
    'privacy.browser.title': 'In your browser',
    'privacy.browser.text':
      'The site keeps in your browser your language (a cookie), your answer about analytics, the invite secrets of the private duels you create, and the create form while the tab is open. Rybbit’s script keeps a random number of its own there, and your Privy id once you allow analytics.',
    'privacy.choice.title': 'Your answer on analytics',
    'privacy.choice.text': 'You can change it at any time; it applies in this browser.',
    'privacy.rights.title': 'Your rights',
    'privacy.rights.text':
      'You can ask what is kept about you, have it corrected or deleted, or object to its use. Write to',
    'privacy.rights.chain': 'What is on the blockchain stays there.',
  },
  ru: {
    'footer.privacy': 'Конфиденциальность',

    'analytics.banner.label': 'Аналитика',
    'analytics.banner.title': 'Помоги сделать DuelMe лучше',
    'analytics.banner.text':
      'Мы считаем визиты и нажатия на своём сервере, не зная, кто ты. С твоего разрешения мы ещё связываем их с аккаунтом и записываем сессии, чтобы видеть, где что ломается.',
    'analytics.banner.more': 'Что именно',
    'analytics.banner.allow': 'Разрешить',
    'analytics.banner.deny': 'Анонимно',

    'analytics.choice.granted': 'Разрешено: аналитика знает твой аккаунт и записывает сессии.',
    'analytics.choice.denied': 'Анонимно: аналитика не знает, кто ты.',
    'analytics.choice.unset': 'Ответа пока нет: аналитика не знает, кто ты.',
    'analytics.choice.off': 'Эта копия сайта работает без аналитики.',

    'privacy.title': 'Конфиденциальность',
    'privacy.updated': 'Обновлено 22 октября 2026',
    'privacy.intro':
      'Что DuelMe хранит о тебе, где и как это изменить. Компании за DuelMe пока нет: сайт ведёт и отвечает за него разработчик.',
    'privacy.chain.title': 'В блокчейне',
    'privacy.chain.text':
      'Дуэли хранятся в смарт-контракте в сети Arbitrum. Адрес кошелька, дуэли, ставки, итоги и сообщения к дуэлям там публичны, и удалить их не может никто, мы тоже.',
    'privacy.account.title': 'Вход',
    'privacy.account.text':
      'Вход и встроенный кошелёк работают через Privy: он обрабатывает твой Google-аккаунт или почту и защищает кошелёк. DuelMe получает твой идентификатор в Privy и адрес кошелька. На то, что обрабатывает Privy, действует его собственная политика.',
    'privacy.account.link': 'Политика конфиденциальности Privy',
    'privacy.profile.title': 'Профиль',
    'privacy.profile.text':
      'Ник, статус, текст о себе и игры, которые ты указываешь, и привязанные аккаунты Steam, Telegram или Instagram хранятся на нашем сервере и видны в публичном профиле. Изменить или убрать их можно на странице профиля.',
    'privacy.analytics.title': 'Аналитика',
    'privacy.analytics.text':
      'Мы считаем, как пользуются DuelMe, через Rybbit на своём сервере: в аналитические компании ничего не уходит. У всех: открытые страницы и ссылки на другие сайты, нажатые кнопки и текст на них, скопированный со страницы текст, какие поля заполнены (но не что в них введено), ошибки, как прошла подпись дуэли (сама дуэль, ставка и ошибка, если была), скорость страниц, браузер и устройство, страна и город по IP-адресу, сам адрес не хранится. Ничего из этого не связано с твоим аккаунтом, но названную там дуэль можно найти в блокчейне, вместе с игроками.',
    'privacy.analytics.consent':
      'С твоего разрешения это ещё связывается с идентификатором в Privy и адресом кошелька, а сессии записываются: что было на экране и куда было нажатие, без того, что вводится в поля. Записи удаляются через 30 дней.',
    'privacy.browser.title': 'В браузере',
    'privacy.browser.text':
      'Сайт хранит в браузере язык (в cookie), ответ про аналитику, секреты приглашений твоих приватных дуэлей и форму создания дуэли, пока открыта вкладка. Скрипт Rybbit хранит там своё случайное число, а после разрешения аналитики ещё и твой идентификатор в Privy.',
    'privacy.choice.title': 'Ответ про аналитику',
    'privacy.choice.text': 'Его можно поменять в любой момент; он действует в этом браузере.',
    'privacy.rights.title': 'Твои права',
    'privacy.rights.text':
      'Можно узнать, что о тебе хранится, исправить или удалить это либо возразить против обработки. Пиши на',
    'privacy.rights.chain': 'То, что в блокчейне, остаётся там.',
  },
});
