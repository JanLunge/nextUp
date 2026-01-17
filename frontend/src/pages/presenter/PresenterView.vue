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
  <div class="min-h-screen bg-base-200 presenter-display flex flex-col">
    <!-- Wave Emitter -->
    <WaveEmitter ref="waveEmitter" />

    <!-- Header -->
    <header class="bg-base-100 shadow-sm px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <span class="font-mono text-lg font-medium">{{ roomId }}</span>
        <div
          :class="[
            'badge',
            isConnected ? 'badge-success' : 'badge-error',
          ]"
        >
          {{ isConnected ? 'Live' : 'Disconnected' }}
        </div>
      </div>

      <div class="flex items-center gap-4">
        <span class="text-base-content/70">
          Queue: <span class="font-semibold">{{ queueCount }}</span> remaining
        </span>
        <QRDropdown :room-id="roomId" :admin-key="adminKey" />
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden">
      <CurrentPresenter
        :participant="currentParticipant"
        :show-need="timer.showNeed.value"
      />
    </main>

    <!-- Footer / Up Next -->
    <footer>
      <UpNext
        :participant="nextParticipant"
        :timer-running="timer.isRunning.value"
      />
    </footer>
  </div>
</template>
