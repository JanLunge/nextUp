<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { usePassphrase } from '@/composables/usePassphrase';
import { useWebSocket } from '@/composables/useWebSocket';
import type { Participant, WSMessage } from '@/types';

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);

const { passphrase } = usePassphrase();

// Submission state
const submission = ref<Participant | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// WebSocket for real-time updates
const { connect } = useWebSocket(roomId, {
  role: 'audience',
  passphrase: passphrase.value ?? undefined,
  onMessage: handleWebSocketMessage,
});

function handleWebSocketMessage(message: WSMessage): void {
  if (message.type === 'participant_updated' && message.participant) {
    const updated = message.participant as Participant;
    if (submission.value && updated.id === submission.value.id) {
      submission.value = updated;
    }
  }
}

// Fetch submission
async function fetchSubmission(): Promise<void> {
  if (!passphrase.value) {
    router.push({ name: 'join', params: { roomId: roomId.value } });
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const result = await api.getMySubmission(roomId.value, passphrase.value);
    submission.value = result.participant;
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) {
      router.push({ name: 'submit', params: { roomId: roomId.value } });
    } else {
      error.value = e instanceof Error ? e.message : 'Failed to load submission';
    }
  } finally {
    loading.value = false;
  }
}

// Withdraw submission
async function withdraw(): Promise<void> {
  if (!passphrase.value || !submission.value) return;

  if (!confirm('Are you sure you want to withdraw your submission?')) return;

  try {
    await api.withdrawSubmission(roomId.value, passphrase.value);
    router.push({ name: 'roomView', params: { roomId: roomId.value } });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to withdraw';
  }
}

// Get status info
function getStatusInfo(status: string): { color: string; label: string; icon: string } {
  switch (status) {
    case 'queued':
      return { color: 'text-info', label: 'In Queue', icon: '⏳' };
    case 'presenting':
      return { color: 'text-coral', label: 'Now Presenting', icon: '🎤' };
    case 'presented':
      return { color: 'text-success', label: 'Presented', icon: '✓' };
    case 'withdrawn':
      return { color: 'text-error', label: 'Withdrawn', icon: '✕' };
    default:
      return { color: 'text-subtle', label: status, icon: '•' };
  }
}

// Go back to room view
function goBack(): void {
  router.push({ name: 'roomView', params: { roomId: roomId.value } });
}

// Go to waves view
function goToWaves(): void {
  router.push({ name: 'waves', params: { roomId: roomId.value } });
}

// Get media URL
function getMediaUrl(path: string | null | undefined): string | null {
  return api.getUploadUrl(path);
}

onMounted(() => {
  fetchSubmission();
  connect();
});
</script>

