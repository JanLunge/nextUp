export interface Room {
  id: string;
  timer_duration: number;
  current_index: number;
  status: 'active' | 'paused' | 'ended';
  current_participant: Participant | null;
  next_participant: Participant | null;
  queue_count: number;
  presented_count: number;
  created_at?: string;
}

export interface RoomCreateResponse {
  id: string;
  admin_key: string;
  timer_duration: number;
  created_at: string;
}

export interface Profile {
  id: number;
  name: string;
  tagline?: string | null;
  profile_image_path?: string | null;
  project_name?: string | null;
  project_url?: string | null;
  project_description?: string | null;
  presentation_media_path?: string | null;
  media_type?: 'image' | 'video' | null;
  current_need?: string | null;
}

export interface Participant {
  id: number;
  room_id: string;
  profile_id: number;
  name: string;
  tagline?: string | null;
  profile_image_path?: string | null;
  project_name: string;
  project_url?: string | null;
  project_description: string;
  presentation_media_path?: string | null;
  media_type?: 'image' | 'video' | null;
  current_need?: string | null;
  queue_position: number;
  status: 'queued' | 'presenting' | 'presented' | 'withdrawn';
  created_at?: string;
}

export interface Wave {
  participant_id?: number;
  profile_id: number;
  name: string;
  tagline?: string | null;
  profile_image_path?: string | null;
  project_name?: string;
  project_url?: string | null;
}

export interface WavesResponse {
  mutual: Wave[];
  sent: Wave[];
  received: Wave[];
}

export interface SubmissionData {
  passphrase?: string;
  name: string;
  tagline?: string;
  project_name: string;
  project_url?: string;
  project_description: string;
  current_need?: string;
  profile_image_path?: string | null;
  presentation_media_path?: string | null;
  media_type?: 'image' | 'video' | null;
}

export interface UploadResponse {
  path: string;
  media_type: 'image' | 'video';
  original_name: string;
  size: number;
}

// Spatial mapping types
export interface SpatialPosition {
  id: number;
  room_id: string;
  participant_id: number;
  x: number;
  y: number;
  name: string;
  profile_image_path?: string | null;
  project_name: string;
}

export interface SpatialOrderEntry {
  id: number;
  room_id: string;
  participant_id: number;
  order_index: number;
  name: string;
  profile_image_path?: string | null;
  project_name: string;
}

export interface MappingParticipant {
  id: number;
  name: string;
  profile_id: number;
}

// WebSocket message types
export type TimerPhase = 'main' | 'need';

export interface WSMessage {
  type: string;
  [key: string]: unknown;
}

export interface WSJoinedMessage extends WSMessage {
  type: 'joined';
  roomId: string;
  role: string;
  clientId: string;
}

export interface WSPresenterChangedMessage extends WSMessage {
  type: 'presenter_changed';
  current_participant: Participant | null;
  next_participant: Participant | null;
  queue_count: number;
  direction: 'next' | 'previous';
}

export interface WSTimerStartMessage extends WSMessage {
  type: 'timer_start';
  duration: number;
}

export interface WSTimerTickMessage extends WSMessage {
  type: 'timer_tick';
  remaining: number;
  phase: TimerPhase;
}

export interface WSTimerOvertimeMessage extends WSMessage {
  type: 'timer_overtime';
  elapsed: number;
}

export interface WSTimerSyncMessage extends WSMessage {
  type: 'timer_sync';
  remaining: number;
  duration: number;
  phase: TimerPhase;
  overtime: number;
  running: boolean;
}

export interface WSWaveAnimationMessage extends WSMessage {
  type: 'wave_animation';
  participant_id: number;
}

export interface WSYouAreNextMessage extends WSMessage {
  type: 'you_are_next';
}

export interface WSParticipantJoinedMessage extends WSMessage {
  type: 'participant_joined';
  participant: Participant;
  queue_count: number;
}

export interface WSParticipantUpdatedMessage extends WSMessage {
  type: 'participant_updated';
  participant: Participant;
}

export interface WSParticipantWithdrawnMessage extends WSMessage {
  type: 'participant_withdrawn';
  participantId: number;
  queue_count: number;
}

export interface WSMappingStartMessage extends WSMessage {
  type: 'mapping_start';
  numPhases: number;
  assignments: Record<number, number>;
  participants: MappingParticipant[];
}

export interface WSMappingPhaseMessage extends WSMessage {
  type: 'mapping_phase';
  phase: number;
  totalPhases: number;
  assignments: Record<number, number>;
}

export interface WSMappingEndMessage extends WSMessage {
  type: 'mapping_end';
}

export interface WSSpatialPositionsUpdatedMessage extends WSMessage {
  type: 'spatial_positions_updated';
  positions: SpatialPosition[];
}

export interface WSSpatialOrderUpdatedMessage extends WSMessage {
  type: 'spatial_order_updated';
  order: SpatialOrderEntry[];
}
