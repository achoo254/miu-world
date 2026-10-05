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
import { COOP_BOT_LINE_VARIANTS, type CoopAction, type CoopBotLine, type CoopBotLineKey, type CoopStateView, type CoopTaskView } from '@miu/schema/coop';
import { VOICE_BOT_LINE_VARIANTS, type VoiceBotLineKey, type VoiceChannel } from '@miu/schema/voice';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import type { CoopBotDriver, CoopBotMoves } from '../coop/coop-service';
import { botAnswerXp, botSkillLevel, fatigueAfter, moodAt, personaOf, rightChance, thinkMs, VOICES, type Bounds } from './bot-persona';
import type { BotStore } from './bot-store';
import type { CoopPerson } from '../coop/coop-session';
import { botProfileId, homeBotId, type MultiplayerHub, type MultiplayerRoom } from './multiplayer-hub';

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
/** However sharp or tired, a companion bot answers a co-op question right at least, and at most, this often. */
export const BOT_COOP_ACCURACY_MIN = 0.35;
export const BOT_COOP_ACCURACY_MAX = 0.95;
/** A pending move further off than twice this gives way to news (a wake-up to pull again). */
export const BOT_COOP_THINK_MS = 1_800;
/** In a `together` round it pulls its rope again this long before letting go. */
const BOT_REHOLD_MS = 3_000;
/** Bot friends of a home's owner who come to visit it. */
const HOME_VISITORS = 2;
/** A bot goes to visit a friend standing at most this far from it, and stops this far from her. */
const VISIT_RANGE = 20;
const VISIT_STOP = 2.5;
const VISIT_CHANCE = 0.6;
/** In a party's voice a bot answers this long after a player stops talking (and up to twice as long)… */
export const BOT_VOICE_REPLY_MS = 700;
/** …greets a player who comes into the voice after this long… */
export const BOT_VOICE_HELLO_MS = 1_200;
/** …and no bot says another line sooner than this after the last one (the players talk more than the bots). */
export const BOT_VOICE_GAP_MS = 4_000;
/** A player's turn shorter than this gets a quick "yes"; longer than the next a "tell me more". */
const SHORT_TURN_MS = 1_500;
const LONG_TURN_MS = 4_500;

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
      petGear: [],
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
            // A greeting, never the nudge towards a quest's hints (that one is for a party at a question).
            const greetings = SAFE_CANNED_CHATS.filter((line) => line !== 'Thử bấm Gợi ý xem!');
            const chatChoice = greetings[Math.floor(this.hooks.random() * greetings.length)] ?? 'Xin chào bạn!';
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
  /** Injectable for tests (whether a bot accepts, asks, visits, answers right). */
  random?: () => number;
  /** How often a bot answers a co-op question right, fixed (0–1; tests). Without it, its persona and skill decide… */
  coopAccuracy?: number;
  /** …within these bounds. */
  coopAccuracyMin?: number;
  coopAccuracyMax?: number;
  /** How long a bot thinks before a co-op move, fixed (ms, up to twice as long; tests). Without it, its persona decides. */
  coopThinkMs?: number;
  /** Bots' own skill XP (they learn from their own answers); none: they learn only while the server runs. */
  store?: BotStore;
  /** The time of day (a bot's mood follows the hour). */
  clock?: () => Date;
}

interface CoopTurn {
  state: CoopStateView;
  moves: CoopBotMoves;
  timer: NodeJS.Timeout | null;
  /** When the pending move is due (ms). */
  dueAt: number;
  /** When it got the state it sees (the holds' time left counts from then). */
  receivedAt: number;
  /** Its answers in this challenge (it tires a little with each). */
  answers: number;
  /** Its lines, each kind from its own voice, never the same twice in a row. */
  lines: Map<CoopBotLineKey, FreshPicker<number>>;
}

