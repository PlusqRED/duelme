// High-level contract helpers used by hooks/pages. Sits on top of the
// manually-mirrored wrapper from `ton/contracts/wrappers/DuelMe.ts` and is
// the only place that knows about cell encoding details — every component
// stays in TypeScript land.

import { Address, beginCell, Cell, type ContractProvider } from "@ton/core";
import {
  Body,
  DuelMe,
  DuelState,
  type DuelView,
  Op,
  STORAGE_RESERVE_NANO,
  FORWARD_FEE_NANO,
} from "./contract";
import { getTonClient } from "./client";
import { config } from "../constants";

export { DuelState, Op };
export type { DuelView };

const ACTIVE_STATES = new Set<DuelState>([
  DuelState.Created,
  DuelState.Funded,
  DuelState.WinnerClaimed,
  DuelState.MutualCancelRequested,
]);

const HISTORICAL_STATES = new Set<DuelState>([
  DuelState.Resolved,
  DuelState.Refunded,
  DuelState.Cancelled,
  DuelState.Declined,
  DuelState.Disputed,
  DuelState.MutuallyCancelled,
]);

export function isActive(state: DuelState): boolean {
  return ACTIVE_STATES.has(state);
}

export function isHistorical(state: DuelState): boolean {
  return HISTORICAL_STATES.has(state);
}

export function getDuelMeAddress(): Address {
  return Address.parse(config.duelMeAddress);
}

export async function readDuelCount(): Promise<bigint> {
  const provider = openProvider();
  const contract = DuelMe.createFromAddress(getDuelMeAddress());
  return contract.getDuelCount(provider);
}

export async function readDuel(id: bigint): Promise<DuelView> {
  const provider = openProvider();
  const contract = DuelMe.createFromAddress(getDuelMeAddress());
  return contract.getDuel(provider, id);
}

export async function readIsPaused(): Promise<boolean> {
  const provider = openProvider();
  const contract = DuelMe.createFromAddress(getDuelMeAddress());
  return contract.getIsPaused(provider);
}

export async function readPlayerStats(player: Address): Promise<{ honored: number; abandoned: number }> {
  const provider = openProvider();
  const contract = DuelMe.createFromAddress(getDuelMeAddress());
  return contract.getPlayerStats(provider, player);
}

// We surface the cell bodies + value separately so the TON Connect bridge can
// construct the unsigned message envelope expected by `sendTransaction`.
export interface TonMessageRequest {
  to: string;
  amount: string;
  payload: string;             // base64 of the body cell
}

function toMessage(body: Cell, valueNano: bigint): TonMessageRequest {
  return {
    to: getDuelMeAddress().toString({ bounceable: true }),
    amount: valueNano.toString(),
    payload: body.toBoc().toString("base64"),
  };
}

export function buildCreateDuel(args: {
  inviteHash: bigint;
  wagerNano: bigint;
  message: string;
  queryId?: bigint;
}): TonMessageRequest {
  const body = Body.createDuel({ ...args });
  const value = args.wagerNano + STORAGE_RESERVE_NANO + FORWARD_FEE_NANO;
  return toMessage(body, value);
}

export function buildJoinDuel(args: {
  duelId: bigint;
  inviteSecret: bigint;
  wagerNano: bigint;
  queryId?: bigint;
}): TonMessageRequest {
  const body = Body.joinDuel(args);
  const value = args.wagerNano + FORWARD_FEE_NANO * 2n;
  return toMessage(body, value);
}

export function buildDecline(args: {
  duelId: bigint;
  inviteSecret: bigint;
  queryId?: bigint;
}): TonMessageRequest {
  const body = Body.declineDuel(args);
  return toMessage(body, FORWARD_FEE_NANO * 4n);
}

export function buildSimple(opcode: number, duelId: bigint, queryId?: bigint): TonMessageRequest {
  const body = Body.simple(opcode, duelId, queryId);
  return toMessage(body, FORWARD_FEE_NANO * 4n);
}

export function buildClaimPayouts(ids: bigint[]): TonMessageRequest {
  const body = Body.batch(Op.claimPayoutsBatch, ids);
  return toMessage(body, FORWARD_FEE_NANO * BigInt(Math.max(4, ids.length * 2)));
}

export function buildRefundAndClaim(ids: bigint[]): TonMessageRequest {
  const body = Body.batch(Op.refundAndClaim, ids);
  return toMessage(body, FORWARD_FEE_NANO * BigInt(Math.max(4, ids.length * 2)));
}

function openProvider(): ContractProvider {
  return getTonClient().provider(getDuelMeAddress());
}

// Helper: encode a `slice` cell for a single address (used by getter calls).
export function addressSlice(addr: Address): Cell {
  return beginCell().storeAddress(addr).endCell();
}
