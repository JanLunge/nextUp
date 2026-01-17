<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { usePassphrase } from '@/composables/usePassphrase';
import type { Participant } from '@/types';

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);
const participantId = computed(() => parseInt(route.params.participantId as string));

const { passphrase } = usePassphrase();

// State
const participant = ref<Participant | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const hasWaved = ref(false);
const waving = ref(false);

// Fetch participant
async function fetchParticipant(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    participant.value = await api.getParticipant(roomId.value, participantId.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load presenter';
  } finally {
    loading.value = false;
  }
}

// Send wave
async function sendWave(): Promise<void> {
  if (!passphrase.value || !participant.value || hasWaved.value) return;

  waving.value = true;

  try {
    await api.sendWave(roomId.value, participant.value.id, passphrase.value);
    hasWaved.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to send wave';
  } finally {
    waving.value = false;
  }
}

// Get media URL
function getMediaUrl(path: string | null | undefined): string | null {
  return api.getUploadUrl(path);
}

// Go back
function goBack(): void {
  router.push({ name: 'roomView', params: { roomId: roomId.value } });
}

onMounted(() => {
  fetchParticipant();
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
          <h1 class="font-semibold">Presenter Details</h1>
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

    <!-- Presenter Details -->
    <main v-else-if="participant" class="container mx-auto px-4 py-6">
      <div class="card bg-base-100 shadow-lg max-w-lg mx-auto">
        <div class="card-body">
          <!-- Profile -->
          <div class="flex items-center gap-4 mb-4">
            <div class="avatar">
              <div class="w-16 rounded-full bg-base-300">
                <img
                  v-if="getMediaUrl(participant.profile_image_path)"
                  :src="getMediaUrl(participant.profile_image_path) ?? undefined"
                  :alt="participant.name"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-xl bg-neutral text-neutral-content"
                >
                  {{ participant.name?.charAt(0)?.toUpperCase() }}
                </div>
              </div>
            </div>
            <div>
              <h2 class="text-xl font-bold">{{ participant.name }}</h2>
              <p v-if="participant.tagline" class="text-base-content/70">
                {{ participant.tagline }}
              </p>
            </div>
          </div>

          <!-- Media Preview -->
          <div v-if="getMediaUrl(participant.presentation_media_path)" class="mb-4">
            <video
              v-if="participant.media_type === 'video'"
              :src="getMediaUrl(participant.presentation_media_path) ?? undefined"
              controls
              class="w-full rounded-lg aspect-video object-cover"
            ></video>
            <img
              v-else
              :src="getMediaUrl(participant.presentation_media_path) ?? undefined"
              :alt="participant.project_name"
              class="w-full rounded-lg aspect-video object-cover"
            />
          </div>

          <!-- Project Info -->
          <h3 class="text-lg font-semibold text-primary">{{ participant.project_name }}</h3>

          <a
            v-if="participant.project_url"
            :href="participant.project_url"
            target="_blank"
            rel="noopener"
            class="link link-primary text-sm"
          >
            {{ participant.project_url }}
          </a>

          <p class="text-base-content/80 mt-2">
            {{ participant.project_description }}
          </p>

          <!-- Current Need -->
          <div
            v-if="participant.current_need"
            class="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg"
          >
            <span class="font-medium">Looking for:</span>
            <span class="ml-2">{{ participant.current_need }}</span>
          </div>

          <!-- Wave Button -->
          <div class="card-actions mt-6">
            <button
              class="btn btn-primary w-full"
              :class="{ 'btn-success': hasWaved }"
              :disabled="hasWaved || waving"
              @click="sendWave"
            >
              <span v-if="waving" class="loading loading-spinner loading-sm"></span>
              <span v-else-if="hasWaved">Waved!</span>
              <span v-else>Wave at {{ participant.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
