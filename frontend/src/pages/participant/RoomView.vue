<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useWebSocket } from '@/composables/useWebSocket';
import { usePassphrase } from '@/composables/usePassphrase';
import { useRoom } from '@/composables/useRoom';
import CurrentPresenterCard from '@/components/CurrentPresenterCard.vue';
import ParticipantCard from '@/components/ParticipantCard.vue';
import YouAreNextModal from '@/components/YouAreNextModal.vue';
import WaveEmitter from '@/components/WaveEmitter.vue';
import type { WSMessage, Participant } from '@/types';

interface WaveEmitterExpose {
  addWave: () => void;
}

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);

const { passphrase } = usePassphrase();
const waveEmitter = ref<WaveEmitterExpose | null>(null);

// Room state
const { room, currentParticipant, nextParticipant, queue, fetchRoom, updateFromWebSocket } = useRoom(roomId);

// UI state
const showYouAreNext = ref(false);
const wavedParticipants = ref<Set<number>>(new Set());
const profileId = ref<number | null>(null);

// WebSocket
const { isConnected, connect } = useWebSocket(roomId, {
  role: 'audience',
  passphrase: passphrase.value ?? undefined,
  onMessage: handleWebSocketMessage,
});

function handleWebSocketMessage(message: WSMessage): void {
  updateFromWebSocket(message);

  // Handle wave animation
  if (message.type === 'wave_animation') {
    waveEmitter.value?.addWave();
  }

  // Handle "you are next" notification
  if (message.type === 'you_are_next' && message.profile_id === profileId.value) {
    showYouAreNext.value = true;
  }
}

// Fetch profile info
async function fetchProfile(): Promise<void> {
  if (!passphrase.value) return;

  try {
    const result = await api.checkPassphraseInRoom(roomId.value, passphrase.value);
    if (result.profile_exists) {
      profileId.value = result.profile_id ?? null;
    }
  } catch (e) {
    console.error('Failed to fetch profile:', e);
  }
}

// Wave at participant
async function handleWave(participant: Participant): Promise<void> {
  if (!passphrase.value || wavedParticipants.value.has(participant.id)) return;

  try {
    await api.sendWave(roomId.value, participant.id, passphrase.value);
    wavedParticipants.value.add(participant.id);
  } catch (e) {
    console.error('Failed to send wave:', e);
  }
}

// Check if waved at participant
function hasWavedAt(participantId: number): boolean {
  return wavedParticipants.value.has(participantId);
}

// Navigate to submit form
function goToSubmit(): void {
  router.push({ name: 'submit', params: { roomId: roomId.value } });
}

// Navigate to my submission
function goToMySubmission(): void {
  router.push({ name: 'mySubmission', params: { roomId: roomId.value } });
}

// Navigate to waves view
function goToWaves(): void {
  router.push({ name: 'waves', params: { roomId: roomId.value } });
}

onMounted(async () => {
  await fetchRoom();
  await fetchProfile();
  connect();
});
</script>

<template>
  <div class="min-h-screen bg-base-200 pb-20">
    <!-- Wave Emitter -->
    <WaveEmitter ref="waveEmitter" />

    <!-- You Are Next Modal -->
    <YouAreNextModal :show="showYouAreNext" @close="showYouAreNext = false" />

    <!-- Header -->
    <header class="bg-base-100 shadow-sm sticky top-0 z-10">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h1 class="font-mono font-semibold">{{ roomId }}</h1>
            <div
              :class="[
                'badge badge-sm',
                isConnected ? 'badge-success' : 'badge-error',
              ]"
            >
              {{ isConnected ? 'Live' : 'Offline' }}
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" @click="goToWaves">
            Waves
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-6 space-y-6">
      <!-- Current Presenter -->
      <section v-if="currentParticipant">
        <h2 class="text-lg font-semibold mb-3">Now Presenting</h2>
        <CurrentPresenterCard
          :participant="currentParticipant"
          :has-waved="hasWavedAt(currentParticipant.id)"
          @wave="handleWave"
        />
      </section>

      <div v-else class="card bg-base-100 shadow-lg">
        <div class="card-body items-center text-center py-12">
          <p class="text-base-content/60">Waiting for first presenter...</p>
        </div>
      </div>

      <!-- Up Next -->
      <section v-if="nextParticipant">
        <h2 class="text-lg font-semibold mb-3">Up Next</h2>
        <ParticipantCard
          :participant="nextParticipant"
          :has-waved="hasWavedAt(nextParticipant.id)"
          @wave="handleWave"
        />
      </section>

      <!-- Queue -->
      <section v-if="queue.length > 0">
        <h2 class="text-lg font-semibold mb-3">In Queue ({{ queue.length }})</h2>
        <div class="space-y-3">
          <ParticipantCard
            v-for="participant in queue"
            :key="participant.id"
            :participant="participant"
            :has-waved="hasWavedAt(participant.id)"
            @wave="handleWave"
          />
        </div>
      </section>
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300">
      <div class="container mx-auto px-4 py-3">
        <div class="flex gap-4">
          <button class="btn btn-primary flex-1" @click="goToSubmit">
            Submit to Present
          </button>
          <button class="btn btn-outline flex-1" @click="goToMySubmission">
            My Submission
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>
