<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { api } from '@/api/client';
import { useWebSocket } from '@/composables/useWebSocket';
import { useRoom } from '@/composables/useRoom';
import { useTimer } from '@/composables/useTimer';
import QRDropdown from './components/QRDropdown.vue';
import CurrentPresenter from './components/CurrentPresenter.vue';
import UpNext from './components/UpNext.vue';
import WaveEmitter from '@/components/WaveEmitter.vue';
import type { WSMessage } from '@/types';

interface WaveEmitterExpose {
  addWave: () => void;
}

const route = useRoute();
const roomId = computed(() => route.params.roomId as string);
const adminKey = computed(() => (route.query.key as string) || null);

const waveEmitter = ref<WaveEmitterExpose | null>(null);

// Room state
const { currentParticipant, nextParticipant, queueCount, fetchRoom, updateFromWebSocket } = useRoom(roomId);

// Timer state
const timer = useTimer();

// WebSocket
const { isConnected, connect } = useWebSocket(roomId, {
  role: 'presenter',
  onMessage: handleWebSocketMessage,
});

function handleWebSocketMessage(message: WSMessage): void {
  // Update room state
  updateFromWebSocket(message);

  // Handle timer
  timer.handleTimerMessage(message);

  // Handle wave animation
  if (message.type === 'wave_animation') {
    waveEmitter.value?.addWave();
  }
}

// Keyboard controls
useEventListener('keydown', (e: KeyboardEvent) => {
  // Ignore if typing in input
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      if (timer.isRunning.value) {
        api.stopTimer(roomId.value, adminKey.value ?? undefined);
      } else {
        api.startTimer(roomId.value, adminKey.value ?? undefined);
      }
      break;

    case 'ArrowRight':
      e.preventDefault();
      api.nextPresenter(roomId.value, adminKey.value ?? undefined);
      break;

    case 'ArrowLeft':
      e.preventDefault();
      api.previousPresenter(roomId.value, adminKey.value ?? undefined);
      break;
  }
});

onMounted(async () => {
  await fetchRoom();
  connect();
});
</script>

<template>
  <div class="h-screen bg-surface presenter-display flex flex-col relative overflow-hidden">
    <!-- Background ambient -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/4 w-[600px] h-[300px] bg-coral/5 rounded-full blur-[100px]"></div>
      <div class="absolute bottom-0 right-1/4 w-[400px] h-[200px] bg-coral/3 rounded-full blur-[80px]"></div>
    </div>

    <!-- Wave Emitter -->
    <WaveEmitter ref="waveEmitter" />

    <!-- Header -->
    <header class="relative z-20 glass-dark px-8 py-4 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <!-- Room Code -->
        <div class="flex items-center gap-3">
          <span class="room-code text-2xl text-coral">{{ roomId }}</span>
          <div class="flex items-center gap-2">
            <span
              :class="[
                'status-dot',
                isConnected ? 'status-dot-live' : 'status-dot-offline'
              ]"
            ></span>
            <span :class="['text-sm font-medium', isConnected ? 'text-success' : 'text-error']">
              {{ isConnected ? 'Live' : 'Offline' }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <!-- Queue Count -->
        <div class="text-right">
          <p class="text-xs text-subtle uppercase tracking-wider">In Queue</p>
          <p class="text-2xl font-display font-bold text-cream">{{ queueCount }}</p>
        </div>

        <!-- Timer Display (hidden for now) -->
        <!-- <div
          v-if="timer.isRunning.value || timer.remaining.value < timer.duration.value"
          class="px-6 py-2 rounded-xl bg-surface-overlay border border-white/10"
        >
          <p
            :class="[
              'text-3xl font-mono font-bold tabular-nums',
              timer.timerClass.value
            ]"
          >
            {{ timer.displayTime.value }}
          </p>
        </div> -->

        <!-- QR Dropdown -->
        <QRDropdown :room-id="roomId" :admin-key="adminKey" />
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative z-10 flex-1 min-h-0 overflow-hidden">
      <CurrentPresenter
        :participant="currentParticipant"
        :show-need="timer.showNeed.value"
        :timer-progress="timer.progress.value"
        :is-overtime="timer.isOvertime.value"
        :room-id="roomId"
      />
    </main>

    <!-- Footer / Up Next -->
    <footer class="relative z-20">
      <UpNext
        :participant="nextParticipant"
        :timer-running="timer.isRunning.value"
        :queue-count="queueCount"
      />
    </footer>
  </div>
</template>
