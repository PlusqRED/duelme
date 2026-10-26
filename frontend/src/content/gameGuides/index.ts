import type { GameGuide } from '@/lib/gameGuides';
import { callOfDutyGuide } from './callOfDuty';
import { chessGuide } from './chess';
import { cs2Guide } from './cs2';
import { dota2Guide } from './dota2';
import { eaSportsFcGuide } from './eaSportsFc';
import { maddenGuide } from './madden';
import { nba2kGuide } from './nba2k';
import { rocketLeagueGuide } from './rocketLeague';
import { starcraft2Guide } from './starcraft2';
import { streetFighter6Guide } from './streetFighter6';
import { tekken8Guide } from './tekken8';
import { valorantGuide } from './valorant';

/** The games with a guide, in the order the catalog's shortcuts show them: the most searched first. */
export const GAME_GUIDES: readonly GameGuide[] = [
  cs2Guide,
  callOfDutyGuide,
  eaSportsFcGuide,
  dota2Guide,
  chessGuide,
  valorantGuide,
  maddenGuide,
  nba2kGuide,
  tekken8Guide,
  streetFighter6Guide,
  rocketLeagueGuide,
  starcraft2Guide,
];
