<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { usePassphrase } from '@/composables/usePassphrase';

interface WaveData {
  id: number;
  from_profile_id: number;
  from_name: string;
  from_tagline: string | null;
  to_participant_id: number;
  to_name: string;
  to_project_name: string;
  is_mutual: boolean;
  created_at: string;
}

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);

const { passphrase } = usePassphrase();

// State
const sentWaves = ref<WaveData[]>([]);
const receivedWaves = ref<WaveData[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const activeTab = ref<'received' | 'sent'>('received');

// Fetch waves
async function fetchWaves(): Promise<void> {
  if (!passphrase.value) {
    router.push({ name: 'join', params: { roomId: roomId.value } });
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const result = await api.getMyWaves(roomId.value, passphrase.value);
    sentWaves.value = result.sent || [];
    receivedWaves.value = result.received || [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load waves';
  } finally {
    loading.value = false;
  }
}

// Go back
function goBack(): void {
  router.push({ name: 'roomView', params: { roomId: roomId.value } });
}

// Format time
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

onMounted(() => {
  fetchWaves();
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
          <h1 class="font-semibold">My Waves</h1>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="container mx-auto px-4 py-4">
      <div class="tabs tabs-boxed">
        <a
          :class="['tab', activeTab === 'received' && 'tab-active']"
          @click="activeTab = 'received'"
        >
          Received ({{ receivedWaves.length }})
        </a>
        <a
          :class="['tab', activeTab === 'sent' && 'tab-active']"
          @click="activeTab = 'sent'"
        >
          Sent ({{ sentWaves.length }})
        </a>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[50vh]">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="container mx-auto px-4">
      <div class="alert alert-error">
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Waves List -->
    <main v-else class="container mx-auto px-4 pb-6">
      <!-- Received Waves -->
      <div v-if="activeTab === 'received'" class="space-y-3">
        <div v-if="receivedWaves.length === 0" class="card bg-base-100">
          <div class="card-body items-center text-center py-12">
            <p class="text-base-content/60">No waves received yet</p>
            <p class="text-sm text-base-content/40">When someone waves at your presentation, you'll see it here</p>
          </div>
        </div>

        <div
          v-for="wave in receivedWaves"
          :key="wave.id"
          class="card bg-base-100 shadow-sm"
        >
          <div class="card-body p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="avatar placeholder">
                  <div class="bg-neutral text-neutral-content rounded-full w-10">
                    <span>{{ wave.from_name?.charAt(0)?.toUpperCase() }}</span>
                  </div>
                </div>
                <div>
                  <p class="font-semibold">{{ wave.from_name }}</p>
                  <p v-if="wave.from_tagline" class="text-sm text-base-content/70">
                    {{ wave.from_tagline }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="wave.is_mutual" class="badge badge-success badge-sm">Mutual</span>
                <span class="text-sm text-base-content/60">{{ formatTime(wave.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sent Waves -->
      <div v-else class="space-y-3">
        <div v-if="sentWaves.length === 0" class="card bg-base-100">
          <div class="card-body items-center text-center py-12">
            <p class="text-base-content/60">No waves sent yet</p>
            <p class="text-sm text-base-content/40">Wave at presenters to show your interest!</p>
          </div>
        </div>

        <div
          v-for="wave in sentWaves"
          :key="wave.id"
          class="card bg-base-100 shadow-sm"
        >
          <div class="card-body p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="avatar placeholder">
                  <div class="bg-primary text-primary-content rounded-full w-10">
                    <span>{{ wave.to_name?.charAt(0)?.toUpperCase() }}</span>
                  </div>
                </div>
                <div>
                  <p class="font-semibold">{{ wave.to_name }}</p>
                  <p class="text-sm text-primary">"{{ wave.to_project_name }}"</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="wave.is_mutual" class="badge badge-success badge-sm">Mutual</span>
                <span class="text-sm text-base-content/60">{{ formatTime(wave.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mutual Waves Info -->
      <div v-if="!loading && (receivedWaves.some(w => w.is_mutual) || sentWaves.some(w => w.is_mutual))" class="mt-6">
        <div class="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Mutual waves mean both of you are interested! Connect after the session.</span>
        </div>
      </div>
    </main>
  </div>
</template>
