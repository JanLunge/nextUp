<script setup lang="ts">
import { ref } from 'vue';

interface Wave {
  id: number;
  x: number;
  y: number;
}

const waves = ref<Wave[]>([]);
let waveId = 0;

function addWave(): void {
  const id = waveId++;
  const x = Math.random() * 80 + 10; // 10-90% of screen
  const y = Math.random() * 40 + 40; // 40-80% of screen (bottom half)

  waves.value.push({ id, x, y });

  // Remove after animation
  setTimeout(() => {
    waves.value = waves.value.filter((w) => w.id !== id);
  }, 2000);
}

defineExpose({ addWave });
</script>

<template>
  <div class="wave-container">
    <span
      v-for="wave in waves"
      :key="wave.id"
      class="wave-emoji"
      :style="{ left: `${wave.x}%`, top: `${wave.y}%` }"
    >
      👋
    </span>
  </div>
</template>

<style scoped>
.wave-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
  overflow: hidden;
}
</style>
