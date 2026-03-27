<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useWebSocket } from '@/composables/useWebSocket';
import { usePassphrase } from '@/composables/usePassphrase';
import { useRoom } from '@/composables/useRoom';
import CurrentPresenterCard from '@/components/CurrentPresenterCard.vue';
import ParticipantCard from '@/components/ParticipantCard.vue';
import YouAreNextModal from '@/components/YouAreNextModal.vue';
import WaveEmitter from '@/components/WaveEmitter.vue';
import ColorDisplay from '@/components/ColorDisplay.vue';
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
const { room, currentParticipant, nextParticipant, queue, fetchRoom, fetchQueue, updateFromWebSocket } = useRoom(roomId);

// Presented participants
const presentedParticipants = ref<Participant[]>([]);

// UI state
const showYouAreNext = ref(false);
const wavedParticipants = ref<Set<number>>(new Set());
const profileId = ref<number | null>(null);

// Spatial mapping state
const mappingActive = ref(false);
const mappingColor = ref('#000000');
const myParticipantId = ref<number | null>(null);
const myMappingId = ref<number | null>(null);

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

  // Handle "you are next" notification (sent only to the specific user)
  if (message.type === 'you_are_next') {
    showYouAreNext.value = true;
  }

  // Update presented list when presenter changes
  if (message.type === 'presenter_changed') {
    fetchPresentedParticipants();
  }

  // Spatial mapping events
  if (message.type === 'mapping_start') {
    mappingActive.value = true;
    // Store my assignment from the assignments map
    const assignments = message.assignments as Record<number, number>;
    if (myParticipantId.value && assignments[myParticipantId.value] !== undefined) {
      myMappingId.value = assignments[myParticipantId.value];
    }
    mappingColor.value = '#000000';
  }

  if (message.type === 'mapping_tick') {
    const tick = message.tick as number;
    // 4 colors: red=0, green=1, blue=2, white=3
    const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'];
    if (myMappingId.value !== null) {
      const colorIndex = (myMappingId.value >> (tick * 2)) & 3;
      mappingColor.value = COLORS[colorIndex];
    } else {
      mappingColor.value = '#000000';
    }
  }

  if (message.type === 'mapping_end') {
    mappingActive.value = false;
    mappingColor.value = '#000000';
    myMappingId.value = null;
  }
}

// Fetch presented participants
async function fetchPresentedParticipants(): Promise<void> {
  try {
    const result = await api.getPresentedParticipants(roomId.value);
    presentedParticipants.value = result.participants;
  } catch (e) {
    console.error('Failed to fetch presented participants:', e);
  }
}

// Fetch profile info
async function fetchProfile(): Promise<void> {
  if (!passphrase.value) return;

  try {
    const result = await api.checkPassphraseInRoom(roomId.value, passphrase.value);
    if (result.profile_exists) {
      profileId.value = result.profile_id ?? null;
      if (result.participant) {
        myParticipantId.value = result.participant.id;
      }
    }
  } catch (e) {
    console.error('Failed to fetch profile:', e);
  }
}

// Wave at participant
async function handleWave(participant: Participant): Promise<void> {
  if (!passphrase.value || wavedParticipants.value.has(participant.id)) return;

  try {
    await api.sendWave(roomId.value, passphrase.value, participant.id);
    wavedParticipants.value.add(participant.id);
  } catch (e) {
    console.error('Failed to send wave:', e);
  }
}

// Check if waved at participant
function hasWavedAt(participantId: number): boolean {
  return wavedParticipants.value.has(participantId);
}

