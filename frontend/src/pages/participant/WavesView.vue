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

// Count mutual waves
const mutualCount = computed(() => {
  const receivedMutual = receivedWaves.value.filter(w => w.is_mutual).length;
  const sentMutual = sentWaves.value.filter(w => w.is_mutual).length;
  return Math.max(receivedMutual, sentMutual);
});

onMounted(() => {
  fetchWaves();
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
          <div>
            <h1 class="font-display font-bold text-cream">My Waves</h1>
            <p class="text-xs text-subtle">Your connections from this session</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="px-4 py-4">
      <div class="flex gap-2 p-1 bg-surface-elevated rounded-xl border border-white/5">
        <button
          :class="[
            'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
            activeTab === 'received'
              ? 'bg-coral text-white'
              : 'text-subtle hover:text-cream'
          ]"
          @click="activeTab = 'received'"
        >
          Received ({{ receivedWaves.length }})
        </button>
        <button
          :class="[
            'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
            activeTab === 'sent'
              ? 'bg-coral text-white'
              : 'text-subtle hover:text-cream'
          ]"
          @click="activeTab = 'sent'"
        >
          Sent ({{ sentWaves.length }})
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[40vh]">
      <div class="text-center">
        <div class="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-coral border-t-transparent animate-spin"></div>
        <p class="text-subtle text-sm">Loading waves...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="px-4">
      <div class="p-4 bg-error/10 border border-error/30 rounded-xl">
        <p class="text-error text-center">{{ error }}</p>
      </div>
    </div>

    <!-- Waves List -->
    <main v-else class="px-4 pb-6">
      <!-- Mutual Waves Banner -->
      <div
        v-if="mutualCount > 0 && !loading"
        class="p-4 bg-success/10 border border-success/30 rounded-xl mb-4 animate-fade-up"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <span class="text-xl">🤝</span>
          </div>
          <div>
            <p class="font-display font-bold text-success">{{ mutualCount }} Mutual Waves!</p>
            <p class="text-sm text-subtle">You both want to connect</p>
          </div>
        </div>
      </div>

      <!-- Received Waves -->
      <div v-if="activeTab === 'received'" class="space-y-3">
        <div
          v-if="receivedWaves.length === 0"
          class="card bg-surface-elevated border border-white/5 animate-fade-up"
        >
          <div class="p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-coral/10 flex items-center justify-center">
              <span class="text-3xl">👋</span>
            </div>
            <p class="font-display font-bold text-cream mb-2">No waves yet</p>
            <p class="text-subtle text-sm">When someone waves at your presentation, you'll see it here</p>
          </div>
        </div>

        <div
          v-for="(wave, index) in receivedWaves"
          :key="wave.id"
          :class="[
            'card border animate-fade-up',
            wave.is_mutual ? 'bg-success/5 border-success/30' : 'bg-surface-elevated border-white/5'
          ]"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-11 h-11 rounded-full flex items-center justify-center font-display font-bold',
                    wave.is_mutual ? 'bg-success/20 text-success' : 'bg-surface-overlay text-subtle'
                  ]"
                >
                  {{ wave.from_name?.charAt(0)?.toUpperCase() }}
                </div>
                <div>
                  <p class="font-semibold text-cream">{{ wave.from_name }}</p>
                  <p v-if="wave.from_tagline" class="text-sm text-subtle">
                    {{ wave.from_tagline }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="wave.is_mutual"
                  class="px-2.5 py-1 bg-success/20 text-success text-xs font-medium rounded-full"
                >
                  Mutual
                </span>
                <span class="text-sm text-muted">{{ formatTime(wave.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sent Waves -->
      <div v-else class="space-y-3">
        <div
          v-if="sentWaves.length === 0"
          class="card bg-surface-elevated border border-white/5 animate-fade-up"
        >
          <div class="p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-coral/10 flex items-center justify-center">
              <span class="text-3xl">✨</span>
            </div>
            <p class="font-display font-bold text-cream mb-2">No waves sent</p>
            <p class="text-subtle text-sm">Wave at presenters to show your interest!</p>
          </div>
        </div>

        <div
          v-for="(wave, index) in sentWaves"
          :key="wave.id"
          :class="[
            'card border animate-fade-up',
            wave.is_mutual ? 'bg-success/5 border-success/30' : 'bg-surface-elevated border-white/5'
          ]"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-11 h-11 rounded-full flex items-center justify-center font-display font-bold',
                    wave.is_mutual ? 'bg-success/20 text-success' : 'bg-coral/20 text-coral'
                  ]"
                >
                  {{ wave.to_name?.charAt(0)?.toUpperCase() }}
                </div>
                <div>
                  <p class="font-semibold text-cream">{{ wave.to_name }}</p>
                  <p class="text-sm text-coral">"{{ wave.to_project_name }}"</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="wave.is_mutual"
                  class="px-2.5 py-1 bg-success/20 text-success text-xs font-medium rounded-full"
                >
                  Mutual
                </span>
                <span class="text-sm text-muted">{{ formatTime(wave.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Banner -->
      <div
        v-if="!loading && (receivedWaves.length > 0 || sentWaves.length > 0)"
        class="mt-6 p-4 bg-info/10 border border-info/30 rounded-xl animate-fade-up"
      >
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-info shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-info">
            Mutual waves mean both parties are interested in connecting. Use the session networking time to meet up!
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
