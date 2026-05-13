"use client";

import {
  Ban,
  CheckCircle2,
  Flag,
  HandshakeIcon,
  Handshake,
  Share2,
  Swords,
  Undo2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Address } from "@ton/core";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ShareDialog } from "@/components/duel/ShareDialog";
import { useDuelActions } from "@/hooks/useDuelActions";
import { useWallet } from "@/hooks/useWallet";
import { useTranslation } from "@/components/providers/I18nProvider";
import { addressEquals, formatTon } from "@/lib/format";
import { CLAIM_TIMEOUT_SEC } from "@/lib/constants";
import { DuelState, type DuelView } from "@/lib/ton/duelme";
import type { InvitePayload } from "@/lib/invite";
import { pendingPayoutFor } from "@/hooks/useDuelList";

interface DuelActionsProps {
  duel: DuelView;
  invite: InvitePayload | null;
}

type Role = "creator" | "opponent" | "stranger";

function roleOf(duel: DuelView, viewer: Address | null): Role {
  if (!viewer) return "stranger";
  if (addressEquals(duel.creator, viewer)) return "creator";
  if (duel.opponent && addressEquals(duel.opponent, viewer)) return "opponent";
  return "stranger";
}

export function DuelActions({ duel, invite }: DuelActionsProps) {
  const { t } = useTranslation();
  const { address, isConnected, openWallet } = useWallet();
  const actions = useDuelActions();
  const [shareOpen, setShareOpen] = useState(false);

  const role = roleOf(duel, address);
  const payout = useMemo(
    () => (address ? pendingPayoutFor(duel, address) : null),
    [duel, address],
  );

  const claimedByYou = duel.claimedBy && address && addressEquals(duel.claimedBy, address);
  const requestedByYou =
    duel.cancelRequestedBy && address && addressEquals(duel.cancelRequestedBy, address);
  const timeoutReached =
    duel.state === DuelState.WinnerClaimed &&
    Math.floor(Date.now() / 1000) >= duel.claimTimestamp + CLAIM_TIMEOUT_SEC;

  // The creator's invite secret is only ever in memory immediately after they
  // hit "Create". If they reopen the duel later without the share URL in the
  // address bar, we can't rebuild a working share link — show a hint instead
  // of a broken button.
  const canShare = invite !== null && invite.duelId === duel.id;

  if (!isConnected) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-muted">{t("errors.walletNotConnected")}</p>
        <Button size="lg" onClick={openWallet}>
          {t("home.ctaConnect")}
        </Button>
      </Card>
    );
  }

  return (
    <>
      <Card className="space-y-3">
        {/* Claim pending payout — always visible when applicable. */}
        {payout && (
          <Button
            size="block"
            variant="success"
            icon={<HandshakeIcon className="size-5" />}
            onClick={() => actions.claimPayout(duel.id)}
          >
            {t("duel.actionClaimPayout", { amount: formatTon(payout, { precision: 4 }) })}
          </Button>
        )}

        {/* Created state — creator can share/cancel; invitee with secret can join/decline. */}
        {duel.state === DuelState.Created && role === "creator" && (
          <>
            {canShare ? (
              <Button size="block" icon={<Share2 className="size-5" />} onClick={() => setShareOpen(true)}>
                {t("duel.actionShare")}
              </Button>
            ) : (
              <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                {t("share.creatorLostSecret")}
              </p>
            )}
            <Button
              variant="danger"
              size="block"
              icon={<X className="size-4" />}
              onClick={() => actions.cancelDuel(duel.id)}
            >
              {t("duel.actionCancelDuel")}
            </Button>
          </>
        )}
        {duel.state === DuelState.Created && role === "stranger" && invite && (
          <>
            <Button
              size="block"
              icon={<Swords className="size-5" />}
              onClick={() =>
                actions.joinDuel({
                  duelId: duel.id,
                  inviteSecret: invite.secret,
                  wagerNano: duel.wagerAmount,
                })
              }
            >
              {t("duel.actionJoin", { amount: formatTon(duel.wagerAmount, { precision: 4 }) })}
            </Button>
            <Button
              variant="ghost"
              size="block"
              icon={<Ban className="size-4" />}
              onClick={() =>
                actions.declineDuel({ duelId: duel.id, inviteSecret: invite.secret })
              }
            >
              {t("duel.actionDecline")}
            </Button>
          </>
        )}
        {duel.state === DuelState.Created && role === "stranger" && !invite && (
          <div className="text-center text-sm text-muted">
            {t("errors.invalidInvite")}
          </div>
        )}

        {/* Funded — participants can claim/admit; mutual cancel is also exposed. */}
        {duel.state === DuelState.Funded && role !== "stranger" && (
          <>
            <Button
              size="block"
              icon={<Flag className="size-5" />}
              onClick={() => actions.claimVictory(duel.id)}
            >
              {t("duel.actionClaim")}
            </Button>
            <Button
              variant="secondary"
              size="block"
              icon={<Handshake className="size-4" />}
              onClick={() => actions.admitDefeat(duel.id)}
            >
              {t("duel.actionAdmit")}
            </Button>
            <Button
              variant="ghost"
              size="block"
              icon={<Undo2 className="size-4" />}
              onClick={() => actions.requestMutualCancel(duel.id)}
            >
              {t("duel.actionRequestCancel")}
            </Button>
          </>
        )}

        {/* WinnerClaimed — the non-claimer confirms or disputes; anyone may refund after timeout. */}
        {duel.state === DuelState.WinnerClaimed && role !== "stranger" && !claimedByYou && (
          <>
            <Button
              size="block"
              variant="success"
              icon={<CheckCircle2 className="size-5" />}
              onClick={() => actions.confirmResult(duel.id)}
            >
              {t("duel.actionConfirm")}
            </Button>
            <Button
              variant="danger"
              size="block"
              icon={<Flag className="size-5" />}
              onClick={() => actions.disputeResult(duel.id)}
            >
              {t("duel.actionDispute")}
            </Button>
          </>
        )}
        {duel.state === DuelState.WinnerClaimed && timeoutReached && (
          <Button variant="secondary" size="block" onClick={() => actions.refund(duel.id)}>
            {t("duel.actionRefund")}
          </Button>
        )}

        {/* Mutual cancel pending. */}
        {duel.state === DuelState.MutualCancelRequested && role !== "stranger" && !requestedByYou && (
          <>
            <Button variant="success" size="block" onClick={() => actions.acceptMutualCancel(duel.id)}>
              {t("duel.actionAcceptCancel")}
            </Button>
            <Button variant="ghost" size="block" onClick={() => actions.declineMutualCancel(duel.id)}>
              {t("duel.actionDeclineCancel")}
            </Button>
          </>
        )}
        {duel.state === DuelState.MutualCancelRequested && requestedByYou && (
          <Button variant="secondary" size="block" onClick={() => actions.withdrawMutualCancel(duel.id)}>
            {t("duel.actionWithdrawCancel")}
          </Button>
        )}
      </Card>

      {/* Single share dialog rendered outside the Card so it sits on its own
          z-layer. Only mounted when we actually have a secret to share. */}
      {canShare && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          duelId={duel.id}
          inviteSecret={invite!.secret}
        />
      )}
    </>
  );
}
