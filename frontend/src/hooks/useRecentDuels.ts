'use client';

import { useMemo } from 'react';

export interface RecentDuel {
  id: number;
  player1: string;
  player2: string;
  wager: number;
  winner: string;
  chain: 'Arbitrum One' | 'Polygon';
  timeAgo: string;
}

// Mock data for demonstration — will be replaced with contract reads / backend API
const MOCK_RECENT_DUELS: RecentDuel[] = [
  {
    id: 1,
    player1: '0x1a2B3c4D5e6F7890abCDeF1234567890AbCdEf12',
    player2: '0xaBcD1234EfGh5678IjKl9012MnOp3456QrSt7890',
    wager: 100,
    winner: '0x1a2B3c4D5e6F7890abCDeF1234567890AbCdEf12',
    chain: 'Arbitrum One',
    timeAgo: '2 min ago',
  },
  {
    id: 2,
    player1: '0x9876FeDcBa5432106789AbCdEf0123456789AbCd',
    player2: '0xFf00Ee11Dd22Cc33Bb44Aa5566778899AaBbCcDd',
    wager: 50,
    winner: '0xFf00Ee11Dd22Cc33Bb44Aa5566778899AaBbCcDd',
    chain: 'Polygon',
    timeAgo: '5 min ago',
  },
  {
    id: 3,
    player1: '0x1111222233334444555566667777888899990000',
    player2: '0xAAAABBBBCCCCDDDDEEEEFFFF0000111122223333',
    wager: 25,
    winner: '0x1111222233334444555566667777888899990000',
    chain: 'Arbitrum One',
    timeAgo: '8 min ago',
  },
  {
    id: 4,
    player1: '0xDeAdBeEf00000000000000000000000000000001',
    player2: '0xCaFeBaBe00000000000000000000000000000002',
    wager: 10,
    winner: '0xCaFeBaBe00000000000000000000000000000002',
    chain: 'Polygon',
    timeAgo: '12 min ago',
  },
  {
    id: 5,
    player1: '0xBad00000000000000000000000000000000Beef1',
    player2: '0xC0De00000000000000000000000000000000Face',
    wager: 5,
    winner: '0xBad00000000000000000000000000000000Beef1',
    chain: 'Arbitrum One',
    timeAgo: '18 min ago',
  },
  {
    id: 6,
    player1: '0x1234567890123456789012345678901234567801',
    player2: '0x1234567890123456789012345678901234567802',
    wager: 75,
    winner: '0x1234567890123456789012345678901234567802',
    chain: 'Arbitrum One',
    timeAgo: '25 min ago',
  },
  {
    id: 7,
    player1: '0xAbAbAbAbAbAbAbAbAbAbAbAbAbAbAbAbAbAbAb01',
    player2: '0xCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCdCd02',
    wager: 200,
    winner: '0xAbAbAbAbAbAbAbAbAbAbAbAbAbAbAbAbAbAbAb01',
    chain: 'Polygon',
    timeAgo: '32 min ago',
  },
  {
    id: 8,
    player1: '0xEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEeEe01',
    player2: '0xFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFf02',
    wager: 15,
    winner: '0xFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFfFf02',
    chain: 'Arbitrum One',
    timeAgo: '41 min ago',
  },
];

export function useRecentDuels() {
  const duels = useMemo(() => MOCK_RECENT_DUELS, []);

  return {
    duels,
    isLoading: false,
    isError: false,
  };
}
