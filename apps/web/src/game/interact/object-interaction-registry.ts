// The everyday interactions with furniture and props on every map: what each one matches, the pose the child
// holds (interaction-poses.ts) and how the object answers (`effect`, drawn by object-effects.ts) or why it
// does not change (`noEffect`). A new one is an entry here (or registerInteraction()); the catalogue tests
// check every entry has a gesture, an answer, and seat data for every seat model the maps place.

import type { ObjectInteractionDef } from './object-interaction-types';

export const BUILTIN_OBJECT_INTERACTIONS: readonly ObjectInteractionDef[] = [
  // ==========================================
  // 1. PHÒNG NGỦ & NGHỈ NGƠI (Rest & Bedroom)
  // ==========================================
  {
    id: 'bed-sleep',
    category: 'rest',
    nameVi: 'Giường ngủ',
    nameEn: 'Cozy Bed',
    verbVi: 'Nằm ngủ',
    verbEn: 'Sleep',
    match: {
      slots: ['bed'],
      modelRegex: /^(ncb-bed-[a-z]+|ld-bed|xma-bed|bed(bunk|double|single)?)$/i,
    },
    pose: 'sleep',
    duration: 0, // Continues until player walks
    effect: { kind: 'symbols', glyph: 'zzz' },
    emoji: '💤',
    dialoguesVi: [
      'Khò khò... Giường êm ấm áp quá! 💤',
      'Chúc bé ngủ ngon và có những giấc mơ đẹp! ⭐',
      'Đắp chăn ấm để nạp lại đầy năng lượng nào! 🛌',
    ],
    dialoguesEn: [
      'Zzz... So soft and cozy! 💤',
      'Sweet dreams and restful sleep! ⭐',
      'Snuggled under the warm blanket! 🛌',
    ],
    sound: 'snore',
  },
  {
    id: 'bed-jump',
    category: 'rest',
    nameVi: 'Đầu giường lò xo',
    nameEn: 'Bouncy Bed',
    verbVi: 'Nhún nhảy',
    verbEn: 'Bounce',
    match: {
      modelRegex: /^bed.*cushion$/i,
      keywords: ['bouncy-bed'],
    },
    pose: 'cheer',
    duration: 3,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '🤸',
    dialoguesVi: [
      'Nhún nhảy lên cao vui thật là vui! 🤸',
      'Tưng tưng tưng... lò xo nảy tanh tách! ✨',
    ],
    dialoguesEn: [
      'Bouncing high is so much fun! 🤸',
      'Boing boing... bouncing on the bed! ✨',
    ],
    sound: 'boing',
  },
  {
    id: 'sofa-relax',
    category: 'rest',
    nameVi: 'Ghế sofa',
    nameEn: 'Comfy Sofa',
    verbVi: 'Ngồi nghỉ',
    verbEn: 'Relax',
    match: {
      modelRegex: /^(ncb-sofa|tv-poufs|tv-window-seat|lounge(design)?sofa(long|corner|ottoman)?)$/i,
      keywords: ['sofa', 'couch'],
    },
    pose: 'sit',
    duration: 0,
    noEffect: 'a seat: it holds her as she sits and stays as it is',
    emoji: '🛋️',
    dialoguesVi: [
      'Ngồi tựa lưng sofa êm ái thích ghê! 🛋️',
      'Nghỉ chân một lát sau chuyến dạo chơi dài! 🌸',
    ],
    dialoguesEn: [
      'Resting on the soft cozy sofa! 🛋️',
      'Taking a nice rest after walking around! 🌸',
    ],
  },
  {
    id: 'chair-sit',
    category: 'rest',
    nameVi: 'Ghế ngồi',
    nameEn: 'Chair',
    verbVi: 'Ngồi xuống',
    verbEn: 'Sit down',
    match: {
      slots: ['chair'],
      modelRegex: /^(chair(cushion|rounded|moderncushion|modernframecushion|desk)?|ld-chair|tv-chair|th-chair|ntu-armchair)$/i,
      keywords: ['chair', 'armchair'],
    },
    pose: 'sit',
    duration: 0,
    noEffect: 'a seat: it holds her as she sits and stays as it is',
    emoji: '🪑',
    dialoguesVi: [
      'Bé ngồi ghế ngay ngắn, lưng thẳng tắp! 🪑',
      'Ngồi nghỉ chân cho khỏe khoắn nào! 🍀',
    ],
    dialoguesEn: [
      'Sitting upright with good posture! 🪑',
      'Resting my feet on this nice chair! 🍀',
    ],
  },
  {
    id: 'lounge-chair-sun',
    category: 'rest',
    nameVi: 'Ghế tựa thư giãn',
    nameEn: 'Lounge Chair',
    verbVi: 'Ngả lưng',
    verbEn: 'Recline',
    match: {
      modelRegex: /^lounge(chair(relax)?|designchair)$/i,
      keywords: ['lounge-chair'],
    },
    pose: 'sit',
    duration: 0,
    noEffect: 'a seat: it holds her as she sits and stays as it is',
    emoji: '🏖️',
    dialoguesVi: [
      'Ngả lưng thư giãn đón gió mát rượi! 🏖️',
      'Cảm giác thảnh thơi dễ chịu làm sao! 🍃',
    ],
    dialoguesEn: [
      'Leaning back to enjoy the fresh breeze! 🏖️',
      'So peaceful and relaxing! 🍃',
    ],
  },
  {
    id: 'bench-rest',
    category: 'rest',
    nameVi: 'Ghế băng dài',
    nameEn: 'Park Bench',
    verbVi: 'Ngồi ghế đá',
    verbEn: 'Sit on bench',
    match: {
      modelRegex: /^(park-bench|kr-log-bench|ld-bench-long|xma-bench|th-piano-bench|bench(cushion(low)?)?)$/i,
      keywords: ['bench'],
    },
    pose: 'sit',
    duration: 0,
    noEffect: 'a seat: it holds her as she sits and stays as it is',
    emoji: '🌳',
    dialoguesVi: [
      'Ngồi ngắm trời mây hoa lá xung quanh! 🌳',
      'Hít thở không khí trong lành dưới bóng râm! 🌤️',
    ],
    dialoguesEn: [
      'Sitting peacefully admiring the scenery! 🌳',
      'Breathing fresh air in the cool shade! 🌤️',
    ],
  },
  {
    id: 'wardrobe-pick',
    category: 'rest',
    nameVi: 'Tủ quần áo',
    nameEn: 'Wardrobe',
    verbVi: 'Mở tủ đồ',
    verbEn: 'Open wardrobe',
    match: {
      slots: ['wardrobe'],
      modelRegex: /^(ncb-wardrobe(-[a-z]+)?|wardrobe)$/i,
      keywords: ['wardrobe'],
    },
    pose: 'open',
    duration: 2.5,
    effect: { kind: 'open', toggle: true },
    offVi: 'Đóng tủ',
    offEn: 'Close wardrobe',
    emoji: '👗',
    dialoguesVi: [
      'Mở tủ chọn một bộ trang phục thật đẹp! 👗',
      'Quần áo được gấp gọn gàng ngăn nắp! 👕',
    ],
    dialoguesEn: [
      'Picking out a wonderful outfit! 👗',
      'Clothes neatly folded and tidy! 👕',
    ],
  },
  {
    id: 'pillow-fluff',
    category: 'rest',
    nameVi: 'Gối ôm mềm mại',
    nameEn: 'Soft Pillow',
    verbVi: 'Vỗ gối',
    verbEn: 'Fluff pillow',
    match: {
      modelRegex: /^pillow(blue|long|bluelong)?$/i,
      keywords: ['pillow'],
    },
    pose: 'tap',
    duration: 2.0,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '☁️',
    dialoguesVi: [
      'Vỗ gối bông bồng bềnh như đám mây! ☁️',
      'Gối thơm tho giúp giấc ngủ ngon lành! 🌙',
    ],
    dialoguesEn: [
      'Fluffing the pillow like a soft cloud! ☁️',
      'Smells fresh and ready for sweet dreams! 🌙',
    ],
  },
  {
    id: 'curtain-open',
    category: 'rest',
    nameVi: 'Rèm cửa sổ',
    nameEn: 'Window Curtains',
    verbVi: 'Kéo rèm',
    verbEn: 'Draw curtains',
    match: {
      slots: ['curtain'],
      modelRegex: /^(ncb-curtains-[a-z]+|xma-curtains|curtains?)$/i,
      keywords: ['curtain', 'curtains'],
    },
    pose: 'open',
    duration: 2.2,
    effect: { kind: 'symbols', glyph: 'sparkle', color: '#ffe08a' },
    emoji: '☀️',
    dialoguesVi: [
      'Kéo rèm đón tia nắng ấm ban mai! ☀️',
      'Căn phòng bừng sáng rạng rỡ! 🌈',
    ],
    dialoguesEn: [
      'Opening the curtains to let sunshine in! ☀️',
      'The room is bright and cheerful! 🌈',
    ],
  },
  {
    id: 'alarm-clock-tap',
    category: 'rest',
    nameVi: 'Đồng hồ báo thức',
    nameEn: 'Alarm Clock',
    verbVi: 'Tắt chuông',
    verbEn: 'Stop alarm',
    match: {
      modelRegex: /clock/i,
      keywords: ['alarm', 'clock'],
    },
    pose: 'tap',
    duration: 1.8,
    effect: { kind: 'symbols', glyph: 'note' },
    emoji: '⏰',
    dialoguesVi: [
      'Reng reng! Đã đến giờ thức dậy học bài rồi! ⏰',
      'Bé dậy sớm tập thể dục cho khỏe người! 🏃',
    ],
    dialoguesEn: [
      'Ring ring! Time to wake up and start the day! ⏰',
      'Waking up early to exercise and stay healthy! 🏃',
    ],
  },

  // ==========================================
  // 2. VỆ SINH CÁ NHÂN (Bathroom & Hygiene)
  // ==========================================
  {
    id: 'toilet-use',
    category: 'hygiene',
    nameVi: 'Bồn cầu',
    nameEn: 'Toilet',
    verbVi: 'Đi vệ sinh',
    verbEn: 'Use toilet',
    match: {
      modelRegex: /^toilet(square)?$/i,
      keywords: ['toilet'],
    },
    pose: 'sit',
    duration: 3.5,
    effect: { kind: 'symbols', glyph: 'bubble' },
    emoji: '🚽',
    dialoguesVi: [
      'Xả nước sạch bong kin kít! 🚽✨',
      'Đi vệ sinh xong nhớ rửa tay xà phòng nhé! 🧼',
      'Bé giữ gìn nhà vệ sinh luôn thơm mát sạch sẽ! 🌸',
    ],
    dialoguesEn: [
      'Flush! Squeaky clean and shiny! 🚽✨',
      'Always wash hands with soap afterwards! 🧼',
      'Keeping the bathroom fresh and clean! 🌸',
    ],
    sound: 'flush',
  },
  {
    id: 'sink-wash-hands',
    category: 'hygiene',
    nameVi: 'Bồn rửa tay',
    nameEn: 'Bathroom Sink',
    verbVi: 'Rửa tay',
    verbEn: 'Wash hands',
    match: {
      modelRegex: /^bathroomsink(square)?$/i,
      keywords: ['sink'],
    },
    pose: 'wash',
    duration: 3.0,
    effect: { kind: 'water' },
    emoji: '🧼',
    dialoguesVi: [
      'Rửa tay 6 bước đúng chuẩn, vi khuẩn biến mất! 🧼',
      'Bọt xà phòng trắng muốt thơm lừng bàn tay! 🫧',
      'Bàn tay sạch sẽ trước khi ăn cơm! 👏',
    ],
    dialoguesEn: [
      'Washing hands properly, germs away! 🧼',
      'Foamy white bubbles smell so good! 🫧',
      'Clean hands before eating meals! 👏',
    ],
    sound: 'water',
  },
  {
    id: 'mirror-check',
    category: 'hygiene',
    nameVi: 'Gương soi mặt',
    nameEn: 'Bathroom Mirror',
    verbVi: 'Soi gương',
    verbEn: 'Look in mirror',
    match: {
      modelRegex: /mirror/i,
      keywords: ['mirror'],
    },
    pose: 'wave',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '🪞',
    dialoguesVi: [
      'Soi gương chải tóc gọn gàng, mỉm cười thật tươi! 🪞',
      'Khuôn mặt sáng ngời tràn đầy niềm vui! 😊',
    ],
    dialoguesEn: [
      'Combing hair neatly and smiling bright! 🪞',
      'A glowing, happy face in the mirror! 😊',
    ],
  },
  {
    id: 'bathtub-soak',
    category: 'hygiene',
    nameVi: 'Bồn tắm',
    nameEn: 'Bathtub',
    verbVi: 'Tắm bọt',
    verbEn: 'Bubble bath',
    match: {
      modelRegex: /^bathtub$/i,
      keywords: ['bathtub'],
    },
    pose: 'sit',
    duration: 4.0,
    effect: { kind: 'symbols', glyph: 'bubble' },
    emoji: '🛁',
    dialoguesVi: [
      'Ngâm mình trong bồn tắm bọt xà phòng bồng bềnh! 🛁',
      'Vịt cao su bơi tung tăng trên mặt nước! 🐥',
      'Tắm rửa sạch sẽ thơm tho khắp người! 🌸',
    ],
    dialoguesEn: [
      'Soaking in warm fluffy bubble bath! 🛁',
      'Rubber ducky floating happily! 🐥',
      'Feeling clean, fresh, and refreshed! 🌸',
    ],
    sound: 'water',
  },
  {
    id: 'shower-take',
    category: 'hygiene',
    nameVi: 'Vòi hoa sen',
    nameEn: 'Shower',
    verbVi: 'Tắm vòi sen',
    verbEn: 'Take shower',
    match: {
      modelRegex: /^shower(round)?$/i,
      keywords: ['shower'],
    },
    pose: 'wash',
    duration: 3.5,
    effect: { kind: 'water' },
    emoji: '🚿',
    dialoguesVi: [
      'Tắm vòi hoa sen mát rượi sảng khoái! 🚿',
      'Dòng nước mát xua tan hết mệt mỏi! 💦',
    ],
    dialoguesEn: [
      'Refreshing cool shower feels wonderful! 🚿',
      'Cool water washes all tiredness away! 💦',
    ],
    sound: 'water',
  },
  {
    id: 'washer-wash',
    category: 'hygiene',
    nameVi: 'Máy giặt',
    nameEn: 'Washing Machine',
    verbVi: 'Giặt đồ',
    verbEn: 'Wash clothes',
    match: {
      modelRegex: /^washer(dryerstacked)?$/i,
      keywords: ['washer'],
    },
    pose: 'tap',
    duration: 2.8,
    effect: { kind: 'symbols', glyph: 'bubble' },
    emoji: '🧺',
    dialoguesVi: [
      'Bấm nút máy giặt quay vù vù sạch bong! 🧺',
      'Giúp bố mẹ phân loại áo quần ngăn nắp! 👕',
    ],
    dialoguesEn: [
      'Spinning round and washing clothes clean! 🧺',
      'Helping parents sort the laundry neatly! 👕',
    ],
  },
  {
    id: 'dryer-dry',
    category: 'hygiene',
    nameVi: 'Máy sấy quần áo',
    nameEn: 'Clothes Dryer',
    verbVi: 'Sấy quần áo',
    verbEn: 'Dry clothes',
    match: {
      modelRegex: /^dryer$/i,
      keywords: ['dryer'],
    },
    pose: 'tap',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '💨',
    dialoguesVi: [
      'Quần áo sấy khô thơm ngát mùi nắng mới! 💨',
    ],
    dialoguesEn: [
      'Warm clothes smelling fresh and cozy! 💨',
    ],
  },
  {
    id: 'bath-cabinet-tidy',
    category: 'hygiene',
    nameVi: 'Tủ gương phòng tắm',
    nameEn: 'Bathroom Cabinet',
    verbVi: 'Sắp xếp đồ',
    verbEn: 'Tidy cabinet',
    match: {
      modelRegex: /^bathroomcabinet(drawer)?$/i,
      keywords: ['bathroom-cabinet'],
    },
    pose: 'open',
    duration: 2.0,
    effect: { kind: 'open', toggle: true },
    offVi: 'Đóng tủ',
    offEn: 'Close cabinet',
    emoji: '🪥',
    dialoguesVi: [
      'Xếp gọn bàn chải, kem đánh răng vào cốc! 🪥',
    ],
    dialoguesEn: [
      'Tidying up toothbrushes and toothpaste cups! 🪥',
    ],
  },

  // ==========================================
  // 3. BẾP & ĂN UỐNG (Kitchen & Dining)
  // ==========================================
  {
    id: 'fridge-open',
    category: 'kitchen',
    nameVi: 'Tủ lạnh',
    nameEn: 'Refrigerator',
    verbVi: 'Mở tủ lạnh',
    verbEn: 'Open fridge',
    match: {
      modelRegex: /^(ncb-fridge|kitchenfridge(builtin|large|small)?)$/i,
      keywords: ['fridge'],
    },
    pose: 'open',
    duration: 2.5,
    effect: { kind: 'open', toggle: true },
    offVi: 'Đóng tủ lạnh',
    offEn: 'Close fridge',
    emoji: '🍎',
    dialoguesVi: [
      'Mở tủ lạnh lấy một quả táo giòn ngọt! 🍎',
      'Một cốc nước cam tươi mát lạnh sảng khoái! 🍊',
      'Nhớ đóng tủ lạnh ngay để tiết kiệm điện nha! ❄️',
    ],
    dialoguesEn: [
      'Grabbing a crunchy sweet red apple! 🍎',
      'Refreshing cool orange juice! 🍊',
      'Close the door promptly to save energy! ❄️',
    ],
  },
  {
    id: 'stove-cook',
    category: 'kitchen',
    nameVi: 'Bếp nấu ăn',
    nameEn: 'Cooking Stove',
    verbVi: 'Nấu món ngon',
    verbEn: 'Cook',
    match: {
      modelRegex: /^(kitchenstove(electric)?|xma-stove)$/i,
      keywords: ['stove'],
    },
    pose: 'cook',
    duration: 3.5,
    effect: { kind: 'steam' },
    emoji: '🍲',
    dialoguesVi: [
      'Xèo xèo... Nồi canh rau củ thơm nức mũi! 🍲',
      'Cùng mẹ làm món trứng cuộn vàng ươm! 🍳',
      'Lửa bếp an toàn, món ăn bổ dưỡng thơm ngon! 🥗',
    ],
    dialoguesEn: [
      'Sizzle sizzle... delicious vegetable soup simmering! 🍲',
      'Making tasty golden egg rolls! 🍳',
      'Cooking safely, healthy food for everyone! 🥗',
    ],
    sound: 'cook',
  },
  {
    id: 'microwave-warm',
    category: 'kitchen',
    nameVi: 'Lò vi sóng',
    nameEn: 'Microwave',
    verbVi: 'Hâm nóng thức ăn',
    verbEn: 'Heat food',
    match: {
      modelRegex: /^kitchenmicrowave$/i,
      keywords: ['microwave'],
    },
    pose: 'tap',
    duration: 2.5,
    effect: { kind: 'glow', color: '#ffd27a' },
    emoji: '🥛',
    dialoguesVi: [
      'Ting! Cốc sữa ấm bổ dưỡng đã sẵn sàng! 🥛',
      'Hâm nóng đĩa bánh thơm phức cho bữa xế! 🥐',
    ],
    dialoguesEn: [
      'Ding! Warm nourishing milk is ready! 🥛',
      'Warming up a delicious snack! 🥐',
    ],
    sound: 'ding',
  },
  {
    id: 'toaster-toast',
    category: 'kitchen',
    nameVi: 'Máy nướng bánh mì',
    nameEn: 'Toaster',
    verbVi: 'Nướng bánh',
    verbEn: 'Toast bread',
    match: {
      modelRegex: /^toaster$/i,
      keywords: ['toaster'],
    },
    pose: 'tap',
    duration: 2.2,
    effect: { kind: 'steam' },
    emoji: '🍞',
    dialoguesVi: [
      'Tách! Hai lát bánh mì vàng giòn rụm bật lên! 🍞',
      'Quết thêm một chút mứt dâu ngọt ngào! 🍓',
    ],
    dialoguesEn: [
      'Pop! Two crispy golden toasts pop up! 🍞',
      'Spread with delicious strawberry jam! 🍓',
    ],
    sound: 'ding',
  },
  {
    id: 'blender-smoothie',
    category: 'kitchen',
    nameVi: 'Máy xay sinh tố',
    nameEn: 'Blender',
    verbVi: 'Xay sinh tố',
    verbEn: 'Blend smoothie',
    match: {
      modelRegex: /^kitchenblender$/i,
      keywords: ['blender'],
    },
    pose: 'tap',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'sparkle', color: '#ff9ec7' },
    emoji: '🥤',
    dialoguesVi: [
      'Rù rù... Ly sinh tố bơ xoài đặc sánh ngọt ngào! 🥭',
    ],
    dialoguesEn: [
      'Whirr... Delicious mango avocado smoothie ready! 🥭',
    ],
  },
  {
    id: 'coffeemaker-cocoa',
    category: 'kitchen',
    nameVi: 'Máy pha cacao ấm',
    nameEn: 'Drink Maker',
    verbVi: 'Pha ca cao',
    verbEn: 'Make cocoa',
    match: {
      modelRegex: /^kitchencoffeemachine$/i,
      keywords: ['coffee-machine'],
    },
    pose: 'tap',
    duration: 2.5,
    effect: { kind: 'steam' },
    emoji: '☕',
    dialoguesVi: [
      'Một cốc cacao nóng ấm thơm lừng trong ngày se lạnh! ☕',
    ],
    dialoguesEn: [
      'A warm cup of sweet hot cocoa on a chilly day! ☕',
    ],
  },
  {
    id: 'kitchen-sink-dish',
    category: 'kitchen',
    nameVi: 'Bồn rửa bát',
    nameEn: 'Kitchen Sink',
    verbVi: 'Rửa bát đĩa',
    verbEn: 'Wash dishes',
    match: {
      modelRegex: /^kitchensink$/i,
      keywords: ['kitchen-sink'],
    },
    pose: 'wash',
    duration: 3.0,
    effect: { kind: 'water' },
    emoji: '🍽️',
    dialoguesVi: [
      'Giúp mẹ rửa bát đĩa sạch bong kin kít! 🍽️✨',
      'Xếp bát gọn vào giá cho ráo nước! 🥣',
    ],
    dialoguesEn: [
      'Helping wash plates until they squeak clean! 🍽️✨',
      'Stacking bowls neatly on the drying rack! 🥣',
    ],
    sound: 'water',
  },
  {
    id: 'dining-table-sit',
    category: 'kitchen',
    nameVi: 'Bàn ăn gia đình',
    nameEn: 'Dining Table',
    verbVi: 'Mời cơm',
    verbEn: 'Have a meal',
    match: {
      modelRegex: /^(table(round|cross|cloth|crosscloth)|xma-dining-table)$/i,
      keywords: ['dining-table'],
    },
    pose: 'eat',
    duration: 4,
    effect: { kind: 'steam' },
    emoji: '🍚',
    dialoguesVi: [
      'Cháu mời cả nhà cùng xơi cơm ạ! 🍚',
      'Bữa cơm gia đình ấm cúng và đầy ắp tiếng cười! 👨‍👩‍👧',
    ],
    dialoguesEn: [
      'Inviting everyone to have dinner together! 🍚',
      'Warm family dinner full of laughter! 👨‍👩‍👧',
    ],
  },
  {
    id: 'bar-stool-sit',
    category: 'kitchen',
    nameVi: 'Ghế cao quầy bar',
    nameEn: 'Bar Stool',
    verbVi: 'Ngồi ghế cao',
    verbEn: 'Sit on stool',
    match: {
      modelRegex: /^(stoolbar(square)?|cp-stool)$/i,
      keywords: ['stool'],
    },
    pose: 'sit',
    duration: 0,
    noEffect: 'a seat: it holds her as she sits and stays as it is',
    emoji: '🍹',
    dialoguesVi: [
      'Ngồi trên ghế cao đung đưa chân thật thích! 🍹',
    ],
    dialoguesEn: [
      'Swinging my feet happily on this high stool! 🍹',
    ],
  },
  {
    id: 'trashcan-tidy',
    category: 'kitchen',
    nameVi: 'Thùng rác phân loại',
    nameEn: 'Trash Can',
    verbVi: 'Bỏ rác vào thùng',
    verbEn: 'Throw trash',
    match: {
      modelRegex: /^trashcan$/i,
      keywords: ['trashcan'],
    },
    pose: 'tap',
    duration: 2.0,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '🗑️',
    dialoguesVi: [
      'Bỏ rác đúng nơi quy định, môi trường thêm xanh! 🗑️🌱',
      'Phân loại rác tái chế để bảo vệ trái đất! ♻️',
    ],
    dialoguesEn: [
      'Putting trash in the bin keeps our world green! 🗑️🌱',
      'Recycling properly to protect planet Earth! ♻️',
    ],
  },

  // ==========================================
  // 4. HỌC TẬP & SÁNG TẠO (Study & Creative)
  // ==========================================
  {
    id: 'desk-study',
    category: 'study',
    nameVi: 'Bàn học tập',
    nameEn: 'Study Desk',
    verbVi: 'Học bài',
    verbEn: 'Study',
    match: {
      slots: ['desk'],
      modelRegex: /^(ncb-desk-[a-z]+|desk(corner)?|th-desk|tv-desk-long)$/i,
      keywords: ['desk'],
    },
    pose: 'study',
    duration: 0,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '✏️',
    dialoguesVi: [
      'Bé chăm chỉ làm bài tập, viết chữ nắn nót! ✏️',
      'Học toán vui và rèn luyện tư duy mỗi ngày! 🔢',
      'Mỗi ngày học thêm một điều hay mới lạ! 🌟',
    ],
    dialoguesEn: [
      'Studying diligently with neat handwriting! ✏️',
      'Fun math exercises train a sharp mind! 🔢',
      'Learning wonderful new things every day! 🌟',
    ],
  },
  {
    id: 'bookcase-pick',
    category: 'study',
    nameVi: 'Tủ sách truyện',
    nameEn: 'Bookcase',
    verbVi: 'Chọn sách',
    verbEn: 'Pick book',
    match: {
      modelRegex: /^(bookcase(closed|closeddoors|closedwide|open|openlow)?|ncb-bookcase-tall|th-bookcase|ld-bookshelf|books)$/i,
      keywords: ['bookcase', 'bookshelf'],
    },
    pose: 'study',
    duration: 3.0,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '📚',
    dialoguesVi: [
      'Tìm thấy một cuốn truyện cổ tích tuyệt hay! 📚',
      'Sách là người bạn mở ra chân trời tri thức! 🌍',
      'Đọc xong nhớ cất sách vào kệ ngay ngắn nhé! 📖',
    ],
    dialoguesEn: [
      'Found a wonderful fairy tale book! 📚',
      'Books are friends opening new horizons! 🌍',
      'Putting the book back neatly on the shelf! 📖',
    ],
  },
  {
    id: 'computer-learn',
    category: 'study',
    nameVi: 'Máy vi tính',
    nameEn: 'Computer',
    verbVi: 'Gõ máy tính',
    verbEn: 'Use computer',
    match: {
      modelRegex: /^(computerscreen|laptop|computerkeyboard|tv-computer)$/i,
      keywords: ['computer', 'laptop'],
    },
    pose: 'study',
    duration: 3.0,
    effect: { kind: 'screen', toggle: true },
    offVi: 'Tắt máy tính',
    offEn: 'Turn off computer',
    emoji: '💻',
    dialoguesVi: [
      'Gõ phím lách cách tìm hiểu thế giới loài vật! 💻',
      'Lập trình điều khiển bạn rô-bốt thông minh! 🤖',
    ],
    dialoguesEn: [
      'Typing away to research amazing animals! 💻',
      'Programming a friendly smart robot! 🤖',
    ],
  },
  {
    id: 'globe-spin',
    category: 'study',
    nameVi: 'Quả địa cầu',
    nameEn: 'World Globe',
    verbVi: 'Xoay địa cầu',
    verbEn: 'Spin globe',
    match: {
      modelRegex: /^(tv-)?globe$/i,
      keywords: ['globe'],
    },
    pose: 'tap',
    duration: 2.5,
    effect: { kind: 'spin', toggle: false },
    emoji: '🌍',
    dialoguesVi: [
      'Xoay xoay... Việt Nam hình chữ S xinh tươi bên bờ Biển Đông! 🌍',
      'Thế giới bao la với năm châu bốn biển tuyệt đẹp! 🗺️',
    ],
    dialoguesEn: [
      'Spinning around... Finding Vietnam on the globe! 🌍',
      'The vast world with beautiful continents and oceans! 🗺️',
    ],
  },
  {
    id: 'blackboard-chalk',
    category: 'study',
    nameVi: 'Bảng phấn lớp học',
    nameEn: 'Chalkboard',
    verbVi: 'Lau bảng',
    verbEn: 'Clean board',
    match: {
      modelRegex: /^(blackboard|whiteboard|cp-chalkboard-[a-z]+|tv-whiteboard)$/i,
      keywords: ['board', 'blackboard', 'chalkboard', 'whiteboard'],
    },
    pose: 'sweep',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '🏫',
    dialoguesVi: [
      'Lau bảng sạch bóng chuẩn bị cho tiết học mới! 🏫',
      'Viết dòng chữ chào mừng thầy cô và bè bạn! ✨',
    ],
    dialoguesEn: [
      'Cleaning the chalkboard ready for next class! 🏫',
      'Writing welcoming words for friends and teacher! ✨',
    ],
  },
  {
    id: 'calendar-read',
    category: 'study',
    nameVi: 'Lịch treo tường',
    nameEn: 'Calendar',
    verbVi: 'Xem lịch',
    verbEn: 'Check calendar',
    match: {
      modelRegex: /^(calendar|ncb-uniform-calendar)$/i,
      keywords: ['calendar'],
    },
    pose: 'study',
    duration: 2.0,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '📅',
    dialoguesVi: [
      'Hôm nay là một ngày tuyệt vời để khám phá điều mới! 📅',
    ],
    dialoguesEn: [
      'Today is a wonderful day to explore new things! 📅',
    ],
  },

  // ==========================================
  // 5. GIẢI TRÍ & ĐỒ CHƠI (Entertainment & Toys)
  // ==========================================
  {
    id: 'tv-watch',
    category: 'entertainment',
    nameVi: 'Tivi phòng khách',
    nameEn: 'Television',
    verbVi: 'Bật tivi',
    verbEn: 'Watch TV',
    match: {
      modelRegex: /^television(modern|vintage|antenna)?$/i,
      keywords: ['tivi'],
    },
    pose: 'watch',
    duration: 3.5,
    effect: { kind: 'screen', toggle: true },
    offVi: 'Tắt tivi',
    offEn: 'Turn off TV',
    emoji: '📺',
    dialoguesVi: [
      'Bật tivi xem hoạt hình Chú Mèo Máy vui nhộn! 📺',
      'Xem chương trình thế giới động vật kỳ thú! 🦁',
      'Nhớ ngồi cách xa tivi để giữ đôi mắt sáng nhé! 👀',
    ],
    dialoguesEn: [
      'Watching exciting animated cartoons! 📺',
      'Watching fascinating wildlife documentaries! 🦁',
      'Sitting at a safe distance to protect our eyes! 👀',
    ],
  },
  {
    id: 'radio-music',
    category: 'entertainment',
    nameVi: 'Đài phát thanh',
    nameEn: 'Radio',
    verbVi: 'Bật đài nghe nhạc',
    verbEn: 'Listen to radio',
    match: {
      modelRegex: /^radio$/i,
      keywords: ['radio'],
    },
    pose: 'dance',
    duration: 3.0,
    effect: { kind: 'symbols', glyph: 'note' },
    emoji: '📻',
    dialoguesVi: [
      'Giai điệu ca khúc thiếu nhi rộn ràng cất lên! 📻🎶',
      'Cùng vỗ tay theo bài hát vui tươi nào! 👏',
    ],
    dialoguesEn: [
      'Upbeat cheerful tunes playing on the radio! 📻🎶',
      'Clapping hands along with the happy rhythm! 👏',
    ],
    sound: 'chime',
  },
  {
    id: 'speaker-dance',
    category: 'entertainment',
    nameVi: 'Loa âm nhạc',
    nameEn: 'Speaker',
    verbVi: 'Bật loa nhảy múa',
    verbEn: 'Play music',
    match: {
      modelRegex: /^speaker(small)?$/i,
      keywords: ['speaker'],
    },
    pose: 'dance',
    duration: 3.0,
    effect: { kind: 'symbols', glyph: 'note' },
    emoji: '🎵',
    dialoguesVi: [
      'Âm nhạc sôi động, cùng nhún nhảy theo nhịp điệu! 🎵🕺',
      'Một điệu nhảy vui vẻ tràn đầy sức sống! ✨',
    ],
    dialoguesEn: [
      'Lively music, dancing to the joyful beat! 🎵🕺',
      'A happy dance filled with energetic fun! ✨',
    ],
    sound: 'chime',
  },
  {
    id: 'fan-breeze',
    category: 'entertainment',
    nameVi: 'Quạt trần làm mát',
    nameEn: 'Ceiling Fan',
    verbVi: 'Bật quạt',
    verbEn: 'Turn on fan',
    match: {
      modelRegex: /^(ceilingfan|fan)$/i,
      keywords: ['fan'],
    },
    pose: 'tap',
    duration: 2.2,
    effect: { kind: 'spin', toggle: true },
    offVi: 'Tắt quạt',
    offEn: 'Turn off fan',
    emoji: '🌀',
    dialoguesVi: [
      'Quạt quay vù vù thổi luồng gió mát rượi! 🌀💨',
    ],
    dialoguesEn: [
      'Fan spinning around blowing a refreshing breeze! 🌀💨',
    ],
  },
  {
    id: 'teddy-hug',
    category: 'entertainment',
    nameVi: 'Gấu bông Teddy',
    nameEn: 'Teddy Bear',
    verbVi: 'Ôm gấu bông',
    verbEn: 'Hug teddy',
    match: {
      modelRegex: /^teddy-bear$/i,
      keywords: ['teddy'],
    },
    pose: 'hug',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'heart' },
    emoji: '🧸',
    dialoguesVi: [
      'Ôm bạn gấu bông mềm mại ấm áp vào lòng! 🧸❤️',
      'Gấu bông là bạn thân cùng bé nghe kể chuyện! 🐻',
    ],
    dialoguesEn: [
      'Giving the soft teddy bear a warm gentle hug! 🧸❤️',
      'Teddy bear is a loyal friend listening to stories! 🐻',
    ],
  },
  {
    id: 'nesting-doll-play',
    category: 'entertainment',
    nameVi: 'Búp bê gỗ Nga',
    nameEn: 'Nesting Dolls',
    verbVi: 'Chơi búp bê',
    verbEn: 'Open dolls',
    match: {
      modelRegex: /^nesting-dolls$/i,
      keywords: ['nesting-dolls'],
    },
    pose: 'open',
    duration: 2.8,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '🪆',
    dialoguesVi: [
      'Mở búp bê lớn ra búp bê nhỏ xíu bên trong! 🪆',
      'Cả gia đình búp bê xếp thành một hàng xinh xắn! ✨',
    ],
    dialoguesEn: [
      'Opening the doll reveals tiny dolls nestled inside! 🪆',
      'A cute family of nesting dolls standing in line! ✨',
    ],
  },
  {
    id: 'lamp-toggle',
    category: 'entertainment',
    nameVi: 'Đèn trang trí',
    nameEn: 'Room Lamp',
    verbVi: 'Bật đèn',
    verbEn: 'Turn on lamp',
    match: {
      slots: ['lamp', 'lights'],
      modelRegex: /^(lamp(roundfloor|squarefloor|roundtable|squaretable|squareceiling|wall)|ncb-lamp-[a-z]+|ncb-garden-lamp-[a-z]+|tv-reading-lamp|tv-wall-lantern|street-lantern|kr-lantern-pole)$/i,
      keywords: ['lamp'],
    },
    pose: 'tap',
    duration: 2.0,
    effect: { kind: 'light', toggle: true },
    offVi: 'Tắt đèn',
    offEn: 'Turn off lamp',
    emoji: '💡',
    dialoguesVi: [
      'Tách! Ánh sáng dịu dàng soi sáng khắp phòng! 💡✨',
      'Đèn bàn sáng rõ giúp bé đọc sách không mỏi mắt! 📖',
    ],
    dialoguesEn: [
      'Click! Gentle cozy light illuminates the room! 💡✨',
      'Bright desk lamp protects eyes while reading! 📖',
    ],
    sound: 'click',
  },
  {
    id: 'rug-play',
    category: 'entertainment',
    nameVi: 'Thảm phòng khách',
    nameEn: 'Play Rug',
    verbVi: 'Ngồi chơi trên thảm',
    verbEn: 'Sit on rug',
    match: {
      slots: ['rug'],
      modelRegex: /^(rug(round|rounded|rectangle|square|doormat)?|ncb-rug-[a-z]+|ncb-cat-rug|xma-rug)$/i,
      keywords: ['rug'],
    },
    pose: 'sit',
    duration: 0,
    noEffect: 'a rug: she sits on it and it stays as it is',
    emoji: '🧶',
    dialoguesVi: [
      'Ngồi chơi xếp hình trên thảm ấm áp! 🧶',
      'Thảm hình xinh xắn làm căn phòng thêm rực rỡ! 🌈',
    ],
    dialoguesEn: [
      'Playing puzzle blocks on the cozy warm rug! 🧶',
      'Colorful rug makes the room look vibrant! 🌈',
    ],
  },

  // ==========================================
  // 6. SÂN VƯỜN & NGOÀI TRỜI (Outdoor & Garden)
  // ==========================================
  {
    id: 'plant-water',
    category: 'outdoor',
    nameVi: 'Chậu cây cảnh',
    nameEn: 'Potted Plant',
    verbVi: 'Tưới nước',
    verbEn: 'Water plant',
    match: {
      modelRegex: /^(pottedplant|potted-plant|plantsmall[123]|seedling|cp-planter|th-planter)$/i,
      keywords: ['plant'],
    },
    pose: 'water',
    duration: 2.8,
    effect: { kind: 'water' },
    emoji: '🪴',
    dialoguesVi: [
      'Tưới từng giọt nước mát cho mầm cây xanh tốt! 🪴💧',
      'Cây ơi lớn nhanh đâm chồi nảy lộc nhé! 🌱',
      'Bé chăm sóc cây để ngôi nhà thêm xanh tươi! 🌿',
    ],
    dialoguesEn: [
      'Watering the green plant with fresh cool drops! 🪴💧',
      'Grow tall and strong, little green sprout! 🌱',
      'Caring for plants keeps our home green and lovely! 🌿',
    ],
    sound: 'water',
  },
  {
    id: 'flower-smell',
    category: 'outdoor',
    nameVi: 'Khóm hoa thơm',
    nameEn: 'Flower Blossom',
    verbVi: 'Ngửi hoa',
    verbEn: 'Smell flowers',
    match: {
      modelRegex: /^(flower_[a-z]+|lotus|nt-sunflower|nt-flower-pot|xma-flower-pot|ncb-flower-box|cp-flowers-(warm|cool))$/i,
      keywords: ['flower', 'flowers', 'sunflower'],
    },
    pose: 'smell',
    duration: 2.2,
    effect: { kind: 'symbols', glyph: 'sparkle', color: '#ff9ec7' },
    emoji: '🌸',
    dialoguesVi: [
      'Hít hà... Hương hoa thơm dịu dàng ngát hương! 🌸',
      'Ong bướm rập rờn bay quanh những cánh hoa xinh! 🦋',
    ],
    dialoguesEn: [
      'Mmm... Sweet and lovely floral fragrance! 🌸',
      'Butterflies dancing around colorful blossoms! 🦋',
    ],
  },
  {
    id: 'mailbox-check',
    category: 'outdoor',
    nameVi: 'Hòm thư trước cổng',
    nameEn: 'Mailbox',
    verbVi: 'Kiểm tra thư',
    verbEn: 'Check mail',
    match: {
      modelRegex: /^(mailbox|ncb-cat-mailbox|nt-mailbox)$/i,
      keywords: ['mailbox'],
    },
    pose: 'open',
    duration: 2.5,
    effect: { kind: 'open', toggle: true },
    offVi: 'Đóng hòm thư',
    offEn: 'Close mailbox',
    emoji: '📬',
    dialoguesVi: [
      'Két! Có bức thư chúc mừng gửi từ người bạn phương xa! 📬',
      'Bưu thiếp rực rỡ sắc màu gửi tặng bé ngoan! 💌',
    ],
    dialoguesEn: [
      'Click! A sweet postcard from a dear friend! 📬',
      'Colorful postcard wishing you a great day! 💌',
    ],
  },
  {
    id: 'doorbell-ring',
    category: 'outdoor',
    nameVi: 'Chuông cửa',
    nameEn: 'Doorbell',
    verbVi: 'Bấm chuông',
    verbEn: 'Ring bell',
    match: {
      modelRegex: /^(door|doorway(front|open)?)$/i,
    },
    pose: 'tap',
    duration: 2.0,
    effect: { kind: 'symbols', glyph: 'note' },
    emoji: '🔔',
    dialoguesVi: [
      'Kính coong! Bé gõ cửa lịch sự trước khi bước vào! 🔔',
    ],
    dialoguesEn: [
      'Ding-dong! Politely knocking before entering! 🔔',
    ],
    sound: 'chime',
  },
  {
    id: 'front-door',
    category: 'outdoor',
    nameVi: 'Cửa chính',
    nameEn: 'Front Door',
    verbVi: 'Mở cửa',
    verbEn: 'Open door',
    offVi: 'Đóng cửa',
    offEn: 'Close door',
    match: {
      modelRegex: /^ncb-door-(left|right)$/i,
    },
    radius: 2.6,
    pose: 'open',
    duration: 1.0,
    effect: { kind: 'door', toggle: true },
    emoji: '🚪',
    dialoguesVi: [
      'Cửa nhà mở rộng chào đón bé về! 🚪',
      'Kẹt kẹt... cánh cửa gỗ mở ra rồi! 🏡',
    ],
    dialoguesEn: [
      'The front door swings open to welcome me home! 🚪',
      'Creak... the wooden door opens! 🏡',
    ],
  },
  {
    id: 'stair-cupboard-open',
    category: 'chores',
    nameVi: 'Tủ gầm cầu thang',
    nameEn: 'Cupboard Under the Stairs',
    verbVi: 'Mở tủ',
    verbEn: 'Open cupboard',
    offVi: 'Đóng tủ',
    offEn: 'Close cupboard',
    match: {
      modelRegex: /^ncb-under-stair-door$/i,
    },
    pose: 'open',
    duration: 1.4,
    effect: { kind: 'open', toggle: true },
    emoji: '🧹',
    dialoguesVi: [
      'Tủ nhỏ gầm cầu thang cất chổi và hộp đồ chơi! 🧹',
      'Ngó vào tủ nhỏ xem có gì bí mật nào! 🔦',
    ],
    dialoguesEn: [
      'The little cupboard keeps the broom and the toy box! 🧹',
      'Peeking into the little cupboard for secrets! 🔦',
    ],
  },
  {
    id: 'gift-open',
    category: 'entertainment',
    nameVi: 'Hộp quà',
    nameEn: 'Gift Box',
    verbVi: 'Mở quà',
    verbEn: 'Open gift',
    match: {
      modelRegex: /^gift-[a-z]+$/i,
      keywords: ['gift'],
    },
    pose: 'open',
    duration: 2.2,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '🎁',
    dialoguesVi: [
      'Mở hộp quà ra xem bên trong có gì nào! 🎁',
      'Ồ, một bất ngờ thật dễ thương! ✨',
    ],
    dialoguesEn: [
      'Opening the gift box to see what is inside! 🎁',
      'Oh, what a lovely surprise! ✨',
    ],
  },
  {
    id: 'puzzle-play',
    category: 'entertainment',
    nameVi: 'Bộ xếp hình',
    nameEn: 'Jigsaw Puzzle',
    verbVi: 'Ghép hình',
    verbEn: 'Do the puzzle',
    match: {
      modelRegex: /^puzzle-[a-z]+$/i,
      keywords: ['puzzle'],
    },
    pose: 'study',
    duration: 3,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '🧩',
    dialoguesVi: [
      'Mảnh này ghép vào đây là vừa khít! 🧩',
      'Ghép xong rồi, bức tranh đẹp quá! ⭐',
    ],
    dialoguesEn: [
      'This piece fits right here! 🧩',
      'Done! What a pretty picture! ⭐',
    ],
  },
  {
    id: 'shell-listen',
    category: 'entertainment',
    nameVi: 'Vỏ ốc biển',
    nameEn: 'Sea Shell',
    verbVi: 'Nghe vỏ ốc',
    verbEn: 'Listen to shell',
    match: {
      modelRegex: /^spiral-shell$/i,
      keywords: ['shell'],
    },
    pose: 'tap',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'note', color: '#7fd3e6' },
    emoji: '🐚',
    dialoguesVi: [
      'Áp vỏ ốc vào tai nghe tiếng sóng biển rì rào! 🐚',
      'Biển đang hát trong vỏ ốc nhỏ xinh! 🌊',
    ],
    dialoguesEn: [
      'Holding the shell to my ear to hear the waves! 🐚',
      'The sea is singing inside the little shell! 🌊',
    ],
  },
  {
    id: 'letter-read',
    category: 'study',
    nameVi: 'Lá thư',
    nameEn: 'Letter',
    verbVi: 'Đọc thư',
    verbEn: 'Read letter',
    match: {
      modelRegex: /^envelope$/i,
      keywords: ['letter'],
    },
    pose: 'study',
    duration: 2.6,
    effect: { kind: 'symbols', glyph: 'heart' },
    emoji: '💌',
    dialoguesVi: [
      'Một lá thư dễ thương gửi cho mình nè! 💌',
      'Đọc thư thấy vui cả ngày luôn! ✨',
    ],
    dialoguesEn: [
      'A lovely letter just for me! 💌',
      'Reading it makes the whole day happy! ✨',
    ],
  },
  {
    id: 'piano-play',
    category: 'entertainment',
    nameVi: 'Đàn piano',
    nameEn: 'Piano',
    verbVi: 'Chơi đàn',
    verbEn: 'Play piano',
    match: {
      modelRegex: /^(th-piano|piano)$/i,
      keywords: ['piano'],
    },
    pose: 'tap',
    duration: 3,
    effect: { kind: 'symbols', glyph: 'note' },
    emoji: '🎹',
    dialoguesVi: [
      'Đô rê mi pha son... tiếng đàn vang lên trong veo! 🎹',
      'Bé đánh một bản nhạc vui cho cả lớp nghe! 🎶',
    ],
    dialoguesEn: [
      'Do re mi fa so... the piano rings out clear! 🎹',
      'Playing a happy tune for the whole class! 🎶',
    ],
  },
  {
    id: 'slide-play',
    category: 'outdoor',
    nameVi: 'Cầu trượt',
    nameEn: 'Slide',
    verbVi: 'Chơi cầu trượt',
    verbEn: 'Play on slide',
    match: {
      modelRegex: /^(playground-slide|slide)$/i,
      keywords: ['slide'],
    },
    pose: 'cheer',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '🛝',
    dialoguesVi: [
      'Vèo... trượt xuống nhanh ơi là nhanh! 🛝',
      'Leo lên rồi trượt xuống thêm lần nữa nào! ✨',
    ],
    dialoguesEn: [
      'Whee... sliding down so fast! 🛝',
      'Climb up and slide down once more! ✨',
    ],
  },
  {
    id: 'well-bucket',
    category: 'outdoor',
    nameVi: 'Giếng nước làng quê',
    nameEn: 'Water Well',
    verbVi: 'Múc nước giếng',
    verbEn: 'Draw water',
    match: {
      modelRegex: /^(well|bucket|xma-hanging-bucket)$/i,
      keywords: ['well'],
    },
    pose: 'water',
    duration: 3.0,
    effect: { kind: 'water' },
    emoji: '💧',
    dialoguesVi: [
      'Kéo gầu nước giếng trong vắt mát rượi tận đáy! 💧',
      'Dòng nước mát lành của làng quê thân thương! 🌿',
    ],
    dialoguesEn: [
      'Drawing up a bucket of crystal clear cool water! 💧',
      'Refreshing cool spring water from the village well! 🌿',
    ],
    sound: 'water',
  },
  {
    id: 'campfire-warm',
    category: 'outdoor',
    nameVi: 'Lửa trại ấm cúng',
    nameEn: 'Campfire',
    verbVi: 'Sưởi ấm',
    verbEn: 'Warm hands',
    match: {
      modelRegex: /^(campfire(-pit|-stand)?|nt-fire|ntu-hearth-fire)$/i,
      keywords: ['campfire'],
    },
    pose: 'wash',
    duration: 3.0,
    effect: { kind: 'symbols', glyph: 'sparkle', color: '#ffa53a' },
    emoji: '🔥',
    dialoguesVi: [
      'Hơ tay bên ánh lửa bập bùng ấm áp! 🔥',
      'Cùng quây quần kể chuyện cổ tích bên đống lửa! ⛺',
    ],
    dialoguesEn: [
      'Warming hands near the cozy flickering fire! 🔥',
      'Gathering round to share stories by the campsite! ⛺',
    ],
  },
  {
    id: 'fruit-pick',
    category: 'outdoor',
    nameVi: 'Cây ăn quả',
    nameEn: 'Fruit Tree',
    verbVi: 'Hái quả chín',
    verbEn: 'Pick fruit',
    match: {
      modelRegex: /^(apple|cherries|banana|orange|nt-apple|nt-orange|nt-apple-crate|cp-crate-(apple|orange)|ncb-fruit-bowl)$/i,
      keywords: ['fruit'],
    },
    pose: 'stretch',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '🍊',
    dialoguesVi: [
      'Hái một quả chín mọng ngọt lịm từ trên cành! 🍊',
      'Trái cây tươi ngon dồi dào vitamin bổ dưỡng! 🍎',
    ],
    dialoguesEn: [
      'Picking ripe juicy fruit from the sunny branch! 🍊',
      'Fresh fruit packed with healthy vitamins! 🍎',
    ],
  },
  {
    id: 'skateboard-ride',
    category: 'outdoor',
    nameVi: 'Ván trượt đường phố',
    nameEn: 'Skateboard',
    verbVi: 'Thử trượt ván',
    verbEn: 'Try skateboard',
    match: {
      modelRegex: /^skateboard$/i,
      keywords: ['skateboard'],
    },
    pose: 'cheer',
    duration: 2.8,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '🛹',
    dialoguesVi: [
      'Lướt ván trượt bon bon đón gió lồng lộng! 🛹💨',
    ],
    dialoguesEn: [
      'Gliding smoothly on the skateboard! 🛹💨',
    ],
  },
  {
    id: 'basketball-shoot',
    category: 'outdoor',
    nameVi: 'Bóng rổ sân trường',
    nameEn: 'Basketball',
    verbVi: 'Ném bóng rổ',
    verbEn: 'Shoot hoop',
    match: {
      modelRegex: /^(basketball|basketball-hoop)$/i,
      keywords: ['basketball'],
    },
    pose: 'cheer',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '🏀',
    dialoguesVi: [
      'Ném bóng vào rổ trúng đích xuất sắc! 🏀🎯',
    ],
    dialoguesEn: [
      'Swish! A perfect basket right through the hoop! 🏀🎯',
    ],
  },
  {
    id: 'soccer-kick',
    category: 'outdoor',
    nameVi: 'Bóng đá sân cỏ',
    nameEn: 'Soccer Ball',
    verbVi: 'Sút bóng',
    verbEn: 'Kick soccer ball',
    match: {
      modelRegex: /^soccer-ball$/i,
      keywords: ['soccer'],
    },
    pose: 'kick',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'star' },
    emoji: '⚽',
    dialoguesVi: [
      'Vào rồi! Cú sút tung lưới ghi bàn tuyệt đẹp! ⚽🎉',
    ],
    dialoguesEn: [
      'Goal! A wonderful kick right into the net! ⚽🎉',
    ],
  },

  // ==========================================
  // 7. THÚ CƯNG & ĐỜI SỐNG (Pets & Caring)
  // ==========================================
  {
    id: 'pet-bowl-feed',
    category: 'pet',
    nameVi: 'Bát thức ăn thú cưng',
    nameEn: 'Pet Food Bowl',
    verbVi: 'Cho thú cưng ăn',
    verbEn: 'Feed pet',
    match: {
      modelRegex: /^(pet-bowl|bowl)$/i,
      keywords: ['pet-bowl'],
    },
    pose: 'pet',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'heart' },
    emoji: '🐾',
    dialoguesVi: [
      'Đổ hạt thơm ngon cho cún cưng và mèo con! 🐾🥣',
      'Thú cưng ăn ngoan chóng lớn khỏe mạnh nhé! 🐶',
    ],
    dialoguesEn: [
      'Serving tasty treats for our friendly pets! 🐾🥣',
      'Eat well and grow strong, sweet little puppy! 🐶',
    ],
  },
  {
    id: 'pet-brush',
    category: 'pet',
    nameVi: 'Lược chải lông thú cưng',
    nameEn: 'Pet Brush',
    verbVi: 'Chải lông thú',
    verbEn: 'Brush pet',
    match: {
      modelRegex: /^paintbrush$/i,
      keywords: ['pet-brush'],
    },
    pose: 'pet',
    duration: 2.5,
    effect: { kind: 'symbols', glyph: 'heart' },
    emoji: '🐱',
    dialoguesVi: [
      'Chải bộ lông mượt mà cho mèo cưng kêu meo meo! 🐱✨',
    ],
    dialoguesEn: [
      'Gently brushing soft fur, kitty purrs happily! 🐱✨',
    ],
  },

  // ==========================================
  // 8. ĂN UỐNG & MÓN NGON (Eating & Dining)
  // ==========================================
  {
    id: 'cake-eat',
    category: 'dining',
    nameVi: 'Bánh ngọt sinh nhật',
    nameEn: 'Sweet Cake',
    verbVi: 'Thưởng thức bánh',
    verbEn: 'Eat cake',
    match: {
      modelRegex: /^(cake|cupcake|pie|birthday-cake)$/i,
      keywords: ['cake', 'cupcake'],
    },
    pose: 'eat',
    duration: 3.0,
    effect: { kind: 'symbols', glyph: 'heart' },
    emoji: '🍰',
    dialoguesVi: [
      'Chom chom... Bánh kem xốp mềm ngọt ngào tan trong miệng! 🍰✨',
      'Miếng bánh thơm lừng mùi vani và dâu tây! 🍓',
      'Ăn bánh thật ngon miệng, cùng chia sẻ với các bạn nào! 😋',
    ],
    dialoguesEn: [
      'Yum yum... Fluffy sweet cake melts in my mouth! 🍰✨',
      'Delicious cake smelling of fresh vanilla and strawberries! 🍓',
      'So tasty! Sharing sweet treats with friends! 😋',
    ],
    sound: 'ding',
  },
  {
    id: 'bread-eat',
    category: 'dining',
    nameVi: 'Bánh mì nướng giòn',
    nameEn: 'Crispy Bread',
    verbVi: 'Ăn bánh mì',
    verbEn: 'Eat bread',
    match: {
      modelRegex: /^(bread|croissant|cp-tray-bread|nt-bread-table)$/i,
      keywords: ['bread', 'croissant'],
    },
    pose: 'eat',
    duration: 2.8,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '🥐',
    dialoguesVi: [
      'Rộp rộp... Bánh sừng bò bơ thơm giòn rụm! 🥐',
      'Bánh mì nóng hổi tiếp thêm nhiều năng lượng cho ngày mới! 🍞⚡',
    ],
    dialoguesEn: [
      'Crunch crunch... Buttery croissant is so flaky and crisp! 🥐',
      'Fresh warm bread gives plenty of energy for playtime! 🍞⚡',
    ],
  },
  {
    id: 'soup-eat',
    category: 'dining',
    nameVi: 'Bát súp rau củ',
    nameEn: 'Warm Soup',
    verbVi: 'Húp súp ngon',
    verbEn: 'Eat soup',
    match: {
      modelRegex: /^(bowl-soup|pot-stew)$/i,
      keywords: ['soup', 'pot-stew'],
    },
    pose: 'eat',
    duration: 3.2,
    effect: { kind: 'steam' },
    emoji: '🍲',
    dialoguesVi: [
      'Xì xụp... Bát súp hầm rau củ ngọt thanh ấm bụng! 🍲😋',
      'Thổi phù phù cho nguội bớt rồi thưởng thức từng muỗng súp! 🥄',
    ],
    dialoguesEn: [
      'Slurp... Warm vegetable stew is so comforting and healthy! 🍲😋',
      'Blowing gently to cool down each delicious spoonful! 🥄',
    ],
  },
  {
    id: 'fruit-slice-eat',
    category: 'dining',
    nameVi: 'Dưa hấu mát lành',
    nameEn: 'Fresh Watermelon',
    verbVi: 'Ăn hoa quả',
    verbEn: 'Eat fruit',
    match: {
      modelRegex: /^(watermelon|pineapple|grapes|pear)$/i,
      keywords: ['watermelon', 'fruit-plate'],
    },
    pose: 'eat',
    duration: 2.8,
    effect: { kind: 'symbols', glyph: 'sparkle' },
    emoji: '🍉',
    dialoguesVi: [
      'Cắn một miếng dưa hấu đỏ au ngọt mát lịm! 🍉💦',
      'Hoa quả tươi ngon vừa giải nhiệt vừa bổ dưỡng! 🍍',
    ],
    dialoguesEn: [
      'Taking a sweet juicy bite of crisp red watermelon! 🍉💦',
      'Fresh fruits are refreshing and packed with vitamins! 🍍',
    ],
  },
  {
    id: 'soda-drink',
    category: 'dining',
    nameVi: 'Chai nước giải khát',
    nameEn: 'Cool Soda',
    verbVi: 'Uống nước mát',
    verbEn: 'Drink soda',
    match: {
      modelRegex: /^soda-bottle$/i,
      keywords: ['soda'],
    },
    pose: 'drink',
    duration: 2.6,
    effect: { kind: 'symbols', glyph: 'bubble' },
    emoji: '🥤',
    dialoguesVi: [
      'Ực ực... Nước mát sủi bọt lăn tăn sảng khoái tuyệt vời! 🥤✨',
      'Uống nước đầy đủ giúp cơ thể luôn khỏe khoắn vui tươi! 💧',
    ],
    dialoguesEn: [
      'Gulp gulp... Cool fizzy drink is so refreshing! 🥤✨',
      'Staying hydrated keeps us healthy, strong and energetic! 💧',
    ],
  },

  // ==========================================
  // 9. CÂU CÁ & BẾN NƯỚC (Fishing & Waterfront)
  // ==========================================
  {
    id: 'dock-fish',
    category: 'fishing',
    nameVi: 'Cầu tàu câu cá',
    nameEn: 'Fishing Pier',
    verbVi: 'Thả cần câu',
    verbEn: 'Go fishing',
    match: {
      modelRegex: /^(dba-dock-lantern|dock|pier)$/i,
      keywords: ['dock', 'pier'],
    },
    pose: 'fish',
    duration: 4.5,
    effect: { kind: 'symbols', glyph: 'bubble' },
    emoji: '🎣',
    dialoguesVi: [
      'Vút... Buông cần câu xuống mặt nước trong veo, kiên nhẫn đợi cá cắn câu! 🎣🐟',
      'Gợn sóng lăn tăn... Ô kìa, phao câu nhấp nhô rồi! Giật cần thôi! ✨🐠',
      'Bé câu được chú cá bạc xinh xắn rồi nhẹ nhàng thả cá về sông nhé! 🌊',
    ],
    dialoguesEn: [
      'Whoosh... Casting the line into crystal water, waiting patiently! 🎣🐟',
      'Ripples in the water... The bobber is dancing! Reel it in! ✨🐠',
      'Caught a pretty little fish, then gently releasing it back home! 🌊',
    ],
    sound: 'water',
  },
  {
    id: 'boat-fish',
    category: 'fishing',
    nameVi: 'Thuyền nan ven bờ',
    nameEn: 'Fishing Boat',
    verbVi: 'Lên thuyền câu cá',
    verbEn: 'Fish from boat',
    match: {
      modelRegex: /^(dba-rowboat|rowboat|sailboat|boat)$/i,
      keywords: ['rowboat'],
    },
    pose: 'fish',
    duration: 4.5,
    effect: { kind: 'symbols', glyph: 'bubble' },
    emoji: '🛶',
    dialoguesVi: [
      'Thuyền bồng bềnh dập dềnh trên sóng nước, cùng thả câu nào! 🛶🎣',
      'Gió sông mát rượi thổi qua, ngắm đàn cá tung tăng bơi lội! 🐟✨',
    ],
    dialoguesEn: [
      'Gently rocking on the peaceful water, let us fish together! 🛶🎣',
      'Cool river breeze blowing as colorful fish swim by! 🐟✨',
    ],
    sound: 'water',
  },
  {
    id: 'ice-hole-fish',
    category: 'fishing',
    nameVi: 'Hố câu trên băng tuyết',
    nameEn: 'Ice Fishing Hole',
    verbVi: 'Câu cá trên băng',
    verbEn: 'Ice fishing',
    match: {
      modelRegex: /^(cp-fish-ice|cp-fish-line)$/i,
      keywords: ['ice-fishing'],
    },
    pose: 'fish',
    duration: 4.0,
    effect: { kind: 'symbols', glyph: 'bubble' },
    emoji: '❄️',
    dialoguesVi: [
      'Thả dây câu qua lỗ băng tuyết... Chú cá tuyết lấp lánh đang đến gần! ❄️🐟',
      'Kéo lên nào! Một chú cá béo tròn nhảy tanh tách trên mặt băng! 🌟',
    ],
    dialoguesEn: [
      'Dropping the line through the crystal ice hole... Shimmering fish ahead! ❄️🐟',
      'Pull up! A happy fish splashing on the ice floe! 🌟',
    ],
    sound: 'water',
  },

  // ==========================================
  // 10. NGHỈ NGƠI & DÃ NGOẠI (Outdoor Rest & Lying)
  // ==========================================
  {
    id: 'bedroll-camp',
    category: 'rest',
    nameVi: 'Túi ngủ cắm trại',
    nameEn: 'Camping Bedroll',
    verbVi: 'Nằm túi ngủ',
    verbEn: 'Rest in bedroll',
    match: {
      modelRegex: /^bedroll$/i,
      keywords: ['bedroll'],
    },
    pose: 'sleep',
    duration: 0,
    effect: { kind: 'symbols', glyph: 'zzz' },
    emoji: '⛺',
    dialoguesVi: [
      'Chui vào túi ngủ ấm áp ngắm bầu trời đêm đầy sao lấp lánh! ⛺✨',
      'Nằm nghỉ ngơi nghe tiếng thông reo rì rào thật êm ái! 🌲💤',
    ],
    dialoguesEn: [
      'Snuggling into the cozy bedroll gazing at starry skies! ⛺✨',
      'Resting peacefully listening to the gentle rustling pine trees! 🌲💤',
    ],
    sound: 'snore',
  },
  {
    id: 'swing-play',
    category: 'entertainment',
    nameVi: 'Xích đu sân chơi',
    nameEn: 'Playground Swing',
    verbVi: 'Đu xích đu',
    verbEn: 'Swing',
    match: {
      modelRegex: /^swing-set$/i,
      keywords: ['swing-set'],
    },
    pose: 'swing',
    duration: 0,
    effect: { kind: 'sway' },
    emoji: '🪁',
    dialoguesVi: [
      'Đung đưa bay lên cao... gió thổi mát rượi tóc bay bay! 🪁🍃',
      'Cười giòn tan trên chiếc xích đu tuổi thơ yêu thương! 😊✨',
    ],
    dialoguesEn: [
      'Swinging high up into the fresh sky... wind in my hair! 🪁🍃',
      'Pure joy and laughter on the lovely playground swing! 😊✨',
    ],
  },
  {
    id: 'picnic-table-relax',
    category: 'rest',
    nameVi: 'Bàn dã ngoại công viên',
    nameEn: 'Picnic Table',
    verbVi: 'Nghỉ dã ngoại',
    verbEn: 'Picnic rest',
    match: {
      modelRegex: /^(nt-picnic-table|picnic-table)$/i,
      keywords: ['picnic-table'],
    },
    pose: 'sit',
    duration: 0,
    noEffect: 'a seat: it holds her as she sits and stays as it is',
    emoji: '🧺',
    dialoguesVi: [
      'Cùng quây quần bên bàn dã ngoại chia sẻ bánh ngon hoa quả! 🧺🍉',
      'Tận hưởng buổi dã ngoại ấm áp dưới bóng cây xanh mát! 🌳☀️',
    ],
    dialoguesEn: [
      'Gathering round the picnic table sharing snacks and fruit! 🧺🍉',
      'Enjoying a sunny picnic afternoon under the green trees! 🌳☀️',
    ],
  },
];

