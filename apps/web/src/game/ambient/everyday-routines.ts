// Everyday life on the wide maps (owner, 01/10/2026: lively, like real life; the mock's cast and activities):
// people at their trades and farm animals, built from two templates so a new trade is a few lines of data.
// A person works between three places of the map (`work-a`, `work-b`, `work-c`) facing what they work on
// (`focus`: the counter, the cow, the boat), says what they are doing and gets an answer from whoever is near
// (the group scenes: a seller calls, a shopper answers). An animal grazes between `graze-a` and `graze-b`.
// Lines: EVERYDAY_LINES, merged into the ambient line pools.
import type { Pose, Range, RoutineSpec } from './ambient-types';

const PERSON = { kind: 'person', walkSpeed: 1.3, noticeRadius: 4, reach: 2.6, label: 'Trò chuyện' } as const;
const ANIMAL = { kind: 'animal', walkSpeed: 0.9, noticeRadius: 3.5, reach: 2, label: 'Vuốt ve' } as const;

interface Job {
  spot: 'work-a' | 'work-b' | 'work-c';
  clip: string;
  loops: Range;
  /** Index into the character's `held` list, or empty hands. */
  item: number | null;
  pose?: Pose;
}

/** A person at a trade: one chore per job, a stroll and a breather; lines from `<pool>-greet/-work/-chat/-cheer`. */
function trade(pool: string, jobs: readonly Job[], reply = 'village-reply'): RoutineSpec {
  return {
    ...PERSON,
    greet: { clip: 'emote-yes', pool: `${pool}-greet` },
    react: [
      { id: 'nod', weight: 2, beats: [{ do: 'say', pool: `${pool}-chat` }, { do: 'act', clip: 'emote-yes', loops: [1, 1] }] },
      { id: 'show', weight: 1, beats: [{ do: 'say', pool: `${pool}-chat` }, { do: 'act', clip: 'interact-right', loops: [1, 1], face: 'focus' }] },
    ],
    celebrate: [
      { id: 'cheer', weight: 2, beats: [{ do: 'say', pool: `${pool}-cheer` }, { do: 'act', clip: 'emote-yes', loops: [1, 1] }, { do: 'act', clip: 'idle', seconds: [1.2, 1.6], pose: 'wave' }] },
      { id: 'hop', weight: 1, lively: true, beats: [{ do: 'say', pool: `${pool}-cheer` }, { do: 'hop', to: 'wander', hops: [2, 3], radius: 0.8 }] },
    ],
    chores: [
      ...jobs.map((job, i) => ({
        id: `${job.spot}-${i}`,
        weight: 3,
        beats: [
          { do: 'hold' as const, item: job.item },
          { do: 'walk' as const, to: job.spot },
          { do: 'act' as const, clip: job.clip, loops: job.loops, face: 'focus', ...(job.pose ? { pose: job.pose } : {}) },
          { do: 'say' as const, pool: `${pool}-work`, ...(i === 0 ? { reply } : {}) },
          { do: 'act' as const, clip: 'idle', seconds: [1, 1.8] as Range, pose: 'wipe-sweat' as const },
        ],
      })),
      {
        id: 'stroll',
        weight: 1,
        beats: [
          { do: 'hold', item: null },
          { do: 'wander', radius: 4 },
          { do: 'act', clip: 'idle', seconds: [1.5, 2.5], pose: 'look-around' },
          { do: 'walk', to: 'home' },
        ],
      },
      { id: 'breather', weight: 1, beats: [{ do: 'act', clip: 'idle', seconds: [1.8, 2.4], pose: 'stretch' }, { do: 'act', clip: 'sit', seconds: [3, 5] }] },
    ],
  };
}

