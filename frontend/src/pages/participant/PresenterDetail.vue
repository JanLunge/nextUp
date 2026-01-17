<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { usePassphrase } from '@/composables/usePassphrase';
import WaveButton from '@/components/WaveButton.vue';
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

// Fetch participant
async function fetchParticipant(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.getParticipant(roomId.value, participantId.value);
    participant.value = response.participant;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load presenter';
  } finally {
    loading.value = false;
  }
}

// Send wave
async function sendWave(): Promise<void> {
  if (!passphrase.value || !participant.value || hasWaved.value) return;

  try {
    await api.sendWave(roomId.value, passphrase.value, participant.value.id);
    hasWaved.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to send wave';
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
          <h1 class="font-display font-bold text-cream">Presenter</h1>
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

    <!-- Presenter Details -->
    <main v-else-if="participant" class="px-4 py-6 pb-safe">
      <div class="max-w-lg mx-auto space-y-6">
        <!-- Profile Header -->
        <div class="text-center animate-fade-up">
          <!-- Avatar -->
          <div class="w-24 h-24 mx-auto rounded-full overflow-hidden avatar-ring">
            <img
              v-if="getMediaUrl(participant.profile_image_path)"
              :src="getMediaUrl(participant.profile_image_path) ?? undefined"
              :alt="participant.name"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-surface-overlay text-3xl font-display font-bold text-coral"
            >
              {{ participant.name?.charAt(0)?.toUpperCase() }}
            </div>
          </div>

          <h1 class="font-display text-2xl font-bold text-cream mt-4">{{ participant.name }}</h1>
          <p v-if="participant.tagline" class="text-subtle mt-1">{{ participant.tagline }}</p>
        </div>

        <!-- Media Preview -->
        <div v-if="getMediaUrl(participant.presentation_media_path)" class="animate-fade-up delay-150">
          <div class="rounded-xl overflow-hidden bg-surface-elevated border border-white/5">
            <video
              v-if="participant.media_type === 'video'"
              :src="getMediaUrl(participant.presentation_media_path) ?? undefined"
              controls
              class="w-full aspect-video object-cover"
            ></video>
            <img
              v-else
              :src="getMediaUrl(participant.presentation_media_path) ?? undefined"
              :alt="participant.project_name"
              class="w-full aspect-video object-cover"
            />
          </div>
        </div>

        <!-- Project Info -->
        <div class="card bg-surface-elevated border border-white/5 animate-fade-up delay-200">
          <div class="p-5 space-y-4">
            <div>
              <h2 class="font-display text-xl font-bold text-coral">{{ participant.project_name }}</h2>
              <a
                v-if="participant.project_url"
                :href="participant.project_url"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-sm text-subtle hover:text-cream transition-colors mt-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {{ participant.project_url }}
              </a>
            </div>

            <p class="text-cream/80">{{ participant.project_description }}</p>

            <!-- Current Need -->
            <div
              v-if="participant.current_need"
              class="p-4 bg-coral/10 border border-coral/20 rounded-xl"
            >
              <p class="text-xs text-coral uppercase tracking-wider font-medium mb-1">Looking For</p>
              <p class="text-cream">{{ participant.current_need }}</p>
            </div>
          </div>
        </div>

        <!-- Wave Button -->
        <div class="animate-fade-up delay-300">
          <WaveButton
            :has-waved="hasWaved"
            :label="`Wave at ${participant.name}`"
            size="lg"
            class="w-full"
            @wave="sendWave"
          />
          <p class="text-xs text-subtle text-center mt-3">
            {{ hasWaved ? 'They\'ll see your wave after their presentation!' : 'Let them know you\'re interested in connecting' }}
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 2rem);
}
</style>