// Extensible registry storage allowing external plugins or custom expansions
const registry: ObjectInteractionDef[] = [...BUILTIN_OBJECT_INTERACTIONS];

/**
 * Register a new custom object interaction.
 * Enables adding 100+ future interactions easily without modifying core engine code.
 */
export function registerInteraction(def: ObjectInteractionDef): void {
  matched.clear();
  const existingIndex = registry.findIndex((item) => item.id === def.id);
  if (existingIndex >= 0) {
    registry[existingIndex] = def;
  } else {
    registry.push(def);
  }
}

/**
 * Register multiple custom interactions in batch.
 */
export function registerInteractions(defs: readonly ObjectInteractionDef[]): void {
  for (const def of defs) registerInteraction(def);
}

/**
 * Get all registered object interactions.
 */
export function getAllInteractions(): readonly ObjectInteractionDef[] {
  return registry;
}

/** A model path's file name without its folder and `.glb` (`packs/kenney-furniture-kit/2.0/chairDesk.glb` → `chairDesk`). */
export function modelBaseName(model: string): string {
  return (model.split('/').pop() ?? '').replace(/\.glb$/i, '');
}

/** The words of a name, lower case, joined by `-` (`kitchenFridgeLarge` → `kitchen-fridge-large`, `flower_redA` → `flower-red-a`). */
export function nameWords(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-');
}

