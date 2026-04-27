import { defineSection } from './defineSection';

export const duelTranslations = defineSection({
  en: {
    'duel.waiting': 'Waiting for opponent',
    'duel.inProgress': 'Duel in progress',
    'duel.waitingConfirm': 'Waiting for confirmation',
    'duel.responseTimedOut': 'Response timed out',
    'duel.resolved': 'Duel resolved',
    'duel.refunded': 'Duel refunded',
    'duel.cancelled': 'Duel cancelled',
    'duel.declined': 'Invite declined',
    'duel.disputed': 'Result disputed',
    'duel.cancellationPending': 'Cancellation requested',
    'duel.mutuallyCancelled': 'Cancelled by agreement',
    'duel.wager': 'Wager',
    'duel.pot': 'Total Pot',
    'duel.creator': 'Creator',
    'duel.opponent': 'Opponent',
    'duel.winner': 'Winner',
    'duel.timeLeft': 'Time left to confirm',
    'duel.resultSubmitted':
      'submitted the result. Confirm it if you agree, or dispute it to refund both players immediately.',
    'duel.timeoutReached': 'Timeout reached. Both players can refund now.',
    'duel.timeoutHint':
      'If no one responds within 1 hour, both players can refund. A timeout counts against the non-responder.',
    'duel.timeoutReputationHint':
      'The non-responding player receives +1 abandoned. The reporting player receives +1 honored.',
    'duel.timeoutReputationClaimer':
      'You reported the result on time. You will receive +1 honored once the refund is processed.',
    'duel.timeoutReputationNonResponder':
      'You did not respond in time. You will receive +1 abandoned when the refund is processed.',
    'duel.public': 'Public',
    'duel.private': 'Private',
    'duel.sharePublic': 'Share this link — anyone can join',
    'duel.sharePrivate': 'Share this private link — only someone with this link can join',
    'duel.createdBy': 'by',
    'duel.privateInviteRequired':
      'This duel uses a private invite link. Only someone with the full link can accept or decline it.',
    'duel.privateInviteMissing':
      'This invite link is missing or invalid. Ask the creator to resend the full private link.',
    'duel.privateInviteUnavailable':
      'This browser no longer has the private invite link for sharing. Open the original invite link or create a new duel.',
    'duel.you': 'You',
    'duel.awaitingOpponentResponse': 'Waiting for opponent response',
    'duel.reviewReportedResult': 'Review reported result',
    'duel.resultUnderReview': 'Result under review',
    'duel.reportedBy': 'Submitted by',
    'duel.reportedWinner': 'Reported winner',
    'duel.youReportedYouWon': 'You reported that you won this duel. The other player must review it now.',
    'duel.youReportedOpponentWon': 'You reported that your opponent won this duel. The other player must review it now.',
    'duel.opponentReportedYouWon': 'Your opponent submitted a result and marked you as the winner.',
    'duel.opponentReportedThemWon': 'Your opponent submitted a result and marked themselves as the winner.',
    'duel.spectatorResultSummary':
      '{claimedBy} submitted a result. {claimedWinner} is currently listed as the reported winner.',
    'duel.spectatorResultHint':
      'Only the two players can confirm, dispute, or unlock the timeout refund for this duel.',
    'duel.reviewGuidance':
      'Confirm only if the reported winner is correct. Use dispute only for exceptional cases like cheating, connection issues, illness, or another serious problem.',
    'duel.disputeGuidance':
      'A dispute does not change reputation. Each player will be able to claim their own funds later from My Duels.',
    'duel.waitingOpponentReviewHint':
      'The other player has up to 1 hour to respond. If no one responds in time, both players will be able to claim refunds. The timeout hurts the non-responder\'s reputation.',
    'duel.requestCancellationTitle': 'Need to stop this duel?',
    'duel.requestCancellationHint':
      'Request cancellation only if both players agree to end the duel without reporting a result. If your opponent accepts, each player will be able to claim back their own wager and reputation will stay unchanged.',
    'duel.awaitingCancellationDecision': 'Waiting for cancellation decision',
    'duel.reviewCancellationRequest': 'Review cancellation request',
    'duel.mutualCancelRequestedByYou':
      'You asked to cancel this duel by agreement. The duel is paused until the other player accepts or declines your request.',
    'duel.mutualCancelRequestedByOpponent':
      'Your opponent asked to cancel this duel by agreement. If you accept, each player will be able to claim back their own wager later.',
    'duel.cancellationPendingSpectator':
      'The players are deciding whether to cancel this duel by agreement. While the request is open, the duel is paused.',
    'duel.mutualCancelRequestedByLabel': 'Requested by',
    'duel.mutualCancelRequestedAtLabel': 'Requested at',
    'duel.mutualCancelRequesterHint':
      'If the other player declines, the duel resumes. You can also withdraw this request yourself.',
    'duel.mutualCancelResponderHint':
      'Accept only if you both want to stop the duel. Declining keeps the duel active.',
    'duel.cancellationPendingSpectatorHint':
      'If the players agree, each of them will later claim back their own wager. Reputation will not change.',
    'duel.mutuallyCancelledSummary':
      'This duel was cancelled by mutual agreement. Each player can now claim back their own wager. Reputation was not changed.',
    'duel.timelineTitle': 'Timeline',
    'duel.timelineCreated': 'Created',
    'duel.timelineAccepted': 'Accepted',
    'duel.timelineCancellationRequested': 'Cancellation requested',
    'duel.timelineResultSubmitted': 'Result submitted',
    'duel.timelineTimedOut': 'Response timed out',
    'duel.timelineResolved': 'Resolved',
    'duel.timelineRefunded': 'Refund unlocked',
    'duel.timelineCancelled': 'Cancelled',
    'duel.timelineDeclined': 'Invite declined',
    'duel.timelineDisputed': 'Disputed',
    'duel.timelineMutuallyCancelled': 'Cancelled by agreement',
    'duel.resolvedClaimHint': 'The winner can now claim the full prize from My Duels.',
    'duel.refundedClaimHint':
      'Both players can now claim their refunds from My Duels. The timeout affects only the player who did not respond.',
    'duel.declinedClaimHint': 'The invite was declined. The creator can claim the refunded wager from My Duels.',
    'duel.disputedClaimHint':
      'After a dispute, each player can claim their own refund from My Duels. Reputation is unchanged because the service cannot know the exact reason for the cancellation.',
    'duel.cancelledClaimHint': 'This duel was cancelled before it started. The creator can claim the refunded wager from My Duels.',
    'duel.mutuallyCancelledClaimHint':
      'This duel was cancelled by mutual agreement. Each player can claim back their own wager from My Duels. Reputation did not change.',
    'duel.notFound': 'Duel not found or contract not deployed yet.',
    'duel.title': 'Duel #{id}',
    'duel.messageTitle': 'Challenge note',
    'duel.spectatorFundedTitle': 'Duel is live',
    'duel.spectatorFundedHint':
      'Only the two players can report the result or request a cancellation. Everyone else can follow the status and timeline here.',
    'duel.cannotJoinOwnDuel': 'You cannot join your own duel.',
    'action.iWon': 'I Won',
    'action.iLost': 'I Lost',
    'action.confirm': 'Confirm Result',
    'action.deny': 'Deny',
    'action.dispute': 'Dispute Result',
    'action.claimPrize': 'Claim Prize',
    'action.cancel': 'Cancel Duel',
    'action.decline': 'Decline Duel',
    'action.refund': 'Refund',
    'action.share': 'Share Link',
    'action.copied': 'Link copied!',
    'action.join': 'Join Duel',
    'action.joinDesc': 'Match the wager to accept the challenge. Winner takes the full pot.',
    'action.loginToJoin': 'Connect wallet to respond to this invite',
    'action.viewDuel': 'View Duel',
    'action.requestCancellation': 'Request Cancellation',
    'action.acceptCancellation': 'Agree to Cancel',
    'action.declineCancellation': 'Decline Request',
    'action.withdrawCancellationRequest': 'Withdraw Request',
    'action.claimFunds': 'Claim Funds',
    'action.claimAll': 'Claim All',
    'action.previous': 'Previous',
    'action.next': 'Next',
  },
  ru: {
    'duel.waiting': 'Ожидание соперника',
    'duel.inProgress': 'Дуэль идёт',
    'duel.waitingConfirm': 'Ожидание подтверждения',
    'duel.responseTimedOut': 'Время ответа истекло',
    'duel.resolved': 'Дуэль завершена',
    'duel.refunded': 'Средства возвращены',
    'duel.cancelled': 'Дуэль отменена',
    'duel.declined': 'Приглашение отклонено',
    'duel.disputed': 'Результат оспорен',
    'duel.cancellationPending': 'Запрос на отмену',
    'duel.mutuallyCancelled': 'Отменена по согласию',
    'duel.wager': 'Ставка',
    'duel.pot': 'Общий банк',
    'duel.creator': 'Создатель',
    'duel.opponent': 'Соперник',
    'duel.winner': 'Победитель',
    'duel.timeLeft': 'Осталось времени на подтверждение',
    'duel.resultSubmitted': 'отправил результат. Подтверди, если согласен, или оспорь, чтобы сразу вернуть средства обоим.',
    'duel.timeoutReached': 'Время вышло. Теперь оба игрока могут оформить возврат.',
    'duel.timeoutHint':
      'Если никто не ответит в течение 1 часа, оба игрока смогут вернуть средства. Таймаут портит репутацию не ответившему игроку.',
    'duel.timeoutReputationHint': 'Не ответивший игрок получит +1 к брошенным. Заявитель получит +1 к выполненным.',
    'duel.timeoutReputationClaimer':
      'Вы отправили результат вовремя. Вы получите +1 к выполненным после обработки возврата.',
    'duel.timeoutReputationNonResponder':
      'Вы не ответили вовремя. Вы получите +1 к брошенным при обработке возврата.',
    'duel.public': 'Публичная',
    'duel.private': 'Приватная',
    'duel.sharePublic': 'Поделитесь ссылкой — присоединиться может любой',
    'duel.sharePrivate': 'Поделитесь приватной ссылкой — присоединиться сможет только тот, у кого она есть',
    'duel.createdBy': 'от',
    'duel.privateInviteRequired':
      'Эта дуэль работает по приватной ссылке. Принять или отклонить её можно только по полной ссылке от создателя.',
    'duel.privateInviteMissing':
      'В ссылке нет приватного токена или он неверный. Попросите создателя отправить полную приватную ссылку.',
    'duel.privateInviteUnavailable':
      'В этом браузере больше нет приватной ссылки для шаринга. Открой исходную ссылку-приглашение или создай новую дуэль.',
    'duel.you': 'Вы',
    'duel.awaitingOpponentResponse': 'Ждём ответ соперника',
    'duel.reviewReportedResult': 'Проверьте заявленный результат',
    'duel.resultUnderReview': 'Результат на проверке',
    'duel.reportedBy': 'Кто отправил результат',
    'duel.reportedWinner': 'Кого отметили победителем',
    'duel.youReportedYouWon': 'Вы сообщили, что победили в этой дуэли. Теперь соперник должен проверить результат.',
    'duel.youReportedOpponentWon': 'Вы сообщили, что победил соперник. Теперь он должен проверить результат.',
    'duel.opponentReportedYouWon': 'Соперник отправил результат и отметил победителем вас.',
    'duel.opponentReportedThemWon': 'Соперник отправил результат и отметил победителем себя.',
    'duel.spectatorResultSummary': '{claimedBy} отправил результат. Сейчас победителем указан {claimedWinner}.',
    'duel.spectatorResultHint': 'Подтвердить, оспорить или разблокировать возврат по таймауту могут только сами участники дуэли.',
    'duel.reviewGuidance':
      'Подтверждайте результат только если победитель указан верно. Оспаривание стоит использовать только в исключительных случаях: читерство, проблемы с сетью, болезнь или другая серьёзная причина.',
    'duel.disputeGuidance':
      'Оспаривание не влияет на репутацию. После него каждый игрок сможет отдельно забрать свои средства в разделе «Мои дуэли».',
    'duel.waitingOpponentReviewHint':
      'У второго игрока есть до 1 часа на ответ. Если никто не ответит вовремя, оба игрока смогут забрать возврат. Репутация пострадает только у того, кто не ответил.',
    'duel.requestCancellationTitle': 'Нужно остановить дуэль?',
    'duel.requestCancellationHint':
      'Запрашивайте отмену только если вы оба согласны закончить дуэль без отправки результата. Если соперник примет запрос, каждый сможет отдельно забрать назад свою ставку, а репутация не изменится.',
    'duel.awaitingCancellationDecision': 'Ждём решения по отмене',
    'duel.reviewCancellationRequest': 'Проверьте запрос на отмену',
    'duel.mutualCancelRequestedByYou':
      'Вы запросили отмену этой дуэли по обоюдному согласию. Пока соперник не ответит, дуэль стоит на паузе.',
    'duel.mutualCancelRequestedByOpponent':
      'Соперник запросил отмену этой дуэли по обоюдному согласию. Если вы согласитесь, каждый позже сможет отдельно забрать назад свою ставку.',
    'duel.cancellationPendingSpectator':
      'Игроки решают, отменить ли эту дуэль по обоюдному согласию. Пока запрос открыт, дуэль стоит на паузе.',
    'duel.mutualCancelRequestedByLabel': 'Кто запросил',
    'duel.mutualCancelRequestedAtLabel': 'Когда запросили',
    'duel.mutualCancelRequesterHint':
      'Если соперник отклонит запрос, дуэль снова продолжится. Вы также можете сами отозвать запрос.',
    'duel.mutualCancelResponderHint':
      'Соглашайтесь только если вы оба действительно хотите остановить дуэль. Отклонение оставит дуэль активной.',
    'duel.cancellationPendingSpectatorHint':
      'Если игроки согласятся, каждый позже отдельно заберёт назад свою ставку. Репутация не изменится.',
    'duel.mutuallyCancelledSummary':
      'Эта дуэль была отменена по обоюдному согласию. Теперь каждый игрок может отдельно забрать назад свою ставку. Репутация не изменилась.',
    'duel.timelineTitle': 'Хронология',
    'duel.timelineCreated': 'Создана',
    'duel.timelineAccepted': 'Принята',
    'duel.timelineCancellationRequested': 'Запрос на отмену',
    'duel.timelineResultSubmitted': 'Результат отправлен',
    'duel.timelineTimedOut': 'Время ответа истекло',
    'duel.timelineResolved': 'Подтверждена',
    'duel.timelineRefunded': 'Возврат доступен',
    'duel.timelineCancelled': 'Отменена',
    'duel.timelineDeclined': 'Приглашение отклонено',
    'duel.timelineDisputed': 'Оспорена',
    'duel.timelineMutuallyCancelled': 'Отменена по согласию',
    'duel.resolvedClaimHint': 'Теперь победитель может забрать весь выигрыш в разделе «Мои дуэли».',
    'duel.refundedClaimHint':
      'Теперь оба игрока могут забрать свои возвраты в разделе «Мои дуэли». Таймаут влияет только на игрока, который не ответил.',
    'duel.declinedClaimHint':
      'Приглашение отклонено. Создатель может забрать возврат ставки в разделе «Мои дуэли».',
    'duel.disputedClaimHint':
      'После оспаривания каждый игрок может отдельно забрать свой возврат в разделе «Мои дуэли». Репутация не меняется, потому что сервис не может знать точную причину отмены.',
    'duel.cancelledClaimHint':
      'Эта дуэль была отменена до начала. Создатель может забрать возврат ставки в разделе «Мои дуэли».',
    'duel.mutuallyCancelledClaimHint':
      'Эта дуэль была отменена по обоюдному согласию. Каждый игрок может отдельно забрать назад свою ставку в разделе «Мои дуэли». Репутация не изменилась.',
    'duel.notFound': 'Дуэль не найдена или контракт ещё не задеплоен.',
    'duel.title': 'Дуэль #{id}',
    'duel.messageTitle': 'Сообщение к дуэли',
    'duel.spectatorFundedTitle': 'Дуэль в процессе',
    'duel.spectatorFundedHint':
      'Только сами участники могут отправить результат или запросить отмену. Остальные могут следить за статусом и хронологией здесь.',
    'duel.cannotJoinOwnDuel': 'Нельзя присоединиться к собственной дуэли.',
    'action.iWon': 'Я победил',
    'action.iLost': 'Я проиграл',
    'action.confirm': 'Подтвердить результат',
    'action.deny': 'Оспорить',
    'action.dispute': 'Оспорить результат',
    'action.claimPrize': 'Забрать выигрыш',
    'action.cancel': 'Отменить дуэль',
    'action.decline': 'Отказаться от дуэли',
    'action.refund': 'Возврат',
    'action.share': 'Поделиться ссылкой',
    'action.copied': 'Ссылка скопирована!',
    'action.join': 'Присоединиться',
    'action.joinDesc': 'Уравняйте ставку, чтобы принять вызов. Победитель забирает весь банк.',
    'action.loginToJoin': 'Подключите кошелёк, чтобы ответить на это приглашение',
    'action.viewDuel': 'Открыть дуэль',
    'action.requestCancellation': 'Запросить отмену',
    'action.acceptCancellation': 'Согласиться на отмену',
    'action.declineCancellation': 'Отклонить запрос',
    'action.withdrawCancellationRequest': 'Отозвать запрос',
    'action.claimFunds': 'Забрать средства',
    'action.claimAll': 'Забрать всё',
    'action.previous': 'Назад',
    'action.next': 'Далее',
  },
});
