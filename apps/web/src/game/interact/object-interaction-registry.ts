// Registry of object interactions for Miu World.
// Provides 50+ rich everyday childhood interactions with furniture and world props,
// fully extensible so that adding 100+ more interactions in the future requires only
// appending to this list or calling registerInteraction().

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
      modelRegex: /bed(bunk|double|single|pink|blue|mint|yellow|lilac|red|rainbow)?/i,
      keywords: ['bed', 'giuong'],
    },
    pose: 'lay',
    duration: 0, // Continues until player walks
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
      modelRegex: /bed.*cushion/i,
      keywords: ['bouncy-bed'],
    },
    pose: 'cheer',
    duration: 3,
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
      modelRegex: /lounge(sofa|designsofa|sofalong|sofacorner|sofaottoman)/i,
      keywords: ['sofa', 'couch'],
    },
    pose: 'sit',
    duration: 0,
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
      modelRegex: /chair(cushion|rounded|moderncushion|modernframecushion|desk)?/i,
      keywords: ['chair', 'ghe'],
    },
    pose: 'sit',
    duration: 0,
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
      modelRegex: /loungechair(relax|designchair)?/i,
      keywords: ['lounge-chair'],
    },
    pose: 'sit',
    duration: 0,
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
      modelRegex: /bench(cushion|cushionlow)?/i,
      keywords: ['bench', 'ghe-da'],
    },
    pose: 'sit',
    duration: 0,
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
      modelRegex: /wardrobe|cabinetbeddrawer/i,
      keywords: ['wardrobe', 'tu-quan-ao'],
    },
    pose: 'wash',
    duration: 2.5,
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
      modelRegex: /pillow(blue|long|bluelong)?/i,
      keywords: ['pillow', 'goi'],
    },
    pose: 'wash',
    duration: 2.0,
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
      modelRegex: /curtain|wallwindow/i,
      keywords: ['curtain', 'rem-cua'],
    },
    pose: 'stretch',
    duration: 2.2,
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
      modelRegex: /alarm-clock|clock/i,
      keywords: ['alarm', 'dong-ho'],
    },
    pose: 'wash',
    duration: 1.8,
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
      modelRegex: /toilet(square)?/i,
      keywords: ['toilet', 'bon-cau'],
    },
    pose: 'sit',
    duration: 3.5,
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
      modelRegex: /bathroomsink(square)?/i,
      keywords: ['sink', 'bon-rua'],
    },
    pose: 'wash',
    duration: 3.0,
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
      modelRegex: /bathroommirror|mirror/i,
      keywords: ['mirror', 'guong'],
    },
    pose: 'stretch',
    duration: 2.5,
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
      modelRegex: /bathtub/i,
      keywords: ['bathtub', 'bon-tam'],
    },
    pose: 'sit',
    duration: 4.0,
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
      modelRegex: /shower(round)?/i,
      keywords: ['shower', 'voi-sen'],
    },
    pose: 'wash',
    duration: 3.5,
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
      modelRegex: /washer(dryerstacked)?/i,
      keywords: ['washer', 'may-giat'],
    },
    pose: 'wash',
    duration: 2.8,
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
      modelRegex: /dryer/i,
      keywords: ['dryer', 'may-say'],
    },
    pose: 'wash',
    duration: 2.5,
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
      modelRegex: /bathroomcabinet(drawer)?/i,
      keywords: ['bathroom-cabinet'],
    },
    pose: 'wash',
    duration: 2.0,
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
      modelRegex: /kitchenfridge(builtin|large|small)?/i,
      keywords: ['fridge', 'tu-lanh'],
    },
    pose: 'cook',
    duration: 2.5,
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
      modelRegex: /kitchenstove(electric)?/i,
      keywords: ['stove', 'bep-nau'],
    },
    pose: 'cook',
    duration: 3.5,
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
      modelRegex: /kitchenmicrowave/i,
      keywords: ['microwave', 'lo-vi-song'],
    },
    pose: 'cook',
    duration: 2.5,
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
      modelRegex: /toaster/i,
      keywords: ['toaster', 'may-nuong-banh'],
    },
    pose: 'cook',
    duration: 2.2,
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
      modelRegex: /kitchenblender/i,
      keywords: ['blender', 'may-xay'],
    },
    pose: 'cook',
    duration: 2.5,
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
      modelRegex: /kitchencoffeemachine/i,
      keywords: ['coffee-machine'],
    },
    pose: 'cook',
    duration: 2.5,
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
      modelRegex: /kitchensink/i,
      keywords: ['kitchen-sink'],
    },
    pose: 'wash',
    duration: 3.0,
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
    verbEn: 'Sit at table',
    match: {
      modelRegex: /table(round|cross|cloth|crosscloth)/i,
      keywords: ['dining-table', 'ban-an'],
    },
    pose: 'sit',
    duration: 0,
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
      modelRegex: /stoolbar(square)?/i,
      keywords: ['stool', 'ghe-cao'],
    },
    pose: 'sit',
    duration: 0,
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
      modelRegex: /trashcan/i,
      keywords: ['trashcan', 'thung-rac'],
    },
    pose: 'wash',
    duration: 2.0,
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
      modelRegex: /desk(oak|white|pink|blue|mint|yellow|corner)?/i,
      keywords: ['desk', 'ban-hoc'],
    },
    pose: 'study',
    duration: 0,
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
      modelRegex: /bookcase(closed|closeddoors|closedwide|open|openlow)?|books/i,
      keywords: ['bookcase', 'tu-sach', 'gia-sach'],
    },
    pose: 'study',
    duration: 3.0,
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
      modelRegex: /computerscreen|laptop|computerkeyboard/i,
      keywords: ['computer', 'laptop', 'may-tinh'],
    },
    pose: 'study',
    duration: 3.0,
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
      modelRegex: /globe/i,
      keywords: ['globe', 'dia-cau'],
    },
    pose: 'wash',
    duration: 2.5,
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
      modelRegex: /blackboard|board/i,
      keywords: ['board', 'bang-den'],
    },
    pose: 'wash',
    duration: 2.5,
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
      modelRegex: /calendar/i,
      keywords: ['calendar', 'lich'],
    },
    pose: 'study',
    duration: 2.0,
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
      modelRegex: /television(modern|vintage|antenna)?/i,
      keywords: ['television', 'tivi'],
    },
    pose: 'sit',
    duration: 3.5,
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
      modelRegex: /radio/i,
      keywords: ['radio', 'dai-phat-thanh'],
    },
    pose: 'cheer',
    duration: 3.0,
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
      modelRegex: /speaker(small)?/i,
      keywords: ['speaker', 'loa'],
    },
    pose: 'cheer',
    duration: 3.0,
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
      modelRegex: /ceilingfan|fan/i,
      keywords: ['fan', 'quat'],
    },
    pose: 'stretch',
    duration: 2.2,
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
      slots: ['ornament'],
      modelRegex: /bear|teddy-bear/i,
      keywords: ['teddy', 'gau-bong'],
    },
    pose: 'wash',
    duration: 2.5,
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
      modelRegex: /nesting-dolls/i,
      keywords: ['nesting-dolls', 'bup-be'],
    },
    pose: 'wash',
    duration: 2.8,
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
      modelRegex: /lamp(roundfloor|squarefloor|roundtable|squaretable|squareceiling|wall)?/i,
      keywords: ['lamp', 'den'],
    },
    pose: 'stretch',
    duration: 2.0,
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
      modelRegex: /rug(round|rounded|rectangle|square|doormat|cat|rainbow|heart|star|flower|leaf|checks)?/i,
      keywords: ['rug', 'tham'],
    },
    pose: 'sit',
    duration: 0,
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
      modelRegex: /pottedplant|plantsmall[123]|seedling/i,
      keywords: ['plant', 'chau-cay'],
    },
    pose: 'wash',
    duration: 2.8,
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
      modelRegex: /flower_.*|lotus/i,
      keywords: ['flower', 'hoa'],
    },
    pose: 'stretch',
    duration: 2.2,
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
      modelRegex: /mailbox|envelope/i,
      keywords: ['mailbox', 'hom-thu'],
    },
    pose: 'wash',
    duration: 2.5,
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
      modelRegex: /doorwayfront|doorwayopen|door/i,
      keywords: ['door', 'cua'],
    },
    pose: 'wash',
    duration: 2.0,
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
    id: 'well-bucket',
    category: 'outdoor',
    nameVi: 'Giếng nước làng quê',
    nameEn: 'Water Well',
    verbVi: 'Múc nước giếng',
    verbEn: 'Draw water',
    match: {
      modelRegex: /well|bucket/i,
      keywords: ['well', 'gieng-nuoc'],
    },
    pose: 'wash',
    duration: 3.0,
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
      modelRegex: /campfire|fire/i,
      keywords: ['campfire', 'lua-trai'],
    },
    pose: 'stretch',
    duration: 3.0,
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
      modelRegex: /apple|cherries|banana|orange/i,
      keywords: ['fruit', 'trai-cay'],
    },
    pose: 'stretch',
    duration: 2.5,
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
      modelRegex: /skateboard/i,
      keywords: ['skateboard', 'van-truot'],
    },
    pose: 'cheer',
    duration: 2.8,
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
      modelRegex: /basketball/i,
      keywords: ['basketball', 'bong-ro'],
    },
    pose: 'cheer',
    duration: 2.5,
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
      modelRegex: /soccer-ball/i,
      keywords: ['soccer', 'bong-da'],
    },
    pose: 'cheer',
    duration: 2.5,
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
      modelRegex: /bowl(soup|broth|cereal)?/i,
      keywords: ['pet-bowl', 'bat-an'],
    },
    pose: 'cook',
    duration: 2.5,
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
      modelRegex: /paintbrush/i,
      keywords: ['brush', 'luoc'],
    },
    pose: 'wash',
    duration: 2.5,
    emoji: '🐱',
    dialoguesVi: [
      'Chải bộ lông mượt mà cho mèo cưng kêu meo meo! 🐱✨',
    ],
    dialoguesEn: [
      'Gently brushing soft fur, kitty purrs happily! 🐱✨',
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

/**
 * Find the most suitable interaction definition for a given prop or model.
 */
export function matchInteraction(
  model: string,
  slot?: string,
  name?: string,
): ObjectInteractionDef | null {
  const normalizedModel = model.toLowerCase();
  const normalizedName = (name ?? '').toLowerCase();
  const normalizedSlot = (slot ?? '').toLowerCase();

  for (const def of registry) {
    const { match } = def;

    // 1. Match by slot if present
    if (normalizedSlot && match.slots?.includes(normalizedSlot)) {
      return def;
    }

    // 2. Match by exact model names
    if (match.modelNames?.some((m) => normalizedModel.includes(m.toLowerCase()))) {
      return def;
    }

    // 3. Match by regex
    if (match.modelRegex && match.modelRegex.test(normalizedModel)) {
      return def;
    }

    // 4. Match by keywords in model, slot or name
    if (
      match.keywords?.some(
        (kw) =>
          normalizedModel.includes(kw) ||
          normalizedName.includes(kw) ||
          normalizedSlot.includes(kw),
      )
    ) {
      return def;
    }
  }

  return null;
}
