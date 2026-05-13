"use client";

import { useTonConnectUI } from "@tonconnect/ui-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  buildClaimPayouts,
  buildCreateDuel,
  buildDecline,
  buildJoinDuel,
  buildRefundAndClaim,
  buildSimple,
  Op,
  type TonMessageRequest,
} from "@/lib/ton/duelme";
import { explainError } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import { useTelegram } from "@/components/providers/TelegramProvider";
import { useTranslation } from "@/components/providers/I18nProvider";

const TX_VALIDITY_SEC = 600; // 10 minutes — enough for cold-cache wallets

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface ActionSet {
  createDuel(args: { inviteHash: bigint; wagerNano: bigint; message: string }): Promise<ActionResult>;
  joinDuel(args: { duelId: bigint; inviteSecret: bigint; wagerNano: bigint }): Promise<ActionResult>;
  declineDuel(args: { duelId: bigint; inviteSecret: bigint }): Promise<ActionResult>;
  cancelDuel(duelId: bigint): Promise<ActionResult>;
  claimVictory(duelId: bigint): Promise<ActionResult>;
  admitDefeat(duelId: bigint): Promise<ActionResult>;
  confirmResult(duelId: bigint): Promise<ActionResult>;
  disputeResult(duelId: bigint): Promise<ActionResult>;
  requestMutualCancel(duelId: bigint): Promise<ActionResult>;
  acceptMutualCancel(duelId: bigint): Promise<ActionResult>;
  declineMutualCancel(duelId: bigint): Promise<ActionResult>;
  withdrawMutualCancel(duelId: bigint): Promise<ActionResult>;
  refund(duelId: bigint): Promise<ActionResult>;
  claimPayout(duelId: bigint): Promise<ActionResult>;
  claimPayouts(duelIds: bigint[]): Promise<ActionResult>;
  refundAndClaim(duelIds: bigint[]): Promise<ActionResult>;
}

export function useDuelActions(): ActionSet {
  const [tonConnectUI] = useTonConnectUI();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { haptic } = useTelegram();
  const { t } = useTranslation();

  return useMemo<ActionSet>(() => {
    async function dispatch(req: TonMessageRequest, successKey: string): Promise<ActionResult> {
      try {
        haptic("light");
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + TX_VALIDITY_SEC,
          messages: [{ address: req.to, amount: req.amount, payload: req.payload }],
        });
        haptic("success");
        toast(t(successKey), { tone: "success" });
        // Refresh contract reads after any mutation. TON transactions can take
        // 5-10s to settle — React Query will retry until the chain agrees.
        await queryClient.invalidateQueries({ queryKey: ["duel"] });
        await queryClient.invalidateQueries({ queryKey: ["duels:list"] });
        await queryClient.invalidateQueries({ queryKey: ["duelCount"] });
        return { ok: true };
      } catch (err) {
        haptic("error");
        const msg = explainError(err);
        toast(msg, { tone: "error" });
        return { ok: false, error: msg };
      }
    }

    return {
      createDuel: (args) => dispatch(buildCreateDuel(args), "actions.successCreate"),
      joinDuel: (args) => dispatch(buildJoinDuel(args), "actions.successJoin"),
      declineDuel: (args) => dispatch(buildDecline(args), "actions.successDecline"),
      cancelDuel: (id) => dispatch(buildSimple(Op.cancelDuel, id), "actions.successCancel"),
      claimVictory: (id) => dispatch(buildSimple(Op.claimVictory, id), "actions.successClaimVictory"),
      admitDefeat: (id) => dispatch(buildSimple(Op.admitDefeat, id), "actions.successAdmit"),
      confirmResult: (id) => dispatch(buildSimple(Op.confirmResult, id), "actions.successConfirm"),
      disputeResult: (id) => dispatch(buildSimple(Op.disputeResult, id), "actions.successDispute"),
      requestMutualCancel: (id) =>
        dispatch(buildSimple(Op.requestMutualCancel, id), "actions.successRequestCancel"),
      acceptMutualCancel: (id) =>
        dispatch(buildSimple(Op.acceptMutualCancel, id), "actions.successAcceptCancel"),
      declineMutualCancel: (id) =>
        dispatch(buildSimple(Op.declineMutualCancel, id), "actions.successDeclineCancel"),
      withdrawMutualCancel: (id) =>
        dispatch(buildSimple(Op.withdrawMutualCancel, id), "actions.successWithdrawCancel"),
      refund: (id) => dispatch(buildSimple(Op.refund, id), "actions.successRefund"),
      claimPayout: (id) => dispatch(buildSimple(Op.claimPayout, id), "actions.successClaimPayout"),
      claimPayouts: (ids) => dispatch(buildClaimPayouts(ids), "actions.successClaimPayout"),
      refundAndClaim: (ids) => dispatch(buildRefundAndClaim(ids), "actions.successClaimPayout"),
    };
  }, [tonConnectUI, queryClient, toast, haptic, t]);
}
