export const duelMeAbi = [
  {
    type: 'function',
    name: 'CLAIM_TIMEOUT',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'EMERGENCY_DELAY',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'MIN_WAGER',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'admitDefeat',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'cancelDuel',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'cancelEmergencyWithdraw',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'claimPayout',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'claimPayouts',
    inputs: [
      {
        name: 'duelIds',
        type: 'uint256[]',
        internalType: 'uint256[]'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'claimVictory',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'confirmResult',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'createDuel',
    inputs: [
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'inviteHash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'declineDuel',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'inviteSecret',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'disputeResult',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'duelCount',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'emergencyNonce',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'emergencyRequests',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'requestedAt',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'executeEmergencyWithdraw',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getDuel',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct DuelMe.Duel',
        components: [
          {
            name: 'creator',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'opponent',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'wagerAmount',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'inviteHash',
            type: 'bytes32',
            internalType: 'bytes32'
          },
          {
            name: 'claimedWinner',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'claimedBy',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'createdAt',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'fundedAt',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'claimTimestamp',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'finalizedAt',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'creatorPayout',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'opponentPayout',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'creatorClaimed',
            type: 'bool',
            internalType: 'bool'
          },
          {
            name: 'opponentClaimed',
            type: 'bool',
            internalType: 'bool'
          },
          {
            name: 'state',
            type: 'uint8',
            internalType: 'enum DuelMe.DuelState'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getPlayerStats',
    inputs: [
      {
        name: 'user',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: 'honored',
        type: 'uint32',
        internalType: 'uint32'
      },
      {
        name: 'abandoned',
        type: 'uint32',
        internalType: 'uint32'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'joinDuel',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'inviteSecret',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'pause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'playerStats',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: 'duelsHonored',
        type: 'uint32',
        internalType: 'uint32'
      },
      {
        name: 'duelsAbandoned',
        type: 'uint32',
        internalType: 'uint32'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'refund',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'requestEmergencyWithdraw',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'rescueETH',
    inputs: [
      {
        name: 'to',
        type: 'address',
        internalType: 'address payable'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'rescueToken',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'contract IERC20'
      },
      {
        name: 'to',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'unpause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'usdt',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IERC20'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'DuelCancelled',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelCreated',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'creator',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'wagerAmount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelDeclined',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'declinedBy',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelDisputed',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'disputedBy',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelJoined',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'opponent',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelPayoutClaimed',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'player',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelRefunded',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelResolved',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'winner',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'EmergencyCancelled',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'EmergencyExecuted',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'recipient',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'EmergencyRequested',
    inputs: [
      {
        name: 'requestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'recipient',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'executeAfter',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Paused',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Unpaused',
    inputs: [
      {
        name: 'account',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VictoryClaimed',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'claimedBy',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'claimedWinner',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  }
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
  Declined = 6,
  Disputed = 7,
}

export interface Duel {
  creator: `0x${string}`;
  opponent: `0x${string}`;
  wagerAmount: bigint;
  inviteHash: `0x${string}`;
  claimedWinner: `0x${string}`;
  claimedBy: `0x${string}`;
  createdAt: bigint;
  fundedAt: bigint;
  claimTimestamp: bigint;
  finalizedAt: bigint;
  creatorPayout: bigint;
  opponentPayout: bigint;
  creatorClaimed: boolean;
  opponentClaimed: boolean;
  state: DuelState;
}
