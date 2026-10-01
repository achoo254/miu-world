// What each kind of villager and animal does all day. Every routine has at least three chores, each
// with small in-between beats (wiping sweat, stretching, looking around) so no two minutes look the
// same; the actor never picks the same chore twice in a row. Spot names are the ones the map
// generator writes in `spots`; `held` indices follow the map's `held` list for that character.
// Clips: people use Kenney Blocky Characters clips, animals Kenney Cube Pets clips.
import type { AmbientRoutine } from '@miu/voxel/world-entities';
import type { Beat, Chore, RoutineSpec } from './ambient-types';

const PERSON = { kind: 'person', walkSpeed: 1.3, noticeRadius: 4, reach: 2.6, label: 'Trò chuyện' } as const;
const personGreet = (pool: string) => ({ clip: 'emote-yes', pool });
/** Tapping a villager: a friendly nod or a shrug, and a line from their small-talk pool. */
const personReact = (pool: string): Chore[] => [
  { id: 'nod', weight: 2, beats: [{ do: 'say', pool }, { do: 'act', clip: 'emote-yes', loops: [1, 1] }] },
  { id: 'point', weight: 1, beats: [{ do: 'say', pool }, { do: 'act', clip: 'interact-right', loops: [1, 1] }, { do: 'act', clip: 'idle', seconds: [0.6, 1] }] },
];
/** A quest finished nearby: a villager cheers the child by name and waves, or (lively) hops for joy. */
const personCelebrate = (pool: string): Chore[] => [
  { id: 'cheer-wave', weight: 2, beats: [{ do: 'say', pool }, { do: 'act', clip: 'emote-yes', loops: [1, 1] }, { do: 'act', clip: 'idle', seconds: [1.4, 1.8], pose: 'wave' }] },
  { id: 'cheer-hop', weight: 1, lively: true, beats: [{ do: 'say', pool }, { do: 'hop', to: 'wander', hops: [2, 3], radius: 0.8 }, { do: 'act', clip: 'idle', seconds: [0.8, 1.2], pose: 'wave' }] },
];
/** Stretching a sore back and looking around: a beat any villager slips in between chores. */
const breather: Chore = {
  id: 'breather',
  weight: 1,
  beats: [
    { do: 'act', clip: 'idle', seconds: [1.8, 2.4], pose: 'stretch' },
    { do: 'act', clip: 'idle', seconds: [1.6, 2.6], pose: 'look-around' },
  ],
};

const ANIMAL = { kind: 'animal', walkSpeed: 1, noticeRadius: 3.5, reach: 2, label: 'Vuốt ve' } as const;
/** A quest finished nearby: an animal dances and makes its sound, or (lively) bounces around. */
const animalCelebrate = (pool: string): Chore[] => [
  { id: 'cheer-dance', weight: 2, beats: [{ do: 'say', pool }, { do: 'act', clip: 'dance', loops: [1, 2] }] },
  { id: 'cheer-bounce', weight: 1, lively: true, beats: [{ do: 'say', pool }, { do: 'hop', to: 'wander', hops: [2, 4], radius: 1 }, { do: 'act', clip: 'gesture-positive', loops: [1, 1] }] },
];
/** Tapping an animal: it does a trick and makes its sound. */
const trick = (pool: string, clip: string, extra: Chore['beats'] = []): Chore[] => [
  { id: 'trick', weight: 1, beats: [{ do: 'say', pool }, { do: 'act', clip, loops: [1, 2] }, ...extra] },
];

