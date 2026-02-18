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

// Background color based on timer state
const bgClass = computed(() => {
  if (timer.isOvertime.value) return 'bg-error/10';
  if (!timer.isRunning.value) return 'bg-surface';
  if (timer.remaining.value <= 10) return 'bg-error/5';
  if (timer.remaining.value <= 20) return 'bg-warning/5';
  return 'bg-success/5';
});

onMounted(() => {
  connect();
});
</script>

<template>
  <div
    :class="[
      'min-h-screen flex flex-col items-center justify-center p-8 transition-colors duration-500 relative overflow-hidden',
      bgClass,
    ]"
  >
    <!-- Wave Emitter -->
    <WaveEmitter ref="waveEmitter" />

    <!-- Background glow effect -->
    <div class="absolute inset-0 pointer-events-none">
      <div
        v-if="timer.isOvertime.value"
        class="absolute inset-0 bg-gradient-radial from-error/20 to-transparent animate-pulse"
      ></div>
      <div
        v-else-if="timer.remaining.value <= 10 && timer.isRunning.value"
        class="absolute inset-0 bg-gradient-radial from-error/10 to-transparent"
      ></div>
      <div
        v-else-if="timer.remaining.value <= 20 && timer.isRunning.value"
        class="absolute inset-0 bg-gradient-radial from-warning/10 to-transparent"
      ></div>
      <div
        v-else-if="timer.isRunning.value"
        class="absolute inset-0 bg-gradient-radial from-success/10 to-transparent"
      ></div>
    </div>

    <!-- Connection Status -->
    <div class="absolute top-6 right-6 z-20">
      <div class="flex items-center gap-2 px-4 py-2 rounded-full glass-dark">
        <span
          :class="['status-dot', isConnected ? 'status-dot-live' : 'status-dot-offline']"
        ></span>
        <span :class="['text-sm font-medium', isConnected ? 'text-success' : 'text-error']">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </span>
      </div>
    </div>

    <!-- Room Code -->
    <div class="absolute top-6 left-6 z-20">
      <div class="px-4 py-2 rounded-full glass-dark">
        <span class="room-code text-coral">{{ roomId }}</span>
      </div>
    </div>

    <!-- Main Timer Content -->
    <div class="relative z-10 text-center">
      <!-- Overtime Label -->
      <div v-if="timer.isOvertime.value" class="mb-6 animate-fade-up">
        <div
          class="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-error/20 border border-error/30"
        >
          <span class="w-3 h-3 rounded-full bg-error animate-pulse"></span>
          <span class="font-display text-2xl font-bold text-error uppercase tracking-wider"
            >Overtime</span
          >
        </div>
      </div>

      <!-- Timer Display -->
      <div
        :class="[
          'font-mono font-bold tabular-nums leading-none transition-all duration-300',
          timer.timerClass.value,
          timer.isOvertime.value ? 'text-[12rem] md:text-[16rem]' : 'text-[14rem] md:text-[20rem]',
        ]"
      >
        {{ timer.displayTime.value }}
      </div>

      <!-- Progress Ring (circular) -->
      <div class="mt-12 flex justify-center">
        <div class="relative w-64 h-4">
          <!-- Background track -->
          <div class="absolute inset-0 rounded-full bg-surface-elevated overflow-hidden">
            <!-- Progress fill -->
            <div
              :class="[
                'h-full rounded-full transition-all duration-300',
                timer.isOvertime.value
                  ? 'bg-error'
                  : timer.remaining.value <= 10
                    ? 'bg-error'
                    : timer.remaining.value <= 20
                      ? 'bg-warning'
                      : 'bg-success',
              ]"
              :style="{ width: `${timer.progress.value}%` }"
            ></div>
          </div>
          <!-- Glow effect -->
          <div
            v-if="timer.isRunning.value"
            :class="[
              'absolute inset-0 rounded-full blur-md opacity-50',
              timer.isOvertime.value
                ? 'bg-error'
                : timer.remaining.value <= 10
                  ? 'bg-error'
                  : timer.remaining.value <= 20
                    ? 'bg-warning'
                    : 'bg-success',
            ]"
            :style="{ width: `${timer.progress.value}%` }"
          ></div>
        </div>
      </div>

      <!-- Status Text -->
      <p class="mt-8 text-xl text-subtle font-medium">
        <template v-if="!timer.isRunning.value && timer.remaining.value === timer.duration.value">
          Waiting to start...
        </template>
        <template v-else-if="timer.isOvertime.value"> Time's up! </template>
        <template v-else> {{ timer.remaining.value }} seconds remaining </template>
      </p>
    </div>

    <!-- Keyboard hints (visible when not running) -->
    <div
      v-if="!timer.isRunning.value && timer.remaining.value === timer.duration.value"
      class="absolute bottom-8 left-1/2 -translate-x-1/2"
    >
      <div class="flex items-center gap-4 text-subtle">
        <kbd class="px-4 py-2 rounded-lg glass-dark text-sm font-mono">SPACE</kbd>
        <span>to start</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-gradient-radial {
  background: radial-gradient(
    ellipse at center,
    var(--tw-gradient-from) 0%,
    var(--tw-gradient-to) 70%
  );
}
</style>
