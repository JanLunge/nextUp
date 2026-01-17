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
    submission.value = result;
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

// Get status badge class
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'queued':
      return 'badge-info';
    case 'presenting':
      return 'badge-success';
    case 'presented':
      return 'badge-neutral';
    case 'withdrawn':
      return 'badge-error';
    default:
      return 'badge-ghost';
  }
}

// Go back to room view
function goBack(): void {
  router.push({ name: 'roomView', params: { roomId: roomId.value } });
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
  <div class="min-h-screen bg-base-200">
    <!-- Header -->
    <header class="bg-base-100 shadow-sm">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center gap-4">
          <button class="btn btn-ghost btn-sm" @click="goBack">
            ← Back
          </button>
          <h1 class="font-semibold">My Submission</h1>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[50vh]">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="container mx-auto px-4 py-6">
      <div class="alert alert-error">
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Submission Details -->
    <main v-else-if="submission" class="container mx-auto px-4 py-6">
      <div class="card bg-base-100 shadow-lg max-w-lg mx-auto">
        <div class="card-body">
          <!-- Status -->
          <div class="flex items-center justify-between mb-4">
            <div :class="['badge', 'badge-lg', getStatusBadgeClass(submission.status)]">
              {{ submission.status }}
            </div>
            <div v-if="submission.status === 'queued'" class="text-sm text-base-content/70">
              Position: #{{ submission.queue_position }}
            </div>
          </div>

          <!-- Media Preview -->
          <div v-if="getMediaUrl(submission.presentation_media_path)" class="mb-4">
            <video
              v-if="submission.media_type === 'video'"
              :src="getMediaUrl(submission.presentation_media_path) ?? undefined"
              controls
              class="w-full rounded-lg aspect-video object-cover"
            ></video>
            <img
              v-else
              :src="getMediaUrl(submission.presentation_media_path) ?? undefined"
              :alt="submission.project_name"
              class="w-full rounded-lg aspect-video object-cover"
            />
          </div>

          <!-- Project Info -->
          <h2 class="text-xl font-bold">{{ submission.project_name }}</h2>

          <a
            v-if="submission.project_url"
            :href="submission.project_url"
            target="_blank"
            rel="noopener"
            class="link link-primary text-sm"
          >
            {{ submission.project_url }}
          </a>

          <p class="text-base-content/80 mt-2">
            {{ submission.project_description }}
          </p>

          <!-- Current Need -->
          <div
            v-if="submission.current_need"
            class="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg"
          >
            <span class="font-medium">Looking for:</span>
            <span class="ml-2">{{ submission.current_need }}</span>
          </div>

          <!-- Actions -->
          <div v-if="submission.status === 'queued'" class="card-actions mt-6">
            <button class="btn btn-error btn-outline w-full" @click="withdraw">
              Withdraw Submission
            </button>
          </div>

          <!-- Presented Message -->
          <div v-else-if="submission.status === 'presented'" class="alert alert-success mt-6">
            <span>You've presented! Check your waves to see who wants to connect.</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
