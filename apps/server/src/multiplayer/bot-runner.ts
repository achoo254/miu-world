// Bot Runner (Master Plan §8b, Jev 03/10/2026).
// Runs companion bots across game maps. Bots behave naturally like grade 2 children:
// patrolling roads, visiting sights, pausing to explore, and waving/saying hello
// when a human child approaches. All bots are clearly labeled "[Bạn máy]".
import {
  HOME_MAP_ID,
  SAFE_CANNED_CHATS,
  type PlayerPresence,
  type ServerWsMessage,
} from '@miu/schema/multiplayer';
import type { MultiplayerHub, MultiplayerRoom } from './multiplayer-hub';

export interface Waypoint {
  x: number;
  y: number;
  z: number;
}

export interface BotProfile {
  id: string;
  displayName: string;
  species: string;
  outfit: string[];
  waypoints: Waypoint[];
}

/** Pre-configured bot routes across core maps (using genuine roads & landmarks). */
export const BOT_MAP_CONFIGS: Record<string, BotProfile[]> = {
  'trung-tam': [
    // 8 bots around Fountain Plaza & central crossroads
    { id: 'bot-tt-1', displayName: 'Bé Bông', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 395, y: 13, z: 420 }, { x: 405, y: 13, z: 420 }, { x: 405, y: 13, z: 435 }, { x: 395, y: 13, z: 435 }] },
    { id: 'bot-tt-2', displayName: 'Mèo Miu', species: 'cat', outfit: ['clothes-overalls-green', 'hat-cat-mint'], waypoints: [{ x: 385, y: 13, z: 440 }, { x: 395, y: 13, z: 455 }, { x: 385, y: 13, z: 465 }, { x: 375, y: 13, z: 450 }] },
    { id: 'bot-tt-3', displayName: 'Gấu Béo', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], waypoints: [{ x: 415, y: 13, z: 435 }, { x: 425, y: 13, z: 445 }, { x: 415, y: 13, z: 460 }, { x: 405, y: 13, z: 450 }] },
    { id: 'bot-tt-4', displayName: 'Cáo Cam', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], waypoints: [{ x: 390, y: 13, z: 430 }, { x: 410, y: 13, z: 430 }, { x: 410, y: 13, z: 450 }, { x: 390, y: 13, z: 450 }] },
    { id: 'bot-tt-5', displayName: 'Bé Bi', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-flower-crown-mint'], waypoints: [{ x: 400, y: 13, z: 425 }, { x: 420, y: 13, z: 435 }, { x: 410, y: 13, z: 455 }, { x: 395, y: 13, z: 440 }] },
    { id: 'bot-tt-6', displayName: 'Bé Bo', species: 'cat', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], waypoints: [{ x: 380, y: 13, z: 435 }, { x: 400, y: 13, z: 435 }, { x: 400, y: 13, z: 455 }, { x: 380, y: 13, z: 455 }] },
    { id: 'bot-tt-7', displayName: 'Thỏ Trắng', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-bow-pink'], waypoints: [{ x: 405, y: 13, z: 440 }, { x: 415, y: 13, z: 450 }, { x: 405, y: 13, z: 465 }, { x: 395, y: 13, z: 455 }] },
    { id: 'bot-tt-8', displayName: 'Bé Nấm', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], waypoints: [{ x: 390, y: 13, z: 445 }, { x: 400, y: 13, z: 460 }, { x: 390, y: 13, z: 470 }, { x: 380, y: 13, z: 455 }] },
    // 6 bots in front of Shop and west shopping street
    { id: 'bot-tt-9', displayName: 'Bé Mít', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-blue'], waypoints: [{ x: 365, y: 13, z: 425 }, { x: 375, y: 13, z: 425 }, { x: 375, y: 13, z: 445 }, { x: 365, y: 13, z: 445 }] },
    { id: 'bot-tt-10', displayName: 'Cáo Nhỏ', species: 'fox', outfit: ['clothes-overalls', 'hat-beanie-red'], waypoints: [{ x: 360, y: 13, z: 430 }, { x: 370, y: 13, z: 435 }, { x: 370, y: 13, z: 450 }, { x: 360, y: 13, z: 445 }] },
    { id: 'bot-tt-11', displayName: 'Gấu Con', species: 'bear', outfit: ['clothes-jacket-red', 'hat-beanie-blue'], waypoints: [{ x: 370, y: 13, z: 420 }, { x: 380, y: 13, z: 425 }, { x: 375, y: 13, z: 440 }, { x: 365, y: 13, z: 435 }] },
    { id: 'bot-tt-12', displayName: 'Bé Dâu', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown'], waypoints: [{ x: 362, y: 13, z: 440 }, { x: 372, y: 13, z: 445 }, { x: 372, y: 13, z: 458 }, { x: 362, y: 13, z: 452 }] },
    { id: 'bot-tt-13', displayName: 'Mèo Vàng', species: 'cat', outfit: ['clothes-overalls-green', 'hat-cat-mint'], waypoints: [{ x: 375, y: 13, z: 430 }, { x: 382, y: 13, z: 440 }, { x: 378, y: 13, z: 455 }, { x: 370, y: 13, z: 445 }] },
    { id: 'bot-tt-14', displayName: 'Bé Sóc', species: 'fox', outfit: ['clothes-vest-shorts-navy', 'hat-cap-blue'], waypoints: [{ x: 368, y: 13, z: 415 }, { x: 376, y: 13, z: 425 }, { x: 368, y: 13, z: 435 }, { x: 360, y: 13, z: 425 }] },
    // 4 bots in Chợ Giao Dịch
    { id: 'bot-tt-15', displayName: 'Bé Cam', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], waypoints: [{ x: 240, y: 13, z: 435 }, { x: 260, y: 13, z: 435 }, { x: 260, y: 13, z: 455 }, { x: 240, y: 13, z: 455 }] },
    { id: 'bot-tt-16', displayName: 'Thỏ Hồng', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-bow-pink'], waypoints: [{ x: 250, y: 13, z: 440 }, { x: 270, y: 13, z: 445 }, { x: 265, y: 13, z: 465 }, { x: 245, y: 13, z: 460 }] },
    { id: 'bot-tt-17', displayName: 'Cáo Đốm', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], waypoints: [{ x: 260, y: 13, z: 430 }, { x: 275, y: 13, z: 440 }, { x: 270, y: 13, z: 455 }, { x: 255, y: 13, z: 445 }] },
    { id: 'bot-tt-18', displayName: 'Bé Khoai', species: 'cat', outfit: ['clothes-overalls-red', 'hat-straw-pink'], waypoints: [{ x: 235, y: 13, z: 445 }, { x: 250, y: 13, z: 450 }, { x: 245, y: 13, z: 465 }, { x: 230, y: 13, z: 460 }] },
    // 4 bots in Khu Sự Kiện
    { id: 'bot-tt-19', displayName: 'Bé Bắp', species: 'rabbit', outfit: ['clothes-dress-blue', 'hat-flower-crown'], waypoints: [{ x: 520, y: 13, z: 430 }, { x: 540, y: 13, z: 430 }, { x: 540, y: 13, z: 450 }, { x: 520, y: 13, z: 450 }] },
    { id: 'bot-tt-20', displayName: 'Mèo Mun', species: 'cat', outfit: ['clothes-jacket-red', 'hat-beanie-red'], waypoints: [{ x: 530, y: 13, z: 440 }, { x: 550, y: 13, z: 445 }, { x: 545, y: 13, z: 465 }, { x: 525, y: 13, z: 460 }] },
    { id: 'bot-tt-21', displayName: 'Gấu Trúc', species: 'bear', outfit: ['clothes-overalls-green', 'hat-cat-mint'], waypoints: [{ x: 515, y: 13, z: 445 }, { x: 535, y: 13, z: 450 }, { x: 530, y: 13, z: 470 }, { x: 510, y: 13, z: 465 }] },
    { id: 'bot-tt-22', displayName: 'Cáo Nâu', species: 'fox', outfit: ['clothes-vest-shorts-navy', 'hat-cap-blue'], waypoints: [{ x: 535, y: 13, z: 435 }, { x: 555, y: 13, z: 440 }, { x: 550, y: 13, z: 460 }, { x: 530, y: 13, z: 455 }] },
    // 2 bots near Cổng & Bến xe
    { id: 'bot-tt-23', displayName: 'Bé Tí', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 395, y: 13, z: 510 }, { x: 410, y: 13, z: 515 }, { x: 405, y: 13, z: 530 }, { x: 390, y: 13, z: 525 }] },
    { id: 'bot-tt-24', displayName: 'Bé Su', species: 'cat', outfit: ['clothes-overalls', 'hat-beanie-blue'], waypoints: [{ x: 400, y: 13, z: 500 }, { x: 415, y: 13, z: 510 }, { x: 410, y: 13, z: 525 }, { x: 395, y: 13, z: 515 }] },
  ],
  'truong-hoc': [
    { id: 'bot-th-1', displayName: 'Cáo Nhanh Trí', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], waypoints: [{ x: 390, y: 13, z: 310 }, { x: 410, y: 13, z: 310 }, { x: 410, y: 13, z: 330 }, { x: 390, y: 13, z: 330 }] },
    { id: 'bot-th-2', displayName: 'Thỏ Măng Non', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown'], waypoints: [{ x: 385, y: 13, z: 320 }, { x: 400, y: 13, z: 335 }, { x: 395, y: 13, z: 350 }, { x: 380, y: 13, z: 335 }] },
    { id: 'bot-th-3', displayName: 'Mèo Chăm Học', species: 'cat', outfit: ['clothes-dress-mint', 'hat-cat-mint'], waypoints: [{ x: 410, y: 13, z: 320 }, { x: 425, y: 13, z: 330 }, { x: 420, y: 13, z: 345 }, { x: 405, y: 13, z: 335 }] },
    { id: 'bot-th-4', displayName: 'Gấu Ngoan', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], waypoints: [{ x: 395, y: 13, z: 340 }, { x: 415, y: 13, z: 345 }, { x: 410, y: 13, z: 365 }, { x: 390, y: 13, z: 360 }] },
    { id: 'bot-th-5', displayName: 'Bé Hạt Dẻ', species: 'fox', outfit: ['clothes-overalls-green', 'hat-beanie-green'], waypoints: [{ x: 415, y: 13, z: 335 }, { x: 435, y: 13, z: 340 }, { x: 430, y: 13, z: 360 }, { x: 410, y: 13, z: 355 }] },
    { id: 'bot-th-6', displayName: 'Thỏ Nhí', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-bow-pink'], waypoints: [{ x: 380, y: 13, z: 330 }, { x: 395, y: 13, z: 340 }, { x: 390, y: 13, z: 360 }, { x: 375, y: 13, z: 350 }] },
    { id: 'bot-th-7', displayName: 'Bé Gạo', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-blue'], waypoints: [{ x: 400, y: 13, z: 350 }, { x: 420, y: 13, z: 355 }, { x: 415, y: 13, z: 375 }, { x: 395, y: 13, z: 370 }] },
    { id: 'bot-th-8', displayName: 'Bé Bơ', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], waypoints: [{ x: 425, y: 13, z: 345 }, { x: 445, y: 13, z: 350 }, { x: 440, y: 13, z: 370 }, { x: 420, y: 13, z: 365 }] },
    { id: 'bot-th-9', displayName: 'Bé Mây', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown-mint'], waypoints: [{ x: 385, y: 13, z: 355 }, { x: 405, y: 13, z: 360 }, { x: 400, y: 13, z: 380 }, { x: 380, y: 13, z: 375 }] },
    { id: 'bot-th-10', displayName: 'Cáo Vui Vẻ', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-beanie-red'], waypoints: [{ x: 405, y: 13, z: 360 }, { x: 425, y: 13, z: 365 }, { x: 420, y: 13, z: 385 }, { x: 400, y: 13, z: 380 }] },
  ],
  'cho-phien': [
    { id: 'bot-cp-1', displayName: 'Cún Đốm', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], waypoints: [{ x: 215, y: 13, z: 255 }, { x: 230, y: 13, z: 260 }, { x: 225, y: 13, z: 275 }, { x: 210, y: 13, z: 270 }] },
    { id: 'bot-cp-2', displayName: 'Thỏ Bán Hoa', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-flower-crown'], waypoints: [{ x: 225, y: 13, z: 260 }, { x: 240, y: 13, z: 265 }, { x: 235, y: 13, z: 280 }, { x: 220, y: 13, z: 275 }] },
    { id: 'bot-cp-3', displayName: 'Mèo Mua Sắm', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-pink'], waypoints: [{ x: 210, y: 13, z: 265 }, { x: 225, y: 13, z: 270 }, { x: 220, y: 13, z: 285 }, { x: 205, y: 13, z: 280 }] },
    { id: 'bot-cp-4', displayName: 'Cáo Nhí Nhảnh', species: 'fox', outfit: ['clothes-overalls-green', 'hat-cap-blue'], waypoints: [{ x: 230, y: 13, z: 250 }, { x: 245, y: 13, z: 255 }, { x: 240, y: 13, z: 270 }, { x: 225, y: 13, z: 265 }] },
    { id: 'bot-cp-5', displayName: 'Bé Đậu', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 235, y: 13, z: 265 }, { x: 250, y: 13, z: 270 }, { x: 245, y: 13, z: 285 }, { x: 230, y: 13, z: 280 }] },
    { id: 'bot-cp-6', displayName: 'Gấu Mũ Rơm', species: 'bear', outfit: ['clothes-overalls', 'hat-straw-blue'], waypoints: [{ x: 215, y: 13, z: 275 }, { x: 230, y: 13, z: 280 }, { x: 225, y: 13, z: 295 }, { x: 210, y: 13, z: 290 }] },
    { id: 'bot-cp-7', displayName: 'Mèo Kẹo Bông', species: 'cat', outfit: ['clothes-vest-shorts-navy', 'hat-cat-mint'], waypoints: [{ x: 225, y: 13, z: 280 }, { x: 240, y: 13, z: 285 }, { x: 235, y: 13, z: 300 }, { x: 220, y: 13, z: 295 }] },
    { id: 'bot-cp-8', displayName: 'Bé Bống', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-flower-crown-mint'], waypoints: [{ x: 240, y: 13, z: 260 }, { x: 255, y: 13, z: 265 }, { x: 250, y: 13, z: 280 }, { x: 235, y: 13, z: 275 }] },
    { id: 'bot-cp-9', displayName: 'Cáo Tạp Hóa', species: 'fox', outfit: ['clothes-jacket-red', 'hat-beanie-green'], waypoints: [{ x: 220, y: 13, z: 245 }, { x: 235, y: 13, z: 250 }, { x: 230, y: 13, z: 265 }, { x: 215, y: 13, z: 260 }] },
    { id: 'bot-cp-10', displayName: 'Bé Thóc', species: 'bear', outfit: ['clothes-vest-shorts', 'hat-beanie-blue'], waypoints: [{ x: 230, y: 13, z: 275 }, { x: 245, y: 13, z: 280 }, { x: 240, y: 13, z: 295 }, { x: 225, y: 13, z: 290 }] },
  ],
  'lang-ven-song': [
    { id: 'bot-lvs-1', displayName: 'Bé Na', species: 'cat', outfit: ['clothes-dress-mint', 'hat-flower-crown-mint'], waypoints: [{ x: 60, y: 13, z: 75 }, { x: 75, y: 13, z: 85 }, { x: 70, y: 13, z: 105 }, { x: 55, y: 13, z: 95 }] },
    { id: 'bot-lvs-2', displayName: 'Họa Mi', species: 'rabbit', outfit: ['clothes-overalls', 'hat-straw-pink'], waypoints: [{ x: 70, y: 13, z: 90 }, { x: 85, y: 13, z: 100 }, { x: 80, y: 13, z: 120 }, { x: 65, y: 13, z: 110 }] },
    { id: 'bot-lvs-3', displayName: 'Gấu Bến Đò', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], waypoints: [{ x: 80, y: 13, z: 110 }, { x: 95, y: 13, z: 120 }, { x: 90, y: 13, z: 140 }, { x: 75, y: 13, z: 130 }] },
    { id: 'bot-lvs-4', displayName: 'Cáo Thả Thuyền', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], waypoints: [{ x: 65, y: 13, z: 120 }, { x: 80, y: 13, z: 130 }, { x: 75, y: 13, z: 150 }, { x: 60, y: 13, z: 140 }] },
    { id: 'bot-lvs-5', displayName: 'Bé Hoa Đăng', species: 'rabbit', outfit: ['clothes-dress-blue', 'hat-straw-blue'], waypoints: [{ x: 90, y: 13, z: 130 }, { x: 105, y: 13, z: 140 }, { x: 100, y: 13, z: 160 }, { x: 85, y: 13, z: 150 }] },
    { id: 'bot-lvs-6', displayName: 'Mèo Sen', species: 'cat', outfit: ['clothes-overalls-green', 'hat-cat-mint'], waypoints: [{ x: 100, y: 13, z: 150 }, { x: 115, y: 13, z: 160 }, { x: 110, y: 13, z: 180 }, { x: 95, y: 13, z: 170 }] },
    { id: 'bot-lvs-7', displayName: 'Bé Lia Thia', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], waypoints: [{ x: 110, y: 13, z: 170 }, { x: 125, y: 13, z: 180 }, { x: 120, y: 13, z: 200 }, { x: 105, y: 13, z: 190 }] },
    { id: 'bot-lvs-8', displayName: 'Thỏ Cầu Kiều', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 75, y: 13, z: 80 }, { x: 90, y: 13, z: 90 }, { x: 85, y: 13, z: 110 }, { x: 70, y: 13, z: 100 }] },
  ],
  'nong-trai': [
    { id: 'bot-nt-1', displayName: 'Bác Nông Dân Nhí', species: 'bear', outfit: ['clothes-overalls-green', 'hat-straw-blue'], waypoints: [{ x: 395, y: 13, z: 320 }, { x: 410, y: 13, z: 325 }, { x: 405, y: 13, z: 340 }, { x: 390, y: 13, z: 335 }] },
    { id: 'bot-nt-2', displayName: 'Bé Gặt Lúa', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-pink'], waypoints: [{ x: 405, y: 13, z: 330 }, { x: 420, y: 13, z: 335 }, { x: 415, y: 13, z: 350 }, { x: 400, y: 13, z: 345 }] },
    { id: 'bot-nt-3', displayName: 'Thỏ Trồng Cà Rốt', species: 'rabbit', outfit: ['clothes-overalls', 'hat-flower-crown'], waypoints: [{ x: 385, y: 13, z: 325 }, { x: 400, y: 13, z: 330 }, { x: 395, y: 13, z: 345 }, { x: 380, y: 13, z: 340 }] },
    { id: 'bot-nt-4', displayName: 'Cáo Chăn Gà', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], waypoints: [{ x: 410, y: 13, z: 315 }, { x: 425, y: 13, z: 320 }, { x: 420, y: 13, z: 335 }, { x: 405, y: 13, z: 330 }] },
    { id: 'bot-nt-5', displayName: 'Bé Nhặt Trứng', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-bow-pink'], waypoints: [{ x: 390, y: 13, z: 340 }, { x: 405, y: 13, z: 345 }, { x: 400, y: 13, z: 360 }, { x: 385, y: 13, z: 355 }] },
    { id: 'bot-nt-6', displayName: 'Gấu Cối Xay', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], waypoints: [{ x: 415, y: 13, z: 335 }, { x: 430, y: 13, z: 340 }, { x: 425, y: 13, z: 355 }, { x: 410, y: 13, z: 350 }] },
    { id: 'bot-nt-7', displayName: 'Mèo Tưới Rau', species: 'cat', outfit: ['clothes-overalls-red', 'hat-cat-mint'], waypoints: [{ x: 380, y: 13, z: 335 }, { x: 395, y: 13, z: 340 }, { x: 390, y: 13, z: 355 }, { x: 375, y: 13, z: 350 }] },
    { id: 'bot-nt-8', displayName: 'Bé Ngô Vàng', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-cap-yellow'], waypoints: [{ x: 400, y: 13, z: 310 }, { x: 415, y: 13, z: 315 }, { x: 410, y: 13, z: 330 }, { x: 395, y: 13, z: 325 }] },
  ],
  'forest-ch1': [
    { id: 'bot-kr-1', displayName: 'Sóc Nhỏ', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], waypoints: [{ x: 20, y: 13, z: 20 }, { x: 35, y: 13, z: 25 }, { x: 30, y: 13, z: 40 }, { x: 15, y: 13, z: 35 }] },
    { id: 'bot-kr-2', displayName: 'Bé Hái Nấm', species: 'cat', outfit: ['clothes-dress-mint', 'hat-straw-pink'], waypoints: [{ x: 30, y: 13, z: 25 }, { x: 45, y: 13, z: 30 }, { x: 40, y: 13, z: 45 }, { x: 25, y: 13, z: 40 }] },
    { id: 'bot-kr-3', displayName: 'Thỏ Rừng', species: 'rabbit', outfit: ['clothes-overalls', 'hat-flower-crown-mint'], waypoints: [{ x: 25, y: 13, z: 35 }, { x: 40, y: 13, z: 40 }, { x: 35, y: 13, z: 55 }, { x: 20, y: 13, z: 50 }] },
    { id: 'bot-kr-4', displayName: 'Gấu Leo Cây', species: 'bear', outfit: ['clothes-jacket-green', 'hat-beanie-blue'], waypoints: [{ x: 35, y: 13, z: 30 }, { x: 50, y: 13, z: 35 }, { x: 45, y: 13, z: 50 }, { x: 30, y: 13, z: 45 }] },
    { id: 'bot-kr-5', displayName: 'Họa Mi Rừng', species: 'fox', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 40, y: 13, z: 20 }, { x: 55, y: 13, z: 25 }, { x: 50, y: 13, z: 40 }, { x: 35, y: 13, z: 35 }] },
    { id: 'bot-kr-6', displayName: 'Bé Soi Đèn', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-cap-yellow'], waypoints: [{ x: 20, y: 13, z: 30 }, { x: 35, y: 13, z: 35 }, { x: 30, y: 13, z: 50 }, { x: 15, y: 13, z: 45 }] },
    { id: 'bot-kr-7', displayName: 'Mèo Suối Mát', species: 'cat', outfit: ['clothes-dress-blue', 'hat-cat-mint'], waypoints: [{ x: 30, y: 13, z: 40 }, { x: 45, y: 13, z: 45 }, { x: 40, y: 13, z: 60 }, { x: 25, y: 13, z: 55 }] },
    { id: 'bot-kr-8', displayName: 'Bé Bắt Bướm', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-cap-blue'], waypoints: [{ x: 45, y: 13, z: 35 }, { x: 60, y: 13, z: 40 }, { x: 55, y: 13, z: 55 }, { x: 40, y: 13, z: 50 }] },
  ],
  'thu-vien': [
    { id: 'bot-tv-1', displayName: 'Bé Mọt Sách', species: 'cat', outfit: ['clothes-dress-blue', 'hat-straw-blue'], waypoints: [{ x: 180, y: 13, z: 425 }, { x: 195, y: 13, z: 430 }, { x: 190, y: 13, z: 445 }, { x: 175, y: 13, z: 440 }] },
    { id: 'bot-tv-2', displayName: 'Thỏ Đọc Truyện', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 190, y: 13, z: 430 }, { x: 205, y: 13, z: 435 }, { x: 200, y: 13, z: 450 }, { x: 185, y: 13, z: 445 }] },
    { id: 'bot-tv-3', displayName: 'Cáo Xếp Sách', species: 'fox', outfit: ['clothes-overalls-green', 'hat-cap-blue'], waypoints: [{ x: 175, y: 13, z: 435 }, { x: 190, y: 13, z: 440 }, { x: 185, y: 13, z: 455 }, { x: 170, y: 13, z: 450 }] },
    { id: 'bot-tv-4', displayName: 'Gấu Đố Chữ', species: 'bear', outfit: ['clothes-jacket-red', 'hat-beanie-blue'], waypoints: [{ x: 195, y: 13, z: 420 }, { x: 210, y: 13, z: 425 }, { x: 205, y: 13, z: 440 }, { x: 190, y: 13, z: 435 }] },
    { id: 'bot-tv-5', displayName: 'Bé Tháp Chuông', species: 'rabbit', outfit: ['clothes-overalls', 'hat-flower-crown'], waypoints: [{ x: 185, y: 13, z: 440 }, { x: 200, y: 13, z: 445 }, { x: 195, y: 13, z: 460 }, { x: 180, y: 13, z: 455 }] },
    { id: 'bot-tv-6', displayName: 'Mèo Kính Cận', species: 'cat', outfit: ['clothes-vest-shorts-navy', 'hat-cat-mint'], waypoints: [{ x: 200, y: 13, z: 435 }, { x: 215, y: 13, z: 440 }, { x: 210, y: 13, z: 455 }, { x: 195, y: 13, z: 450 }] },
    { id: 'bot-tv-7', displayName: 'Bé Thơ Ca', species: 'fox', outfit: ['clothes-dress-mint', 'hat-straw-pink'], waypoints: [{ x: 170, y: 13, z: 430 }, { x: 185, y: 13, z: 435 }, { x: 180, y: 13, z: 450 }, { x: 165, y: 13, z: 445 }] },
    { id: 'bot-tv-8', displayName: 'Bé Hộp Nhạc', species: 'bear', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], waypoints: [{ x: 185, y: 13, z: 415 }, { x: 200, y: 13, z: 420 }, { x: 195, y: 13, z: 435 }, { x: 180, y: 13, z: 430 }] },
  ],
  'lau-dai': [
    { id: 'bot-ld-1', displayName: 'Hiệp Sĩ Mèo', species: 'cat', outfit: ['clothes-jacket-red', 'hat-cap-blue'], waypoints: [{ x: 55, y: 17, z: 340 }, { x: 70, y: 17, z: 345 }, { x: 65, y: 17, z: 360 }, { x: 50, y: 17, z: 355 }] },
    { id: 'bot-ld-2', displayName: 'Thỏ Cung Đình', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 65, y: 17, z: 345 }, { x: 80, y: 17, z: 350 }, { x: 75, y: 17, z: 365 }, { x: 60, y: 17, z: 360 }] },
    { id: 'bot-ld-3', displayName: 'Gấu Lính Gác', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], waypoints: [{ x: 75, y: 17, z: 335 }, { x: 90, y: 17, z: 340 }, { x: 85, y: 17, z: 355 }, { x: 70, y: 17, z: 350 }] },
    { id: 'bot-ld-4', displayName: 'Cáo Hoàng Gia', species: 'fox', outfit: ['clothes-overalls-green', 'hat-cap-yellow'], waypoints: [{ x: 50, y: 17, z: 350 }, { x: 65, y: 17, z: 355 }, { x: 60, y: 17, z: 370 }, { x: 45, y: 17, z: 365 }] },
    { id: 'bot-ld-5', displayName: 'Bé Cờ Vua', species: 'cat', outfit: ['clothes-dress-blue', 'hat-cat-mint'], waypoints: [{ x: 80, y: 17, z: 345 }, { x: 95, y: 17, z: 350 }, { x: 90, y: 17, z: 365 }, { x: 75, y: 17, z: 360 }] },
    { id: 'bot-ld-6', displayName: 'Thỏ Cầu Treo', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-flower-crown-mint'], waypoints: [{ x: 60, y: 17, z: 335 }, { x: 75, y: 17, z: 340 }, { x: 70, y: 17, z: 355 }, { x: 55, y: 17, z: 350 }] },
    { id: 'bot-ld-7', displayName: 'Bé Gương Soi', species: 'fox', outfit: ['clothes-dress-mint', 'hat-straw-pink'], waypoints: [{ x: 70, y: 17, z: 355 }, { x: 85, y: 17, z: 360 }, { x: 80, y: 17, z: 375 }, { x: 65, y: 17, z: 370 }] },
    { id: 'bot-ld-8', displayName: 'Gấu Tháp Cao', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], waypoints: [{ x: 85, y: 17, z: 340 }, { x: 100, y: 17, z: 345 }, { x: 95, y: 17, z: 360 }, { x: 80, y: 17, z: 355 }] },
  ],
  'xom-mai-am': [
    { id: 'bot-xma-1', displayName: 'Bé Xóm Mới', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown'], waypoints: [{ x: 105, y: 13, z: 105 }, { x: 120, y: 13, z: 110 }, { x: 115, y: 13, z: 125 }, { x: 100, y: 13, z: 120 }] },
    { id: 'bot-xma-2', displayName: 'Mèo Mái Ngói', species: 'cat', outfit: ['clothes-overalls-green', 'hat-cat-mint'], waypoints: [{ x: 115, y: 13, z: 110 }, { x: 130, y: 13, z: 115 }, { x: 125, y: 13, z: 130 }, { x: 110, y: 13, z: 125 }] },
    { id: 'bot-xma-3', displayName: 'Cáo Thả Diều', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], waypoints: [{ x: 100, y: 13, z: 115 }, { x: 115, y: 13, z: 120 }, { x: 110, y: 13, z: 135 }, { x: 95, y: 13, z: 130 }] },
    { id: 'bot-xma-4', displayName: 'Gấu Chuyền Cầu', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], waypoints: [{ x: 125, y: 13, z: 105 }, { x: 140, y: 13, z: 110 }, { x: 135, y: 13, z: 125 }, { x: 120, y: 13, z: 120 }] },
    { id: 'bot-xma-5', displayName: 'Bé Đánh Cù', species: 'rabbit', outfit: ['clothes-overalls-red', 'hat-cap-yellow'], waypoints: [{ x: 110, y: 13, z: 120 }, { x: 125, y: 13, z: 125 }, { x: 120, y: 13, z: 140 }, { x: 105, y: 13, z: 135 }] },
    { id: 'bot-xma-6', displayName: 'Mèo Ngắm Trăng', species: 'cat', outfit: ['clothes-dress-mint', 'hat-straw-pink'], waypoints: [{ x: 120, y: 13, z: 115 }, { x: 135, y: 13, z: 120 }, { x: 130, y: 13, z: 135 }, { x: 115, y: 13, z: 130 }] },
    { id: 'bot-xma-7', displayName: 'Bé Giàn Mướp', species: 'fox', outfit: ['clothes-vest-shorts', 'hat-beanie-green'], waypoints: [{ x: 95, y: 13, z: 110 }, { x: 110, y: 13, z: 115 }, { x: 105, y: 13, z: 130 }, { x: 90, y: 13, z: 125 }] },
    { id: 'bot-xma-8', displayName: 'Bé Kể Chuyện', species: 'bear', outfit: ['clothes-dress-blue', 'hat-bow-pink'], waypoints: [{ x: 130, y: 13, z: 115 }, { x: 145, y: 13, z: 120 }, { x: 140, y: 13, z: 135 }, { x: 125, y: 13, z: 130 }] },
  ],
  'nui-tuyet': [
    { id: 'bot-ntu-1', displayName: 'Cánh Cụt Nhí', species: 'cat', outfit: ['clothes-jacket-red', 'hat-beanie-blue'], waypoints: [{ x: 395, y: 17, z: 720 }, { x: 410, y: 17, z: 725 }, { x: 405, y: 17, z: 740 }, { x: 390, y: 17, z: 735 }] },
    { id: 'bot-ntu-2', displayName: 'Gấu Bắc Cực', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-red'], waypoints: [{ x: 405, y: 17, z: 725 }, { x: 420, y: 17, z: 730 }, { x: 415, y: 17, z: 745 }, { x: 400, y: 17, z: 740 }] },
    { id: 'bot-ntu-3', displayName: 'Cáo Tuyết', species: 'fox', outfit: ['clothes-overalls-green', 'hat-cat-mint'], waypoints: [{ x: 390, y: 17, z: 715 }, { x: 405, y: 17, z: 720 }, { x: 400, y: 17, z: 735 }, { x: 385, y: 17, z: 730 }] },
    { id: 'bot-ntu-4', displayName: 'Thỏ Trượt Băng', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 410, y: 17, z: 715 }, { x: 425, y: 17, z: 720 }, { x: 420, y: 17, z: 735 }, { x: 405, y: 17, z: 730 }] },
    { id: 'bot-ntu-5', displayName: 'Bé Đắp Người Tuyết', species: 'cat', outfit: ['clothes-dress-blue', 'hat-flower-crown-mint'], waypoints: [{ x: 385, y: 17, z: 725 }, { x: 400, y: 17, z: 730 }, { x: 395, y: 17, z: 745 }, { x: 380, y: 17, z: 740 }] },
    { id: 'bot-ntu-6', displayName: 'Bé Cáp Treo', species: 'fox', outfit: ['clothes-overalls', 'hat-cap-blue'], waypoints: [{ x: 400, y: 17, z: 735 }, { x: 415, y: 17, z: 740 }, { x: 410, y: 17, z: 755 }, { x: 395, y: 17, z: 750 }] },
    { id: 'bot-ntu-7', displayName: 'Nai Nhỏ', species: 'bear', outfit: ['clothes-jacket-green', 'hat-cap-yellow'], waypoints: [{ x: 415, y: 17, z: 720 }, { x: 430, y: 17, z: 725 }, { x: 425, y: 17, z: 740 }, { x: 410, y: 17, z: 735 }] },
    { id: 'bot-ntu-8', displayName: 'Bé Bông Tuyết', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-straw-blue'], waypoints: [{ x: 395, y: 17, z: 710 }, { x: 410, y: 17, z: 715 }, { x: 405, y: 17, z: 730 }, { x: 390, y: 17, z: 725 }] },
  ],
  'dao-bi-an': [
    { id: 'bot-dba-1', displayName: 'Thủy Thủ Nhí', species: 'cat', outfit: ['clothes-overalls-green', 'hat-straw-blue'], waypoints: [{ x: 385, y: 13, z: 605 }, { x: 400, y: 13, z: 610 }, { x: 395, y: 13, z: 625 }, { x: 380, y: 13, z: 620 }] },
    { id: 'bot-dba-2', displayName: 'Thỏ Vỏ Ốc', species: 'rabbit', outfit: ['clothes-dress', 'hat-flower-crown'], waypoints: [{ x: 395, y: 13, z: 610 }, { x: 410, y: 13, z: 615 }, { x: 405, y: 13, z: 630 }, { x: 390, y: 13, z: 625 }] },
    { id: 'bot-dba-3', displayName: 'Cáo Lâu Đài Cát', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], waypoints: [{ x: 380, y: 13, z: 615 }, { x: 395, y: 13, z: 620 }, { x: 390, y: 13, z: 635 }, { x: 375, y: 13, z: 630 }] },
    { id: 'bot-dba-4', displayName: 'Gấu Nhảy Sóng', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], waypoints: [{ x: 400, y: 13, z: 600 }, { x: 415, y: 13, z: 605 }, { x: 410, y: 13, z: 620 }, { x: 395, y: 13, z: 615 }] },
    { id: 'bot-dba-5', displayName: 'Bé Cây Dừa', species: 'rabbit', outfit: ['clothes-dress-mint', 'hat-straw-pink'], waypoints: [{ x: 390, y: 13, z: 620 }, { x: 405, y: 13, z: 625 }, { x: 400, y: 13, z: 640 }, { x: 385, y: 13, z: 635 }] },
    { id: 'bot-dba-6', displayName: 'Mèo Kho Báu', species: 'cat', outfit: ['clothes-vest-shorts', 'hat-cat-mint'], waypoints: [{ x: 405, y: 13, z: 615 }, { x: 420, y: 13, z: 620 }, { x: 415, y: 13, z: 635 }, { x: 400, y: 13, z: 630 }] },
    { id: 'bot-dba-7', displayName: 'Bé San Hô', species: 'fox', outfit: ['clothes-dress-blue', 'hat-bow-pink'], waypoints: [{ x: 375, y: 13, z: 610 }, { x: 390, y: 13, z: 615 }, { x: 385, y: 13, z: 630 }, { x: 370, y: 13, z: 625 }] },
    { id: 'bot-dba-8', displayName: 'Bé Hải Âu', species: 'bear', outfit: ['clothes-overalls-red', 'hat-cap-yellow'], waypoints: [{ x: 385, y: 13, z: 595 }, { x: 400, y: 13, z: 600 }, { x: 395, y: 13, z: 615 }, { x: 380, y: 13, z: 610 }] },
  ],
  'nha-cua-be': [
    { id: 'bot-ncb-1', displayName: 'Bạn Hàng Xóm', species: 'rabbit', outfit: ['clothes-dress', 'hat-bow-pink'], waypoints: [{ x: 75, y: 13, z: 20 }, { x: 85, y: 13, z: 25 }, { x: 80, y: 13, z: 35 }, { x: 70, y: 13, z: 30 }] },
    { id: 'bot-ncb-2', displayName: 'Bé Tưới Hoa', species: 'cat', outfit: ['clothes-overalls-green', 'hat-straw-pink'], waypoints: [{ x: 82, y: 13, z: 22 }, { x: 90, y: 13, z: 30 }, { x: 85, y: 13, z: 40 }, { x: 76, y: 13, z: 32 }] },
    { id: 'bot-ncb-3', displayName: 'Cún Vui Vẻ', species: 'bear', outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'], waypoints: [{ x: 72, y: 13, z: 28 }, { x: 80, y: 13, z: 35 }, { x: 75, y: 13, z: 45 }, { x: 68, y: 13, z: 38 }] },
    { id: 'bot-ncb-4', displayName: 'Cáo Giao Thư', species: 'fox', outfit: ['clothes-jacket-red', 'hat-cap-blue'], waypoints: [{ x: 78, y: 13, z: 18 }, { x: 88, y: 13, z: 24 }, { x: 84, y: 13, z: 32 }, { x: 74, y: 13, z: 26 }] },
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

/** How long a companion bot takes to answer a party invite. */
export const BOT_REPLY_MS = 1_500;
/** A companion bot thinks over a friend request this long (and up to twice as long), as a player would. */
export const BOT_FRIEND_REPLY_MS = 2_000;
/** Most friend requests a companion bot accepts; now and then it is "busy" and says not now. */
export const BOT_FRIEND_ACCEPT = 0.85;
/** Meeting the same player this many times, a companion bot may ask her to be friends (once per server run). */
const BOT_ASKS_AFTER_GREETS = 2;
const BOT_ASK_CHANCE = 0.5;
const MAX_GREET_PAIRS = 10_000;
/** Bot friends of a home's owner who come to visit it. */
const HOME_VISITORS = 2;
/** A bot goes to visit a friend standing at most this far from it, and stops this far from her. */
const VISIT_RANGE = 20;
const VISIT_STOP = 2.5;
const VISIT_CHANCE = 0.6;

/** What a bot asks of its runner: the hub's messages, meeting a player, and its friends in the room. */
interface BotHooks {
  onMessage(message: ServerWsMessage): void;
  /** It greeted a player (by public id). */
  onGreet(playerId: string): void;
  /** Public ids of the players in its room who are friends with it. */
  friendsHere(): readonly string[];
  random(): number;
}

const NO_HOOKS: BotHooks = { onMessage: () => {}, onGreet: () => {}, friendsHere: () => [], random: Math.random };

class CompanionBotInstance {
  readonly profile: BotProfile;
  readonly room: MultiplayerRoom;
  readonly presence: PlayerPresence;
  private currentWaypointIdx = 0;
  private state: 'walk' | 'idle' | 'greet' = 'walk';
  private stateTimer = 0;
  private lastGreetTime = 0;
  /** A friend it walks over to, before going on along its way. */
  private detour: Waypoint | null = null;
  private readonly hooks: BotHooks;

  constructor(profile: BotProfile, room: MultiplayerRoom, hooks: Partial<BotHooks> = {}) {
    this.profile = profile;
    this.room = room;
    this.hooks = { ...NO_HOOKS, ...hooks };
    const startWp = profile.waypoints[0] ?? { x: 0, y: 0, z: 0 };

    this.presence = {
      id: profile.id,
      displayName: profile.displayName,
      isBot: true, // ALWAYS labelled as bot per Jev ruling
      species: profile.species,
      outfit: profile.outfit,
      pet: null,
      x: startWp.x,
      y: startWp.y,
      z: startWp.z,
      yaw: 0,
      speed: 0,
      action: 'idle',
      riding: false,
      bubble: null,
    };
  }

  join(): void {
    this.room.join({
      id: this.profile.id,
      presence: this.presence,
      send: (message) => this.hooks.onMessage(message),
      isBot: true,
    });
  }

  leave(): void {
    this.room.leave(this.profile.id);
  }

  /** Sometimes, after a pause, it walks over to a friend in its room (friends meet it more often). */
  private visitFriend(): void {
    if (this.hooks.random() >= VISIT_CHANCE) return;
    for (const id of this.hooks.friendsHere()) {
      const friend = this.room.members.get(id)?.presence;
      if (!friend) continue;
      const dx = friend.x - this.presence.x;
      const dz = friend.z - this.presence.z;
      const dist = Math.hypot(dx, dz);
      if (dist > VISIT_RANGE || dist <= VISIT_STOP) continue;
      const k = (dist - VISIT_STOP) / dist;
      this.detour = { x: this.presence.x + dx * k, y: friend.y, z: this.presence.z + dz * k };
      return;
    }
  }

  tick(dt: number): void {
    this.stateTimer -= dt;

    // Check if any human player is nearby (< 4.5 units) to greet them
    const now = Date.now();
    if (this.state !== 'greet' && now - this.lastGreetTime > 15000) {
      for (const member of this.room.members.values()) {
        if (!member.isBot) {
          const dx = member.presence.x - this.presence.x;
          const dz = member.presence.z - this.presence.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 4.5) {
            this.state = 'greet';
            this.stateTimer = 3.5;
            this.lastGreetTime = now;
            this.presence.yaw = Math.atan2(dx, dz);
            this.presence.speed = 0;
            this.presence.action = 'wave';
            this.room.updatePresence(this.presence.id, {
              x: this.presence.x,
              y: this.presence.y,
              z: this.presence.z,
              yaw: this.presence.yaw,
              speed: 0,
              action: 'wave',
            });
            this.room.broadcastEmote(this.presence.id, 'wave');
            const chatChoice = SAFE_CANNED_CHATS[Math.floor(this.hooks.random() * SAFE_CANNED_CHATS.length)] ?? 'Xin chào bạn!';
            this.room.broadcastChat(this.presence.id, chatChoice);
            this.hooks.onGreet(member.id);
            return;
          }
        }
      }
    }

    if (this.state === 'greet') {
      if (this.stateTimer <= 0) {
        this.state = 'walk';
        this.stateTimer = 0;
      }
      return;
    }

    if (this.state === 'idle') {
      if (this.stateTimer <= 0) {
        this.state = 'walk';
        this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.profile.waypoints.length;
        this.visitFriend();
      }
      return;
    }

    // Walking towards a friend it visits, or its current waypoint
    const targetWp = this.detour ?? this.profile.waypoints[this.currentWaypointIdx];
    if (!targetWp) return;

    const dx = targetWp.x - this.presence.x;
    const dz = targetWp.z - this.presence.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.6) {
      // Reached waypoint: switch to idle
      this.detour = null;
      this.state = 'idle';
      this.stateTimer = 2.5 + this.hooks.random() * 3.5; // 2.5 - 6s pause
      this.presence.speed = 0;
      this.presence.action = 'idle';
      this.room.updatePresence(this.presence.id, {
        x: targetWp.x,
        y: targetWp.y,
        z: targetWp.z,
        yaw: this.presence.yaw,
        speed: 0,
        action: 'idle',
      });
      return;
    }

    // Move smoothly
    const speed = 1.8; // blocks per second
    const moveStep = Math.min(speed * dt, dist);
    const angle = Math.atan2(dx, dz);

    this.presence.x += Math.sin(angle) * moveStep;
    this.presence.z += Math.cos(angle) * moveStep;
    this.presence.y = targetWp.y;
    this.presence.yaw = angle;
    this.presence.speed = speed;
    this.presence.action = 'walk';

    this.room.updatePresence(this.presence.id, {
      x: this.presence.x,
      y: this.presence.y,
      z: this.presence.z,
      yaw: this.presence.yaw,
      speed: this.presence.speed,
      action: 'walk',
    });
  }
}

