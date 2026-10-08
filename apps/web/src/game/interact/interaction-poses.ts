// The one table from an interaction's pose to what the child does: the gesture she makes (player-actions.ts),
// the clip she holds while on the object, and where she goes for it.
import type { InteractionPose } from './object-interaction-types';
import type { PlayerAction } from './player-actions';

/**
 * Where she goes: `seat` her hips on its seat (a chair, a bench, a swing), `lie` on its mattress, `front` on
 * the floor in front of it facing it (a television), `inside` standing on its floor (a shower's tray) for the
 * pose's while, `face` where she stands, turned toward it.
 */
export type PosePlacement = 'seat' | 'lie' | 'front' | 'inside' | 'face';

export interface PoseBehaviour {
  action: PlayerAction;
  /** The rig clip she holds meanwhile (its seated clip, entities/player-character.ts `SEATED_POSES`), or her idle. */
  seated: 'sit' | null;
  place: PosePlacement;
}

const stand = (action: PlayerAction): PoseBehaviour => ({ action, seated: null, place: 'face' });

export const POSE_BEHAVIOURS: Readonly<Record<InteractionPose, PoseBehaviour>> = {
  sit: { action: 'rest', seated: 'sit', place: 'seat' },
  lay: { action: 'lay', seated: null, place: 'lie' },
  sleep: { action: 'sleep', seated: null, place: 'lie' },
  swing: { action: 'swing', seated: 'sit', place: 'seat' },
  watch: { action: 'watch', seated: 'sit', place: 'front' },
  wash: stand('wash'),
  shower: { action: 'shower', seated: null, place: 'inside' },
  cook: stand('cook'),
  study: stand('study'),
  stretch: stand('stretch'),
  open: stand('open'),
  tap: stand('tap'),
  hug: stand('hug'),
  dance: stand('dance'),
  smell: stand('smell'),
  kick: stand('kick'),
  eat: stand('eat'),
  drink: stand('drink'),
  fish: stand('fish'),
  pet: stand('pet'),
  water: stand('water'),
  sweep: stand('sweep'),
  cheer: stand('cheer'),
  wave: stand('wave'),
};

/** Whether the pose keeps her on (or in front of) the object until she gets up. */
export function holdsHer(pose: InteractionPose): boolean {
  return POSE_BEHAVIOURS[pose].place !== 'face';
}
