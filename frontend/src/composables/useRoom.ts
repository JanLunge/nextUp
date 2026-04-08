import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { api } from '@/api/client';
import type {
  Room,
  Participant,
  WSMessage,
  WSPresenterChangedMessage,
  WSParticipantJoinedMessage,
  WSParticipantWithdrawnMessage,
  WSParticipantUpdatedMessage,
} from '@/types';

export interface UseRoomReturn {
  room: Ref<Room | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  currentParticipant: ComputedRef<Participant | null>;
  nextParticipant: ComputedRef<Participant | null>;
  queue: Ref<Participant[]>;
  queueCount: ComputedRef<number>;
  presentedCount: ComputedRef<number>;
  fetchRoom: () => Promise<void>;
  fetchQueue: () => Promise<void>;
  updateFromWebSocket: (message: WSMessage) => void;
}

export function useRoom(roomId: Ref<string> | ComputedRef<string> | string): UseRoomReturn {
  const room = ref<Room | null>(null);
  const queue = ref<Participant[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const getRoomId = (): string => {
    if (typeof roomId === 'string') return roomId;
    return roomId.value;
  };

  const currentParticipant = computed(() => room.value?.current_participant ?? null);
  const nextParticipant = computed(() => room.value?.next_participant ?? null);
  const queueCount = computed(() => room.value?.queue_count ?? 0);
  const presentedCount = computed(() => room.value?.presented_count ?? 0);

  async function fetchRoom(): Promise<void> {
    const id = getRoomId();
    if (!id) return;

    loading.value = true;
    error.value = null;

    try {
      room.value = await api.getRoom(id);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch room';
      room.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchQueue(): Promise<void> {
    const id = getRoomId();
    if (!id) return;

    try {
      const result = await api.getParticipants(id);
      // Filter to only queued participants (not current/next/presented)
      const currentId = room.value?.current_participant?.id;
      const nextId = room.value?.next_participant?.id;
      queue.value = result.participants.filter(
        (p) => p.status === 'queued' && p.id !== currentId && p.id !== nextId
      );
    } catch (e) {
      console.error('Failed to fetch queue:', e);
      queue.value = [];
    }
  }

  function updateFromWebSocket(message: WSMessage): void {
    if (!room.value) return;

    switch (message.type) {
      case 'presenter_changed': {
        const msg = message as WSPresenterChangedMessage;
        room.value.current_participant = msg.current_participant;
        room.value.next_participant = msg.next_participant;
        room.value.queue_count = msg.queue_count;
        if (msg.current_participant) {
          room.value.current_index = msg.current_participant.queue_position;
        }
        break;
      }

      case 'participant_joined': {
        const msg = message as WSParticipantJoinedMessage;
        room.value.queue_count = msg.queue_count;
        // Add the new participant to the queue
        if (msg.participant.status === 'queued') {
          queue.value = [...queue.value, msg.participant];
          // If there's no next participant, this becomes next
          if (!room.value.next_participant) {
            room.value.next_participant = msg.participant;
          }
        }
        break;
      }

      case 'participant_withdrawn': {
        const msg = message as WSParticipantWithdrawnMessage;
        room.value.queue_count = msg.queue_count;
        // Remove from queue
        queue.value = queue.value.filter((p) => p.id !== msg.participantId);
        break;
      }

      case 'participant_updated': {
        const msg = message as WSParticipantUpdatedMessage;
        if (room.value.current_participant?.id === msg.participant.id) {
          room.value.current_participant = msg.participant;
        }
        if (room.value.next_participant?.id === msg.participant.id) {
          room.value.next_participant = msg.participant;
        }
        break;
      }
    }
  }

  return {
    room,
    loading,
    error,
    currentParticipant,
    nextParticipant,
    queue,
    queueCount,
    presentedCount,
    fetchRoom,
    fetchQueue,
    updateFromWebSocket,
  };
}
