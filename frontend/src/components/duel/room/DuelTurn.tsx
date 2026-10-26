'use client';

import { useId, useMemo, useSyncExternalStore, type RefObject } from 'react';
import { TurnBlocks } from '@/components/duel/room/TurnBlocks';
import { TurnPanel } from '@/components/duel/room/TurnPanel';
import { ActionSigningWindow } from '@/components/sign/ActionSigningWindow';
import { JoinSigningWindow } from '@/components/sign/JoinSigningWindow';
import { TopUpWindow } from '@/components/topup/TopUpWindow';
import type { TranslationKey } from '@/i18n/translations';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import type { DuelTurnActions } from '@/hooks/useDuelTurnActions';
import { useNicknames } from '@/hooks/useNicknames';
import { useReputationLevels } from '@/hooks/useReputationLevels';
import type { StakePurse } from '@/hooks/useStakePurse';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import type { Duel } from '@/lib/contracts';
import type { SeatSide } from '@/lib/duel';
import { buildDuelLink, buildInviteLink, isPublicDuel } from '@/lib/invite';
import { durationWords } from '@/lib/timeWords';
import type { TurnView } from '@/lib/turnView';
import { formatUSDT, subscribeToNothing } from '@/lib/utils';

const whoseLabels: Record<TurnView['whose'], TranslationKey> = {
  you: 'room.whose.you',
  them: 'room.whose.them',
  watch: 'room.whose.watch',
  over: 'room.whose.over',
};

interface DuelTurnProps {
  duelId: number;
  duel: Duel;
  view: TurnView;
  /** The game being played, from the backend; null for a duel created without one. */
  gameName: string | null;
  inviteSecret: `0x${string}` | null;
  /** The reader's wallet, lowercased; undefined while signed out or still loading. */
  walletAddress: `0x${string}` | undefined;
  claimTimeout: number;
  purse: StakePurse;
  /** What the panel's moves do; the page holds them, so the open seat can make the panel's move too. */
  actions: DuelTurnActions;
  /** The seats' faces, for the notch to point at. */
  faces: Record<SeatSide, RefObject<HTMLSpanElement | null>>;
  onPreviewJoin: (isPreviewing: boolean) => void;
}

/**
 * The duel page's "your move" panel and the windows its moves open: the join window, the signing
 * window for a report, an answer or a payout, and the top-up window for a stake the wallet can't
 * cover yet.
 */
export function DuelTurn({ duelId, duel, view, gameName, inviteSecret, walletAddress, claimTimeout, purse, actions, faces, onPreviewJoin }: DuelTurnProps) {
  const { t, plural, language } = useTranslation();
  const titleId = useId();
  // The link is read off the page's address, which the server does not have.
  const hasWindow = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const { activeWallet } = useActiveWallet();
  const players = useMemo(() => [duel.creator, duel.opponent], [duel.creator, duel.opponent]);
  const { resolveDisplay } = useNicknames(players);
  const { reputationStatsByAddress } = useReputationLevels(players, DEFAULT_CHAIN_ID);
  const { joinFlow, actionFlow } = actions;

  const name = (address: `0x${string}` | null) => (address ? resolveDisplay(address) : '');
  const { people } = view;
  const vars = {
    wager: formatUSDT(duel.wagerAmount, language),
    pot: formatUSDT(duel.wagerAmount * 2n, language),
    game: gameName ?? '',
    timeout: durationWords(claimTimeout, plural),
    name: name(people.creator),
    other: name(people.other),
    claimer: name(people.claimer),
    winner: name(people.winner),
    late: name(people.late),
    who: name(people.who),
  };
  const isPublic = isPublicDuel(duel.inviteHash);
  // A private duel's link is nothing without its key: never fall back to a bare `/duel/{id}`.
  const link = !hasWindow ? null : isPublic ? buildDuelLink(duelId, duel.inviteHash, language) : inviteSecret ? buildInviteLink(duelId, inviteSecret, language) : null;

  return (
    <>
      <TurnPanel
        tone={view.tone}
        pointAt={view.caret ? faces[view.caret] : null}
        whose={{
          tone: view.pill.tone,
          label: t(whoseLabels[view.whose]),
          isLive: view.pill.isLive,
          avatar: view.pill.avatar,
          icon: view.pill.isWatching ? 'eye' : undefined,
        }}
        titleId={titleId}
        title={t(view.title, vars)}
        text={t(view.text, vars)}
        swapKey={view.key}
      >
        <TurnBlocks
          blocks={view.blocks}
          moves={{
            vars,
            onMove: actions.run,
            isBusy: actions.isBusy,
            isJoinArriving: purse.isCovered,
            onPreviewJoin,
          }}
          share={{ link, isPublic }}
          foe={{ address: duel.creator, name: name(duel.creator), level: reputationStatsByAddress[duel.creator.toLowerCase()] }}
          purse={{ needRaw: duel.wagerAmount, balance: purse.shown, fromRaw: purse.fromRaw }}
          countdown={{ duel, claimTimeout }}
        />
      </TurnPanel>

      {activeWallet && walletAddress && (
        <TopUpWindow
          address={activeWallet.address}
          walletAddress={walletAddress}
          chainId={purse.isTopUpOpen ? DEFAULT_CHAIN_ID : null}
          duel={{ neededRaw: duel.wagerAmount, isJoining: true, funding: { balance: purse.balance, retry: purse.retry } }}
          onClose={purse.closeTopUp}
        />
      )}

      <JoinSigningWindow
        open={joinFlow.flow !== null}
        canClose={joinFlow.canCloseFlow}
        draft={joinFlow.flow?.draft ?? null}
        stage={joinFlow.flow?.stage ?? 'review'}
        actionState={joinFlow.flow?.actionState ?? 'idle'}
        needsNetworkSwitch={joinFlow.needsNetworkSwitch}
        needsApproval={joinFlow.needsApproval}
        completedSwitchNetwork={joinFlow.flow?.completedSteps.switchNetwork ?? false}
        completedApproval={joinFlow.flow?.completedSteps.approve ?? false}
        errorMessage={joinFlow.flow?.errorMessage}
        review={joinFlow.review}
        creatorName={resolveDisplay(duel.creator)}
        onOpenChange={joinFlow.handleFlowOpenChange}
        onContinue={joinFlow.handleContinueFlow}
        onSwitchNetwork={joinFlow.handleSwitchNetwork}
        onApprove={joinFlow.handleApprove}
        onJoinDuel={joinFlow.handleJoinTransaction}
        onDone={joinFlow.closeFlow}
      />

      <ActionSigningWindow
        open={actionFlow.flow !== null}
        canClose={actionFlow.canClose}
        flow={actionFlow.flow}
        config={actionFlow.activeConfig}
        needsNetworkSwitch={actionFlow.needsNetworkSwitch}
        summaryContext={actions.summaryContext}
        onOpenChange={actionFlow.handleFlowOpenChange}
        onContinue={actionFlow.handleContinue}
        onSwitchNetwork={actionFlow.handleSwitchNetwork}
        onExecute={actionFlow.handleExecute}
        onDone={actionFlow.closeFlow}
      />
    </>
  );
}
