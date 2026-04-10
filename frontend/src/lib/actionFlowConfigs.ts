import { Trophy, Flag, CheckCircle, XCircle, Handshake, Wallet, RotateCcw } from 'lucide-react';
import { emitBalanceRefresh } from '@/lib/balanceRefresh';
import type { ActionFlowConfig } from '@/lib/actionFlow';

export function claimVictoryConfig(execute: () => void): ActionFlowConfig {
  return {
    type: 'claimVictory',
    execute,
    icon: Trophy,
    labels: {
      dialogTitle: 'actionFlow.claimVictory.title',
      dialogDescription: 'actionFlow.claimVictory.description',
      reviewTitle: 'actionFlow.claimVictory.review.title',
      reviewDescription: 'actionFlow.claimVictory.review.description',
      reviewHint: 'actionFlow.claimVictory.review.hint',
      reviewHintSwitch: 'actionFlow.claimVictory.review.hintSwitch',
      executeTitle: 'actionFlow.claimVictory.execute.title',
      executeDescription: 'actionFlow.claimVictory.execute.description',
      executeHint: 'actionFlow.claimVictory.execute.hint',
      executeButton: 'actionFlow.claimVictory.execute.button',
      successTitle: 'actionFlow.claimVictory.success.title',
      successDescription: 'actionFlow.claimVictory.success.description',
      successHint: 'actionFlow.claimVictory.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.duel'), value: `#${ctx.duelId}` },
      { label: ctx.t('actionFlow.summary.wager'), value: ctx.formattedWager, emphasize: true },
      { label: ctx.t('actionFlow.summary.pot'), value: ctx.formattedPot, emphasize: true },
      { label: ctx.t('actionFlow.summary.opponent'), value: ctx.opponentDisplay },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}

export function admitDefeatConfig(execute: () => void): ActionFlowConfig {
  return {
    type: 'admitDefeat',
    execute,
    icon: Flag,
    labels: {
      dialogTitle: 'actionFlow.admitDefeat.title',
      dialogDescription: 'actionFlow.admitDefeat.description',
      reviewTitle: 'actionFlow.admitDefeat.review.title',
      reviewDescription: 'actionFlow.admitDefeat.review.description',
      reviewHint: 'actionFlow.admitDefeat.review.hint',
      reviewHintSwitch: 'actionFlow.admitDefeat.review.hintSwitch',
      executeTitle: 'actionFlow.admitDefeat.execute.title',
      executeDescription: 'actionFlow.admitDefeat.execute.description',
      executeHint: 'actionFlow.admitDefeat.execute.hint',
      executeButton: 'actionFlow.admitDefeat.execute.button',
      successTitle: 'actionFlow.admitDefeat.success.title',
      successDescription: 'actionFlow.admitDefeat.success.description',
      successHint: 'actionFlow.admitDefeat.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.duel'), value: `#${ctx.duelId}` },
      { label: ctx.t('actionFlow.summary.wager'), value: ctx.formattedWager, emphasize: true },
      { label: ctx.t('actionFlow.summary.opponent'), value: ctx.opponentDisplay },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}

export function confirmResultConfig(execute: () => void): ActionFlowConfig {
  return {
    type: 'confirmResult',
    execute,
    icon: CheckCircle,
    labels: {
      dialogTitle: 'actionFlow.confirmResult.title',
      dialogDescription: 'actionFlow.confirmResult.description',
      reviewTitle: 'actionFlow.confirmResult.review.title',
      reviewDescription: 'actionFlow.confirmResult.review.description',
      reviewHint: 'actionFlow.confirmResult.review.hint',
      reviewHintSwitch: 'actionFlow.confirmResult.review.hintSwitch',
      executeTitle: 'actionFlow.confirmResult.execute.title',
      executeDescription: 'actionFlow.confirmResult.execute.description',
      executeHint: 'actionFlow.confirmResult.execute.hint',
      executeButton: 'actionFlow.confirmResult.execute.button',
      successTitle: 'actionFlow.confirmResult.success.title',
      successDescription: 'actionFlow.confirmResult.success.description',
      successHint: 'actionFlow.confirmResult.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.duel'), value: `#${ctx.duelId}` },
      { label: ctx.t('actionFlow.summary.claimedWinner'), value: ctx.claimedWinnerDisplay },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}

export function disputeResultConfig(execute: () => void): ActionFlowConfig {
  return {
    type: 'disputeResult',
    execute,
    icon: XCircle,
    labels: {
      dialogTitle: 'actionFlow.disputeResult.title',
      dialogDescription: 'actionFlow.disputeResult.description',
      reviewTitle: 'actionFlow.disputeResult.review.title',
      reviewDescription: 'actionFlow.disputeResult.review.description',
      reviewHint: 'actionFlow.disputeResult.review.hint',
      reviewHintSwitch: 'actionFlow.disputeResult.review.hintSwitch',
      executeTitle: 'actionFlow.disputeResult.execute.title',
      executeDescription: 'actionFlow.disputeResult.execute.description',
      executeHint: 'actionFlow.disputeResult.execute.hint',
      executeButton: 'actionFlow.disputeResult.execute.button',
      successTitle: 'actionFlow.disputeResult.success.title',
      successDescription: 'actionFlow.disputeResult.success.description',
      successHint: 'actionFlow.disputeResult.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.duel'), value: `#${ctx.duelId}` },
      { label: ctx.t('actionFlow.summary.claimedWinner'), value: ctx.claimedWinnerDisplay },
      { label: ctx.t('actionFlow.summary.pot'), value: ctx.formattedPot, emphasize: true },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}

