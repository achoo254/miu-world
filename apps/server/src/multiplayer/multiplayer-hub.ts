// Multiplayer Hub (Master Plan §8 & §8b, Jev 03/10/2026).
// Manages real-time WebSocket rooms by mapId, broadcasting presence, movement,
// emotes, and safe canned-chat between children and companion bots.
import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ClientWsMessage,
  type PlayerPresence,
  type ServerWsMessage,
  type SafeEmote,
} from '@miu/schema/multiplayer';

export interface RoomMember {
  id: string;
  presence: PlayerPresence;
  send(message: ServerWsMessage): void;
  isBot: boolean;
}

export class MultiplayerRoom {
  readonly mapId: string;
  readonly members = new Map<string, RoomMember>();

  constructor(mapId: string) {
    this.mapId = mapId;
  }

  join(member: RoomMember): void {
    // Notify the newcomer with the existing players in the room.
    const existing = Array.from(this.members.values()).map((m) => m.presence);
    member.send({
      type: 'welcome',
      selfId: member.id,
      players: existing,
    });

    this.members.set(member.id, member);

    // Broadcast spawn to all other members.
    this.broadcast(
      {
        type: 'spawn',
        player: member.presence,
      },
      member.id,
    );
  }

  updatePresence(
    id: string,
    update: { x: number; y: number; z: number; yaw: number; speed: number; action?: string; riding?: boolean },
  ): void {
    const member = this.members.get(id);
    if (!member) return;

    member.presence.x = update.x;
    member.presence.y = update.y;
    member.presence.z = update.z;
    member.presence.yaw = update.yaw;
    member.presence.speed = update.speed;
    if (update.action !== undefined) member.presence.action = update.action;
    if (update.riding !== undefined) member.presence.riding = update.riding;

    this.broadcast(
      {
        type: 'move',
        id,
        x: update.x,
        y: update.y,
        z: update.z,
        yaw: update.yaw,
        speed: update.speed,
        action: update.action,
        riding: update.riding,
      },
      id,
    );
  }

  broadcastEmote(id: string, emote: SafeEmote): void {
    const member = this.members.get(id);
    if (!member) return;
    this.broadcast({ type: 'emote', id, emote }, id);
  }

  broadcastChat(id: string, text: string): void {
    const member = this.members.get(id);
    if (!member) return;
    member.presence.bubble = { text, at: Date.now() };
    this.broadcast({ type: 'chat', id, text });
  }

  leave(id: string): void {
    if (!this.members.has(id)) return;
    this.members.delete(id);
    this.broadcast({ type: 'despawn', id });
  }

  broadcast(message: ServerWsMessage, exceptId?: string): void {
    for (const [memberId, member] of this.members) {
      if (exceptId && memberId === exceptId) continue;
      member.send(message);
    }
  }
}

export class MultiplayerHub {
  private readonly wss: WebSocketServer;
  private readonly rooms = new Map<string, MultiplayerRoom>();

  constructor(server?: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    if (server) {
      server.on('upgrade', (req: IncomingMessage, socket, head) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        if (url.pathname === '/api/ws' || url.pathname === '/ws') {
          this.wss.handleUpgrade(req, socket, head, (ws) => {
            this.wss.emit('connection', ws, req);
          });
        }
      });
    }

    this.wss.on('connection', (ws: WebSocket) => {
      let currentRoom: MultiplayerRoom | null = null;
      let memberId: string | null = null;

      const send = (msg: ServerWsMessage): void => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      };

      ws.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          const message = ClientWsMessage.parse(parsed);

          if (message.type === 'join') {
            if (currentRoom && memberId) currentRoom.leave(memberId);
            memberId = `player-${Math.random().toString(36).slice(2, 9)}`;
            currentRoom = this.getOrCreateRoom(message.mapId);

            const presence: PlayerPresence = {
              ...message.presence,
              id: memberId,
              isBot: false,
            };

            currentRoom.join({
              id: memberId,
              presence,
              send,
              isBot: false,
            });
          } else if (message.type === 'update' && currentRoom && memberId) {
            currentRoom.updatePresence(memberId, message);
          } else if (message.type === 'emote' && currentRoom && memberId) {
            currentRoom.broadcastEmote(memberId, message.emote);
          } else if (message.type === 'chat' && currentRoom && memberId) {
            currentRoom.broadcastChat(memberId, message.text);
          } else if (message.type === 'leave' && currentRoom && memberId) {
            currentRoom.leave(memberId);
            currentRoom = null;
            memberId = null;
          }
        } catch (err) {
          console.warn('invalid ws message', err);
        }
      });

      ws.on('close', () => {
        if (currentRoom && memberId) {
          currentRoom.leave(memberId);
        }
      });
    });
  }

  getOrCreateRoom(mapId: string): MultiplayerRoom {
    let room = this.rooms.get(mapId);
    if (!room) {
      room = new MultiplayerRoom(mapId);
      this.rooms.set(mapId, room);
    }
    return room;
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => resolve());
    });
  }
}
