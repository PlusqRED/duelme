'use client';

import { useMemo, useRef, useState } from 'react';
import { CreatedPanel } from '@/components/duel/create/CreatedPanel';
import { CreateFacts } from '@/components/duel/create/CreateFacts';
import { CreateSigning } from '@/components/duel/create/CreateSigning';
import { DraftArena } from '@/components/duel/create/DraftArena';
import { SetupPanel } from '@/components/duel/create/SetupPanel';
import { WayOnBar } from '@/components/duel/create/WayOnBar';
import { BackLink } from '@/components/duel/room/BackLink';
import { TopUpWindow } from '@/components/topup/TopUpWindow';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useCreateDuelFlow } from '@/hooks/useCreateDuelFlow';
import { useCreateSetup } from '@/hooks/useCreateSetup';
import { useDefaultChain } from '@/hooks/useDefaultChain';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useGameNote } from '@/hooks/useGameNote';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useUsdtBalance } from '@/hooks/useUsdtBalance';
import { useTranslation } from '@/i18n/useTranslation';
import { resolveBalanceStatus, resolveFunding, type FundingStatus } from '@/lib/balanceStatus';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { duelIdOfPath, isNewGame, wayOn, type WayOn } from '@/lib/createSetup';
import { stakeStops } from '@/lib/stakeScale';
import { formatUSDT, parseUSDT } from '@/lib/utils';

/**
 * The create page: the duel page before the duel exists. The arena fills in while the duel is set
 * up in the panel under it, the facts beside it say what is chosen so far, and the way on signs in,
 * tops up or creates the duel. Created, the page is the duel page's own, with the link to send.
 */
export function CreateDuelRoom() {
  const { t, language } = useTranslation();
  const isReduced = useReducedMotion();
  const chainKey = useDefaultChain();
  const chainId = SUPPORTED_CHAINS[chainKey].id;
  const limits = useContractConfig(chainId);
  const { games: catalog } = useGameCatalog();
  const { activeWallet, walletAddress } = useActiveWallet();
  const creatorFace = useRef<HTMLSpanElement>(null);
  const [isDraftClosed, setIsDraftClosed] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);

  const setup = useCreateSetup({ chainId, limits, isDraftClosed });
  const { form, reading, message, answers, progress } = setup;
  const stakeRaw = reading.kind === 'valid' ? reading.raw : null;
  const flow = useCreateDuelFlow({
    amount: reading.kind === 'valid' ? reading.amount : '',
    message,
    gameName: form.game?.name ?? '',
    gameCategory: form.game?.category ?? null,
    isPublic: form.isPublic,
    selectedChain: chainKey,
    isValidAmount: reading.kind === 'valid',
    isValidMessage: answers.message,
  });
  const createdPath = flow.createdDuelPath !== dismissedPath ? flow.createdDuelPath : null;
  const createdId = createdPath === null ? null : duelIdOfPath(createdPath);

  // The stored draft goes once the create call is with the wallet, and stays gone once the duel
  // exists: a reload must not offer the same terms for a second duel. Mirrored here because the
  // setup runs before the flow: a refused call puts the form back in the player's hands.
  const closesDraft = flow.flow?.pendingTransaction === 'create-duel' || flow.flow?.stage === 'success' || createdPath !== null;
  if (closesDraft !== isDraftClosed) setIsDraftClosed(closesDraft);

  const isSignedIn = flow.authenticated;
  const address = isSignedIn && activeWallet ? (activeWallet.address as `0x${string}`) : null;
  const { read, refetch } = useUsdtBalance(chainId, walletAddress, isSignedIn);
  const balance = resolveBalanceStatus(read, isSignedIn && walletAddress ? { chainId, walletAddress } : null);
  const funding: FundingStatus = stakeRaw === null ? { kind: 'unknown' } : resolveFunding(balance, stakeRaw);
  const way = wayOn(answers, { isSignedIn, isShort: funding.kind === 'short' });
  const note = useGameNote(form.game && !isNewGame(form.game) ? form.game.slug : undefined, chainId, limits);
  const stops = useMemo(() => stakeStops(limits.minWager), [limits.minWager]);
  const format = (stake: number) => formatUSDT(parseUSDT(stake), language);

  const wayParams = {
    min: format(limits.minWager),
    max: limits.maxMessageCharacters,
    amount: funding.kind === 'short' ? formatUSDT(funding.shortfallRaw, language) : '',
    wager: stakeRaw === null ? '' : formatUSDT(stakeRaw, language),
  };

  function go(next: WayOn) {
    if (next === 'short') setIsTopUpOpen(true);
    // Signed out, this signs in; the setup stays as it is, kept in the tab.
    else if (next === 'signIn' || next === 'ready') flow.handleCreateDuelClick();
  }

  function setUpAnother() {
    setDismissedPath(createdPath);
    setup.reset();
    window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' });
  }

  const wayOnBar = (place: 'panel' | 'side') =>
    createdPath === null && (
      <WayOnBar
        way={way}
        params={wayParams}
        place={place}
        isSticky={progress.open === null && (way === 'signIn' || way === 'short' || way === 'ready')}
        onGo={go}
      />
    );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-1 pb-18 sm:px-6">
      <BackLink href={isSignedIn ? '/dashboard' : '/duels/public'}>{t(isSignedIn ? 'room.back.mine' : 'room.back.public')}</BackLink>
      <div className="grid grid-cols-1 gap-5 min-[1080px]:grid-cols-[minmax(0,1fr)_340px] min-[1080px]:items-start min-[1080px]:gap-7">
        <div className="grid min-w-0 content-start gap-4">
          <DraftArena
            game={form.game}
            created={createdId === null ? null : { id: createdId }}
            address={address}
            chainId={chainId}
            stakeRaw={stakeRaw}
            stakeLabel={stakeRaw === null ? '?' : formatUSDT(stakeRaw, language)}
            message={message}
            isPublic={form.isPublic}
            balanceLabel={balance.kind === 'ready' ? formatUSDT(balance.raw, language) : null}
            bumpKey={bumpKey}
            creatorFace={creatorFace}
          />
          {createdPath !== null ? (
            <CreatedPanel
              pointAt={creatorFace}
              path={createdPath}
              wager={wayParams.wager}
              isPublic={form.isPublic}
              onAgain={setUpAnother}
            />
          ) : (
            <SetupPanel
              setup={setup}
              pointAt={creatorFace}
              catalog={catalog}
              limits={limits}
              stops={stops}
              address={address}
              balance={balance}
              funding={funding}
              example={note ?? t('create.message.example')}
              onTopUp={() => setIsTopUpOpen(true)}
              onRetryBalance={refetch}
              onRipple={() => setBumpKey((key) => key + 1)}
            >
              {wayOnBar('panel')}
            </SetupPanel>
          )}
        </div>
        <aside className="grid min-w-0 content-start gap-5 min-[1080px]:sticky min-[1080px]:top-[92px]">
          <CreateFacts chainId={chainId} game={form.game} stakeRaw={stakeRaw} isPublic={form.isPublic}>
            {wayOnBar('side')}
          </CreateFacts>
        </aside>
      </div>
      <CreateSigning flow={flow} />
      {activeWallet && walletAddress && balance.kind !== 'no-wallet' && (
        <TopUpWindow
          address={activeWallet.address}
          walletAddress={walletAddress}
          chainId={isTopUpOpen ? chainId : null}
          duel={{ neededRaw: stakeRaw ?? 0n, isJoining: false, funding: { balance, retry: refetch } }}
          onClose={() => setIsTopUpOpen(false)}
        />
      )}
    </div>
  );
}