/** A party's voice as its bots follow it: who is in it, who talks now (since when), and whose turn a line is. */
interface VoiceTalk {
  players: Set<string>;
  speaking: Map<string, number>;
  /** The line a bot is about to say (cancelled when a player starts talking). */
  timer: NodeJS.Timeout | null;
  lastLineAt: number;
  /** When each bot last spoke: the turn goes to the one who spoke least lately. */
  spoke: Map<string, number>;
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
  /** Bots playing a co-op challenge: what each sees and the move it is thinking over. */
  private readonly coop = new Map<string, CoopTurn>();
  private readonly bounds: Bounds;
  private readonly coopThinkMs: number | null;
  private readonly store: BotStore | null;
  private readonly clock: () => Date;
  /** Each bot's skill XP, read once from the store and kept up to date as it plays. */
  private readonly skills = new Map<string, Promise<Record<string, number>>>();
  /** Parties' voices with bots in them, by party id. */
  private readonly talks = new Map<string, VoiceTalk>();
  /** Each bot's voice lines per kind, from its own voice, never the same twice in a row. */
  private readonly voiceLines = new Map<string, FreshPicker<number>>();

  constructor(hub: MultiplayerHub, options: BotRunnerOptions = {}) {
    this.hub = hub;
    this.random = options.random ?? Math.random;
    const fixed = options.coopAccuracy === undefined ? null : Math.min(1, Math.max(0, options.coopAccuracy));
    this.bounds = fixed === null ? { min: options.coopAccuracyMin ?? BOT_COOP_ACCURACY_MIN, max: options.coopAccuracyMax ?? BOT_COOP_ACCURACY_MAX } : { min: fixed, max: fixed };
    this.coopThinkMs = options.coopThinkMs ?? null;
    this.store = options.store ?? null;
    this.clock = options.clock ?? (() => new Date());
  }

