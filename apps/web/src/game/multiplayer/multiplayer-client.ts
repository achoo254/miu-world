// Multiplayer WebSocket Client (Master Plan §8 & §8b).
// Connects to /api/ws, synchronizing position, actions, and canned chats.
import {
  ClientWsMessage,
  ServerWsMessage,
  type PlayerPresence,
  type SafeCannedChat,
  type SafeEmote,
} from '@miu/schema/multiplayer';

export interface MultiplayerClientHandlers {
  onWelcome(players: PlayerPresence[]): void;
  onSpawn(player: PlayerPresence): void;
  onMove(update: { id: string; x: number; y: number; z: number; yaw: number; speed: number; action?: string; riding?: boolean }): void;
  onEmote(id: string, emote: SafeEmote): void;
  onChat(id: string, text: string): void;
  onDespawn(id: string): void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private readonly mapId: string;
  private readonly selfPresence: Omit<PlayerPresence, 'id'>;
  private readonly handlers: MultiplayerClientHandlers;
  private lastUpdateSent = 0;
  private disposed = false;

  constructor(
    mapId: string,
    selfPresence: Omit<PlayerPresence, 'id'>,
    handlers: MultiplayerClientHandlers,
  ) {
    this.mapId = mapId;
    this.selfPresence = selfPresence;
    this.handlers = handlers;
    this.connect();
  }

  private connect(): void {
    if (this.disposed || typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/api/ws`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        if (this.disposed) {
          this.ws?.close();
          return;
        }
        // Send join packet
        const joinMsg = ClientWsMessage.parse({
          type: 'join',
          mapId: this.mapId,
          presence: this.selfPresence,
        });
        this.ws?.send(JSON.stringify(joinMsg));
      };

      this.ws.onmessage = (event) => {
        if (this.disposed) return;
        try {
          const raw = JSON.parse(event.data);
          const msg = ServerWsMessage.parse(raw);

          switch (msg.type) {
            case 'welcome':
              this.handlers.onWelcome(msg.players);
              break;
            case 'spawn':
              this.handlers.onSpawn(msg.player);
              break;
            case 'move':
              this.handlers.onMove(msg);
              break;
            case 'emote':
              this.handlers.onEmote(msg.id, msg.emote);
              break;
            case 'chat':
              this.handlers.onChat(msg.id, msg.text);
              break;
            case 'despawn':
              this.handlers.onDespawn(msg.id);
              break;
          }
        } catch (err) {
          console.warn('client failed to parse server ws message', err);
        }
      };

      this.ws.onclose = () => {
        // Auto-reconnect after 3s if not intentionally disposed
        if (!this.disposed) {
          setTimeout(() => this.connect(), 3000);
        }
      };
    } catch {
      // Best-effort connection: single-player continues seamlessly if server offline
    }
  }

  sendUpdate(x: number, y: number, z: number, yaw: number, speed: number, action = 'walk', riding = false): void {
    if (this.disposed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    if (now - this.lastUpdateSent < 95) return; // 10Hz throttle
    this.lastUpdateSent = now;

    try {
      const updateMsg = ClientWsMessage.parse({
        type: 'update',
        x,
        y,
        z,
        yaw,
        speed,
        action,
        riding,
      });
      this.ws.send(JSON.stringify(updateMsg));
    } catch {
      // Ignore send errors
    }
  }

  sendEmote(emote: SafeEmote): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const msg = ClientWsMessage.parse({ type: 'emote', emote });
      this.ws.send(JSON.stringify(msg));
    } catch {
      // Ignore send errors
    }
  }

  sendChat(text: SafeCannedChat): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const msg = ClientWsMessage.parse({ type: 'chat', text });
      this.ws.send(JSON.stringify(msg));
    } catch {
      // Ignore send errors
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          const leaveMsg = ClientWsMessage.parse({ type: 'leave' });
          this.ws.send(JSON.stringify(leaveMsg));
        } catch {
          // Ignore
        }
      }
      this.ws.close();
      this.ws = null;
    }
  }
}
