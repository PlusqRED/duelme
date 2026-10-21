import type { IconName } from '@/components/ui/iconPaths';
import type { TranslationKey } from '@/i18n/translations';
import type { SeatSay } from '@/lib/duel';

/** What each thing a player says over their seat looks like: its icon and its words. */
export const seatSays: Record<SeatSay, { icon: IconName; key: TranslationKey }> = {
  won: { icon: 'trophy', key: 'sim.say.won' },
  lost: { icon: 'flag', key: 'room.say.lost' },
  confirm: { icon: 'check', key: 'sim.say.confirm' },
  dispute: { icon: 'x', key: 'sim.say.dispute' },
  callOff: { icon: 'pause', key: 'room.say.callOff' },
  agree: { icon: 'check', key: 'room.say.agree' },
  decline: { icon: 'x', key: 'room.say.decline' },
};
