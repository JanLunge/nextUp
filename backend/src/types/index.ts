import type { Request, Response, NextFunction } from 'express';
import type { WebSocket } from 'ws';

// Database row types
export interface RoomRow {
  id: string;
  admin_key: string;
  timer_duration: number;
  current_index: number;
  status: 'active' | 'paused' | 'ended';
  created_at: string;
}

export interface ProfileRow {
  id: number;
  passphrase: string;
  name: string;
  tagline: string | null;
  profile_image_path: string | null;
  project_name: string | null;
  project_url: string | null;
  project_description: string | null;
  presentation_media_path: string | null;
  media_type: 'image' | 'video' | null;
  current_need: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantRow {
  id: number;
  room_id: string;
  profile_id: number;
  name: string;
  tagline: string | null;
  profile_image_path: string | null;
  project_name: string;
  project_url: string | null;
  project_description: string;
  presentation_media_path: string | null;
  media_type: 'image' | 'video' | null;
  current_need: string | null;
  queue_position: number;
  status: 'queued' | 'presenting' | 'presented' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface WaveRow {
  id: number;
  room_id: string;
  from_profile_id: number;
  to_participant_id: number;
  waved_during_presentation: number; // SQLite boolean
  created_at: string;
}

export interface WaveWithParticipantInfo extends WaveRow {
  name: string;
  tagline: string | null;
  profile_image_path: string | null;
  project_name: string;
  project_url: string | null;
}

export interface WaveWithProfileInfo extends WaveRow {
  name: string;
  tagline: string | null;
  profile_image_path: string | null;
}

// API response types
export interface FormattedParticipant {
  id: number;
  room_id: string;
  profile_id: number;
  name: string;
  tagline: string | null;
  profile_image_path: string | null;
  project_name: string;
  project_url: string | null;
  project_description: string;
  presentation_media_path: string | null;
  media_type: 'image' | 'video' | null;
  current_need: string | null;
  queue_position: number;
  status: string;
  created_at: string;
}

export interface FormattedProfile {
  id: number;
  name: string;
  tagline: string | null;
  profile_image_path: string | null;
  project_name: string | null;
  project_url: string | null;
  project_description: string | null;
  presentation_media_path: string | null;
  media_type: 'image' | 'video' | null;
  current_need: string | null;
}

// WebSocket types
export interface WSClient {
  ws: ExtendedWebSocket;
  role: ClientRole;
  profileId?: number;
}

export interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  clientId?: string;
  roomId?: string;
  role?: ClientRole;
  profileId?: number;
}

export type ClientRole = 'presenter' | 'admin' | 'timer' | 'audience';

export interface TimerState {
  running: boolean;
  duration: number;
  remaining: number;
  phase: 'main' | 'need';
  overtime: number;
  interval: NodeJS.Timeout | null;
}

export interface WSMessage {
  type: string;
  [key: string]: unknown;
}

export interface JoinMessage extends WSMessage {
  type: 'join';
  roomId: string;
  role: ClientRole;
  passphrase?: string;
  adminKey?: string;
}

export interface TimerControlMessage extends WSMessage {
  type: 'timer_control';
  action: 'start' | 'stop' | 'restart';
  roomId: string;
  duration?: number;
}

// Express extended types
export interface WebSocketManagerInterface {
  broadcastToRoom(roomId: string, data: object): void;
  broadcastToRoles(roomId: string, roles: ClientRole[], data: object): void;
  notifyParticipant(roomId: string, profileId: number, data: object): void;
  startTimer(roomId: string, duration?: number): void;
  stopTimer(roomId: string): void;
  restartTimer(roomId: string, duration?: number): void;
  close(): void;
}

declare global {
  namespace Express {
    interface Application {
      get(name: 'wsManager'): WebSocketManagerInterface | undefined;
      set(name: 'wsManager', value: WebSocketManagerInterface): void;
    }
  }
}

export interface CountResult {
  count: number;
}

export interface NextPositionResult {
  next_position: number;
}

// Multer types
export type UploadType = 'profile' | 'presentation';

// Request parameter types
export interface RoomParams {
  roomId: string;
}

export interface ParticipantParams extends RoomParams {
  participantId: string;
}

export interface PassphraseParams {
  passphrase: string;
}