const hasWords = (words: string, keyword: string): boolean => words !== '' && `-${words}-`.includes(`-${nameWords(keyword)}-`);

/**
 * The interaction for a placed model (with its home slot, or a name): a slot named by an interaction first, then
 * an exact model name, then a model pattern, then whole keywords of the file name, slot or name; each step over
 * every interaction before the next, so a loose keyword of one never takes a model another names exactly.
 */
export function matchInteraction(model: string, slot?: string, name?: string): ObjectInteractionDef | null {
  // A map places the same few hundred models thousands of times: each model, slot and name is matched once.
  const key = `${model}|${slot ?? ''}|${name ?? ''}`;
  const known = matched.get(key);
  if (known !== undefined) return known;
  const found = matchUncached(model, slot, name);
  matched.set(key, found);
  return found;
}

/** Matches already worked out (cleared when an interaction is registered). */
const matched = new Map<string, ObjectInteractionDef | null>();

function matchUncached(model: string, slot?: string, name?: string): ObjectInteractionDef | null {
  const base = modelBaseName(model);
  const normalizedSlot = (slot ?? '').toLowerCase();
  if (normalizedSlot) {
    const bySlot = registry.find((def) => def.match.slots?.includes(normalizedSlot));
    if (bySlot) return bySlot;
  }
  if (base) {
    const lower = base.toLowerCase();
    const byName = registry.find((def) => def.match.modelNames?.some((m) => m.toLowerCase() === lower));
    if (byName) return byName;
    const byPattern = registry.find((def) => def.match.modelRegex?.test(base));
    if (byPattern) return byPattern;
  }
  const words = [nameWords(base), nameWords(normalizedSlot), nameWords(name ?? '')];
  return registry.find((def) => def.match.keywords?.some((kw) => words.some((w) => hasWords(w, kw)))) ?? null;
}