/** A farm animal grazing between two spots of its pasture; `<sound>` is its line pool. */
function grazer(sound: string, walkSpeed = 0.8): RoutineSpec {
  return {
    ...ANIMAL,
    walkSpeed,
    greet: { clip: 'gesture-positive', pool: sound },
    react: [{ id: 'trick', weight: 1, beats: [{ do: 'say', pool: sound }, { do: 'act', clip: 'dance', loops: [1, 2] }] }],
    celebrate: [{ id: 'cheer', weight: 1, beats: [{ do: 'say', pool: sound }, { do: 'act', clip: 'dance', loops: [1, 2] }] }],
    chores: [
      { id: 'graze-a', weight: 3, beats: [{ do: 'walk', to: 'graze-a' }, { do: 'act', clip: 'eat', loops: [3, 5] }] },
      { id: 'graze-b', weight: 3, beats: [{ do: 'walk', to: 'graze-b' }, { do: 'act', clip: 'eat', loops: [3, 5] }, { do: 'say', pool: sound }] },
      { id: 'rest', weight: 2, beats: [{ do: 'walk', to: 'home' }, { do: 'act', clip: 'idle', seconds: [3, 6] }] },
      { id: 'frisk', weight: 1, lively: true, beats: [{ do: 'wander', radius: 3, speed: 1.8, clip: 'run' }, { do: 'act', clip: 'gesture-positive', loops: [1, 1] }] },
    ],
  };
}

/** Snow and island animals: each with its own sounds and ways (owner, 02/10/2026: no penguin says "chíp"). */
function wildAnimal(sound: string, trick: string, walkSpeed: number, chores: RoutineSpec['chores']): RoutineSpec {
  return {
    ...ANIMAL,
    walkSpeed,
    greet: { clip: 'gesture-positive', pool: sound },
    react: [{ id: 'trick', weight: 1, beats: [{ do: 'say', pool: trick }, { do: 'act', clip: 'dance', loops: [1, 2] }] }],
    celebrate: [
      { id: 'cheer', weight: 2, beats: [{ do: 'say', pool: sound }, { do: 'act', clip: 'dance', loops: [1, 2] }] },
      { id: 'cheer-bounce', weight: 1, lively: true, beats: [{ do: 'say', pool: trick }, { do: 'hop', to: 'wander', hops: [2, 3], radius: 1 }] },
    ],
    chores,
  };
}

const work = (spot: Job['spot'], clip: string, item: number | null, loops: Range = [2, 4], pose?: Pose): Job => ({ spot, clip, loops, item, ...(pose ? { pose } : {}) });

