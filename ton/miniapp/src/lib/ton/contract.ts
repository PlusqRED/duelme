// SPDX-License-Identifier: MIT
//
// Hand-mirrored TypeScript wrapper for the DuelMe Tolk contract.
//
// Acton emits a Tolk wrapper for test consumers in
// `ton/contracts/wrappers/Duelme.gen.tolk` — this file is the TypeScript
// counterpart used by the Mini App. The two MUST stay in lockstep with the
// on-chain storage layout defined in `ton/contracts/contracts/storage.tolk`
// and the opcodes defined in `ton/contracts/contracts/messages.tolk`.

import {
  Address,
  beginCell,
  Cell,
  type Contract,
  type ContractABI,
  type ContractProvider,
  type Sender,
  SendMode,
  Slice,
  toNano,
  type TupleReader,
} from "@ton/core";

// Opcodes mirror the on-chain `messages.tolk` definitions exactly. Keep these
// in lockstep with the Tolk file or builds will silently route to the
// `else => throw 0xFFFF` branch.
export const Op = {
  createDuel: 0x9d4e1101,
  joinDuel: 0x9d4e1102,
  declineDuel: 0x9d4e1103,
  cancelDuel: 0x9d4e1104,
  claimVictory: 0x9d4e1105,
  admitDefeat: 0x9d4e1106,
  confirmResult: 0x9d4e1107,
  disputeResult: 0x9d4e1108,
  requestMutualCancel: 0x9d4e1109,
  acceptMutualCancel: 0x9d4e110a,
  declineMutualCancel: 0x9d4e110b,
  withdrawMutualCancel: 0x9d4e110c,
  refund: 0x9d4e110d,
  claimPayout: 0x9d4e110e,
  claimPayoutsBatch: 0x9d4e110f,
  refundAndClaim: 0x9d4e1110,
  pause: 0x9d4e1180,
  unpause: 0x9d4e1181,
  requestEmergency: 0x9d4e1182,
  executeEmergency: 0x9d4e1183,
  cancelEmergency: 0x9d4e1184,
  transferOwnership: 0x9d4e1185,
  claimReceiptEvt: 0x9d4e1203,
} as const;

export enum DuelState {
  Created = 0,
  Funded = 1,
  WinnerClaimed = 2,
  Resolved = 3,
  Refunded = 4,
  Cancelled = 5,
  Declined = 6,
  Disputed = 7,
  MutualCancelRequested = 8,
  MutuallyCancelled = 9,
}

export const ACTIVE_STATES = new Set<DuelState>([
  DuelState.Created,
  DuelState.Funded,
  DuelState.WinnerClaimed,
  DuelState.MutualCancelRequested,
]);

export const MIN_WAGER_NANO = toNano("1");
export const STORAGE_RESERVE_NANO = toNano("0.05");
export const FORWARD_FEE_NANO = toNano("0.01");
export const CLAIM_TIMEOUT_SEC = 3600;

/**
 * Flat consumer view of a duel.
 *
 * The on-chain `Duel` struct splits its payload across three sibling cells
 * (`Duel` essentials, `Cell<DuelClaim>`, `Cell<DuelMeta>`) to stay under the
 * 1023-bit TVM cell budget. This view flattens the three back into a single
 * object so React components don't need to load child cells manually.
 */
export interface DuelView {
  id: bigint;
  state: DuelState;
  creator: Address;
  opponent: Address | null;
  cancelRequestedBy: Address | null;
  claimedWinner: Address | null;
  claimedBy: Address | null;
  wagerAmount: bigint;
  creatorPayout: bigint;
  opponentPayout: bigint;
  inviteHash: bigint;
  createdAt: number;
  fundedAt: number;
  cancelRequestedAt: number;
  claimTimestamp: number;
  finalizedAt: number;
  creatorClaimed: boolean;
  opponentClaimed: boolean;
  message: string;
}

export interface CreateDuelArgs {
  queryId?: bigint;
  inviteHash: bigint;
  wagerNano: bigint;          // wager amount in nanoTON
  message: string;
}

