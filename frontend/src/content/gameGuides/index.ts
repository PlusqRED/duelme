import type { GameGuide } from '@/lib/gameGuides';
import { ageOfEmpires2Guide } from './ageOfEmpires2';
import { backgammonGuide } from './backgammon';
import { billiardsGuide } from './billiards';
import { brawlhallaGuide } from './brawlhalla';
import { callOfDutyGuide } from './callOfDuty';
import { checkersGuide } from './checkers';
import { chessGuide } from './chess';
import { clashRoyaleGuide } from './clashRoyale';
import { cs2Guide } from './cs2';
import { dartsGuide } from './darts';
import { dota2Guide } from './dota2';
import { durakGuide } from './durak';
import { eaSportsFcGuide } from './eaSportsFc';
import { eFootballGuide } from './eFootball';
import { eightBallPoolGuide } from './eightBallPool';
import { fortniteGuide } from './fortnite';
import { guiltyGearStriveGuide } from './guiltyGearStrive';
import { hearthstoneGuide } from './hearthstone';
import { heroes3Guide } from './heroes3';
import { leagueOfLegendsGuide } from './leagueOfLegends';
import { maddenGuide } from './madden';
import { magicTheGatheringGuide } from './magicTheGathering';
import { mobileLegendsGuide } from './mobileLegends';
import { mortalKombat1Guide } from './mortalKombat1';
import { nba2kGuide } from './nba2k';
import { pokerGuide } from './poker';
import { pubgMobileGuide } from './pubgMobile';
import { rocketLeagueGuide } from './rocketLeague';
import { standoff2Guide } from './standoff2';
import { starcraft2Guide } from './starcraft2';
import { streetFighter6Guide } from './streetFighter6';
import { superSmashBrosUltimateGuide } from './superSmashBrosUltimate';
import { tableTennisGuide } from './tableTennis';
import { tekken8Guide } from './tekken8';
import { valorantGuide } from './valorant';
import { warcraft3Guide } from './warcraft3';
import { worldOfWarcraftGuide } from './worldOfWarcraft';

/** The games with a guide, the most searched first: the order every row of them and the landing's pick follow. */
export const GAME_GUIDES: readonly GameGuide[] = [
  cs2Guide,
  pokerGuide,
  chessGuide,
  dota2Guide,
  eaSportsFcGuide,
  fortniteGuide,
  backgammonGuide,
  callOfDutyGuide,
  billiardsGuide,
  valorantGuide,
  standoff2Guide,
  pubgMobileGuide,
  leagueOfLegendsGuide,
  durakGuide,
  eFootballGuide,
  mortalKombat1Guide,
  eightBallPoolGuide,
  clashRoyaleGuide,
  checkersGuide,
  dartsGuide,
  maddenGuide,
  nba2kGuide,
  tekken8Guide,
  streetFighter6Guide,
  superSmashBrosUltimateGuide,
  rocketLeagueGuide,
  ageOfEmpires2Guide,
  heroes3Guide,
  magicTheGatheringGuide,
  hearthstoneGuide,
  starcraft2Guide,
  brawlhallaGuide,
  mobileLegendsGuide,
  warcraft3Guide,
  worldOfWarcraftGuide,
  guiltyGearStriveGuide,
  tableTennisGuide,
];