  /**
   * Companion bots in co-op challenges: the bots of the map fill a lone player's free places (always labelled), no two
   * of a team alike, and each plays its part like a player of its own: shares its clues, answers its questions as its
   * persona, skill, mood and tiredness have it (quick and sharp one moment, slipping the next), pulls its rope and
   * pulls again before letting go, and now and then says a line in its own voice.
   */
  coopDriver(): CoopBotDriver {
    return {
      pick: (mapId, count, exclude) => {
        const local = mapId ? (BOT_MAP_CONFIGS[mapId] ?? []) : [];
        const all = Object.values(BOT_MAP_CONFIGS).flat();
        const seen = new Set<string>();
        const pool = [...this.shuffled(local), ...this.shuffled(all)].filter((p) => {
          if (seen.has(p.id) || exclude.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        // No two bots of one team alike: another voice and another rhythm than every bot already in it.
        const team = [...exclude].filter((id) => id.startsWith('bot-')).map((id) => personaOf(id));
        const chosen: BotProfile[] = [];
        const differs = (p: BotProfile): boolean => {
          const persona = personaOf(p.id);
          return team.every((o) => o.voice !== persona.voice && Math.abs(o.speed - persona.speed) >= 0.1);
        };
        for (const p of pool) {
          if (chosen.length >= count) break;
          if (!differs(p)) continue;
          chosen.push(p);
          team.push(personaOf(p.id));
        }
        // More places than voices: the rest come as they are (still with their own personas).
        for (const p of pool) if (chosen.length < count && !chosen.includes(p)) chosen.push(p);
        return chosen.map((p): CoopPerson => ({ id: p.id, displayName: p.displayName, species: p.species, isBot: true }));
      },
      play: (botId, state, moves) => {
        const turn = this.coop.get(botId);
        if (turn) {
          turn.state = state;
          turn.moves = moves;
          turn.receivedAt = Date.now();
          // A far wake-up (waiting to pull again) gives way to news: it thinks again now. A move it is already
          // thinking over stays, so a busy team never keeps it from answering.
          if (turn.timer && turn.dueAt - Date.now() > 2 * (this.coopThinkMs ?? BOT_COOP_THINK_MS)) {
            clearTimeout(turn.timer);
            turn.timer = null;
          }
        } else this.coop.set(botId, { state, moves, timer: null, dueAt: 0, receivedAt: Date.now(), answers: 0, lines: new Map() });
        this.coopThink(botId, this.moveMs(botId, state, moves));
      },
      forget: (ids) => {
        for (const id of ids) {
          const turn = this.coop.get(id);
          if (turn?.timer) clearTimeout(turn.timer);
          this.coop.delete(id);
        }
      },
    };
  }

  private shuffled<T>(list: readonly T[]): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }

  /** A bot's skill XP (read once, then kept as it learns). */
  private skillsOf(botId: string): Promise<Record<string, number>> {
    const id = botProfileId(botId);
    let skills = this.skills.get(id);
    if (!skills) {
      skills = this.store ? this.store.skills(id).catch(() => ({})) : Promise.resolve({});
      this.skills.set(id, skills);
    }
    return skills;
  }

  /** How long its next move takes: a question as long as its persona and the players' usual time say, a share or a pull less. */
  private moveMs(botId: string, state: CoopStateView, moves: CoopBotMoves): number {
    const chance = this.random();
    if (this.coopThinkMs !== null) return this.coopThinkMs * (1 + chance);
    const persona = personaOf(botId);
    const own = state.tasks.find((t) => t.task !== null)?.task ?? (state.turn === state.self ? state.task : null);
    const info = own ? moves.question(own.id) : null;
    const fatigue = fatigueAfter(this.coop.get(botId)?.answers ?? 0);
    return info ? thinkMs(persona, info, fatigue, chance) : Math.round(1_200 + 1_800 * persona.speed * (0.5 + chance));
  }

  /** Thinks over its next move a moment, unless it already is. */
  private coopThink(botId: string, ms: number): void {
    const turn = this.coop.get(botId);
    if (!turn || turn.timer) return;
    turn.dueAt = Date.now() + ms;
    turn.timer = setTimeout(() => {
      turn.timer = null;
      void this.coopMove(botId);
    }, ms);
  }

  /** A line of its own voice for this kind of move, said as often as its persona talks. */
  private lineFor(botId: string, turn: CoopTurn, key: CoopBotLineKey): CoopBotLine | undefined {
    const persona = personaOf(botId);
    if (this.random() >= persona.chat) return undefined;
    let picker = turn.lines.get(key);
    if (!picker) {
      const variants = Array.from({ length: COOP_BOT_LINE_VARIANTS }, (_, i) => i).filter((i) => i % VOICES === persona.voice);
      picker = freshPicker(variants, this.random);
      turn.lines.set(key, picker);
    }
    return { key, variant: picker.next() };
  }

  /** Its answer: right as often as its skill, the question, its mood and tiredness make it; it learns from it. */
  private async coopAnswer(botId: string, task: CoopTaskView, turn: CoopTurn): Promise<{ action: CoopAction; right: boolean }> {
    const right = turn.moves.answerOf(task.id);
    const info = turn.moves.question(task.id);
    const persona = personaOf(botId);
    const skills = await this.skillsOf(botId);
    const level = botSkillLevel(info ? (skills[info.skill] ?? 0) : 0);
    const chance = info ? rightChance(persona, info, level, moodAt(botId, persona, this.clock()), fatigueAfter(turn.answers), this.bounds) : this.bounds.max;
    const others = task.choices.filter((c) => c.id !== right);
    const wrong = others[Math.floor(this.random() * others.length)];
    const isRight = right !== null && (this.random() < chance || !wrong);
    turn.answers += 1;
    if (info) {
      // It learns from its own answer only (more from a right one), kept for the next challenge.
      const gained = botAnswerXp(isRight);
      skills[info.skill] = (skills[info.skill] ?? 0) + gained;
      void this.store?.addSkillXp(botProfileId(botId), info.skill, gained).catch((err: unknown) => {
        console.error('bot skill failed', err instanceof Error ? err.name : typeof err);
      });
    }
    const choice = isRight ? (right ?? '') : (wrong?.id ?? task.choices[0]?.id ?? '');
    return { action: { kind: 'answer', task: task.id, choice }, right: isRight };
  }

  private async coopMove(botId: string): Promise<void> {
    const turn = this.coop.get(botId);
    if (!turn || turn.state.status !== 'playing') return;
    const { state } = turn;
    const self = state.self;
    // Its own clue not shown yet: share it.
    const clue = state.pieces.find((p) => p.text !== null && !p.shared);
    if (clue) return turn.moves.act({ kind: 'share', piece: clue.index }, this.lineFor(botId, turn, 'share'));
    const task = state.task && state.turn === self && state.pieces.every((p) => p.shared) ? state.task : (state.tasks.find((t) => t.task !== null)?.task ?? null);
    if (task) {
      const { action, right } = await this.coopAnswer(botId, task, turn);
      if (this.coop.get(botId) !== turn) return;
      return turn.moves.act(action, this.lineFor(botId, turn, right ? 'right' : 'oops'));
    }
    if (state.mode !== 'together') return;
    const places = state.seats.filter((s) => s.id === self || s.standIn?.id === self).map((s) => s.id);
    // Time left of its holds now, not when the state came.
    const since = Date.now() - turn.receivedAt;
    const left = state.holds.filter((h) => places.includes(h.seat)).map((h) => Math.max(0, h.msLeft - since));
    if (left.length === 0) return;
    if (left.some((ms) => ms < BOT_REHOLD_MS)) return turn.moves.act({ kind: 'hold' }, this.lineFor(botId, turn, 'hold'));
    // Held: it pulls again just before letting go, while the others answer.
    this.coopThink(botId, Math.min(...left) - BOT_REHOLD_MS + 100);
  }

  /** A bot of `profile` in `room`, wired to this runner. */
  private instance(profile: BotProfile, room: MultiplayerRoom): CompanionBotInstance {
    return new CompanionBotInstance(profile, room, {
      onMessage: (message) => this.heard(profile.id, message),
      onGreet: (playerId) => this.greeted(profile.id, playerId),
      friendsHere: () => this.hub.friendsOfBot(botProfileId(profile.id)).filter((id) => room.members.has(id)),
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
      opened: (room) => this.fill(room, this.homeBots(room), room.host),
      closed: (room) => {
        for (const bot of this.bots.get(room.key) ?? []) bot.leave();
        this.bots.delete(room.key);
      },
    });

    // Run tick loop at 10Hz (100ms)
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), 100);
  }