<template>
  <div class="min-h-screen bg-surface">
    <!-- Header -->
    <header class="glass-dark sticky top-0 z-10">
      <div class="px-4 py-4">
        <div class="flex items-center gap-4">
          <button class="btn btn-ghost btn-sm btn-square" @click="goBack">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 class="font-display font-bold text-cream">My Submission</h1>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-coral border-t-transparent animate-spin"></div>
        <p class="text-subtle">Loading...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="px-4 py-6">
      <div class="max-w-lg mx-auto p-4 bg-error/10 border border-error/30 rounded-xl">
        <p class="text-error text-center">{{ error }}</p>
      </div>
    </div>

    <!-- Submission Details -->
    <main v-else-if="submission" class="px-4 py-6">
      <div class="max-w-lg mx-auto space-y-6">
        <!-- Status Card -->
        <div
          :class="[
            'card border animate-fade-up',
            submission.status === 'presenting' ? 'bg-coral/10 border-coral/30' :
            submission.status === 'presented' ? 'bg-success/10 border-success/30' :
            'bg-surface-elevated border-white/5'
          ]"
        >
          <div class="p-5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ getStatusInfo(submission.status).icon }}</span>
                <div>
                  <p :class="['font-display font-bold text-lg', getStatusInfo(submission.status).color]">
                    {{ getStatusInfo(submission.status).label }}
                  </p>
                  <p v-if="submission.status === 'queued'" class="text-sm text-subtle">
                    Position #{{ submission.queue_position }} in queue
                  </p>
                </div>
              </div>

              <!-- Presenting animation -->
              <div v-if="submission.status === 'presenting'" class="flex gap-1">
                <span class="w-2 h-2 rounded-full bg-coral animate-bounce" style="animation-delay: 0ms;"></span>
                <span class="w-2 h-2 rounded-full bg-coral animate-bounce" style="animation-delay: 150ms;"></span>
                <span class="w-2 h-2 rounded-full bg-coral animate-bounce" style="animation-delay: 300ms;"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Media Preview -->
        <div v-if="getMediaUrl(submission.presentation_media_path)" class="animate-fade-up delay-150">
          <div class="rounded-xl overflow-hidden bg-surface-elevated border border-white/5">
            <video
              v-if="submission.media_type === 'video'"
              :src="getMediaUrl(submission.presentation_media_path) ?? undefined"
              controls
              class="w-full aspect-video object-cover"
            ></video>
            <img
              v-else
              :src="getMediaUrl(submission.presentation_media_path) ?? undefined"
              :alt="submission.project_name"
              class="w-full aspect-video object-cover"
            />
          </div>
        </div>

        <!-- Submission Info -->
        <div class="card bg-surface-elevated border border-white/5 animate-fade-up delay-200">
          <div class="p-5 space-y-4">
            <!-- Name is always shown -->
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-coral/20 flex items-center justify-center text-xl font-bold text-coral">
                {{ submission.name?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <div>
                <h2 class="font-display text-xl font-bold text-cream">{{ submission.name }}</h2>
                <p v-if="submission.tagline" class="text-sm text-subtle">{{ submission.tagline }}</p>
              </div>
            </div>

            <!-- Project Name (if provided) -->
            <div v-if="submission.project_name">
              <h3 class="font-display text-lg font-bold text-coral">{{ submission.project_name }}</h3>
              <a
                v-if="submission.project_url"
                :href="submission.project_url"
                target="_blank"
                rel="noopener"
                class="text-sm text-subtle hover:text-cream transition-colors"
              >
                {{ submission.project_url }}
              </a>
            </div>

            <!-- Project Description (if provided) -->
            <p v-if="submission.project_description" class="text-cream/80">{{ submission.project_description }}</p>

            <!-- Empty state if no project details -->
            <div v-if="!submission.project_name && !submission.project_description" class="p-4 bg-surface-overlay/50 rounded-xl border border-white/5 border-dashed">
              <p class="text-subtle text-sm text-center">No project details added yet</p>
            </div>

            <!-- Current Need -->
            <div
              v-if="submission.current_need"
              class="p-4 bg-coral/10 border border-coral/20 rounded-xl"
            >
              <p class="text-xs text-coral uppercase tracking-wider font-medium mb-1">Looking For</p>
              <p class="text-cream">{{ submission.current_need }}</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-3 animate-fade-up delay-300">
          <!-- Withdraw (only if queued) -->
          <button
            v-if="submission.status === 'queued'"
            class="btn btn-outline w-full border-error/30 text-error hover:bg-error/10 hover:border-error"
            @click="withdraw"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Withdraw Submission
          </button>

          <!-- Presented Success -->
          <div
            v-if="submission.status === 'presented'"
            class="p-4 bg-success/10 border border-success/30 rounded-xl"
          >
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-success shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="font-medium text-success">Great presentation!</p>
                <p class="text-sm text-subtle mt-1">Check your waves to see who wants to connect with you.</p>
              </div>
            </div>
            <button
              class="btn btn-success w-full mt-4"
              @click="goToWaves"
            >
              <span class="text-lg mr-2">👋</span>
              View My Waves
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
