<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useWebSocket } from '@/composables/useWebSocket';
import { useRoom } from '@/composables/useRoom';
import { useTimer } from '@/composables/useTimer';
import type { WSMessage } from '@/types';

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);
const adminKey = computed(() => route.query.key as string | undefined);

const isValid = ref(false);
const loading = ref(true);
const error = ref<string | null>(null);

// Room state
const { currentParticipant, nextParticipant, queueCount, presentedCount, fetchRoom, updateFromWebSocket } = useRoom(roomId);

// Timer state
const timer = useTimer();

// WebSocket
const { isConnected, connect } = useWebSocket(roomId, {
  role: 'admin',
  adminKey: adminKey.value,
  onMessage: handleWebSocketMessage,
});

function handleWebSocketMessage(message: WSMessage): void {
  updateFromWebSocket(message);
  timer.handleTimerMessage(message);
}

// Validate admin key
async function validateKey(): Promise<void> {
  if (!adminKey.value) {
    error.value = 'Admin key required';
    loading.value = false;
    return;
  }

  try {
    const result = await api.validateAdminKey(roomId.value, adminKey.value);
    if (result.valid) {
      isValid.value = true;
      await fetchRoom();
      connect();
    } else {
      error.value = 'Invalid admin key';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Validation failed';
  } finally {
    loading.value = false;
  }
}

// Controls
async function goNext(): Promise<void> {
  try {
    await api.nextPresenter(roomId.value, adminKey.value);
  } catch (e) {
    console.error('Failed to go next:', e);
  }
}

async function goPrevious(): Promise<void> {
  try {
    await api.previousPresenter(roomId.value, adminKey.value);
  } catch (e) {
    console.error('Failed to go previous:', e);
  }
}

async function startTimer(): Promise<void> {
  try {
    await api.startTimer(roomId.value, adminKey.value);
  } catch (e) {
    console.error('Failed to start timer:', e);
  }
}

async function stopTimer(): Promise<void> {
  try {
    await api.stopTimer(roomId.value, adminKey.value);
  } catch (e) {
    console.error('Failed to stop timer:', e);
  }
}

async function restartTimer(): Promise<void> {
  try {
    await api.restartTimer(roomId.value, adminKey.value);
  } catch (e) {
    console.error('Failed to restart timer:', e);
  }
}

onMounted(() => {
  validateKey();
});
</script>

<template>
  <div class="min-h-screen bg-surface">
    <!-- Loading -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-coral border-t-transparent animate-spin"></div>
        <p class="text-subtle">Connecting...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="min-h-screen flex flex-col items-center justify-center p-6">
      <div class="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mb-6">
        <svg class="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 class="font-display text-xl font-bold text-cream mb-2">Access Denied</h1>
      <p class="text-subtle text-center mb-6">{{ error }}</p>
      <button class="btn btn-ghost" @click="router.push('/')">
        Go Home
      </button>
    </div>

    <!-- Admin Controller -->
    <div v-else-if="isValid" class="min-h-screen flex flex-col pb-safe">
      <!-- Header -->
      <header class="glass-dark px-4 py-4 sticky top-0 z-10">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-subtle uppercase tracking-wider">Admin Controller</p>
            <p class="room-code text-lg text-coral">{{ roomId }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              :class="[
                'status-dot',
                isConnected ? 'status-dot-live' : 'status-dot-offline'
              ]"
            ></span>
            <span :class="['text-sm', isConnected ? 'text-success' : 'text-error']">
              {{ isConnected ? 'Live' : 'Offline' }}
            </span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 p-4 space-y-4 overflow-y-auto">
        <!-- Current / Next Presenters -->
        <div class="card bg-surface-elevated border border-white/5">
          <div class="p-4 space-y-4">
            <!-- Current -->
            <div>
              <p class="text-xs text-subtle uppercase tracking-wider mb-1">Now Presenting</p>
              <div v-if="currentParticipant" class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center text-coral font-display font-bold">
                  {{ currentParticipant.name?.charAt(0)?.toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-cream truncate">{{ currentParticipant.name }}</p>
                  <p class="text-sm text-coral truncate">{{ currentParticipant.project_name }}</p>
                </div>
              </div>
              <p v-else class="text-subtle">No one presenting</p>
            </div>

            <div class="divider-glow"></div>

            <!-- Next -->
            <div>
              <p class="text-xs text-subtle uppercase tracking-wider mb-1">Up Next</p>
              <div v-if="nextParticipant" class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-surface-overlay flex items-center justify-center text-subtle font-display font-bold">
                  {{ nextParticipant.name?.charAt(0)?.toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-cream truncate">{{ nextParticipant.name }}</p>
                  <p class="text-sm text-subtle truncate">{{ nextParticipant.project_name }}</p>
                </div>
              </div>
              <p v-else class="text-subtle">No one in queue</p>
            </div>
          </div>
        </div>

        <!-- Timer Display -->
        <div
          :class="[
            'card border transition-all',
            timer.isOvertime.value
              ? 'bg-error/10 border-error/30'
              : 'bg-surface-elevated border-white/5'
          ]"
        >
          <div class="p-6 text-center">
            <!-- Overtime Badge -->
            <div
              v-if="timer.isOvertime.value"
              class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-error/20 text-error text-sm font-medium mb-3"
            >
              <span class="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              OVERTIME
            </div>

            <!-- Timer -->
            <p
              :class="[
                'text-6xl font-mono font-bold tabular-nums',
                timer.timerClass.value
              ]"
            >
              {{ timer.displayTime.value }}
            </p>

            <!-- Progress Bar -->
            <div class="mt-4 h-2 rounded-full bg-surface-overlay overflow-hidden">
              <div
                :class="[
                  'h-full rounded-full transition-all duration-300',
                  timer.isOvertime.value ? 'bg-error' :
                  timer.remaining.value <= 10 ? 'bg-error' :
                  timer.remaining.value <= 20 ? 'bg-warning' :
                  'bg-success'
                ]"
                :style="{ width: `${timer.progress.value}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Navigation Controls -->
        <div class="grid grid-cols-2 gap-3">
          <button
            class="btn btn-lg h-16 bg-surface-elevated border border-white/10 hover:bg-slate hover:border-coral/30 font-display"
            @click="goPrevious"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>
          <button
            class="btn btn-lg btn-primary h-16 font-display"
            @click="goNext"
          >
            Next
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Timer Controls -->
        <div class="card bg-surface-elevated border border-white/5">
          <div class="p-4 space-y-3">
            <p class="text-xs text-subtle uppercase tracking-wider">Timer Controls</p>

            <button
              class="btn btn-lg w-full h-14 font-display"
              :class="timer.isRunning.value ? 'btn-error' : 'bg-success hover:bg-success/80 text-white'"
              @click="timer.isRunning.value ? stopTimer() : startTimer()"
            >
              <template v-if="timer.isRunning.value">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Timer
              </template>
              <template v-else>
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Timer
              </template>
            </button>

            <button
              class="btn w-full bg-surface-overlay border border-white/10 hover:bg-slate"
              @click="restartTimer"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restart Timer
            </button>
          </div>
        </div>

        <!-- Queue Stats -->
        <div class="grid grid-cols-2 gap-3">
          <div class="card bg-surface-elevated border border-white/5 p-4 text-center">
            <p class="text-3xl font-display font-bold text-coral">{{ queueCount }}</p>
            <p class="text-xs text-subtle uppercase tracking-wider mt-1">In Queue</p>
          </div>
          <div class="card bg-surface-elevated border border-white/5 p-4 text-center">
            <p class="text-3xl font-display font-bold text-success">{{ presentedCount }}</p>
            <p class="text-xs text-subtle uppercase tracking-wider mt-1">Presented</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