export interface BotRunnerOptions {
  /** Injectable for tests (whether a bot accepts, asks, visits). */
  random?: () => number;
}

export class BotRunner {
  private readonly hub: MultiplayerHub;
  private readonly random: () => number;
  private readonly bots = new Map<string, CompanionBotInstance[]>();
  private timer: NodeJS.Timeout | null = null;
  private lastTick = Date.now();
  /** Answers on their way (a bot takes a moment, as a player would). */
  private readonly replies = new Set<NodeJS.Timeout>();
  /** Greetings per bot and player, and the pairs a bot already asked to be friends. */
  private readonly greets = new Map<string, number>();
  private readonly asked = new Set<string>();

  constructor(hub: MultiplayerHub, options: BotRunnerOptions = {}) {
    this.hub = hub;
    this.random = options.random ?? Math.random;
  }

  /** A bot of `profile` in `room`, wired to this runner. */
  private instance(profile: BotProfile, room: MultiplayerRoom): CompanionBotInstance {
    return new CompanionBotInstance(profile, room, {
      onMessage: (message) => this.heard(profile.id, message),
      onGreet: (playerId) => this.greeted(profile.id, playerId),
      friendsHere: () => this.hub.friendsOfBot(profile.id).filter((id) => room.members.has(id)),
      random: this.random,
    });
  }