// ───── snake-cell helpers (matches the on-chain UTF-8 validator) ────────────

function encodeUtf8Message(message: string): Cell {
  const bytes = new TextEncoder().encode(message);
  if (bytes.length === 0) {
    return beginCell().endCell();
  }
  return writeSnakeBytes(bytes, 0);
}

function writeSnakeBytes(bytes: Uint8Array, offset: number): Cell {
  const chunkSize = 127;
  const slice = bytes.slice(offset, offset + chunkSize);
  const builder = beginCell();
  for (const b of slice) {
    builder.storeUint(b, 8);
  }
  if (offset + chunkSize < bytes.length) {
    builder.storeRef(writeSnakeBytes(bytes, offset + chunkSize));
  }
  return builder.endCell();
}

function readSnakeUtf8(cell: Cell): string {
  const bytes: number[] = [];
  let current: Cell | null = cell;
  while (current) {
    const s = current.beginParse();
    while (s.remainingBits >= 8) {
      bytes.push(s.loadUint(8));
    }
    current = s.remainingRefs > 0 ? s.loadRef() : null;
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

// ───── batch-claim duelIds encoding ────────────────────────────────────────

function packDuelIds(ids: bigint[]): Cell {
  if (ids.length === 0 || ids.length > 0xffff) {
    throw new Error("duelIds length must be 1..65535");
  }
  const idsPerCell = 15;
  const head = beginCell().storeUint(ids.length, 16);
  let cursor = 0;
  let written = 0;
  while (cursor < ids.length && written < idsPerCell) {
    head.storeUint(ids[cursor]!, 64);
    cursor++;
    written++;
  }
  if (cursor < ids.length) {
    head.storeRef(writeIdsContinuation(ids, cursor, idsPerCell));
  }
  return head.endCell();
}

function writeIdsContinuation(ids: bigint[], start: number, idsPerCell: number): Cell {
  const b = beginCell();
  let i = start;
  let written = 0;
  while (i < ids.length && written < idsPerCell) {
    b.storeUint(ids[i]!, 64);
    i++;
    written++;
  }
  if (i < ids.length) {
    b.storeRef(writeIdsContinuation(ids, i, idsPerCell));
  }
  return b.endCell();
}

function defaultQueryId(): bigint {
  return BigInt(Date.now());
}

// ───── message body factories ───────────────────────────────────────────────

export const Body = {
  createDuel(args: { queryId?: bigint; inviteHash: bigint; message: string }): Cell {
    return beginCell()
      .storeUint(Op.createDuel, 32)
      .storeUint(args.queryId ?? defaultQueryId(), 64)
      .storeUint(args.inviteHash, 256)
      .storeRef(encodeUtf8Message(args.message))
      .endCell();
  },
  joinDuel(args: { queryId?: bigint; duelId: bigint; inviteSecret: bigint }): Cell {
    return beginCell()
      .storeUint(Op.joinDuel, 32)
      .storeUint(args.queryId ?? defaultQueryId(), 64)
      .storeUint(args.duelId, 64)
      .storeUint(args.inviteSecret, 256)
      .endCell();
  },
  declineDuel(args: { queryId?: bigint; duelId: bigint; inviteSecret: bigint }): Cell {
    return beginCell()
      .storeUint(Op.declineDuel, 32)
      .storeUint(args.queryId ?? defaultQueryId(), 64)
      .storeUint(args.duelId, 64)
      .storeUint(args.inviteSecret, 256)
      .endCell();
  },
  simple(opcode: number, duelId: bigint, queryId?: bigint): Cell {
    return beginCell()
      .storeUint(opcode, 32)
      .storeUint(queryId ?? defaultQueryId(), 64)
      .storeUint(duelId, 64)
      .endCell();
  },
  batch(opcode: number, ids: bigint[], queryId?: bigint): Cell {
    return beginCell()
      .storeUint(opcode, 32)
      .storeUint(queryId ?? defaultQueryId(), 64)
      .storeRef(packDuelIds(ids))
      .endCell();
  },
  admin(opcode: number, queryId?: bigint): Cell {
    return beginCell()
      .storeUint(opcode, 32)
      .storeUint(queryId ?? defaultQueryId(), 64)
      .endCell();
  },
  requestEmergency(args: { queryId?: bigint; recipient: Address; amount: bigint }): Cell {
    return beginCell()
      .storeUint(Op.requestEmergency, 32)
      .storeUint(args.queryId ?? defaultQueryId(), 64)
      .storeAddress(args.recipient)
      .storeCoins(args.amount)
      .endCell();
  },
  emergencyById(opcode: number, requestId: bigint, queryId?: bigint): Cell {
    return beginCell()
      .storeUint(opcode, 32)
      .storeUint(queryId ?? defaultQueryId(), 64)
      .storeUint(requestId, 64)
      .endCell();
  },
  transferOwnership(args: { queryId?: bigint; newOwner: Address }): Cell {
    return beginCell()
      .storeUint(Op.transferOwnership, 32)
      .storeUint(args.queryId ?? defaultQueryId(), 64)
      .storeAddress(args.newOwner)
      .endCell();
  },
};

// ───── child-cell parsers ──────────────────────────────────────────────────
//
// `Cell<DuelClaim>` and `Cell<DuelMeta>` are TVM cells whose root slice holds
// the inline serialization of the matching Tolk struct. We re-parse them here
// using @ton/core primitives. Field order MUST match the storage.tolk file.

interface DuelClaimRecord {
  cancelRequestedBy: Address | null;
  claimedWinner: Address | null;
  claimedBy: Address | null;
}

function parseDuelClaim(cell: Cell): DuelClaimRecord {
  const slice: Slice = cell.beginParse();
  return {
    cancelRequestedBy: slice.loadMaybeAddress(),
    claimedWinner: slice.loadMaybeAddress(),
    claimedBy: slice.loadMaybeAddress(),
  };
}

interface DuelMetaRecord {
  inviteHash: bigint;
  cancelRequestedAt: number;
  claimTimestamp: number;
  finalizedAt: number;
}

function parseDuelMeta(cell: Cell): DuelMetaRecord {
  const slice: Slice = cell.beginParse();
  return {
    inviteHash: slice.loadUintBig(256),
    cancelRequestedAt: slice.loadUint(32),
    claimTimestamp: slice.loadUint(32),
    finalizedAt: slice.loadUint(32),
  };
}

// ───── contract wrapper ─────────────────────────────────────────────────────

export class DuelMe implements Contract {
  static MIN_WAGER = MIN_WAGER_NANO;
  static STORAGE_RESERVE = STORAGE_RESERVE_NANO;
  static FORWARD_FEE = FORWARD_FEE_NANO;
  static CLAIM_TIMEOUT = CLAIM_TIMEOUT_SEC;
  static ABI: ContractABI = { name: "DuelMe", types: [], errors: {}, getters: [], receivers: [] };

  readonly address: Address;
  readonly init?: { code: Cell; data: Cell };

  constructor(address: Address, init?: { code: Cell; data: Cell }) {
    this.address = address;
    this.init = init;
  }

  static createFromAddress(address: Address): DuelMe {
    return new DuelMe(address);
  }

  // ----- writes ----------------------------------------------------------

  async sendCreateDuel(
    provider: ContractProvider,
    via: Sender,
    args: CreateDuelArgs,
  ): Promise<void> {
    const value = args.wagerNano + STORAGE_RESERVE_NANO + FORWARD_FEE_NANO;
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Body.createDuel({
        queryId: args.queryId,
        inviteHash: args.inviteHash,
        message: args.message,
      }),
    });
  }

  async sendJoinDuel(
    provider: ContractProvider,
    via: Sender,
    args: { queryId?: bigint; duelId: bigint; inviteSecret: bigint; wagerNano: bigint },
  ): Promise<void> {
    await provider.internal(via, {
      value: args.wagerNano + FORWARD_FEE_NANO * 2n,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Body.joinDuel(args),
    });
  }

  async sendDecline(
    provider: ContractProvider,
    via: Sender,
    args: { queryId?: bigint; duelId: bigint; inviteSecret: bigint },
  ): Promise<void> {
    await provider.internal(via, {
      value: FORWARD_FEE_NANO * 4n,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Body.declineDuel(args),
    });
  }

  async sendSimple(
    provider: ContractProvider,
    via: Sender,
    opcode: number,
    duelId: bigint,
    valueOverride?: bigint,
  ): Promise<void> {
    await provider.internal(via, {
      value: valueOverride ?? FORWARD_FEE_NANO * 4n,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Body.simple(opcode, duelId),
    });
  }

  async sendBatch(
    provider: ContractProvider,
    via: Sender,
    opcode: number,
    ids: bigint[],
  ): Promise<void> {
    await provider.internal(via, {
      value: FORWARD_FEE_NANO * BigInt(Math.max(4, ids.length * 2)),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Body.batch(opcode, ids),
    });
  }

  // ----- getters ---------------------------------------------------------

  async getDuel(provider: ContractProvider, id: bigint): Promise<DuelView> {
    const { stack } = await provider.get("getDuel", [{ type: "int", value: id }]);
    return DuelMe.parseDuelTuple(stack, id);
  }

  async getDuelCount(provider: ContractProvider): Promise<bigint> {
    const { stack } = await provider.get("duelCount", []);
    return stack.readBigNumber();
  }

  async getIsPaused(provider: ContractProvider): Promise<boolean> {
    const { stack } = await provider.get("isPaused", []);
    return stack.readBoolean();
  }

  async getOwner(provider: ContractProvider): Promise<Address> {
    const { stack } = await provider.get("owner", []);
    return stack.readAddress();
  }

  async getPlayerStats(
    provider: ContractProvider,
    player: Address,
  ): Promise<{ honored: number; abandoned: number }> {
    const { stack } = await provider.get("getPlayerStats", [
      { type: "slice", cell: beginCell().storeAddress(player).endCell() },
    ]);
    return { honored: stack.readNumber(), abandoned: stack.readNumber() };
  }

  /**
   * Read the on-chain `Duel` struct returned by `getDuel` and flatten its
   * three sibling cells into a single view object. Field order matches the
   * declaration in `ton/contracts/contracts/storage.tolk`:
   *
   *   creator, opponent, wagerAmount, creatorPayout, opponentPayout,
   *   createdAt, fundedAt, state, creatorClaimed, opponentClaimed,
   *   claim:Cell<DuelClaim>, meta:Cell<DuelMeta>, message:cell
   */
  private static parseDuelTuple(stack: TupleReader, id: bigint): DuelView {
    const creator = stack.readAddress();
    const opponent = stack.readAddressOpt();
    const wagerAmount = stack.readBigNumber();
    const creatorPayout = stack.readBigNumber();
    const opponentPayout = stack.readBigNumber();
    const createdAt = stack.readNumber();
    const fundedAt = stack.readNumber();
    const state = stack.readNumber() as DuelState;
    const creatorClaimed = stack.readBoolean();
    const opponentClaimed = stack.readBoolean();
    const claim = parseDuelClaim(stack.readCell());
    const meta = parseDuelMeta(stack.readCell());
    const messageCell = stack.readCell();

    return {
      id,
      creator,
      opponent,
      wagerAmount,
      creatorPayout,
      opponentPayout,
      inviteHash: meta.inviteHash,
      createdAt,
      fundedAt,
      cancelRequestedAt: meta.cancelRequestedAt,
      claimTimestamp: meta.claimTimestamp,
      finalizedAt: meta.finalizedAt,
      state,
      creatorClaimed,
      opponentClaimed,
      cancelRequestedBy: claim.cancelRequestedBy,
      claimedWinner: claim.claimedWinner,
      claimedBy: claim.claimedBy,
      message: readSnakeUtf8(messageCell),
    };
  }
}

// Used by tests / off-chain replicas to mirror the on-chain validator.
export const messageLimits = {
  maxBytes: 128,
  maxCodePoints: 32,
};
