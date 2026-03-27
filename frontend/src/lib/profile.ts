export interface Profile {
  walletAddress: string;
  nickname: string | null;
  status: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  aboutMe: string | null;
  games: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfileRequest {
  nickname?: string | null;
  status?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  aboutMe?: string | null;
  games?: string[] | null;
}

export const PROFILE_LIMITS = {
  nickname: 30,
  status: 140,
  firstName: 50,
  lastName: 50,
  gender: 20,
  aboutMe: 500,
  gameTag: 30,
  gamesMax: 20,
} as const;