// Check if participant is the current user
function isCurrentUser(participant: Participant): boolean {
  return profileId.value !== null && participant.profile_id === profileId.value;
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

// Navigate to presenter detail
function goToPresenter(participant: Participant): void {
  router.push({
    name: 'presenterDetail',
    params: { roomId: roomId.value, participantId: participant.id }
  });
}

onMounted(async () => {
  await fetchRoom();
  await fetchQueue();
  await fetchProfile();
  await fetchPresentedParticipants();
  connect();
});
</script>

<template>
  <div class="min-h-screen bg-surface pb-24">
    <!-- Spatial Mapping Color Display -->
    <ColorDisplay
      :active="mappingActive"
      :color="mappingColor"
      :participant-name="currentParticipant?.name || ''"
    />

    <!-- Wave Emitter -->
    <WaveEmitter ref="waveEmitter" />

    <!-- You Are Next Modal -->
    <YouAreNextModal :show="showYouAreNext" @close="showYouAreNext = false" />

    <!-- Header -->
    <header class="glass-dark sticky top-0 z-20">
      <div class="px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="room-code text-lg text-coral">{{ roomId }}</span>
            <div class="flex items-center gap-1.5">
              <span
                :class="[
                  'status-dot',
                  isConnected ? 'status-dot-live' : 'status-dot-offline'
                ]"
              ></span>
              <span :class="['text-xs', isConnected ? 'text-success' : 'text-error']">
                {{ isConnected ? 'Live' : 'Offline' }}
              </span>
            </div>
          </div>
          <button
            class="btn btn-ghost btn-sm gap-2"
            @click="goToWaves"
          >
            <span class="text-lg">👋</span>
            <span>Waves</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 py-6 space-y-6">
      <!-- Current Presenter - Special highlight if it's the current user -->
      <section v-if="currentParticipant && isCurrentUser(currentParticipant)" class="animate-fade-up">
        <div class="card bg-coral/20 border-2 border-coral overflow-hidden next-pulse">
          <div class="p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-full bg-coral/30 flex items-center justify-center">
                <span class="text-3xl">🎤</span>
              </div>
              <div>
                <h2 class="font-display text-xl font-bold text-coral">You're On Stage!</h2>
                <p class="text-sm text-cream/80">You're currently presenting</p>
              </div>
            </div>
            <div class="p-3 bg-surface/50 rounded-xl">
              <p class="text-cream">
                <span class="font-medium">Your project:</span> {{ currentParticipant.project_name || 'Untitled' }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Current Presenter - Regular view -->
      <section v-else-if="currentParticipant" class="animate-fade-up">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-2 h-2 rounded-full bg-coral animate-pulse"></div>
          <h2 class="font-display text-sm font-bold text-subtle uppercase tracking-wider">Now Presenting</h2>
        </div>
        <CurrentPresenterCard
          :participant="currentParticipant"
          :has-waved="hasWavedAt(currentParticipant.id)"
          :is-you="false"
          @wave="handleWave"
          @click="goToPresenter(currentParticipant)"
        />
      </section>

      <!-- Empty State for No Presenter -->
      <div v-else-if="!nextParticipant && queue.length === 0 && presentedParticipants.length === 0" class="animate-fade-up">
        <div class="card bg-surface-elevated border border-white/5">
          <div class="p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-coral/10 flex items-center justify-center">
              <svg class="w-8 h-8 text-coral/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-subtle">Waiting for first presenter...</p>
          </div>
        </div>
      </div>

      <!-- All Done State -->
      <div v-else-if="!nextParticipant && queue.length === 0 && presentedParticipants.length > 0" class="animate-fade-up">
        <div class="card bg-success/10 border border-success/30">
          <div class="p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="font-display text-lg font-bold text-cream mb-2">All presentations complete!</p>
            <p class="text-subtle text-sm">{{ presentedParticipants.length }} {{ presentedParticipants.length === 1 ? 'person' : 'people' }} presented today.</p>
          </div>
        </div>
      </div>

      <!-- Up Next - Special highlight if it's the current user -->
      <section v-if="nextParticipant && isCurrentUser(nextParticipant)" class="animate-fade-up delay-150">
        <div class="card bg-coral/10 border-2 border-coral/50 overflow-hidden">
          <div class="p-4">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center">
                <span class="text-2xl">⚡</span>
              </div>
              <div>
                <h2 class="font-display font-bold text-coral">You're Up Next!</h2>
                <p class="text-sm text-subtle">You'll present after the current speaker finishes</p>
              </div>
            </div>
            <div class="p-3 bg-surface/50 rounded-xl">
              <p class="text-sm text-cream">
                <span class="font-medium">Your project:</span> {{ nextParticipant.project_name || 'Untitled' }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Up Next - Regular view for other users -->
      <section v-else-if="nextParticipant" class="animate-fade-up delay-150">
        <div class="flex items-center gap-2 mb-3">
          <h2 class="font-display text-sm font-bold text-subtle uppercase tracking-wider">Up Next</h2>
          <span class="text-xs text-subtle">(after current presenter)</span>
        </div>
        <ParticipantCard
          :participant="nextParticipant"
          :has-waved="hasWavedAt(nextParticipant.id)"
          :is-you="false"
          @wave="handleWave"
          @click="goToPresenter(nextParticipant)"
        />
      </section>

      <!-- Queue -->
      <section v-if="queue.length > 0" class="animate-fade-up delay-200">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-display text-sm font-bold text-subtle uppercase tracking-wider">
            In Queue
          </h2>
          <span class="px-2 py-1 bg-surface-overlay rounded-full text-xs text-coral font-medium">
            {{ queue.length }}
          </span>
        </div>
        <div class="space-y-3">
          <ParticipantCard
            v-for="(participant, index) in queue"
            :key="participant.id"
            :participant="participant"
            :has-waved="hasWavedAt(participant.id)"
            :is-you="isCurrentUser(participant)"
            :compact="true"
            :class="['animate-fade-up', { 'delay-200': index < 3 }]"
            :style="{ animationDelay: `${150 + index * 50}ms` }"
            @wave="handleWave"
            @click="goToPresenter(participant)"
          />
        </div>
      </section>

      <!-- Empty Queue State (only when no one has presented yet) -->
      <section v-else-if="!currentParticipant && !nextParticipant && presentedParticipants.length === 0" class="animate-fade-up delay-200">
        <div class="card bg-surface-elevated border border-white/5 border-dashed">
          <div class="p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-coral/10 flex items-center justify-center">
              <svg class="w-8 h-8 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p class="font-display text-lg font-bold text-cream mb-2">Be the first to present!</p>
            <p class="text-subtle text-sm">The stage is empty. Submit your project to get started.</p>
          </div>
        </div>
      </section>

      <!-- Presented History -->
      <section v-if="presentedParticipants.length > 0" class="animate-fade-up delay-300">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-display text-sm font-bold text-subtle uppercase tracking-wider">
            Already Presented
          </h2>
          <span class="px-2 py-1 bg-success/20 rounded-full text-xs text-success font-medium">
            {{ presentedParticipants.length }}
          </span>
        </div>
        <div class="space-y-3">
          <ParticipantCard
            v-for="(participant, index) in presentedParticipants"
            :key="participant.id"
            :participant="participant"
            :has-waved="hasWavedAt(participant.id)"
            :is-you="isCurrentUser(participant)"
            :compact="true"
            :class="['animate-fade-up opacity-75']"
            :style="{ animationDelay: `${200 + index * 50}ms` }"
            @wave="handleWave"
            @click="goToPresenter(participant)"
          />
        </div>
      </section>
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/5 pb-safe z-20">
      <div class="px-4 py-3">
        <div class="flex gap-3">
          <button
            class="btn btn-primary flex-1 font-display font-bold"
            @click="goToSubmit"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Submit to Present
          </button>
          <button
            class="btn bg-surface-overlay border border-white/10 hover:bg-slate"
            @click="goToMySubmission"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