export const ROUTINES: Readonly<Record<AmbientRoutine, RoutineSpec>> = {
  woodcutter: {
    ...PERSON,
    greet: personGreet('woodcutter-greet'),
    react: personReact('woodcutter-chat'),
    celebrate: personCelebrate('woodcutter-cheer'),
    chores: [
      {
        id: 'chop',
        weight: 4,
        beats: [
          { do: 'hold', item: 0 },
          { do: 'walk', to: 'tree' },
          { do: 'act', clip: 'attack-melee-right', loops: [2, 4], face: 'trunk' },
          { do: 'act', clip: 'idle', seconds: [1.6, 2.2], pose: 'wipe-sweat' },
          { do: 'act', clip: 'attack-melee-right', loops: [2, 3], face: 'trunk' },
          { do: 'say', pool: 'woodcutter-work', reply: 'village-reply' },
        ],
      },
      {
        id: 'stack',
        weight: 2,
        beats: [
          { do: 'hold', item: null },
          { do: 'walk', to: 'tree' },
          { do: 'act', clip: 'pick-up', loops: [1, 1] },
          { do: 'hold', item: 1 },
          { do: 'walk', to: 'logs' },
          { do: 'act', clip: 'pick-up', loops: [1, 1], face: 'logs' },
          { do: 'hold', item: null },
          { do: 'act', clip: 'idle', seconds: [1.2, 1.8], pose: 'wipe-sweat' },
        ],
      },
      {
        id: 'rest',
        weight: 2,
        beats: [
          { do: 'hold', item: null },
          { do: 'walk', to: 'stump' },
          { do: 'act', clip: 'sit', seconds: [3, 5] },
          { do: 'act', clip: 'sit', seconds: [1.5, 2], pose: 'drink' },
          { do: 'say', pool: 'woodcutter-rest', reply: 'village-reply' },
          { do: 'act', clip: 'sit', seconds: [2, 4] },
        ],
      },
      breather,
    ],
  },
  fisher: {
    ...PERSON,
    greet: personGreet('fisher-greet'),
    react: personReact('fisher-chat'),
    celebrate: personCelebrate('fisher-cheer'),
    chores: [
      {
        id: 'catch',
        weight: 2,
        beats: [
          { do: 'hold', item: 0 },
          { do: 'walk', to: 'bank' },
          { do: 'act', clip: 'idle', seconds: [4, 7], face: 'water', pose: 'rod-hold' },
          { do: 'act', clip: 'idle', seconds: [1, 1.4], face: 'water', pose: 'rod-reel' },
          { do: 'hold', item: 1 },
          { do: 'act', clip: 'emote-yes', loops: [1, 1] },
          { do: 'say', pool: 'fisher-catch' },
          // Every fish goes back into the stream.
          { do: 'act', clip: 'pick-up', loops: [1, 1], face: 'water' },
          { do: 'hold', item: 0 },
        ],
      },
      {
        id: 'miss',
        weight: 2,
        beats: [
          { do: 'hold', item: 0 },
          { do: 'walk', to: 'bank' },
          { do: 'act', clip: 'idle', seconds: [5, 8], face: 'water', pose: 'rod-hold' },
          { do: 'act', clip: 'idle', seconds: [0.8, 1.2], face: 'water', pose: 'rod-reel' },
          { do: 'act', clip: 'emote-no', loops: [1, 1] },
          { do: 'say', pool: 'fisher-miss' },
        ],
      },
      {
        id: 'stroll',
        weight: 1,
        beats: [
          { do: 'hold', item: null },
          { do: 'wander', radius: 3 },
          { do: 'act', clip: 'idle', seconds: [1.5, 2.5], pose: 'look-around' },
          { do: 'walk', to: 'bank' },
        ],
      },
      breather,
    ],
  },
  gardener: {
    ...PERSON,
    greet: personGreet('gardener-greet'),
    react: personReact('gardener-chat'),
    celebrate: personCelebrate('gardener-cheer'),
    chores: [
      {
        id: 'hoe',
        weight: 3,
        beats: [
          { do: 'hold', item: 0 },
          { do: 'walk', to: 'row-a' },
          { do: 'act', clip: 'attack-melee-right', loops: [2, 3], face: 'bed' },
          { do: 'walk', to: 'row-b' },
          { do: 'act', clip: 'attack-melee-right', loops: [2, 3], face: 'bed' },
          { do: 'act', clip: 'idle', seconds: [1.5, 2], pose: 'wipe-sweat' },
        ],
      },
      {
        id: 'water',
        weight: 2,
        beats: [
          { do: 'hold', item: 1 },
          { do: 'walk', to: 'row-c' },
          { do: 'act', clip: 'interact-right', loops: [2, 3], face: 'bed' },
          { do: 'walk', to: 'row-a' },
          { do: 'act', clip: 'interact-right', loops: [1, 2], face: 'bed' },
          { do: 'hold', item: null },
        ],
      },
      {
        id: 'harvest',
        weight: 2,
        beats: [
          { do: 'hold', item: null },
          { do: 'walk', to: 'row-b' },
          { do: 'act', clip: 'pick-up', loops: [1, 1], face: 'bed' },
          { do: 'hold', item: 2 },
          { do: 'act', clip: 'emote-yes', loops: [1, 1] },
          { do: 'say', pool: 'gardener-harvest', reply: 'village-reply' },
          { do: 'act', clip: 'pick-up', loops: [1, 1] },
          { do: 'hold', item: null },
        ],
      },
      breather,
    ],
  },
  cook: {
    ...PERSON,
    greet: personGreet('cook-greet'),
    react: personReact('cook-chat'),
    celebrate: personCelebrate('cook-cheer'),
    chores: [
      {
        id: 'stir',
        weight: 3,
        beats: [
          { do: 'hold', item: 0 },
          { do: 'walk', to: 'fire' },
          { do: 'act', clip: 'interact-right', loops: [3, 5], face: 'pot' },
          { do: 'act', clip: 'idle', seconds: [1.2, 1.6], face: 'pot', pose: 'drink' },
          { do: 'say', pool: 'cook-taste' },
        ],
      },
      {
        id: 'call',
        weight: 2,
        beats: [
          { do: 'walk', to: 'fire' },
          { do: 'act', clip: 'idle', seconds: [1.8, 2.4], pose: 'wave' },
          { do: 'say', pool: 'cook-call', reply: 'village-reply' },
          { do: 'act', clip: 'interact-right', loops: [2, 3], face: 'pot' },
        ],
      },
      {
        id: 'fetch',
        weight: 2,
        beats: [
          { do: 'hold', item: null },
          { do: 'walk', to: 'table' },
          { do: 'act', clip: 'pick-up', loops: [1, 1], face: 'table' },
          { do: 'walk', to: 'fire' },
          { do: 'act', clip: 'pick-up', loops: [1, 1], face: 'pot' },
          { do: 'hold', item: 0 },
        ],
      },
      {
        id: 'sit',
        weight: 1,
        beats: [
          { do: 'hold', item: null },
          { do: 'walk', to: 'seat' },
          { do: 'act', clip: 'sit', seconds: [4, 6] },
          { do: 'act', clip: 'sit', seconds: [1.5, 2], pose: 'wipe-sweat' },
        ],
      },
    ],
  },
  'firewood-carrier': {
    ...PERSON,
    walkSpeed: 1.6,
    greet: personGreet('carrier-greet'),
    react: personReact('carrier-chat'),
    celebrate: personCelebrate('carrier-cheer'),
    chores: [
      {
        id: 'carry',
        weight: 3,
        beats: [
          { do: 'hold', item: null },
          { do: 'walk', to: 'pile' },
          { do: 'act', clip: 'pick-up', loops: [1, 1], face: 'stack' },
          { do: 'hold', item: 0 },
          { do: 'walk', to: 'fire', speed: 1.2 },
          { do: 'act', clip: 'pick-up', loops: [1, 1], face: 'fire' },
          { do: 'hold', item: null },
          { do: 'say', pool: 'carrier-deliver', reply: 'cook-thanks' },
        ],
      },
      {
        id: 'play',
        weight: 1,
        lively: true,
        beats: [
          { do: 'wander', radius: 4, speed: 2.6, clip: 'sprint' },
          { do: 'wander', radius: 4, speed: 2.6, clip: 'sprint' },
          { do: 'act', clip: 'emote-yes', loops: [1, 1] },
          { do: 'say', pool: 'carrier-play' },
        ],
      },
      {
        id: 'wave-parrot',
        weight: 1,
        beats: [
          { do: 'act', clip: 'idle', seconds: [1.8, 2.5], pose: 'wave' },
          { do: 'say', pool: 'carrier-parrot' },
          { do: 'act', clip: 'idle', seconds: [1.5, 2], pose: 'look-around' },
        ],
      },
    ],
  },
  parrot: {
    kind: 'flyer',
    wings: 'bird',
    walkSpeed: 1,
    noticeRadius: 3.5,
    reach: 2.5,
    label: 'Chào',
    greet: { clip: 'gesture-positive', pool: 'parrot-greet' },
    react: trick('parrot-trick', 'dance'),
    celebrate: [
      { id: 'cheer-song', weight: 2, beats: [{ do: 'say', pool: 'parrot-cheer' }, { do: 'act', clip: 'dance', loops: [1, 2] }, { do: 'say', pool: 'parrot-sing' }] },
      { id: 'cheer-loop', weight: 1, lively: true, beats: [{ do: 'say', pool: 'parrot-cheer' }, { do: 'circle', around: 'sky', radius: 4, height: 0, seconds: [3, 4] }, { do: 'fly', to: 'perch-a', height: 2 }] },
    ],
    chores: [
      { id: 'loop', weight: 3, lively: true, beats: [{ do: 'circle', around: 'sky', radius: 7, height: 0, seconds: [9, 15] }, { do: 'fly', to: 'perch-a', height: 2 }] },
      { id: 'hop-trees', weight: 2, lively: true, beats: [{ do: 'fly', to: 'perch-b', height: 3 }, { do: 'act', clip: 'eat', loops: [2, 3] }, { do: 'fly', to: 'perch-a', height: 3 }] },
      { id: 'preen', weight: 2, beats: [{ do: 'act', clip: 'eat', loops: [2, 4] }, { do: 'act', clip: 'idle', seconds: [2, 4] }] },
      { id: 'sing', weight: 1, beats: [{ do: 'act', clip: 'gesture-positive', loops: [1, 2] }, { do: 'say', pool: 'parrot-sing' }, { do: 'act', clip: 'idle', seconds: [2, 3] }] },
    ],
  },
  bee: {
    kind: 'flyer',
    wings: 'bee',
    walkSpeed: 1,
    noticeRadius: 0,
    reach: 1.8,
    label: 'Chào',
    greet: { clip: 'idle', pool: 'bee-buzz' },
    react: trick('bee-buzz', 'dance'),
    celebrate: [{ id: 'cheer-dance', weight: 1, beats: [{ do: 'say', pool: 'bee-buzz' }, { do: 'act', clip: 'dance', loops: [1, 2] }] }],
    chores: [
      { id: 'flower-a', weight: 2, lively: true, beats: [{ do: 'fly', to: 'flower-a', height: 0.8 }, { do: 'act', clip: 'idle', seconds: [2, 4] }] },
      { id: 'flower-b', weight: 2, lively: true, beats: [{ do: 'fly', to: 'flower-b', height: 0.8 }, { do: 'act', clip: 'idle', seconds: [2, 4] }] },
      { id: 'flower-c', weight: 2, lively: true, beats: [{ do: 'fly', to: 'flower-c', height: 1.2 }, { do: 'act', clip: 'eat', loops: [1, 2] }] },
      { id: 'hover', weight: 1, beats: [{ do: 'act', clip: 'idle', seconds: [3, 5] }] },
    ],
  },
  bunny: {
    ...ANIMAL,
    greet: { clip: 'gesture-positive', pool: 'bunny-sound' },
    react: trick('bunny-trick', 'dance', [{ do: 'hop', to: 'wander', hops: [3, 4], radius: 1.5 }]),
    celebrate: animalCelebrate('bunny-sound'),
    chores: [
      { id: 'to-bush', weight: 2, lively: true, beats: [{ do: 'hop', to: 'bush-b', hops: [4, 7] }, { do: 'act', clip: 'eat', loops: [2, 4] }, { do: 'hop', to: 'home', hops: [4, 7] }] },
      { id: 'nibble', weight: 3, beats: [{ do: 'act', clip: 'eat', loops: [2, 4] }, { do: 'act', clip: 'idle', seconds: [1.5, 3] }] },
      { id: 'look', weight: 2, beats: [{ do: 'act', clip: 'gesture-positive', loops: [1, 1] }, { do: 'act', clip: 'idle', seconds: [1, 2] }] },
      { id: 'roam', weight: 2, lively: true, beats: [{ do: 'hop', to: 'wander', hops: [3, 5], radius: 3 }, { do: 'act', clip: 'eat', loops: [1, 2] }] },
    ],
  },
  deer: {
    ...ANIMAL,
    walkSpeed: 0.8,
    noticeRadius: 4.5,
    greet: { clip: 'gesture-positive', pool: 'deer-sound' },
    react: trick('deer-trick', 'gesture-positive'),
    celebrate: animalCelebrate('deer-sound'),
    chores: [
      { id: 'graze', weight: 4, beats: [{ do: 'act', clip: 'eat', loops: [3, 6] }, { do: 'act', clip: 'idle', seconds: [1.5, 3] }] },
      { id: 'amble', weight: 2, beats: [{ do: 'walk', to: 'graze-b' }, { do: 'act', clip: 'eat', loops: [2, 4] }, { do: 'walk', to: 'home' }] },
      { id: 'alert', weight: 1, beats: [{ do: 'act', clip: 'idle', seconds: [2, 3] }, { do: 'wander', radius: 2 }] },
      { id: 'frolic', weight: 1, lively: true, beats: [{ do: 'wander', radius: 4, speed: 2.4, clip: 'run' }, { do: 'act', clip: 'dance', loops: [1, 1] }] },
    ],
  },
  fox: {
    ...ANIMAL,
    noticeRadius: 3,
    watchClip: 'idle',
    greet: { clip: 'gesture-positive', pool: 'fox-greet' },
    react: trick('fox-trick', 'dance'),
    celebrate: animalCelebrate('fox-greet'),
    chores: [
      { id: 'nap', weight: 3, beats: [{ do: 'walk', to: 'den' }, { do: 'act', clip: 'idle', seconds: [6, 10], speed: 0.4, pose: 'sleepy' }, { do: 'say', pool: 'fox-snore' }] },
      { id: 'stretch', weight: 2, beats: [{ do: 'act', clip: 'dance', loops: [1, 1] }, { do: 'act', clip: 'gesture-negative', loops: [1, 1] }] },
      { id: 'patrol', weight: 2, beats: [{ do: 'walk', to: 'lookout' }, { do: 'act', clip: 'idle', seconds: [2, 3] }, { do: 'walk', to: 'den' }] },
      { id: 'pounce', weight: 1, lively: true, beats: [{ do: 'wander', radius: 3, speed: 2.8, clip: 'run' }, { do: 'act', clip: 'eat', loops: [1, 2] }] },
    ],
  },
  hog: {
    ...ANIMAL,
    walkSpeed: 0.9,
    greet: { clip: 'gesture-positive', pool: 'hog-sound' },
    react: trick('hog-trick', 'dance'),
    celebrate: animalCelebrate('hog-sound'),
    chores: [
      { id: 'root-a', weight: 3, beats: [{ do: 'walk', to: 'mush-a' }, { do: 'act', clip: 'eat', loops: [3, 5] }, { do: 'say', pool: 'hog-sound' }] },
      { id: 'root-b', weight: 3, beats: [{ do: 'walk', to: 'mush-b' }, { do: 'act', clip: 'eat', loops: [3, 5] }] },
      { id: 'wiggle', weight: 1, lively: true, beats: [{ do: 'act', clip: 'dance', loops: [1, 2] }] },
      { id: 'grumble', weight: 1, beats: [{ do: 'act', clip: 'gesture-negative', loops: [1, 1] }, { do: 'act', clip: 'idle', seconds: [1.5, 2.5] }] },
    ],
  },
  chick: {
    ...ANIMAL,
    walkSpeed: 1.1,
    noticeRadius: 3,
    greet: { clip: 'gesture-positive', pool: 'chick-sound' },
    react: trick('chick-sound', 'dance'),
    celebrate: animalCelebrate('chick-sound'),
    chores: [
      { id: 'peck', weight: 4, beats: [{ do: 'act', clip: 'eat', loops: [2, 4] }, { do: 'act', clip: 'idle', seconds: [0.8, 1.6] }] },
      { id: 'scurry', weight: 2, lively: true, beats: [{ do: 'wander', radius: 2.5, speed: 2.2, clip: 'run' }, { do: 'act', clip: 'eat', loops: [1, 2] }] },
      { id: 'amble', weight: 2, beats: [{ do: 'wander', radius: 2 }, { do: 'act', clip: 'eat', loops: [1, 3] }] },
      { id: 'cheep', weight: 1, beats: [{ do: 'act', clip: 'gesture-positive', loops: [1, 1] }, { do: 'say', pool: 'chick-sound' }] },
    ],
  },
  crab: {
    ...ANIMAL,
    walkSpeed: 0.7,
    noticeRadius: 2.5,
    greet: { clip: 'gesture-positive', pool: 'crab-greet' },
    react: trick('crab-trick', 'dance'),
    celebrate: animalCelebrate('crab-greet'),
    chores: [
      { id: 'scuttle-b', weight: 3, beats: [{ do: 'walk', to: 'sand-b', sideways: true }, { do: 'act', clip: 'eat', loops: [1, 3] }] },
      { id: 'scuttle-a', weight: 3, beats: [{ do: 'walk', to: 'sand-a', sideways: true }, { do: 'act', clip: 'idle', seconds: [1.5, 3] }] },
      { id: 'wave', weight: 1, beats: [{ do: 'act', clip: 'gesture-positive', loops: [1, 2] }] },
    ],
  },
  fish: {
    kind: 'swimmer',
    walkSpeed: 1,
    noticeRadius: 0,
    reach: 0,
    label: '',
    hiddenAtRest: true,
    greet: { clip: 'idle', pool: 'fish-splash' },
    react: [],
    celebrate: [],
    chores: [
      { id: 'leap-a', weight: 1, lively: true, beats: [{ do: 'leap', at: 'leap-a', height: 1.6, after: [3, 7] }] },
      { id: 'leap-b', weight: 1, lively: true, beats: [{ do: 'leap', at: 'leap-b', height: 1.3, after: [4, 8] }] },
    ],
  },
  caterpillar: {
    ...ANIMAL,
    walkSpeed: 0.25,
    noticeRadius: 2.5,
    greet: { clip: 'gesture-positive', pool: 'caterpillar-greet' },
    react: trick('caterpillar-trick', 'dance'),
    celebrate: animalCelebrate('caterpillar-greet'),
    chores: [
      { id: 'crawl-out', weight: 2, beats: [{ do: 'walk', to: 'log-end' }, { do: 'act', clip: 'eat', loops: [2, 3] }] },
      { id: 'crawl-back', weight: 2, beats: [{ do: 'walk', to: 'home' }, { do: 'act', clip: 'idle', seconds: [2, 4] }] },
      { id: 'munch', weight: 2, beats: [{ do: 'act', clip: 'eat', loops: [2, 4] }] },
    ],
  },
};

function beatSpots(beat: Beat): string[] {
  switch (beat.do) {
    case 'walk':
    case 'fly':
      return [beat.to];
    case 'hop':
      return beat.to === 'wander' ? [] : [beat.to];
    case 'act':
      return beat.face ? [beat.face] : [];
    case 'circle':
      return [beat.around];
    case 'leap':
      return [beat.at];
    default:
      return [];
  }
}

/** Spot names a routine's chores go to (besides `home`); the map must give each character every one. */
export function spotsUsed(spec: RoutineSpec): string[] {
  const beats = [...spec.chores, ...spec.react, ...spec.celebrate].flatMap((c) => c.beats);
  return [...new Set(beats.flatMap(beatSpots).filter((name) => name !== 'home'))].sort();
}
