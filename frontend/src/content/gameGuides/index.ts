import type { GameGuide } from '@/lib/gameGuides';
import { chessGuide } from './chess';
import { cs2Guide } from './cs2';
import { dota2Guide } from './dota2';
import { eaSportsFcGuide } from './eaSportsFc';
import { fortniteGuide } from './fortnite';
import { rocketLeagueGuide } from './rocketLeague';
import { starcraft2Guide } from './starcraft2';
import { streetFighter6Guide } from './streetFighter6';
import { tekken8Guide } from './tekken8';
import { valorantGuide } from './valorant';

/** The games with a guide, in the order the catalog's shortcuts show them: the most searched first. */
export const GAME_GUIDES: readonly GameGuide[] = [
  cs2Guide,
  dota2Guide,
  eaSportsFcGuide,
  fortniteGuide,
  valorantGuide,
  chessGuide,
  rocketLeagueGuide,
  tekken8Guide,
  streetFighter6Guide,
  starcraft2Guide,
];
