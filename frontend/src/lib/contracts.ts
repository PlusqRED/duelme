import { USDT_ADDRESSES } from '@/lib/constants';

export const duelMeAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_usdt',
        type: 'address',
        internalType: 'address'
      },
      {
        name: '_minWager',
        type: 'uint96',
        internalType: 'uint96'
      },
      {
        name: '_trustedForwarder',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'MIN_CLAIM_TIMEOUT',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint64',
        internalType: 'uint64'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'MIN_EMERGENCY_DELAY',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint64',
        internalType: 'uint64'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'MIN_MESSAGE_BYTES',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'MIN_MESSAGE_CODEPOINTS',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'MIN_WAGER_FLOOR',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint96',
        internalType: 'uint96'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'acceptMutualCancellation',
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
    name: 'claimTimeout',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint64',
        internalType: 'uint64'
      }
    ],
    stateMutability: 'view'
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
      },
      {
        name: 'message',
        type: 'string',
        internalType: 'string'
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
    name: 'createDuelWithPermit',
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
      },
      {
        name: 'message',
        type: 'string',
        internalType: 'string'
      },
      {
        name: 'permitDeadline',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'v',
        type: 'uint8',
        internalType: 'uint8'
      },
      {
        name: 'r',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 's',
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
    name: 'declineMutualCancellation',
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
    name: 'emergencyDelay',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint64',
        internalType: 'uint64'
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
            name: 'message',
            type: 'string',
            internalType: 'string'
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
            name: 'cancelRequestedBy',
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
            name: 'cancelRequestedAt',
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
    name: 'isTrustedForwarder',
    inputs: [
      {
        name: 'forwarder',
        type: 'address',
        internalType: 'address'
      }
    ],
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
    name: 'joinDuelWithPermit',
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
      },
      {
        name: 'permitDeadline',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'v',
        type: 'uint8',
        internalType: 'uint8'
      },
      {
        name: 'r',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 's',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'maxMessageBytes',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'maxMessageCodepoints',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'minWager',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint96',
        internalType: 'uint96'
      }
    ],
    stateMutability: 'view'
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
    name: 'refundAndClaimPayouts',
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
    name: 'requestMutualCancellation',
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
    name: 'setClaimTimeout',
    inputs: [
      {
        name: 'newClaimTimeout',
        type: 'uint64',
        internalType: 'uint64'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setEmergencyDelay',
    inputs: [
      {
        name: 'newEmergencyDelay',
        type: 'uint64',
        internalType: 'uint64'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setMaxMessageBytes',
    inputs: [
      {
        name: 'newMax',
        type: 'uint16',
        internalType: 'uint16'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setMaxMessageCodepoints',
    inputs: [
      {
        name: 'newMax',
        type: 'uint16',
        internalType: 'uint16'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setMinWager',
    inputs: [
      {
        name: 'newMinWager',
        type: 'uint96',
        internalType: 'uint96'
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
    name: 'trustedForwarder',
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
    type: 'function',
    name: 'withdrawMutualCancellationRequest',
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
    type: 'event',
    name: 'ClaimTimeoutUpdated',
    inputs: [
      {
        name: 'oldValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
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
    name: 'DuelMutualCancellationDeclined',
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
    name: 'DuelMutualCancellationRequested',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'requestedBy',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelMutualCancellationWithdrawn',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'withdrawnBy',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DuelMutuallyCancelled',
    inputs: [
      {
        name: 'duelId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'requestedBy',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'acceptedBy',
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
    name: 'EmergencyDelayUpdated',
    inputs: [
      {
        name: 'oldValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newValue',
        type: 'uint256',
        indexed: false,
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
    name: 'MaxMessageBytesUpdated',
    inputs: [
      {
        name: 'oldValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'MaxMessageCodepointsUpdated',
    inputs: [
      {
        name: 'oldValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'MinWagerUpdated',
    inputs: [
      {
        name: 'oldValue',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newValue',
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
  },
  {
    type: 'error',
    name: 'EnforcedPause',
    inputs: []
  },
  {
    type: 'error',
    name: 'ExpectedPause',
    inputs: []
  },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: []
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address'
      }
    ]
  }
] as const;

// Minimal ERC2771Forwarder surface. `execute` is what the relayer sends; `verify` is the
// admission check it runs first; `nonces` is what the client folds into the signed
// ForwardRequest struct hash (ForwardRequestData itself carries no nonce field).
// Field order mirrors the on-chain struct and must stay in lockstep with it, so verify and
// execute share one definition rather than two copies that can drift apart.
const forwardRequestTuple = {
  name: 'request',
  type: 'tuple',
  components: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gas', type: 'uint256' },
    { name: 'deadline', type: 'uint48' },
    { name: 'data', type: 'bytes' },
    { name: 'signature', type: 'bytes' }
  ]
} as const;

export const erc2771ForwarderAbi = [
  {
    type: 'function',
    name: 'verify',
    stateMutability: 'view',
    inputs: [forwardRequestTuple],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [forwardRequestTuple],
    outputs: []
  },
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

// EIP-2612 reads needed to build a permit signature. `permit` itself is never called from
// the client — it rides inside createDuelWithPermit / joinDuelWithPermit calldata.
// DOMAIN_SEPARATOR is read so the locally rebuilt domain can be checked against the
// token's own: mainnet USDT has no ERC-5267 eip712Domain(), so the domain has to be
// reconstructed from name() + version "1", and a silent mismatch would only show up as an
// unexplained invalid signature.
export const erc20PermitAbi = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  },
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'DOMAIN_SEPARATOR',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }]
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
  MutualCancelRequested = 8,
  MutuallyCancelled = 9,
}

export const ACTIVE_STATES = new Set<DuelState>([
  DuelState.Created,
  DuelState.Funded,
  DuelState.WinnerClaimed,
  DuelState.MutualCancelRequested,
]);

export interface Duel {
  creator: `0x${string}`;
  opponent: `0x${string}`;
  wagerAmount: bigint;
  inviteHash: `0x${string}`;
  message: string;
  claimedWinner: `0x${string}`;
  claimedBy: `0x${string}`;
  cancelRequestedBy: `0x${string}`;
  createdAt: bigint;
  fundedAt: bigint;
  cancelRequestedAt: bigint;
  claimTimestamp: bigint;
  finalizedAt: bigint;
  creatorPayout: bigint;
  opponentPayout: bigint;
  creatorClaimed: boolean;
  opponentClaimed: boolean;
  state: DuelState;
}

export const balanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const transferAbi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// Reads straight from SUPPORTED_CHAINS. This used to inline its own copy of the map to
// "avoid a circular import" — constants.ts imports nothing, so there was no cycle, and the
// second copy went stale the first time MockUSDT was redeployed: the permit path then read
// nonces() off the previous token and the duel failed with an unexplained revert.
export function getUsdtAddress(chainId: number | undefined) {
  if (chainId === undefined) {
    return undefined;
  }

  return USDT_ADDRESSES[chainId];
}
