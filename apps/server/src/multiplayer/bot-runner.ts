// Bot Runner (Master Plan §8b, Jev 03/10/2026).
// Runs companion bots across game maps. Bots behave naturally like grade 2 children:
// patrolling roads, visiting sights, pausing to explore, and waving/saying hello
// when a human child approaches. All bots are clearly labeled "[Bạn máy]".
import {
  SAFE_CANNED_CHATS,
  type PlayerPresence,
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
const BOT_MAP_CONFIGS: Record<string, BotProfile[]> = {
  'trung-tam': [
    {
      id: 'bot-tt-1',
      displayName: 'Bé Bông',
      species: 'rabbit',
      outfit: ['clothes-dress-pink', 'hat-bow-pink'],
      waypoints: [
        { x: 395, y: 15, z: 420 },
        { x: 400, y: 15, z: 405 },
        { x: 410, y: 15, z: 420 },
        { x: 400, y: 15, z: 435 },
      ],
    },
    {
      id: 'bot-tt-2',
      displayName: 'Mèo Miu',
      species: 'cat',
      outfit: ['clothes-overalls-green', 'hat-cat-mint'],
      waypoints: [
        { x: 380, y: 15, z: 415 },
        { x: 370, y: 15, z: 430 },
        { x: 385, y: 15, z: 445 },
        { x: 390, y: 15, z: 425 },
      ],
    },
    {
      id: 'bot-tt-3',
      displayName: 'Gấu Béo',
      species: 'bear',
      outfit: ['clothes-vest-shorts-navy', 'hat-beanie-blue'],
      waypoints: [
        { x: 420, y: 15, z: 410 },
        { x: 435, y: 15, z: 420 },
        { x: 425, y: 15, z: 440 },
        { x: 415, y: 15, z: 425 },
      ],
    },
  ],
  'truong-hoc': [
    {
      id: 'bot-th-1',
      displayName: 'Cáo Nhanh Trí',
      species: 'fox',
      outfit: ['clothes-jacket-red', 'hat-cap-blue'],
      waypoints: [
        { x: 195, y: 10, z: 180 },
        { x: 210, y: 10, z: 180 },
        { x: 210, y: 10, z: 200 },
        { x: 195, y: 10, z: 200 },
      ],
    },
    {
      id: 'bot-th-2',
      displayName: 'Thỏ Măng Non',
      species: 'rabbit',
      outfit: ['clothes-tshirt', 'hat-flower-crown'],
      waypoints: [
        { x: 180, y: 10, z: 190 },
        { x: 180, y: 10, z: 215 },
        { x: 200, y: 10, z: 215 },
        { x: 200, y: 10, z: 190 },
      ],
    },
  ],
  'lang-ven-song': [
    {
      id: 'bot-lvs-1',
      displayName: 'Bé Na',
      species: 'cat',
      outfit: ['clothes-dress-mint', 'hat-flower-crown-mint'],
      waypoints: [
        { x: 60, y: 12, z: 100 },
        { x: 80, y: 12, z: 140 },
        { x: 100, y: 12, z: 200 },
        { x: 70, y: 12, z: 150 },
      ],
    },
    {
      id: 'bot-lvs-2',
      displayName: 'Họa Mi',
      species: 'rabbit',
      outfit: ['clothes-overalls', 'hat-straw'],
      waypoints: [
        { x: 120, y: 12, z: 230 },
        { x: 140, y: 12, z: 240 },
        { x: 110, y: 12, z: 250 },
      ],
    },
  ],
  'cho-phien': [
    {
      id: 'bot-cp-1',
      displayName: 'Cún Đốm',
      species: 'bear',
      outfit: ['clothes-jacket-green', 'hat-cap-yellow'],
      waypoints: [
        { x: 220, y: 12, z: 260 },
        { x: 240, y: 12, z: 270 },
        { x: 230, y: 12, z: 290 },
        { x: 215, y: 12, z: 275 },
      ],
    },
  ],
  'khu-rung-bi-mat': [
    {
      id: 'bot-kr-1',
      displayName: 'Sóc Nhỏ',
      species: 'fox',
      outfit: ['clothes-vest-shorts', 'hat-beanie-green'],
      waypoints: [
        { x: 100, y: 8, z: 120 },
        { x: 120, y: 8, z: 135 },
        { x: 110, y: 8, z: 150 },
        { x: 95, y: 8, z: 130 },
      ],
    },
  ],
};

class CompanionBotInstance {
  readonly profile: BotProfile;
  readonly room: MultiplayerRoom;
  readonly presence: PlayerPresence;
  private currentWaypointIdx = 0;
  private state: 'walk' | 'idle' | 'greet' = 'walk';
  private stateTimer = 0;
  private lastGreetTime = 0;

  constructor(profile: BotProfile, room: MultiplayerRoom) {
    this.profile = profile;
    this.room = room;
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
      bubble: null,
    };
  }

  join(): void {
    this.room.join({
      id: this.profile.id,
      presence: this.presence,
      send: () => {}, // Bot consumes no network packets
      isBot: true,
    });
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
            const chatChoice = SAFE_CANNED_CHATS[Math.floor(Math.random() * SAFE_CANNED_CHATS.length)] ?? 'Xin chào bạn!';
            this.room.broadcastChat(this.presence.id, chatChoice);
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
      }
      return;
    }

    // Walking towards current waypoint
    const targetWp = this.profile.waypoints[this.currentWaypointIdx];
    if (!targetWp) return;

    const dx = targetWp.x - this.presence.x;
    const dz = targetWp.z - this.presence.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.6) {
      // Reached waypoint: switch to idle
      this.state = 'idle';
      this.stateTimer = 2.5 + Math.random() * 3.5; // 2.5 - 6s pause
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

export class BotRunner {
  private readonly hub: MultiplayerHub;
  private readonly bots = new Map<string, CompanionBotInstance[]>();
  private timer: NodeJS.Timeout | null = null;
  private lastTick = Date.now();

  constructor(hub: MultiplayerHub) {
    this.hub = hub;
  }

  start(): void {
    // Populate companion bots for configured maps
    for (const [mapId, profiles] of Object.entries(BOT_MAP_CONFIGS)) {
      const room = this.hub.getOrCreateRoom(mapId);
      const instances = profiles.map((p) => new CompanionBotInstance(p, room));
      for (const inst of instances) {
        inst.join();
      }
      this.bots.set(mapId, instances);
    }

    // Run tick loop at 10Hz (100ms)
    this.lastTick = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - this.lastTick) / 1000, 0.2);
      this.lastTick = now;

      for (const list of this.bots.values()) {
        for (const bot of list) {
          bot.tick(dt);
        }
      }
    }, 100);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