/** Every everyday routine, keyed by the routine id the maps write in `ambients`. */
export const EVERYDAY_ROUTINES = {
  // The market: the seller calls and the shopper answers; the porter carries loads between stalls.
  vendor: trade('vendor', [work('work-a', 'interact-right', 0), work('work-b', 'pick-up', 1, [1, 2]), work('work-c', 'interact-left', 0)], 'shopper-reply'),
  shopper: trade('shopper', [work('work-a', 'pick-up', null, [1, 1]), work('work-b', 'interact-right', 0, [1, 2]), work('work-c', 'pick-up', 0, [1, 1])], 'vendor-reply'),
  porter: trade('porter', [work('work-a', 'pick-up', 0, [1, 1]), work('work-b', 'holding-both', 0, [2, 3]), work('work-c', 'pick-up', null, [1, 1])]),
  // The river village.
  ferryman: trade('ferryman', [work('work-a', 'interact-right', 0, [3, 5]), work('work-b', 'attack-melee-right', 0, [2, 3]), work('work-c', 'pick-up', 1, [1, 1])]),
  'rice-planter': trade('planter', [work('work-a', 'pick-up', 0, [2, 3]), work('work-b', 'pick-up', 0, [2, 3]), work('work-c', 'interact-right', 0, [1, 2])]),
  'kite-flyer': trade('kite', [work('work-a', 'holding-right', 0, [3, 5]), work('work-b', 'emote-yes', 0, [1, 2]), work('work-c', 'holding-right', 0, [2, 4])]),
  // At home in the hamlet.
  'home-cook': trade('home-cook', [work('work-a', 'interact-right', 0, [3, 5]), work('work-b', 'pick-up', 1, [1, 1]), work('work-c', 'interact-left', 0, [2, 3])]),
  laundry: trade('laundry', [work('work-a', 'pick-up', 0, [1, 1]), work('work-b', 'interact-right', 1, [3, 4]), work('work-c', 'interact-left', 1, [2, 3])]),
  waterer: trade('waterer', [work('work-a', 'interact-right', 0, [2, 3]), work('work-b', 'interact-right', 0, [2, 3]), work('work-c', 'pick-up', 1, [1, 1])]),
  // The farm.
  milker: trade('milker', [work('work-a', 'interact-right', 0, [3, 5]), work('work-b', 'pick-up', 0, [1, 1]), work('work-c', 'interact-left', 1, [2, 3])]),
  'hen-keeper': trade('hen-keeper', [work('work-a', 'interact-right', 0, [2, 4]), work('work-b', 'pick-up', 1, [1, 2]), work('work-c', 'interact-right', 0, [2, 3])]),
  ploughman: trade('ploughman', [work('work-a', 'attack-melee-right', 0, [3, 4]), work('work-b', 'attack-melee-right', 0, [3, 4]), work('work-c', 'pick-up', 1, [1, 1])]),
  // The school and the town.
  sweeper: trade('sweeper', [work('work-a', 'attack-melee-right', 0, [3, 5]), work('work-b', 'attack-melee-left', 0, [3, 5]), work('work-c', 'pick-up', 1, [1, 1])]),
  'school-guard': trade('guard', [work('work-a', 'idle', null, [3, 4], 'look-around'), work('work-b', 'interact-right', null, [1, 2]), work('work-c', 'idle', null, [2, 3], 'look-around')]),
  pupil: trade('pupil', [work('work-a', 'attack-kick-right', null, [2, 3]), work('work-b', 'emote-yes', null, [1, 2]), work('work-c', 'sit', 0, [2, 3])], 'pupil-reply'),
  teacher: trade('teacher', [work('work-a', 'interact-right', 0, [2, 3]), work('work-b', 'emote-yes', null, [1, 2]), work('work-c', 'interact-left', 0, [2, 3])]),
  // The library.
  reader: trade('reader', [work('work-a', 'sit', 0, [4, 6]), work('work-b', 'holding-right', 0, [3, 5]), work('work-c', 'pick-up', 0, [1, 1])]),
  librarian: trade('librarian', [work('work-a', 'interact-right', 0, [2, 4]), work('work-b', 'pick-up', 0, [1, 2]), work('work-c', 'interact-left', 0, [2, 3])]),
  // The castle.
  sentry: trade('sentry', [work('work-a', 'idle', 0, [3, 5], 'look-around'), work('work-b', 'holding-right', 0, [2, 3]), work('work-c', 'idle', 0, [3, 4], 'look-around')]),
  trumpeter: trade('trumpeter', [work('work-a', 'holding-right', 0, [3, 5], 'drink'), work('work-b', 'emote-yes', 0, [1, 2]), work('work-c', 'holding-right', 0, [2, 4], 'drink')]),
  // Farm animals and pets.
  cow: grazer('cow-sound', 0.6),
  pig: grazer('pig-sound', 0.8),
  dog: grazer('dog-sound', 1.4),
  cat: grazer('cat-sound', 1.1),
  // The snow mountain: penguins waddle to the ice to fish and belly-slide; polar bears fish, nap and roll.
  penguin: wildAnimal('penguin-sound', 'penguin-trick', 0.6, [
    { id: 'fish', weight: 3, beats: [{ do: 'walk', to: 'graze-a' }, { do: 'act', clip: 'eat', loops: [2, 4] }, { do: 'say', pool: 'penguin-sound' }] },
    { id: 'slide', weight: 2, lively: true, beats: [{ do: 'wander', radius: 4, speed: 2.6, clip: 'run' }, { do: 'act', clip: 'gesture-positive', loops: [1, 1] }] },
    { id: 'huddle', weight: 2, beats: [{ do: 'walk', to: 'home' }, { do: 'act', clip: 'idle', seconds: [3, 5], pose: 'look-around' }] },
    { id: 'flap', weight: 1, beats: [{ do: 'walk', to: 'graze-b' }, { do: 'act', clip: 'dance', loops: [1, 1] }, { do: 'say', pool: 'penguin-sound' }] },
  ]),
  'polar-bear': wildAnimal('polar-bear-sound', 'polar-bear-trick', 0.7, [
    { id: 'fish', weight: 3, beats: [{ do: 'walk', to: 'graze-a' }, { do: 'act', clip: 'eat', loops: [3, 5] }] },
    { id: 'nap', weight: 2, beats: [{ do: 'walk', to: 'home' }, { do: 'act', clip: 'idle', seconds: [6, 10], speed: 0.4, pose: 'sleepy' }, { do: 'say', pool: 'polar-bear-snore' }] },
    { id: 'roll', weight: 1, lively: true, beats: [{ do: 'act', clip: 'dance', loops: [1, 2] }, { do: 'say', pool: 'polar-bear-sound' }] },
    { id: 'sniff', weight: 2, beats: [{ do: 'walk', to: 'graze-b' }, { do: 'act', clip: 'idle', seconds: [2, 3], pose: 'look-around' }] },
  ]),
  // The island: monkeys hop between trees for fruit, chatter and swing about.
  monkey: wildAnimal('monkey-sound', 'monkey-trick', 1.5, [
    { id: 'fruit', weight: 3, lively: true, beats: [{ do: 'hop', to: 'graze-a', hops: [3, 5] }, { do: 'act', clip: 'eat', loops: [2, 3] }, { do: 'say', pool: 'monkey-sound' }] },
    { id: 'swing', weight: 2, lively: true, beats: [{ do: 'hop', to: 'graze-b', hops: [4, 6] }, { do: 'act', clip: 'dance', loops: [1, 1] }] },
    { id: 'chatter', weight: 2, beats: [{ do: 'act', clip: 'gesture-positive', loops: [1, 2] }, { do: 'say', pool: 'monkey-sound' }] },
    { id: 'scamper', weight: 1, lively: true, beats: [{ do: 'wander', radius: 4, speed: 2.8, clip: 'run' }, { do: 'hop', to: 'home', hops: [2, 4] }] },
  ]),
} as const satisfies Record<string, RoutineSpec>;

