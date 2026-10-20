import { parseUnits } from 'viem';
import type { Dispatch, SetStateAction } from 'react';
import type { useAppToast } from '@/hooks/useAppToast';
import {
  createStageAfterChecks,
  type CreateDuelFlowSession,
  type CreateDuelFlowStage,
} from '@/lib/createDuelFlow';
import { USDT_DECIMALS } from '@/lib/constants';
import type { GameCategory } from '@/lib/game';
import { getContractConfig } from '@/lib/contractConfig';
import { classifyFlowError } from '@/lib/flowError';
import { reduceFlow, startFlow, type FlowEvent } from '@/lib/flowSession';
import {
  generateInviteSecret,
  hashInviteSecret,
  OPEN_DUEL_INVITE_HASH,
} from '@/lib/invite';
import { resolveNeedsApproval } from '@/lib/writeRoute';

interface CreateDuelFlowActionsOptions {
  activeWalletAddress?: string;
  amount: string;
  appToast: ReturnType<typeof useAppToast>;
  authenticated: boolean;
  chainId: number;
  chainName: string;
  connectedChainId?: number;
  contractAddress: `0x${string}`;
  createDuel: (amount: bigint, inviteHash: `0x${string}`, message?: string) => Promise<void> | void;
  /**
   * True when the wager is authorised by an EIP-2612 signature instead of an allowance —
   * the relayed path. The approve step is then not just skipped in the UI: the allowance
   * guard below must not bounce the flow back to it either, because there is no allowance
   * to find and the permit is signed as part of the duel call itself.
   */
  fundsViaPermit: boolean;

  gameName: string;
  gameCategory: GameCategory | null;
  isPublic: boolean;
  isValidAmount: boolean;
  isValidMessage: boolean;
  login: () => void;
  message: string;
  ready: boolean;
  reset: () => void;
  readLatestAllowance: () => Promise<bigint | undefined>;
  setFlow: Dispatch<SetStateAction<CreateDuelFlowSession | null>>;
  switchChainAsync: (args: { chainId: number }) => Promise<unknown>;
  tokenAddress: `0x${string}`;
  approveToken: (token: `0x${string}`, amount: bigint) => Promise<void> | void;
}

export function createDuelFlowActions({
  activeWalletAddress,
  amount,
  appToast,
  authenticated,
  chainId,
  chainName,
  connectedChainId,
  contractAddress,
  createDuel,
  fundsViaPermit,
  gameName,
  gameCategory,
  isPublic,
  isValidAmount,
  isValidMessage,
  login,
  message,
  ready,
  reset,
  readLatestAllowance,
  setFlow,
  switchChainAsync,
  tokenAddress,
  approveToken,
}: CreateDuelFlowActionsOptions) {
  function dispatch(event: FlowEvent<CreateDuelFlowStage>) {
    setFlow((current) => current && reduceFlow(current, event));
  }

  function failWith(error: unknown, options: { step?: CreateDuelFlowStage; isNetworkSwitch?: boolean } = {}) {
    dispatch({
      type: 'failed',
      error: classifyFlowError(error, { chainId, isNetworkSwitch: options.isNetworkSwitch }),
      step: options.step,
    });
  }

  function closeFlow() {
    setFlow(null);
    reset();
  }

  async function handleCreateDuelClick() {
    if (!ready) {
      return;
    }
    if (!authenticated) {
      login();
      return;
    }
    if (!activeWalletAddress) {
      appToast.error('toast.walletNotReady');
      return;
    }
    if (!isValidAmount) {
      appToast.error('create.min', { min: getContractConfig().minWager });
      return;
    }
    if (!isValidMessage) {
      appToast.error('create.messageTooLong', { max: getContractConfig().maxMessageCharacters });
      return;
    }
    const rawAmount = parseUnits(amount, USDT_DECIMALS);
    const inviteSecret = isPublic ? null : generateInviteSecret();
    reset();
    setFlow({
      ...startFlow<CreateDuelFlowStage>('review'),
      draft: {
        rawAmount,
        chainId,
        chainName,
        usdtAddress: tokenAddress,
        contractAddress,
        inviteHash: inviteSecret ? hashInviteSecret(inviteSecret, contractAddress, chainId) : OPEN_DUEL_INVITE_HASH,
        inviteSecret,
        isPublic,
        gameName: gameName.trim(),
        gameCategory,
        message,
      },
      createdDuelId: null,
    });
  }

  function needsApprovalFor(flow: CreateDuelFlowSession) {
    return resolveNeedsApproval({ fundsViaPermit, readLatestAllowance, rawAmount: flow.draft.rawAmount });
  }

  async function handleContinueFlow(flow: CreateDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      dispatch({ type: 'moved', stage: 'switch-network' });
      return;
    }
    try {
      const needsApproval = await needsApprovalFor(flow);
      dispatch({ type: 'moved', stage: createStageAfterChecks({ needsNetworkSwitch: false, needsApproval }) });
    } catch (allowanceError) {
      failWith(allowanceError);
    }
  }

  async function handleSwitchNetwork(flow: CreateDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    dispatch({ type: 'switching', stage: 'switch-network' });
    try {
      await switchChainAsync({ chainId: flow.draft.chainId });
    } catch (switchError) {
      failWith(switchError, { isNetworkSwitch: true });
      return;
    }
    try {
      const needsApproval = await needsApprovalFor(flow);
      dispatch({ type: 'switched', next: needsApproval ? 'approve' : 'create-duel' });
    } catch (allowanceError) {
      failWith(allowanceError);
    }
  }

  function handleApprove(flow: CreateDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      dispatch({ type: 'moved', stage: 'switch-network' });
      return;
    }
    startContractStep('approve', () => approveToken(flow.draft.usdtAddress, flow.draft.rawAmount));
  }

  async function handleCreateTransaction(flow: CreateDuelFlowSession | null) {
    if (!flow) {
      return;
    }
    if (connectedChainId !== flow.draft.chainId) {
      dispatch({ type: 'moved', stage: 'switch-network' });
      return;
    }
    let needsApproval: boolean;
    try {
      needsApproval = await needsApprovalFor(flow);
    } catch (allowanceError) {
      failWith(allowanceError);
      return;
    }
    if (needsApproval) {
      dispatch({ type: 'moved', stage: 'approve' });
      return;
    }
    startContractStep('create-duel', () =>
      createDuel(flow.draft.rawAmount, flow.draft.inviteHash, flow.draft.message)
    );
  }

  function startContractStep(step: 'approve' | 'create-duel', run: () => Promise<void> | void) {
    reset();
    dispatch({ type: 'writing', step });
    // A permit refused in the wallet rejects here, before the write hook ever hears of it.
    const failed = (error: unknown) => {
      reset();
      failWith(error, { step });
    };
    try {
      void Promise.resolve(run()).catch(failed);
    } catch (error) {
      failed(error);
    }
  }

  return {
    closeFlow,
    handleApprove,
    handleContinueFlow,
    handleCreateDuelClick,
    handleCreateTransaction,
    handleSwitchNetwork,
  };
}
