// EN / RU translation bundles. The active language is derived from
// `Telegram.WebApp.initDataUnsafe.user.language_code` and falls back to `en`.
//
// Keep new strings flat (no nested objects) and keep both languages in sync —
// each missing key shows up as a runtime warning during dev.

export const translations = {
  en: {
    appName: "DuelMe",
    tagline: "1v1 TON Duels. Zero platform fees.",

    nav: {
      home: "Duels",
      create: "Create",
      myDuels: "My Duels",
      profile: "Profile",
    },

    home: {
      hero: "Stake TON. Win or lose. No middlemen.",
      heroSub: "Honor-based result reporting. On-chain reputation.",
      ctaCreate: "Start a duel",
      ctaConnect: "Connect TON wallet to start",
      sectionActive: "Active duels",
      sectionRecent: "Recent results",
      emptyActive: "No active duels yet. Time to make some noise.",
      empty: "Be the first to throw down a wager.",
    },

    create: {
      title: "Create a duel",
      subtitle: "You'll lock {amount} TON. The opponent must match to start.",
      wagerLabel: "Wager (TON)",
      wagerHelper: "Minimum 1 TON.",
      messageLabel: "Trash talk (optional)",
      messageHelper: "Up to 32 characters / 128 bytes.",
      submit: "Lock {amount} TON",
      generating: "Securing invite…",
      sending: "Sign in your wallet…",
      success: "Duel created! Share the invite link with your rival.",
      successCta: "Share invite",
    },

    duel: {
      stateCreated: "Awaiting opponent",
      stateFunded: "Funded — fight!",
      stateWinnerClaimed: "Winner claimed",
      stateResolved: "Resolved",
      stateRefunded: "Refunded (timeout)",
      stateCancelled: "Cancelled",
      stateDeclined: "Declined",
      stateDisputed: "Disputed",
      stateMutualCancelRequested: "Mutual cancel requested",
      stateMutuallyCancelled: "Mutually cancelled",

      labelCreator: "Creator",
      labelOpponent: "Opponent",
      labelWager: "Wager",
      labelPrize: "Prize",
      labelMessage: "Message",

      actionClaim: "Claim victory",
      actionAdmit: "Admit defeat",
      actionConfirm: "Confirm — they won",
      actionDispute: "Dispute result",
      actionRequestCancel: "Request mutual cancel",
      actionAcceptCancel: "Accept cancel",
      actionDeclineCancel: "Decline cancel",
      actionWithdrawCancel: "Withdraw request",
      actionRefund: "Refund (timed out)",
      actionJoin: "Join — Lock {amount} TON",
      actionDecline: "Decline invite",
      actionCancelDuel: "Cancel duel",
      actionShare: "Share invite",
      actionClaimPayout: "Claim {amount} TON",

      timelineCreated: "Duel created",
      timelineFunded: "Opponent joined",
      timelineClaimed: "Winner claimed — confirm or dispute",
      timelineResolved: "Result confirmed",
      timelineRefunded: "Refunded after timeout",
      timelineDisputed: "Disputed",
      timelineCancelled: "Cancelled",
      timelineDeclined: "Declined",
      timelineMutualRequested: "Mutual cancellation requested",
      timelineMutuallyCancelled: "Mutually cancelled",

      claimTimerLabel: "Time to respond",
      claimTimerExpired: "Response window expired — anyone can refund",
      noWinnerHint: "No winner declared yet.",
      youWin: "You won {amount} TON",
      youLose: "You lost {amount} TON",
      youTie: "Funds returned",
    },

    share: {
      title: "Share this duel",
      subtitle: "The secret invite link lets your rival join — keep it private.",
      caption: "I challenge you to a DuelMe — 1v1 TON duel.",
      copyLink: "Copy invite link",
      copied: "Copied!",
      openTelegram: "Open Telegram share sheet",
      warning: "Anyone with this link can join. Don't post it publicly.",
      creatorLostSecret:
        "Invite secret is no longer in memory. Cancel this duel and create a new one to share it again.",
    },

    actions: {
      successCreate: "Duel created.",
      successJoin: "Joined — fight!",
      successDecline: "Invite declined.",
      successCancel: "Duel cancelled.",
      successClaimVictory: "Victory claimed — opponent has 1 hour to respond.",
      successAdmit: "Defeat admitted.",
      successConfirm: "Result confirmed.",
      successDispute: "Result disputed.",
      successRequestCancel: "Cancellation request sent.",
      successAcceptCancel: "Mutual cancel accepted.",
      successDeclineCancel: "Cancellation declined.",
      successWithdrawCancel: "Cancellation request withdrawn.",
      successRefund: "Refund issued.",
      successClaimPayout: "Payout claimed.",
    },

    errors: {
      generic: "Something went wrong. Try again.",
      walletNotConnected: "Connect a TON wallet first.",
      messageTooLong: "Message too long.",
      wagerTooSmall: "Minimum wager is 1 TON.",
      invalidWager: "Enter a valid TON amount.",
      txRejected: "Transaction rejected.",
      invalidInvite: "This invite link is invalid or expired.",
      rpcRateLimited: "Network is rate-limiting reads. Refreshing soon.",
      readFailed: "Couldn't read the chain. Retrying…",
    },

    common: {
      cancel: "Cancel",
      confirm: "Confirm",
      back: "Back",
      retry: "Retry",
      loading: "Loading…",
      copy: "Copy",
      copied: "Copied!",
      share: "Share",
      close: "Close",
    },
  },

  ru: {
    appName: "DuelMe",
    tagline: "1v1 TON-дуэли. Без комиссии платформы.",

    nav: {
      home: "Дуэли",
      create: "Создать",
      myDuels: "Мои дуэли",
      profile: "Профиль",
    },

    home: {
      hero: "Ставь TON. Побеждай. Без посредников.",
      heroSub: "Самоотчёт результата. Репутация в блокчейне.",
      ctaCreate: "Создать дуэль",
      ctaConnect: "Подключите TON-кошелёк",
      sectionActive: "Активные дуэли",
      sectionRecent: "Свежие результаты",
      emptyActive: "Пока нет активных дуэлей. Самое время поднять шум.",
      empty: "Стань первым, кто бросит вызов.",
    },

    create: {
      title: "Создание дуэли",
      subtitle: "Вы заблокируете {amount} TON. Соперник должен внести столько же.",
      wagerLabel: "Ставка (TON)",
      wagerHelper: "Минимум 1 TON.",
      messageLabel: "Подкол (необязательно)",
      messageHelper: "До 32 символов / 128 байт.",
      submit: "Заблокировать {amount} TON",
      generating: "Готовим приглашение…",
      sending: "Подпишите в кошельке…",
      success: "Дуэль создана! Отправь ссылку сопернику.",
      successCta: "Поделиться приглашением",
    },

    duel: {
      stateCreated: "Ожидаем соперника",
      stateFunded: "Профинансирована — в бой!",
      stateWinnerClaimed: "Победитель заявлен",
      stateResolved: "Завершена",
      stateRefunded: "Возврат по таймауту",
      stateCancelled: "Отменена",
      stateDeclined: "Отклонена",
      stateDisputed: "Оспорена",
      stateMutualCancelRequested: "Запрос на отмену",
      stateMutuallyCancelled: "Отменена обоюдно",

      labelCreator: "Создатель",
      labelOpponent: "Соперник",
      labelWager: "Ставка",
      labelPrize: "Приз",
      labelMessage: "Сообщение",

      actionClaim: "Заявить о победе",
      actionAdmit: "Признать поражение",
      actionConfirm: "Подтвердить — они выиграли",
      actionDispute: "Оспорить",
      actionRequestCancel: "Запросить обоюдную отмену",
      actionAcceptCancel: "Принять отмену",
      actionDeclineCancel: "Отклонить отмену",
      actionWithdrawCancel: "Отозвать запрос",
      actionRefund: "Возврат (таймаут)",
      actionJoin: "Присоединиться — {amount} TON",
      actionDecline: "Отклонить приглашение",
      actionCancelDuel: "Отменить дуэль",
      actionShare: "Поделиться приглашением",
      actionClaimPayout: "Забрать {amount} TON",

      timelineCreated: "Дуэль создана",
      timelineFunded: "Соперник присоединился",
      timelineClaimed: "Победитель заявлен — подтвердите или оспорьте",
      timelineResolved: "Результат подтверждён",
      timelineRefunded: "Возврат после таймаута",
      timelineDisputed: "Оспорено",
      timelineCancelled: "Отменено",
      timelineDeclined: "Отклонено",
      timelineMutualRequested: "Запрошена обоюдная отмена",
      timelineMutuallyCancelled: "Отменено обоюдно",

      claimTimerLabel: "Время на ответ",
      claimTimerExpired: "Окно ответа истекло — возможен возврат",
      noWinnerHint: "Победитель ещё не объявлен.",
      youWin: "Вы выиграли {amount} TON",
      youLose: "Вы проиграли {amount} TON",
      youTie: "Средства возвращены",
    },

    share: {
      title: "Поделиться дуэлью",
      subtitle: "По секретной ссылке соперник присоединится — держите в тайне.",
      caption: "Я бросаю вызов в DuelMe — 1v1 TON-дуэль.",
      copyLink: "Копировать ссылку",
      copied: "Скопировано!",
      openTelegram: "Открыть шер в Telegram",
      warning: "Любой с этой ссылкой сможет присоединиться. Не публикуйте её.",
      creatorLostSecret:
        "Секрет приглашения больше не в памяти. Отмените дуэль и создайте новую, чтобы поделиться повторно.",
    },

    actions: {
      successCreate: "Дуэль создана.",
      successJoin: "Принято — в бой!",
      successDecline: "Приглашение отклонено.",
      successCancel: "Дуэль отменена.",
      successClaimVictory: "Победа заявлена — у соперника час на ответ.",
      successAdmit: "Поражение признано.",
      successConfirm: "Результат подтверждён.",
      successDispute: "Результат оспорен.",
      successRequestCancel: "Запрос на отмену отправлен.",
      successAcceptCancel: "Обоюдная отмена принята.",
      successDeclineCancel: "Отмена отклонена.",
      successWithdrawCancel: "Запрос на отмену отозван.",
      successRefund: "Возврат проведён.",
      successClaimPayout: "Выплата получена.",
    },

    errors: {
      generic: "Что-то пошло не так. Попробуйте снова.",
      walletNotConnected: "Сначала подключите TON-кошелёк.",
      messageTooLong: "Сообщение слишком длинное.",
      wagerTooSmall: "Минимальная ставка — 1 TON.",
      invalidWager: "Введите корректную сумму TON.",
      txRejected: "Транзакция отклонена.",
      invalidInvite: "Эта ссылка-приглашение недействительна или истекла.",
      rpcRateLimited: "Сеть ограничила чтения. Скоро обновим.",
      readFailed: "Не удалось прочитать чейн. Повторим…",
    },

    common: {
      cancel: "Отмена",
      confirm: "Подтвердить",
      back: "Назад",
      retry: "Повторить",
      loading: "Загрузка…",
      copy: "Копировать",
      copied: "Скопировано!",
      share: "Поделиться",
      close: "Закрыть",
    },
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = string;

type Bundle = (typeof translations)["en"];

function get(obj: unknown, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export function getTranslation(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const path = key.split(".");
  const raw = get(translations[locale], path) ?? get(translations.en, path);
  if (!raw) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Missing translation: ${key}`);
    }
    return key;
  }
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_match, name) => String(vars[name] ?? `{${name}}`));
}

export function pickLocale(input: string | null | undefined): Locale {
  if (!input) return "en";
  const lower = input.toLowerCase();
  if (lower.startsWith("ru")) return "ru";
  return "en";
}

export type { Bundle };
