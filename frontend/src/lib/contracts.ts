export const duelMeAbi = [
  // Read functions
  {
    name: 'getDuel',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'duelId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'creator', type: 'address' },
          { name: 'opponent', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'state', type: 'uint8' },
          { name: 'winner', type: 'address' },
          { name: 'claimedBy', type: 'address' },
          { name: 'claimTimestamp', type: 'uint256' },
          { name: 'token', type: 'address' },
        ],
      },
    ],
  },
  {
    name: 'getDuelRep',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'duelCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'duels',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'opponent', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'winner', type: 'address' },
      { name: 'claimedBy', type: 'address' },
      { name: 'claimTimestamp', type: 'uint256' },
      { name: 'token', type: 'address' },
    ],
  },
  {
    name: 'duelRep',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // Write functions
  {
    name: 'createDuel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'token', type: 'address' },
    ],
    outputs: [{ name: 'duelId', type: 'uint256' }],
  },
  {
    name: 'joinDuel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'duelId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'claimVictory',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'duelId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'admitDefeat',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'duelId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'confirmResult',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'duelId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'refund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'duelId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancelDuel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'duelId', type: 'uint256' }],
    outputs: [],
  },

  // Events
  {
    name: 'DuelCreated',
    type: 'event',
    inputs: [
      { name: 'duelId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
    ],
  },
  {
    name: 'DuelJoined',
    type: 'event',
    inputs: [
      { name: 'duelId', type: 'uint256', indexed: true },
      { name: 'opponent', type: 'address', indexed: true },
    ],
  },
  {
    name: 'VictoryClaimed',
    type: 'event',
    inputs: [
      { name: 'duelId', type: 'uint256', indexed: true },
      { name: 'claimedBy', type: 'address', indexed: true },
    ],
  },
  {
    name: 'DuelResolved',
    type: 'event',
    inputs: [
      { name: 'duelId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'payout', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'DuelRefunded',
    type: 'event',
    inputs: [
      { name: 'duelId', type: 'uint256', indexed: true },
    ],
  },
  {
    name: 'DuelCancelled',
    type: 'event',
    inputs: [
      { name: 'duelId', type: 'uint256', indexed: true },
    ],
  },
] as const;

export const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Duel state enum matching the smart contract
export enum DuelState {
  Created = 0,
  Funded = 1,
  WinnerClaimed = 2,
  Resolved = 3,
  Refunded = 4,
  Cancelled = 5,
}

export interface Duel {
  creator: `0x${string}`;
  opponent: `0x${string}`;
  amount: bigint;
  state: DuelState;
  winner: `0x${string}`;
  claimedBy: `0x${string}`;
  claimTimestamp: bigint;
  token: `0x${string}`;
}