/** Speech bubbles of the everyday routines: short (a child reads them walking), `{name}` is the child. */
export const EVERYDAY_LINES: Readonly<Record<string, readonly string[]>> = {
  'vendor-greet': ['Chào cháu {name}! Mua gì nào?', 'Ghé xem hàng đi {name}!', 'Hàng tươi lắm cháu ơi!'],
  'vendor-work': ['Rau mới hái đây, ai mua!', 'Quả ngọt lắm, mời mua ạ!', 'Hoa tươi đây, hoa tươi đây!'],
  'vendor-chat': ['Bác xếp hàng từ sớm đấy.', 'Chợ phiên đông vui ghê.', 'Mua nhiều bác bớt cho.'],
  'vendor-cheer': ['Giỏi quá {name}, bác tặng quả!', 'Hoan hô cháu bé giỏi!', 'Cả chợ vỗ tay nào!'],
  'vendor-reply': ['Cảm ơn bác nhé!', 'Bác ơi, bán cho cháu với!', 'Hàng bác đẹp quá!'],
  'shopper-greet': ['Chào {name}, đi chợ à?', 'Ồ, {name} cũng ra chợ!', 'Chợ hôm nay vui nhỉ!'],
  'shopper-work': ['Mớ rau này bao nhiêu ạ?', 'Cho tôi một cân cam!', 'Quả này chín chưa bác?'],
  'shopper-chat': ['Cô mua rau nấu canh.', 'Chiều nay nhà có khách.', 'Cô chọn quả to nhất.'],
  'shopper-cheer': ['Ôi, {name} giỏi thật!', 'Cô mừng cho cháu đấy!', 'Hay quá, hay quá!'],
  'shopper-reply': ['Bớt cho tôi chút nhé!', 'Lấy cho tôi hai mớ!', 'Ngon thế, tôi mua thêm!'],
  'porter-greet': ['Tránh đường nhé {name}!', 'Chào cháu! Hàng nặng ghê.', 'Ới, {name} đấy à!'],
  'porter-work': ['Hai, ba, nhấc nào!', 'Bao gạo này nặng thật!', 'Chở sang sạp kia nhé!'],
  'porter-chat': ['Chú gánh hàng cả sáng.', 'Mỗi chuyến một gánh đầy.', 'Khỏe là nhờ ăn no.'],
  'porter-cheer': ['Chú giơ gánh mừng cháu!', 'Tài quá {name} ơi!', 'Nhất cháu rồi đấy!'],
  'ferryman-greet': ['Qua sông không {name}?', 'Đò sắp sang bờ bên kia!', 'Chào cháu, ngồi vững nhé!'],
  'ferryman-work': ['Chèo nào, chèo nào!', 'Nước hôm nay êm ghê.', 'Buộc đò cho chắc nhé.'],
  'ferryman-chat': ['Bác chèo đò ba mươi năm.', 'Sông quê mình hiền lắm.', 'Mùa lũ nước dâng cao.'],
  'ferryman-cheer': ['Bác gõ mái chèo mừng cháu!', 'Giỏi lắm con ơi!', 'Cả bến sông reo vui!'],
  'planter-greet': ['Chào cháu! Ra đồng à?', '{name} xem cô cấy lúa nhé!', 'Ruộng hôm nay đẹp quá!'],
  'planter-work': ['Cấy thẳng hàng nào!', 'Mạ non xanh mướt đây.', 'Lội ruộng mát chân ghê.'],
  'planter-chat': ['Ba tháng nữa lúa chín.', 'Hạt gạo nuôi cả làng.', 'Cấy xong cô về nấu cơm.'],
  'planter-cheer': ['Cô giơ bó mạ mừng cháu!', 'Cháu giỏi như lúa lên!', 'Ồ, tuyệt quá {name}!'],
  'kite-greet': ['{name} ơi, thả diều không?', 'Gió lên rồi, chơi thôi!', 'Diều tớ bay cao nhất!'],
  'kite-work': ['Lên nữa, lên nữa nào!', 'Diều chao kìa, giữ chặt!', 'Vi vu, vi vu!'],
  'kite-chat': ['Tớ tự làm con diều này.', 'Chiều nào tớ cũng ra đê.', 'Diều sáo kêu hay lắm.'],
  'kite-cheer': ['Yeah! {name} siêu quá!', 'Diều tớ múa mừng cậu!', 'Đập tay nào {name}!'],
  'home-cook-greet': ['Vào nhà chơi đi {name}!', 'Cơm sắp chín rồi cháu.', 'Bà chào cháu ngoan!'],
  'home-cook-work': ['Thêm chút hành cho thơm.', 'Nồi cơm sôi rồi đây.', 'Canh chua ngon quá!'],
  'home-cook-chat': ['Bà nấu cơm cho cả nhà.', 'Ăn cơm nhà là vui nhất.', 'Rửa tay rồi vào ăn nhé.'],
  'home-cook-cheer': ['Bà thưởng cháu miếng bánh!', 'Cháu bà giỏi ghê!', 'Thơm má cái nào!'],
  'laundry-greet': ['Chào cháu! Nắng đẹp nhỉ.', '{name} giúp cô phơi đồ không?', 'Ôi, cháu đến chơi à!'],
  'laundry-work': ['Giũ cho phẳng áo nào.', 'Nắng thế này chóng khô.', 'Kẹp lại kẻo gió bay.'],
  'laundry-chat': ['Áo trắng phải phơi nắng.', 'Chiều cô gấp quần áo.', 'Mùi nắng thơm ghê.'],
  'laundry-cheer': ['Cô vẫy khăn mừng cháu!', 'Giỏi quá đi {name}!', 'Vui như ngày hội!'],
  'waterer-greet': ['Chào cháu! Xem vườn không?', 'Ông chào {name} nhé.', 'Vườn ông nở hoa rồi!'],
  'waterer-work': ['Tưới gốc cho cây uống.', 'Cây ơi lớn nhanh nhé.', 'Đất khô quá, tưới thêm.'],
  'waterer-chat': ['Ông trồng cây từ bé.', 'Cây cần nắng và nước.', 'Mai ông hái rau cho cháu.'],
  'waterer-cheer': ['Ông khen cháu giỏi lắm!', 'Hoa cũng cười với cháu!', 'Tuyệt vời {name} ơi!'],
  'milker-greet': ['Chào cháu! Bò hiền lắm.', '{name} uống sữa không?', 'Lại gần xem bác vắt sữa!'],
  'milker-work': ['Đầy xô sữa rồi đây.', 'Bò ngoan, đứng yên nhé.', 'Sữa thơm, sữa mát!'],
  'milker-chat': ['Mỗi sáng bác vắt sữa.', 'Bò ăn cỏ non mới khỏe.', 'Sữa này làm bánh ngon.'],
  'milker-cheer': ['Cả chuồng bò mừng cháu!', 'Giỏi quá, giỏi quá!', 'Bác tặng cháu ly sữa!'],
  'hen-keeper-greet': ['Chào cháu! Gà đang ăn.', '{name} nhặt trứng cùng cô nhé!', 'Ổ trứng hôm nay nhiều!'],
  'hen-keeper-work': ['Tục tục, ra ăn nào!', 'Thêm nắm thóc cho gà.', 'Trứng còn ấm đây này.'],
  'hen-keeper-chat': ['Gà mái đẻ mỗi ngày.', 'Gà con theo mẹ kiếm ăn.', 'Đừng đuổi gà nhé cháu.'],
  'hen-keeper-cheer': ['Gà cũng gáy mừng cháu!', 'Cô vỗ tay to nhất!', 'Hay lắm {name} ơi!'],
  'ploughman-greet': ['Chào cháu! Ruộng đẹp nhỉ.', '{name} xem chú cày đất!', 'Đất tơi mới gieo hạt.'],
  'ploughman-work': ['Xới thêm luống nữa!', 'Đất mềm, dễ cày ghê.', 'Hây dô, cố lên nào!'],
  'ploughman-chat': ['Chú trồng ngô vụ này.', 'Mùa mưa cây lên nhanh.', 'Giun làm đất tơi xốp.'],
  'ploughman-cheer': ['Chú giơ cuốc mừng cháu!', 'Cháu giỏi ghê đấy!', 'Hoan hô {name}!'],
  'sweeper-greet': ['Chào cháu! Sân sạch chưa?', '{name} đi học vui nhé!', 'Cô quét lá rụng đây.'],
  'sweeper-work': ['Lá vàng rơi nhiều quá.', 'Gom vào một đống nào.', 'Sạch sẽ, gọn gàng!'],
  'sweeper-chat': ['Bỏ rác đúng chỗ nhé.', 'Sân sạch, học vui hơn.', 'Cô quét từ sáng sớm.'],
  'sweeper-cheer': ['Cô khen cháu giỏi quá!', 'Hay lắm, hay lắm!', 'Cả sân vui theo cháu!'],
  'guard-greet': ['Chào cháu! Vào lớp đi.', 'Bác chào {name} nhé!', 'Nhớ đi đúng vạch nhé.'],
  'guard-work': ['Mọi thứ đều ổn cả.', 'Cổng mở rồi, vào thôi.', 'Bác trông cổng cẩn thận.'],
  'guard-chat': ['Bác gác cổng mười năm.', 'Qua đường nhớ nhìn xe.', 'Trường mình đẹp nhất.'],
  'guard-cheer': ['Bác chào kiểu chào cờ!', 'Giỏi lắm học trò ngoan!', 'Bác tự hào về cháu!'],
  'pupil-greet': ['Ê {name}, chơi với tớ!', 'Chào bạn mới!', 'Giờ ra chơi vui quá!'],
  'pupil-work': ['Sút này, đỡ này!', 'Nhảy dây nào, một hai!', 'Tớ thắng rồi nhé!'],
  'pupil-chat': ['Tớ học lớp Hai đấy.', 'Mai kiểm tra Toán đó.', 'Cô giáo tớ hiền lắm.'],
  'pupil-cheer': ['Cậu giỏi nhất lớp!', 'Đập tay nào {name}!', 'Hoan hô bạn tớ!'],
  'pupil-reply': ['Chuyền cho tớ với!', 'Tớ chơi nữa nhé!', 'Hay quá đi!'],
  'teacher-greet': ['Chào em {name}!', 'Em đến sớm thế!', 'Cô chào em nhé.'],
  'teacher-work': ['Cả lớp chú ý nào.', 'Bài hôm nay hay lắm.', 'Viết cẩn thận nhé em.'],
  'teacher-chat': ['Đọc sách mỗi ngày nhé.', 'Cô thích lớp mình lắm.', 'Học vui là học giỏi.'],
  'teacher-cheer': ['Cô thưởng em sao vàng!', 'Em giỏi quá {name}!', 'Cả lớp vỗ tay nào!'],
  'reader-greet': ['Suỵt, chào {name} nhé.', 'Sách này hay lắm đấy.', 'Ngồi đọc cùng không?'],
  'reader-work': ['Trang này có tranh đẹp.', 'Truyện hay quá đi.', 'Đọc thêm chương nữa thôi.'],
  'reader-chat': ['Tớ mê truyện cổ tích.', 'Thư viện yên tĩnh ghê.', 'Mượn sách về nhà được.'],
  'reader-cheer': ['Cậu như nhân vật truyện!', 'Giỏi quá đi {name}!', 'Tuyệt cú mèo!'],
  'librarian-greet': ['Chào cháu! Tìm sách gì?', 'Thư viện mở cửa rồi.', 'Vào đây cháu {name}.'],
  'librarian-work': ['Xếp sách theo chữ cái.', 'Cuốn này về kệ ba.', 'Lau bụi cho sách nào.'],
  'librarian-chat': ['Nhớ trả sách đúng hẹn.', 'Sách là bạn tốt nhất.', 'Đọc khẽ thôi cháu nhé.'],
  'librarian-cheer': ['Cô tặng cháu bookmark!', 'Giỏi như mọt sách!', 'Hoan hô cháu ngoan!'],
  'sentry-greet': ['Chào hiệp sĩ {name}!', 'Ai đến gần lâu đài?', 'Mời vào, cổng mở rồi!'],
  'sentry-work': ['Canh gác cẩn thận!', 'Trên tháp mọi thứ yên.', 'Đổi ca gác nào!'],
  'sentry-chat': ['Lâu đài có trăm bậc.', 'Chú gác cổng thành đấy.', 'Từ tháp nhìn xa lắm.'],
  'sentry-cheer': ['Chào mừng nhà vô địch!', 'Lâu đài mở hội mừng cháu!', 'Hiệp sĩ {name} giỏi quá!'],
  'trumpeter-greet': ['Tò te! Chào {name}!', 'Nghe kèn chú thổi nhé!', 'Chào cháu yêu nhạc!'],
  'trumpeter-work': ['Tò te tí te!', 'Một bài nữa nhé!', 'Kèn vang khắp thành!'],
  'trumpeter-chat': ['Chú thổi kèn mỗi sáng.', 'Nhạc làm mọi người vui.', 'Kèn này của ông chú.'],
  'trumpeter-cheer': ['Tò te mừng chiến thắng!', 'Chú thổi bài mừng cháu!', 'Vang lên nào, hoan hô!'],
  'cow-sound': ['Bò kêu: ò ò!', 'Bò vẫy đuôi chào {name}.', 'Bò nhai cỏ ngon lành.'],
  'pig-sound': ['Ụt ịt, ụt ịt!', 'Lợn ủn mũi vào đất.', 'Lợn con lăn tròn.'],
  'dog-sound': ['Gâu gâu! Chào {name}!', 'Cún vẫy đuôi tít mù.', 'Cún nhảy quanh chân.'],
  'cat-sound': ['Meo meo!', 'Mèo dụi đầu vào {name}.', 'Mèo duỗi người lười biếng.'],
  'penguin-sound': ['Quác quác!', 'Cánh cụt lạch bạch chào {name}.', 'Cánh cụt vỗ vỗ đôi cánh nhỏ.'],
  'penguin-trick': ['Cánh cụt trượt bụng trên băng!', 'Cánh cụt xoay một vòng!', 'Quác! Xem tớ nhảy nè!'],
  'polar-bear-sound': ['Gừ... chào {name} nhé.', 'Gấu trắng vẫy bàn chân to.', 'Gấu trắng hít hít mùi cá.'],
  'polar-bear-trick': ['Gấu trắng lăn tròn trên tuyết!', 'Gấu trắng đứng hai chân chào!', 'Gấu trắng lắc mình rũ tuyết!'],
  'polar-bear-snore': ['Khò... khò...', 'Gấu ngủ trên tuyết êm.', 'Zzz... cá ngon quá...'],
  'monkey-sound': ['Khẹc khẹc!', 'Khỉ gãi đầu nhìn {name}.', 'Khỉ chìa quả chuối mời {name}.'],
  'monkey-trick': ['Khỉ nhào lộn một vòng!', 'Khỉ đu tay vẫy {name}!', 'Khẹc! Khỉ múa nè!'],
};
