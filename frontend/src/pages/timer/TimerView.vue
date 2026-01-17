<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useWebSocket } from '@/composables/useWebSocket';
import { useTimer } from '@/composables/useTimer';
import WaveEmitter from '@/components/WaveEmitter.vue';
import type { WSMessage } from '@/types';

interface WaveEmitterExpose {
  addWave: () => void;
}

const route = useRoute();
const roomId = computed(() => route.params.roomId as string);

const waveEmitter = ref<WaveEmitterExpose | null>(null);

// Timer state
const timer = useTimer();

// WebSocket
const { isConnected, connect } = useWebSocket(roomId, {
  role: 'timer',
  onMessage: handleWebSocketMessage,
});

function handleWebSocketMessage(message: WSMessage): void {
  timer.handleTimerMessage(message);

  // Handle wave animation
  if (message.type === 'wave_animation') {
    waveEmitter.value?.addWave();
  }
}

onMounted(() => {
  connect();
});
</script>

<template>
  <div
    :class="[
      'min-h-screen flex flex-col items-center justify-center p-8',
      timer.isOvertime.value ? 'bg-error/20' : 'bg-base-200',
    ]"
  >
    <!-- Wave Emitter -->
    <WaveEmitter ref="waveEmitter" />

    <!-- Connection Status -->
    <div class="absolute top-4 right-4">
      <div
        :class="[
          'badge',
          isConnected ? 'badge-success' : 'badge-error',
        ]"
      >
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </div>
    </div>

    <!-- Overtime Label -->
    <div
      v-if="timer.isOvertime.value"
      class="text-error text-2xl font-bold mb-4 animate-pulse"
    >
      OVERTIME
    </div>

    <!-- Timer Display -->
    <div
      :class="[
        'text-9xl font-mono font-bold tabular-nums transition-colors duration-300',
        timer.timerClass.value,
      ]"
    >
      {{ timer.displayTime.value }}
    </div>

    <!-- Progress Bar -->
    <div class="w-full max-w-md mt-8">
      <progress
        :class="[
          'progress w-full h-4',
          timer.isOvertime.value ? 'progress-error' :
          timer.remaining.value <= 10 ? 'progress-error' :
          timer.remaining.value <= 20 ? 'progress-warning' :
          'progress-success',
        ]"
        :value="timer.progress.value"
        max="100"
      ></progress>
    </div>

    <!-- Status -->
    <p class="mt-8 text-base-content/60 text-lg">
      <template v-if="!timer.isRunning.value">
        Waiting to start...
      </template>
      <template v-else-if="timer.isOvertime.value">
        Time's up!
      </template>
      <template v-else>
        {{ timer.remaining.value }} seconds remaining
      </template>
    </p>
  </div>
</template>