  /** Bots of `profiles` into `room`; in a home (`host`), each as its own instance there. */
  private fill(room: MultiplayerRoom, profiles: readonly BotProfile[], host: string | null = null): void {
    const instances = profiles.map((p) => this.instance(host ? { ...p, id: homeBotId(p.id, host) } : p, room));
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
    for (const turn of this.coop.values()) if (turn.timer) clearTimeout(turn.timer);
    this.coop.clear();
    for (const talk of this.talks.values()) if (talk.timer) clearTimeout(talk.timer);
    this.talks.clear();
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
      return;
    }
    if (message.type === 'voice-state') return this.voiceState(botId, message.channel);
    if (message.type === 'voice-speaking') return this.voiceSpeaking(botId, message.id, message.on);
  }

  /**
   * Its party's voice changed. Every bot of the party hears it; the first one to hear a change acts for them all (the
   * others find nothing new): a player who came in is greeted by one bot.
   */
  private voiceState(botId: string, channel: VoiceChannel | null): void {
    const partyId = this.hub.parties.partyOf(botId)?.id;
    if (!partyId) return;
    const players = new Set((channel?.members ?? []).filter((m) => !m.isBot).map((m) => m.id));
    let talk = this.talks.get(partyId);
    if (players.size === 0) {
      if (talk?.timer) clearTimeout(talk.timer);
      this.talks.delete(partyId);
      return;
    }
    if (!talk) {
      // Only voices with players in them are followed: a crowded server forgets the oldest rather than growing.
      if (this.talks.size >= MAX_GREET_PAIRS) this.talks.clear();
      talk = { players: new Set(), speaking: new Map(), timer: null, lastLineAt: Number.NEGATIVE_INFINITY, spoke: new Map() };
      this.talks.set(partyId, talk);
    }
    const newcomer = [...players].some((p) => !talk.players.has(p));
    talk.players = players;
    for (const id of talk.speaking.keys()) if (!players.has(id)) talk.speaking.delete(id);
    if (newcomer && !talk.timer) this.voiceTurn(partyId, talk, 'hello', BOT_VOICE_HELLO_MS);
  }

  /**
   * A player in its party's voice started or stopped talking. The bots never talk over her: a line about to be said
   * waits; when she stops, one bot answers after a moment with a line fitting how long she talked (never what she
   * said: the sound never reaches the server).
   */
  private voiceSpeaking(botId: string, playerId: string, on: boolean): void {
    const partyId = this.hub.parties.partyOf(botId)?.id;
    const talk = partyId ? this.talks.get(partyId) : undefined;
    if (!partyId || !talk) return;
    const now = Date.now();
    if (on) {
      talk.speaking.set(playerId, now);
      if (talk.timer) clearTimeout(talk.timer);
      talk.timer = null;
      return;
    }
    const started = talk.speaking.get(playerId);
    if (started === undefined) return;
    talk.speaking.delete(playerId);
    if (talk.timer) return;
    const ms = now - started;
    const key: VoiceBotLineKey = ms < SHORT_TURN_MS ? 'yes' : ms < LONG_TURN_MS ? 'wow' : 'more';
    this.voiceTurn(partyId, talk, key, BOT_VOICE_REPLY_MS * (1 + this.random()));
  }

  private voiceTurn(partyId: string, talk: VoiceTalk, key: VoiceBotLineKey, ms: number): void {
    talk.timer = setTimeout(() => {
      talk.timer = null;
      this.voiceLine(partyId, talk, key);
    }, ms);
  }

  /** One bot of the party says its line: the one who spoke least lately, as often as its persona talks. */
  private voiceLine(partyId: string, talk: VoiceTalk, key: VoiceBotLineKey): void {
    const anyone = [...talk.players][0];
    const party = anyone ? this.hub.parties.partyOf(anyone) : null;
    if (party?.id !== partyId) {
      this.talks.delete(partyId);
      return;
    }
    const now = Date.now();
    // Someone talks again, or a bot just spoke: the players' turn.
    if (talk.speaking.size > 0 || now - talk.lastLineAt < BOT_VOICE_GAP_MS) return;
    const bots = party.members.filter((m) => m.startsWith('bot-')).sort((a, b) => (talk.spoke.get(a) ?? 0) - (talk.spoke.get(b) ?? 0));
    const bot = bots[0];
    if (!bot) return;
    if (key !== 'hello' && this.random() >= 0.35 + 0.6 * personaOf(bot).chat) return;
    talk.lastLineAt = now;
    talk.spoke.set(bot, now);
    this.hub.voiceBotSay(bot, { key, variant: this.voiceVariant(bot, key) });
  }

  /** A line of its own voice (every `VOICES`-th variant from its offset), never the one it said last. */
  private voiceVariant(botId: string, key: VoiceBotLineKey): number {
    const id = `${botProfileId(botId)}:${key}`;
    let picker = this.voiceLines.get(id);
    if (!picker) {
      const voice = personaOf(botId).voice;
      picker = freshPicker(
        Array.from({ length: VOICE_BOT_LINE_VARIANTS }, (_, i) => i).filter((i) => i % VOICES === voice),
        this.random,
      );
      this.voiceLines.set(id, picker);
    }
    return picker.next();
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
    // A record of asks, not a log: a crowded server forgets it (at worst a bot asks again).
    if (this.asked.size >= MAX_GREET_PAIRS) this.asked.clear();
    this.asked.add(pair);
    this.greets.delete(pair);
    void this.hub.botFriendRequest(botId, playerId);
  }
}
