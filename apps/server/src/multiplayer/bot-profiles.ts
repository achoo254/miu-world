// Every companion bot: who it is (id, name, species, outfit) and where it starts on its map, its home. The ids are
// kept for good: friendships, the bots' skills and memories in the database name them. A bot has no route: it finds
// its own way from its home over the map's standing spots (bot-brain/).
export interface BotHome {
  x: number;
  y: number;
  z: number;
}

export interface BotProfile {
  id: string;
  displayName: string;
  species: string;
  outfit: string[];
  /** Where it starts (and comes back to when it knows nothing better): a spot on its map, feet height. */
  home: BotHome;
}

/** A bot put on its map takes the standing spot nearest its home within this many columns. */
export const HOME_SNAP = 8;

/** The companion bots of each map they live on (`nha-cua-be`: the neighbours every home gets). */
export const BOT_MAP_CONFIGS: Readonly<Record<string, readonly BotProfile[]>> = {
  'trung-tam': [
    // 8 bots around Fountain Plaza & central crossroads
    { id: 'bot-tt-1', displayName: 'Bé Bông', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 395, y: 13, z: 420 } },
    { id: 'bot-tt-2', displayName: 'Mèo Miu', species: 'cat', outfit: ['clothes-overalls-green', 'hat-cat-mint'], home: { x: 385, y: 13, z: 440 } },
    { id: 'bot-tt-3', displayName: 'Gấu Béo', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], home: { x: 415, y: 13, z: 435 } },
    { id: 'bot-tt-4', displayName: 'Cáo Cam', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], home: { x: 390, y: 13, z: 430 } },
    { id: 'bot-tt-5', displayName: 'Bé Bi', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-flower-crown-mint'], home: { x: 400, y: 13, z: 425 } },
    { id: 'bot-tt-6', displayName: 'Bé Bo', species: 'cat', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], home: { x: 380, y: 13, z: 435 } },
    { id: 'bot-tt-7', displayName: 'Thỏ Trắng', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-bow-pink'], home: { x: 405, y: 13, z: 440 } },
    { id: 'bot-tt-8', displayName: 'Bé Nấm', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], home: { x: 390, y: 13, z: 445 } },
    // 6 bots in front of Shop and west shopping street
    { id: 'bot-tt-9', displayName: 'Bé Mít', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-blue'], home: { x: 365, y: 13, z: 425 } },
    { id: 'bot-tt-10', displayName: 'Cáo Nhỏ', species: 'fox', outfit: ['clothes-overalls', 'hat-beanie-red'], home: { x: 360, y: 13, z: 430 } },
    { id: 'bot-tt-11', displayName: 'Gấu Con', species: 'bear', outfit: ['clothes-jacket-red', 'hat-beanie-blue'], home: { x: 370, y: 13, z: 420 } },
    { id: 'bot-tt-12', displayName: 'Bé Dâu', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown'], home: { x: 362, y: 13, z: 440 } },
    { id: 'bot-tt-13', displayName: 'Mèo Vàng', species: 'cat', outfit: ['clothes-overalls-green', 'hat-cat-mint'], home: { x: 375, y: 13, z: 430 } },
    { id: 'bot-tt-14', displayName: 'Bé Sóc', species: 'fox', outfit: ['clothes-vest-shorts-navy', 'hat-cap-blue'], home: { x: 368, y: 13, z: 415 } },
    // 4 bots in Chợ Giao Dịch
    { id: 'bot-tt-15', displayName: 'Bé Cam', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], home: { x: 240, y: 13, z: 435 } },
    { id: 'bot-tt-16', displayName: 'Thỏ Hồng', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-bow-pink'], home: { x: 250, y: 13, z: 440 } },
    { id: 'bot-tt-17', displayName: 'Cáo Đốm', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], home: { x: 260, y: 13, z: 430 } },
    { id: 'bot-tt-18', displayName: 'Bé Khoai', species: 'cat', outfit: ['clothes-overalls-red', 'hat-straw-pink'], home: { x: 235, y: 13, z: 445 } },
    // 4 bots in Khu Sự Kiện
    { id: 'bot-tt-19', displayName: 'Bé Bắp', species: 'rabbit', outfit: ['clothes-dress-blue', 'hat-flower-crown'], home: { x: 520, y: 13, z: 430 } },
    { id: 'bot-tt-20', displayName: 'Mèo Mun', species: 'cat', outfit: ['clothes-jacket-red', 'hat-beanie-red'], home: { x: 530, y: 13, z: 440 } },
    { id: 'bot-tt-21', displayName: 'Gấu Trúc', species: 'bear', outfit: ['clothes-overalls-green', 'hat-cat-mint'], home: { x: 515, y: 13, z: 445 } },
    { id: 'bot-tt-22', displayName: 'Cáo Nâu', species: 'fox', outfit: ['clothes-vest-shorts-navy', 'hat-cap-blue'], home: { x: 535, y: 13, z: 435 } },
    // 2 bots near Cổng & Bến xe
    { id: 'bot-tt-23', displayName: 'Bé Tí', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 395, y: 13, z: 510 } },
    { id: 'bot-tt-24', displayName: 'Bé Su', species: 'cat', outfit: ['clothes-overalls', 'hat-beanie-blue'], home: { x: 400, y: 13, z: 500 } },
  ],
  'truong-hoc': [
    { id: 'bot-th-1', displayName: 'Cáo Nhanh Trí', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], home: { x: 390, y: 13, z: 310 } },
    { id: 'bot-th-2', displayName: 'Thỏ Măng Non', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown'], home: { x: 385, y: 13, z: 320 } },
    { id: 'bot-th-3', displayName: 'Mèo Chăm Học', species: 'cat', outfit: ['clothes-dress-mint', 'hat-cat-mint'], home: { x: 410, y: 13, z: 320 } },
    { id: 'bot-th-4', displayName: 'Gấu Ngoan', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], home: { x: 395, y: 13, z: 340 } },
    { id: 'bot-th-5', displayName: 'Bé Hạt Dẻ', species: 'fox', outfit: ['clothes-overalls-green', 'hat-beanie-green'], home: { x: 415, y: 13, z: 335 } },
    { id: 'bot-th-6', displayName: 'Thỏ Nhí', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-bow-pink'], home: { x: 380, y: 13, z: 330 } },
    { id: 'bot-th-7', displayName: 'Bé Gạo', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-blue'], home: { x: 400, y: 13, z: 350 } },
    { id: 'bot-th-8', displayName: 'Bé Bơ', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], home: { x: 425, y: 13, z: 345 } },
    { id: 'bot-th-9', displayName: 'Bé Mây', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown-mint'], home: { x: 385, y: 13, z: 355 } },
    { id: 'bot-th-10', displayName: 'Cáo Vui Vẻ', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-beanie-red'], home: { x: 405, y: 13, z: 360 } },
  ],
  'cho-phien': [
    { id: 'bot-cp-1', displayName: 'Cún Đốm', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], home: { x: 215, y: 13, z: 255 } },
    { id: 'bot-cp-2', displayName: 'Thỏ Bán Hoa', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-flower-crown'], home: { x: 225, y: 13, z: 260 } },
    { id: 'bot-cp-3', displayName: 'Mèo Mua Sắm', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-pink'], home: { x: 210, y: 13, z: 265 } },
    { id: 'bot-cp-4', displayName: 'Cáo Nhí Nhảnh', species: 'fox', outfit: ['clothes-overalls-green', 'hat-cap-blue'], home: { x: 230, y: 13, z: 250 } },
    { id: 'bot-cp-5', displayName: 'Bé Đậu', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 235, y: 13, z: 265 } },
    { id: 'bot-cp-6', displayName: 'Gấu Mũ Rơm', species: 'bear', outfit: ['clothes-overalls', 'hat-straw-blue'], home: { x: 215, y: 13, z: 275 } },
    { id: 'bot-cp-7', displayName: 'Mèo Kẹo Bông', species: 'cat', outfit: ['clothes-vest-shorts-navy', 'hat-cat-mint'], home: { x: 225, y: 13, z: 280 } },
    { id: 'bot-cp-8', displayName: 'Bé Bống', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-flower-crown-mint'], home: { x: 240, y: 13, z: 260 } },
    { id: 'bot-cp-9', displayName: 'Cáo Tạp Hóa', species: 'fox', outfit: ['clothes-jacket-red', 'hat-beanie-green'], home: { x: 220, y: 13, z: 245 } },
    { id: 'bot-cp-10', displayName: 'Bé Thóc', species: 'bear', outfit: ['clothes-vest-shorts', 'hat-beanie-blue'], home: { x: 230, y: 13, z: 275 } },
  ],
  'lang-ven-song': [
    { id: 'bot-lvs-1', displayName: 'Bé Na', species: 'cat', outfit: ['clothes-dress-mint', 'hat-flower-crown-mint'], home: { x: 60, y: 13, z: 75 } },
    { id: 'bot-lvs-2', displayName: 'Họa Mi', species: 'rabbit', outfit: ['clothes-overalls', 'hat-straw-pink'], home: { x: 70, y: 13, z: 90 } },
    { id: 'bot-lvs-3', displayName: 'Gấu Bến Đò', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], home: { x: 80, y: 13, z: 110 } },
    { id: 'bot-lvs-4', displayName: 'Cáo Thả Thuyền', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], home: { x: 65, y: 13, z: 120 } },
    { id: 'bot-lvs-5', displayName: 'Bé Hoa Đăng', species: 'rabbit', outfit: ['clothes-dress-blue', 'hat-straw-blue'], home: { x: 90, y: 13, z: 130 } },
    { id: 'bot-lvs-6', displayName: 'Mèo Sen', species: 'cat', outfit: ['clothes-overalls-green', 'hat-cat-mint'], home: { x: 100, y: 13, z: 150 } },
    { id: 'bot-lvs-7', displayName: 'Bé Lia Thia', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], home: { x: 110, y: 13, z: 170 } },
    { id: 'bot-lvs-8', displayName: 'Thỏ Cầu Kiều', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 75, y: 13, z: 80 } },
  ],
  'nong-trai': [
    { id: 'bot-nt-1', displayName: 'Bác Nông Dân Nhí', species: 'bear', outfit: ['clothes-overalls-green', 'hat-straw-blue'], home: { x: 395, y: 13, z: 320 } },
    { id: 'bot-nt-2', displayName: 'Bé Gặt Lúa', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-pink'], home: { x: 405, y: 13, z: 330 } },
    { id: 'bot-nt-3', displayName: 'Thỏ Trồng Cà Rốt', species: 'rabbit', outfit: ['clothes-overalls', 'hat-flower-crown'], home: { x: 385, y: 13, z: 325 } },
    { id: 'bot-nt-4', displayName: 'Cáo Chăn Gà', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], home: { x: 410, y: 13, z: 315 } },
    { id: 'bot-nt-5', displayName: 'Bé Nhặt Trứng', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-bow-pink'], home: { x: 390, y: 13, z: 340 } },
    { id: 'bot-nt-6', displayName: 'Gấu Cối Xay', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], home: { x: 415, y: 13, z: 335 } },
    { id: 'bot-nt-7', displayName: 'Mèo Tưới Rau', species: 'cat', outfit: ['clothes-overalls-red', 'hat-cat-mint'], home: { x: 380, y: 13, z: 335 } },
    { id: 'bot-nt-8', displayName: 'Bé Ngô Vàng', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-cap-yellow'], home: { x: 400, y: 13, z: 310 } },
  ],
  'forest-ch1': [
    { id: 'bot-kr-1', displayName: 'Sóc Nhỏ', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], home: { x: 20, y: 13, z: 20 } },
    { id: 'bot-kr-2', displayName: 'Bé Hái Nấm', species: 'cat', outfit: ['clothes-dress-mint', 'hat-straw-pink'], home: { x: 30, y: 13, z: 25 } },
    { id: 'bot-kr-3', displayName: 'Thỏ Rừng', species: 'rabbit', outfit: ['clothes-overalls', 'hat-flower-crown-mint'], home: { x: 25, y: 13, z: 35 } },
    { id: 'bot-kr-4', displayName: 'Gấu Leo Cây', species: 'bear', outfit: ['clothes-jacket-green', 'hat-beanie-blue'], home: { x: 35, y: 13, z: 30 } },
    { id: 'bot-kr-5', displayName: 'Họa Mi Rừng', species: 'fox', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 40, y: 13, z: 20 } },
    { id: 'bot-kr-6', displayName: 'Bé Soi Đèn', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-cap-yellow'], home: { x: 20, y: 13, z: 30 } },
    { id: 'bot-kr-7', displayName: 'Mèo Suối Mát', species: 'cat', outfit: ['clothes-dress-blue', 'hat-cat-mint'], home: { x: 30, y: 13, z: 40 } },
    { id: 'bot-kr-8', displayName: 'Bé Bắt Bướm', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-cap-blue'], home: { x: 45, y: 13, z: 35 } },
  ],
  'thu-vien': [
    { id: 'bot-tv-1', displayName: 'Bé Mọt Sách', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-blue'], home: { x: 180, y: 13, z: 425 } },
    { id: 'bot-tv-2', displayName: 'Thỏ Đọc Truyện', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 190, y: 13, z: 430 } },
    { id: 'bot-tv-3', displayName: 'Cáo Xếp Sách', species: 'fox', outfit: ['clothes-overalls-green', 'hat-cap-blue'], home: { x: 175, y: 13, z: 435 } },
    { id: 'bot-tv-4', displayName: 'Gấu Đố Chữ', species: 'bear', outfit: ['clothes-jacket-red', 'hat-beanie-blue'], home: { x: 195, y: 13, z: 420 } },
    { id: 'bot-tv-5', displayName: 'Bé Tháp Chuông', species: 'rabbit', outfit: ['clothes-overalls', 'hat-flower-crown'], home: { x: 185, y: 13, z: 440 } },
    { id: 'bot-tv-6', displayName: 'Mèo Kính Cận', species: 'cat', outfit: ['clothes-vest-shorts-navy', 'hat-cat-mint'], home: { x: 200, y: 13, z: 435 } },
    { id: 'bot-tv-7', displayName: 'Bé Thơ Ca', species: 'fox', outfit: ['clothes-dress-mint', 'hat-straw-pink'], home: { x: 170, y: 13, z: 430 } },
    { id: 'bot-tv-8', displayName: 'Bé Hộp Nhạc', species: 'bear', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], home: { x: 185, y: 13, z: 415 } },
  ],
  'lau-dai': [
    { id: 'bot-ld-1', displayName: 'Hiệp Sĩ Mèo', species: 'cat', outfit: ['clothes-jacket-red', 'hat-cap-blue'], home: { x: 55, y: 17, z: 340 } },
    { id: 'bot-ld-2', displayName: 'Thỏ Cung Đình', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 65, y: 17, z: 345 } },
    { id: 'bot-ld-3', displayName: 'Gấu Lính Gác', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], home: { x: 75, y: 17, z: 335 } },
    { id: 'bot-ld-4', displayName: 'Cáo Hoàng Gia', species: 'fox', outfit: ['clothes-overalls-green', 'hat-cap-yellow'], home: { x: 50, y: 17, z: 350 } },
    { id: 'bot-ld-5', displayName: 'Bé Cờ Vua', species: 'cat', outfit: ['clothes-dress-blue', 'hat-cat-mint'], home: { x: 80, y: 17, z: 345 } },
    { id: 'bot-ld-6', displayName: 'Thỏ Cầu Treo', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-flower-crown-mint'], home: { x: 60, y: 17, z: 335 } },
    { id: 'bot-ld-7', displayName: 'Bé Gương Soi', species: 'fox', outfit: ['clothes-dress-mint', 'hat-straw-pink'], home: { x: 70, y: 17, z: 355 } },
    { id: 'bot-ld-8', displayName: 'Gấu Tháp Cao', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], home: { x: 85, y: 17, z: 340 } },
  ],
  'xom-mai-am': [
    { id: 'bot-xma-1', displayName: 'Bé Xóm Mới', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown'], home: { x: 105, y: 13, z: 105 } },
    { id: 'bot-xma-2', displayName: 'Mèo Mái Ngói', species: 'cat', outfit: ['clothes-overalls-green', 'hat-cat-mint'], home: { x: 115, y: 13, z: 110 } },
    { id: 'bot-xma-3', displayName: 'Cáo Thả Diều', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], home: { x: 100, y: 13, z: 115 } },
    { id: 'bot-xma-4', displayName: 'Gấu Chuyền Cầu', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], home: { x: 125, y: 13, z: 105 } },
    { id: 'bot-xma-5', displayName: 'Bé Đánh Cù', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-cap-yellow'], home: { x: 110, y: 13, z: 120 } },
    { id: 'bot-xma-6', displayName: 'Mèo Ngắm Trăng', species: 'cat', outfit: ['clothes-dress-mint', 'hat-straw-pink'], home: { x: 120, y: 13, z: 115 } },
    { id: 'bot-xma-7', displayName: 'Bé Giàn Mướp', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], home: { x: 95, y: 13, z: 110 } },
    { id: 'bot-xma-8', displayName: 'Bé Kể Chuyện', species: 'bear', outfit: ['clothes-dress-blue', 'hat-bow-pink'], home: { x: 130, y: 13, z: 115 } },
  ],
  'nui-tuyet': [
    { id: 'bot-ntu-1', displayName: 'Cánh Cụt Nhí', species: 'cat', outfit: ['clothes-jacket-red', 'hat-beanie-blue'], home: { x: 395, y: 17, z: 720 } },
    { id: 'bot-ntu-2', displayName: 'Gấu Bắc Cực', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-red'], home: { x: 405, y: 17, z: 725 } },
    { id: 'bot-ntu-3', displayName: 'Cáo Tuyết', species: 'fox', outfit: ['clothes-overalls-green', 'hat-cat-mint'], home: { x: 390, y: 17, z: 715 } },
    { id: 'bot-ntu-4', displayName: 'Thỏ Trượt Băng', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 410, y: 17, z: 715 } },
    { id: 'bot-ntu-5', displayName: 'Bé Đắp Người Tuyết', species: 'cat', outfit: ['clothes-dress-blue', 'hat-flower-crown-mint'], home: { x: 385, y: 17, z: 725 } },
    { id: 'bot-ntu-6', displayName: 'Bé Cáp Treo', species: 'fox', outfit: ['clothes-overalls', 'hat-cap-blue'], home: { x: 400, y: 17, z: 735 } },
    { id: 'bot-ntu-7', displayName: 'Nai Nhỏ', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], home: { x: 415, y: 17, z: 720 } },
    { id: 'bot-ntu-8', displayName: 'Bé Bông Tuyết', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-straw-blue'], home: { x: 395, y: 17, z: 710 } },
  ],
  'dao-bi-an': [
    { id: 'bot-dba-1', displayName: 'Thủy Thủ Nhí', species: 'cat', outfit: ['clothes-overalls-green', 'hat-straw-blue'], home: { x: 385, y: 13, z: 605 } },
    { id: 'bot-dba-2', displayName: 'Thỏ Vỏ Ốc', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown'], home: { x: 395, y: 13, z: 610 } },
    { id: 'bot-dba-3', displayName: 'Cáo Lâu Đài Cát', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], home: { x: 380, y: 13, z: 615 } },
    { id: 'bot-dba-4', displayName: 'Gấu Nhảy Sóng', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], home: { x: 400, y: 13, z: 600 } },
    { id: 'bot-dba-5', displayName: 'Bé Cây Dừa', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-straw-pink'], home: { x: 390, y: 13, z: 620 } },
    { id: 'bot-dba-6', displayName: 'Mèo Kho Báu', species: 'cat', outfit: ['clothes-vest-shorts', 'hat-cat-mint'], home: { x: 405, y: 13, z: 615 } },
    { id: 'bot-dba-7', displayName: 'Bé San Hô', species: 'fox', outfit: ['clothes-dress-blue', 'hat-bow-pink'], home: { x: 375, y: 13, z: 610 } },
    { id: 'bot-dba-8', displayName: 'Bé Hải Âu', species: 'bear', outfit: ['clothes-overalls-red', 'hat-cap-yellow'], home: { x: 385, y: 13, z: 595 } },
  ],
  'nha-cua-be': [
    { id: 'bot-ncb-1', displayName: 'Bạn Hàng Xóm', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], home: { x: 75, y: 13, z: 20 } },
    { id: 'bot-ncb-2', displayName: 'Bé Tưới Hoa', species: 'cat', outfit: ['clothes-overalls-green', 'hat-straw-pink'], home: { x: 82, y: 13, z: 22 } },
    { id: 'bot-ncb-3', displayName: 'Cún Vui Vẻ', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], home: { x: 72, y: 13, z: 28 } },
    { id: 'bot-ncb-4', displayName: 'Cáo Giao Thư', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], home: { x: 78, y: 13, z: 18 } },
  ],
};

/** Every companion bot by id, with the map it lives on. */
const BOTS_BY_ID: ReadonlyMap<string, { profile: BotProfile; mapId: string }> = new Map(
  Object.entries(BOT_MAP_CONFIGS).flatMap(([mapId, profiles]) => profiles.map((profile) => [profile.id, { profile, mapId }] as const)),
);

/** A companion bot by id (null: no such bot), for the friends lists. */
export function findBot(id: string): { profile: BotProfile; mapId: string } | null {
  return BOTS_BY_ID.get(id) ?? null;
}