export function requestMutualCancellationConfig(execute: () => void): ActionFlowConfig {
  return {
    type: 'requestMutualCancellation',
    execute,
    icon: Handshake,
    labels: {
      dialogTitle: 'actionFlow.requestCancel.title',
      dialogDescription: 'actionFlow.requestCancel.description',
      reviewTitle: 'actionFlow.requestCancel.review.title',
      reviewDescription: 'actionFlow.requestCancel.review.description',
      reviewHint: 'actionFlow.requestCancel.review.hint',
      reviewHintSwitch: 'actionFlow.requestCancel.review.hintSwitch',
      executeTitle: 'actionFlow.requestCancel.execute.title',
      executeDescription: 'actionFlow.requestCancel.execute.description',
      executeHint: 'actionFlow.requestCancel.execute.hint',
      executeButton: 'actionFlow.requestCancel.execute.button',
      successTitle: 'actionFlow.requestCancel.success.title',
      successDescription: 'actionFlow.requestCancel.success.description',
      successHint: 'actionFlow.requestCancel.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.duel'), value: `#${ctx.duelId}` },
      { label: ctx.t('actionFlow.summary.wager'), value: ctx.formattedWager, emphasize: true },
      { label: ctx.t('actionFlow.summary.pot'), value: ctx.formattedPot, emphasize: true },
      { label: ctx.t('actionFlow.summary.opponent'), value: ctx.opponentDisplay },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}

export function claimPayoutConfig(execute: () => void): ActionFlowConfig {
  return {
    type: 'claimPayout',
    execute,
    onSuccess: emitBalanceRefresh,
    icon: Wallet,
    labels: {
      dialogTitle: 'actionFlow.claimPayout.title',
      dialogDescription: 'actionFlow.claimPayout.description',
      reviewTitle: 'actionFlow.claimPayout.review.title',
      reviewDescription: 'actionFlow.claimPayout.review.description',
      reviewHint: 'actionFlow.claimPayout.review.hint',
      reviewHintSwitch: 'actionFlow.claimPayout.review.hintSwitch',
      executeTitle: 'actionFlow.claimPayout.execute.title',
      executeDescription: 'actionFlow.claimPayout.execute.description',
      executeHint: 'actionFlow.claimPayout.execute.hint',
      executeButton: 'actionFlow.claimPayout.execute.button',
      successTitle: 'actionFlow.claimPayout.success.title',
      successDescription: 'actionFlow.claimPayout.success.description',
      successHint: 'actionFlow.claimPayout.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.duel'), value: `#${ctx.duelId}` },
      { label: ctx.t('actionFlow.summary.claimable'), value: ctx.claimableDisplay, emphasize: true },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}

export function refundConfig(execute: () => void): ActionFlowConfig {
  return {
    type: 'refund',
    execute,
    icon: RotateCcw,
    labels: {
      dialogTitle: 'actionFlow.refund.title',
      dialogDescription: 'actionFlow.refund.description',
      reviewTitle: 'actionFlow.refund.review.title',
      reviewDescription: 'actionFlow.refund.review.description',
      reviewHint: 'actionFlow.refund.review.hint',
      reviewHintSwitch: 'actionFlow.refund.review.hintSwitch',
      executeTitle: 'actionFlow.refund.execute.title',
      executeDescription: 'actionFlow.refund.execute.description',
      executeHint: 'actionFlow.refund.execute.hint',
      executeButton: 'actionFlow.refund.execute.button',
      successTitle: 'actionFlow.refund.success.title',
      successDescription: 'actionFlow.refund.success.description',
      successHint: 'actionFlow.refund.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.duel'), value: `#${ctx.duelId}` },
      { label: ctx.t('actionFlow.summary.pot'), value: ctx.formattedPot, emphasize: true },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}

export function claimAllConfig(execute: () => void, totalDisplay: string, duelCount: number): ActionFlowConfig {
  return {
    type: 'claimAll',
    execute,
    onSuccess: emitBalanceRefresh,
    icon: Wallet,
    labels: {
      dialogTitle: 'actionFlow.claimAll.title',
      dialogDescription: 'actionFlow.claimAll.description',
      reviewTitle: 'actionFlow.claimAll.review.title',
      reviewDescription: 'actionFlow.claimAll.review.description',
      reviewHint: 'actionFlow.claimAll.review.hint',
      reviewHintSwitch: 'actionFlow.claimAll.review.hintSwitch',
      executeTitle: 'actionFlow.claimAll.execute.title',
      executeDescription: 'actionFlow.claimAll.execute.description',
      executeHint: 'actionFlow.claimAll.execute.hint',
      executeButton: 'actionFlow.claimAll.execute.button',
      successTitle: 'actionFlow.claimAll.success.title',
      successDescription: 'actionFlow.claimAll.success.description',
      successHint: 'actionFlow.claimAll.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.totalClaimable'), value: totalDisplay, emphasize: true },
      { label: ctx.t('actionFlow.summary.duelCount'), value: String(duelCount) },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}
