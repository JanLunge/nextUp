import { WebSocketServer, type WebSocket as WS } from 'ws';
import type { Server } from 'http';
import { roomQueries, profileQueries } from '../db.js';
import type {
  ExtendedWebSocket,
  WSClient,
  TimerState,
  ClientRole,
  JoinMessage,
  TimerControlMessage,
  WebSocketManagerInterface
} from '../types/index.js';

export class WebSocketManager implements WebSocketManagerInterface {
  private wss: WebSocketServer;
  private rooms: Map<string, Map<string, WSClient>>;
  private timers: Map<string, TimerState>;
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.rooms = new Map();
    this.timers = new Map();

    this.wss.on('connection', (ws: WS) => {
      const extWs = ws as ExtendedWebSocket;
      extWs.isAlive = true;

      extWs.on('pong', () => {
        extWs.isAlive = true;
      });

      extWs.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(extWs, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          this.send(extWs, { type: 'error', message: 'Invalid message format' });
        }
      });

      extWs.on('close', () => {
        this.handleDisconnect(extWs);
      });

      extWs.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Heartbeat to detect dead connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const extWs = ws as ExtendedWebSocket;
        if (extWs.isAlive === false) {
          this.handleDisconnect(extWs);
          return extWs.terminate();
        }
        extWs.isAlive = false;
        extWs.ping();
      });
    }, 30000);
  }

  private send(ws: ExtendedWebSocket, data: object): void {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(ws: ExtendedWebSocket, data: JoinMessage | TimerControlMessage): void {
    switch (data.type) {
      case 'join':
        this.handleJoin(ws, data as JoinMessage);
        break;
      case 'timer_control':
        this.handleTimerControl(ws, data as TimerControlMessage);
        break;
      default:
        this.send(ws, { type: 'error', message: 'Unknown message type' });
    }
  }

  private handleJoin(ws: ExtendedWebSocket, data: JoinMessage): void {
    const { roomId, role, passphrase, adminKey } = data;

    // Validate room exists
    const room = roomQueries.getById.get(roomId);
    if (!room) {
      this.send(ws, { type: 'error', message: 'Room not found' });
      return;
    }

    // Validate admin key for admin role
    if (role === 'admin') {
      if (!adminKey || !roomQueries.validateAdminKey.get(roomId, adminKey)) {
        this.send(ws, { type: 'error', message: 'Invalid admin key' });
        return;
      }
    }

    // Get profile if passphrase provided
    let profile = null;
    if (passphrase) {
      profile = profileQueries.getByPassphrase.get(passphrase);
    }

    // Store client info
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    const roomClients = this.rooms.get(roomId)!;
    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    ws.clientId = clientId;
    ws.roomId = roomId;
    ws.role = role;
    ws.profileId = profile?.id;

    roomClients.set(clientId, {
      ws,
      role,
      profileId: profile?.id
    });

    this.send(ws, {
      type: 'joined',
      roomId,
      role,
      clientId
    });

    // Send current timer state if timer is running
    const timerState = this.timers.get(roomId);
    if (timerState && timerState.running) {
      this.send(ws, {
        type: 'timer_sync',
        remaining: timerState.remaining,
        duration: timerState.duration,
        phase: timerState.phase,
        overtime: timerState.overtime,
        running: true
      });
    }
  }

  private handleDisconnect(ws: ExtendedWebSocket): void {
    if (ws.roomId && ws.clientId) {
      const roomClients = this.rooms.get(ws.roomId);
      if (roomClients) {
        roomClients.delete(ws.clientId);
        if (roomClients.size === 0) {
          this.rooms.delete(ws.roomId);
          // Stop timer if no one is in the room
          this.stopTimer(ws.roomId);
        }
      }
    }
  }

  private handleTimerControl(ws: ExtendedWebSocket, data: TimerControlMessage): void {
    const { action, roomId, duration } = data;

    // Only presenter and admin can control timer
    if (ws.role !== 'presenter' && ws.role !== 'admin') {
      this.send(ws, { type: 'error', message: 'Not authorized' });
      return;
    }

    switch (action) {
      case 'start':
        this.startTimer(roomId, duration);
        break;
      case 'stop':
        this.stopTimer(roomId);
        break;
      case 'restart':
        this.restartTimer(roomId, duration);
        break;
    }
  }

  // Broadcast to all clients in a room
  broadcastToRoom(roomId: string, data: object): void {
    const roomClients = this.rooms.get(roomId);
    if (!roomClients) return;

    roomClients.forEach(({ ws }) => {
      this.send(ws, data);
    });
  }

  // Broadcast to specific roles in a room
  broadcastToRoles(roomId: string, roles: ClientRole[], data: object): void {
    const roomClients = this.rooms.get(roomId);
    if (!roomClients) return;

    roomClients.forEach(({ ws, role }) => {
      if (roles.includes(role)) {
        this.send(ws, data);
      }
    });
  }

  // Send to a specific participant by profile ID
  notifyParticipant(roomId: string, profileId: number, data: object): void {
    const roomClients = this.rooms.get(roomId);
    if (!roomClients) return;

    roomClients.forEach(({ ws, profileId: clientProfileId }) => {
      if (clientProfileId === profileId) {
        this.send(ws, data);
      }
    });
  }

  // Timer management
  startTimer(roomId: string, duration?: number): void {
    // Stop existing timer if any
    this.stopTimer(roomId);

    const room = roomQueries.getById.get(roomId);
    const timerDuration = duration || room?.timer_duration || 60;

    const timerState: TimerState = {
      running: true,
      duration: timerDuration,
      remaining: timerDuration,
      phase: 'main',
      overtime: 0,
      interval: null
    };

    timerState.interval = setInterval(() => {
      this.timerTick(roomId);
    }, 1000);

    this.timers.set(roomId, timerState);

    this.broadcastToRoom(roomId, {
      type: 'timer_start',
      duration: timerDuration
    });
  }

  stopTimer(roomId: string): void {
    const timerState = this.timers.get(roomId);
    if (timerState) {
      if (timerState.interval) {
        clearInterval(timerState.interval);
      }
      timerState.running = false;
      this.timers.delete(roomId);

      this.broadcastToRoom(roomId, {
        type: 'timer_cleared'
      });
    }
  }

  restartTimer(roomId: string, duration?: number): void {
    const room = roomQueries.getById.get(roomId);
    this.startTimer(roomId, duration || room?.timer_duration || 60);
  }

  private timerTick(roomId: string): void {
    const timerState = this.timers.get(roomId);
    if (!timerState || !timerState.running) return;

    if (timerState.remaining > 0) {
      timerState.remaining--;

      // Determine phase
      const needThreshold = Math.ceil(timerState.duration / 3);
      if (timerState.remaining <= needThreshold && timerState.phase !== 'need') {
        timerState.phase = 'need';
      }

      this.broadcastToRoom(roomId, {
        type: 'timer_tick',
        remaining: timerState.remaining,
        phase: timerState.phase
      });

      if (timerState.remaining === 0) {
        this.broadcastToRoom(roomId, {
          type: 'timer_end'
        });
      }
    } else {
      // Overtime
      timerState.overtime++;
      this.broadcastToRoom(roomId, {
        type: 'timer_overtime',
        elapsed: timerState.overtime
      });
    }
  }

  close(): void {
    clearInterval(this.heartbeatInterval);
    this.timers.forEach((state) => {
      if (state.interval) {
        clearInterval(state.interval);
      }
    });
    this.wss.close();
  }
}