  start(): void {
    // Populate companion bots for configured maps; each home gets its own while a player is in it.
    for (const [mapId, profiles] of Object.entries(BOT_MAP_CONFIGS)) {
      if (mapId === HOME_MAP_ID) continue;
      this.fill(this.hub.getOrCreateRoom(mapId), profiles);
    }
    this.hub.setHomeRoomHooks({
      opened: (room) => this.fill(room, this.homeBots(room)),
      closed: (room) => {
        for (const bot of this.bots.get(room.key) ?? []) bot.leave();
        this.bots.delete(room.key);
      },
    });

    // Run tick loop at 10Hz (100ms)
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), 100);
  }

  private fill(room: MultiplayerRoom, profiles: readonly BotProfile[]): void {
    const instances = profiles.map((p) => this.instance(p, room));
    for (const inst of instances) inst.join();
    this.bots.set(room.key, instances);
  }

  /**
   * A home's bots: the neighbours of the home map, and up to two of its owner's bot friends come to visit (along
   * the neighbours' ways), so friends turn up more often.
   */
  private homeBots(room: MultiplayerRoom): BotProfile[] {
    const neighbours = BOT_MAP_CONFIGS[HOME_MAP_ID] ?? [];
    const visitors = (room.host ? this.hub.botFriendsOf(room.host) : [])
      .filter((id) => !neighbours.some((n) => n.id === id))
      .slice(0, HOME_VISITORS)
      .flatMap((id, i): BotProfile[] => {
        const friend = findBot(id)?.profile;
        const way = neighbours[i % Math.max(1, neighbours.length)]?.waypoints;
        return friend && way ? [{ ...friend, waypoints: way }] : [];
      });
    return [...neighbours, ...visitors];
  }

  /** Moves every bot on by the time since the last tick (at most a fifth of a second, after a stall). */
  tick(): void {
    const now = Date.now();
    const dt = Math.min((now - this.lastTick) / 1000, 0.2);
    this.lastTick = now;
    for (const list of this.bots.values()) {
      for (const bot of list) {
        bot.tick(dt);
      }
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const reply of this.replies) clearTimeout(reply);
    this.replies.clear();
  }

  private later(ms: number, run: () => void): void {
    const reply = setTimeout(() => {
      this.replies.delete(reply);
      run();
    }, ms);
    this.replies.add(reply);
  }

  /**
   * A companion bot is a full party member: invited, it joins after a moment. Asked to be friends, it thinks it
   * over and mostly says yes. Leaving and choosing by character are the bots' own behaviour, built on this.
   */
  private heard(botId: string, message: ServerWsMessage): void {
    if (message.type === 'party-invite') {
      this.later(BOT_REPLY_MS, () => this.hub.answerPartyInvite(botId, message.from.id, true));
      return;
    }
    if (message.type === 'friend-request') {
      const accept = this.random() < BOT_FRIEND_ACCEPT;
      this.later(BOT_FRIEND_REPLY_MS * (1 + this.random()), () => void this.hub.answerBotFriendRequest(botId, message.request.id, accept));
    }
  }

  /** Meeting a player again and again, a bot may ask her to be friends (once). */
  private greeted(botId: string, playerId: string): void {
    const pair = `${botId}>${playerId}`;
    if (this.asked.has(pair)) return;
    const count = (this.greets.get(pair) ?? 0) + 1;
    // Only a memory of who met whom: a crowded server forgets it rather than growing without end.
    if (this.greets.size >= MAX_GREET_PAIRS) this.greets.clear();
    this.greets.set(pair, count);
    if (count < BOT_ASKS_AFTER_GREETS || this.random() >= BOT_ASK_CHANCE) return;
    this.asked.add(pair);
    this.greets.delete(pair);
    void this.hub.botFriendRequest(botId, playerId);
  }
}
