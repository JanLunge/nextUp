import type {
  Room,
  RoomCreateResponse,
  Profile,
  Participant,
  SubmissionData,
  UploadResponse,
  WavesResponse,
  SpatialPosition,
  SpatialOrderEntry,
  MappingParticipant,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface AdminValidationResponse {
  valid: boolean;
  room?: Room;
}

interface PassphraseCheckResponse {
  profile_exists: boolean;
  has_submission_in_room?: boolean;
  submission_status?: string;
  queue_position?: number | null;
  participant?: Participant;
  profile?: Profile;
}

interface ProfileCreateResponse {
  id: number;
  passphrase: string;
  name: string;
}

interface ProfileGetResponse {
  exists: boolean;
  profile?: Profile;
}

interface SubmitResponse {
  id: number;
  passphrase: string;
  queue_position: number;
  is_new_profile: boolean;
}

interface ParticipantsResponse {
  participants: Participant[];
  queue_count: number;
  current_index: number;
}

interface PresentedResponse {
  participants: Participant[];
  count: number;
}

interface MySubmissionResponse {
  participant: Participant;
  queue_position: number | null;
  status: string;
}

interface WaveResponse {
  success: boolean;
  is_mutual: boolean;
  triggered_animation: boolean;
}

interface WaveStatusResponse {
  waved_at: number[];
}

interface ParticipantWavesResponse {
  count: number;
  wavers: Array<{
    id: number;
    name: string;
    profile_image_path: string | null;
  }>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Remove Content-Type for FormData
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Rooms
  async createRoom(timerDuration = 60): Promise<RoomCreateResponse> {
    return this.request<RoomCreateResponse>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ timer_duration: timerDuration }),
    });
  }

  async getRoom(roomId: string): Promise<Room> {
    return this.request<Room>(`/api/rooms/${roomId}`);
  }

  async updateRoom(roomId: string, data: Partial<Room>, adminKey?: string): Promise<Room> {
    const params = adminKey ? `?admin_key=${adminKey}` : '';
    return this.request<Room>(`/api/rooms/${roomId}${params}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async validateAdminKey(roomId: string, key: string): Promise<AdminValidationResponse> {
    return this.request<AdminValidationResponse>(`/api/rooms/${roomId}/admin?key=${key}`);
  }

  async checkPassphraseInRoom(roomId: string, passphrase: string): Promise<PassphraseCheckResponse> {
    return this.request<PassphraseCheckResponse>(`/api/rooms/${roomId}/check?passphrase=${passphrase}`);
  }

  // Navigation
  async nextPresenter(roomId: string, adminKey?: string): Promise<{ current_index: number; current_participant: Participant | null; next_participant: Participant | null }> {
    const params = adminKey ? `?admin_key=${adminKey}` : '';
    return this.request(`/api/rooms/${roomId}/next${params}`, { method: 'POST' });
  }

  async previousPresenter(roomId: string, adminKey?: string): Promise<{ current_index: number; current_participant: Participant | null; next_participant: Participant | null }> {
    const params = adminKey ? `?admin_key=${adminKey}` : '';
    return this.request(`/api/rooms/${roomId}/previous${params}`, { method: 'POST' });
  }

  // Timer
  async startTimer(roomId: string, adminKey?: string): Promise<{ success: boolean; duration: number }> {
    const params = adminKey ? `?admin_key=${adminKey}` : '';
    return this.request(`/api/rooms/${roomId}/timer/start${params}`, { method: 'POST' });
  }

  async stopTimer(roomId: string, adminKey?: string): Promise<{ success: boolean }> {
    const params = adminKey ? `?admin_key=${adminKey}` : '';
    return this.request(`/api/rooms/${roomId}/timer/stop${params}`, { method: 'POST' });
  }

  async restartTimer(roomId: string, adminKey?: string): Promise<{ success: boolean; duration: number }> {
    const params = adminKey ? `?admin_key=${adminKey}` : '';
    return this.request(`/api/rooms/${roomId}/timer/restart${params}`, { method: 'POST' });
  }

  // Profiles
  async createProfile(name: string): Promise<ProfileCreateResponse> {
    return this.request<ProfileCreateResponse>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getProfile(passphrase: string): Promise<ProfileGetResponse> {
    return this.request<ProfileGetResponse>(`/api/profiles/${passphrase}`);
  }

  // Participants
  async submitToQueue(roomId: string, data: SubmissionData): Promise<SubmitResponse> {
    return this.request<SubmitResponse>(`/api/rooms/${roomId}/participants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getParticipants(roomId: string): Promise<ParticipantsResponse> {
    return this.request<ParticipantsResponse>(`/api/rooms/${roomId}/participants`);
  }

  async getPresentedParticipants(roomId: string): Promise<PresentedResponse> {
    return this.request<PresentedResponse>(`/api/rooms/${roomId}/participants/presented`);
  }

  async getMySubmission(roomId: string, passphrase: string): Promise<MySubmissionResponse> {
    return this.request<MySubmissionResponse>(`/api/rooms/${roomId}/participants/me?passphrase=${passphrase}`);
  }

  async updateMySubmission(roomId: string, passphrase: string, data: Partial<SubmissionData>): Promise<{ participant: Participant }> {
    return this.request(`/api/rooms/${roomId}/participants/me?passphrase=${passphrase}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async withdrawSubmission(roomId: string, passphrase: string): Promise<{ success: boolean }> {
    return this.request(`/api/rooms/${roomId}/participants/me?passphrase=${passphrase}`, {
      method: 'DELETE',
    });
  }

  async getParticipant(roomId: string, participantId: number): Promise<{ participant: Participant }> {
    return this.request(`/api/rooms/${roomId}/participants/${participantId}`);
  }

  // Waves
  async sendWave(roomId: string, passphrase: string, toParticipantId: number): Promise<WaveResponse> {
    return this.request<WaveResponse>(`/api/rooms/${roomId}/waves`, {
      method: 'POST',
      body: JSON.stringify({ passphrase, to_participant_id: toParticipantId }),
    });
  }

  async getMyWaves(roomId: string, passphrase: string): Promise<WavesResponse> {
    return this.request<WavesResponse>(`/api/rooms/${roomId}/waves?passphrase=${passphrase}`);
  }

  async getWaveStatus(roomId: string, passphrase: string): Promise<WaveStatusResponse> {
    return this.request<WaveStatusResponse>(`/api/rooms/${roomId}/waves/status?passphrase=${passphrase}`);
  }

  async getParticipantWaves(roomId: string, participantId: number): Promise<ParticipantWavesResponse> {
    return this.request<ParticipantWavesResponse>(`/api/rooms/${roomId}/participants/${participantId}/waves`);
  }

  // Upload
  async uploadFile(file: File, type: 'profile' | 'presentation' = 'presentation'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request<UploadResponse>(`/api/upload?type=${type}`, {
      method: 'POST',
      body: formData,
    });
  }

  // Spatial mapping
  async getSpatialPositions(roomId: string): Promise<{ positions: SpatialPosition[] }> {
    return this.request(`/api/rooms/${roomId}/spatial/positions`);
  }

  async saveSpatialPositions(roomId: string, adminKey: string, positions: Array<{ participant_id: number; x: number; y: number }>): Promise<{ success: boolean; count: number }> {
    return this.request(`/api/rooms/${roomId}/spatial/positions?admin_key=${adminKey}`, {
      method: 'POST',
      body: JSON.stringify({ positions }),
    });
  }

  async getSpatialOrder(roomId: string): Promise<{ order: SpatialOrderEntry[] }> {
    return this.request(`/api/rooms/${roomId}/spatial/order`);
  }

  async saveSpatialOrder(roomId: string, adminKey: string, order: number[]): Promise<{ success: boolean; count: number }> {
    return this.request(`/api/rooms/${roomId}/spatial/order?admin_key=${adminKey}`, {
      method: 'POST',
      body: JSON.stringify({ order }),
    });
  }

  async startMapping(roomId: string, adminKey: string): Promise<{
    success: boolean;
    numPhases: number;
    numParticipants: number;
    assignments: Record<number, number>;
    participants: Array<{ id: number; name: string }>;
  }> {
    return this.request(`/api/rooms/${roomId}/spatial/mapping/start?admin_key=${adminKey}`, {
      method: 'POST',
    });
  }

  async advanceMappingPhase(roomId: string, adminKey: string, phase: number, totalPhases: number, assignments: Record<number, number>): Promise<{ success: boolean }> {
    return this.request(`/api/rooms/${roomId}/spatial/mapping/phase?admin_key=${adminKey}`, {
      method: 'POST',
      body: JSON.stringify({ phase, totalPhases, assignments }),
    });
  }

  async endMapping(roomId: string, adminKey: string): Promise<{ success: boolean }> {
    return this.request(`/api/rooms/${roomId}/spatial/mapping/end?admin_key=${adminKey}`, {
      method: 'POST',
    });
  }

  getUploadUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${this.baseUrl}${path}`;
  }
}

export const api = new ApiClient(API_BASE);
export default api;
