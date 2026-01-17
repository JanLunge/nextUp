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
  <div class="min-h-screen bg-base-200 p-4">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center min-h-screen gap-4">
      <div class="alert alert-error max-w-sm">
        <span>{{ error }}</span>
      </div>
      <button class="btn btn-ghost" @click="router.push('/')">
        Go Home
      </button>
    </div>

    <!-- Admin Controller -->
    <div v-else-if="isValid" class="max-w-md mx-auto">
      <!-- Header -->
      <div class="card bg-base-100 shadow-lg mb-4">
        <div class="card-body p-4">
          <div class="flex items-center justify-between">
            <h1 class="text-lg font-bold flex items-center gap-2">
              Admin Controller
            </h1>
            <div
              :class="[
                'badge badge-sm',
                isConnected ? 'badge-success' : 'badge-error',
              ]"
            >
              {{ isConnected ? 'Live' : 'Offline' }}
            </div>
          </div>
          <p class="text-sm text-base-content/70 font-mono">{{ roomId }}</p>
        </div>
      </div>

      <!-- Current / Next -->
      <div class="card bg-base-100 shadow-lg mb-4">
        <div class="card-body p-4">
          <div class="space-y-2">
            <p>
              <span class="text-base-content/70">Now:</span>
              <span class="font-semibold ml-2">
                {{ currentParticipant?.name || 'No one' }}
              </span>
              <span v-if="currentParticipant" class="text-primary ml-1">
                — {{ currentParticipant.project_name }}
              </span>
            </p>
            <p>
              <span class="text-base-content/70">Next:</span>
              <span class="font-semibold ml-2">
                {{ nextParticipant?.name || 'No one' }}
              </span>
              <span v-if="nextParticipant" class="text-primary ml-1">
                — {{ nextParticipant.project_name }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Timer Display -->
      <div class="card bg-base-100 shadow-lg mb-4">
        <div class="card-body items-center p-6">
          <!-- Overtime Label -->
          <div
            v-if="timer.isOvertime.value"
            class="badge badge-error badge-lg mb-2"
          >
            OVERTIME
          </div>

          <!-- Time -->
          <div
            :class="[
              'text-5xl font-mono font-bold tabular-nums',
              timer.timerClass.value,
            ]"
          >
            {{ timer.displayTime.value }}
          </div>

          <!-- Progress -->
          <progress
            :class="[
              'progress w-full h-2 mt-4',
              timer.isOvertime.value ? 'progress-error' :
              timer.remaining.value <= 10 ? 'progress-error' :
              timer.remaining.value <= 20 ? 'progress-warning' :
              'progress-success',
            ]"
            :value="timer.progress.value"
            max="100"
          ></progress>
        </div>
      </div>

      <!-- Navigation Controls -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <button class="btn btn-lg" @click="goPrevious">
          Prev
        </button>
        <button class="btn btn-lg btn-primary" @click="goNext">
          Next
        </button>
      </div>

      <!-- Timer Controls -->
      <div class="card bg-base-100 shadow-lg mb-4">
        <div class="card-body p-4">
          <button
            class="btn btn-lg btn-success w-full mb-2"
            :disabled="timer.isRunning.value"
            @click="startTimer"
          >
            Start Timer
          </button>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="btn"
              :disabled="!timer.isRunning.value"
              @click="stopTimer"
            >
              Stop
            </button>
            <button class="btn" @click="restartTimer">
              Restart
            </button>
          </div>
        </div>
      </div>

      <!-- Queue Status -->
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body p-4">
          <h3 class="font-semibold mb-2">Queue Status</h3>
          <div class="stats stats-vertical w-full">
            <div class="stat py-2">
              <div class="stat-title">Remaining</div>
              <div class="stat-value text-2xl">{{ queueCount }}</div>
            </div>
            <div class="stat py-2">
              <div class="stat-title">Presented</div>
              <div class="stat-value text-2xl">{{ presentedCount }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
