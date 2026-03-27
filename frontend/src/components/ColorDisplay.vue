<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

interface Props {
  active: boolean;
  color: string; // hex color to display
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  color: '#000000',
});

const wakeLock = ref<WakeLockSentinel | null>(null);

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock.value = await navigator.wakeLock.request('screen');
    }
  } catch {
    // Wake lock not available or denied
  }
}

function releaseWakeLock() {
  wakeLock.value?.release();
  wakeLock.value = null;
}

onMounted(() => {
  if (props.active) requestWakeLock();
});

onUnmounted(() => {
  releaseWakeLock();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="active"
      class="fixed inset-0 z-[9999]"
      :style="{ backgroundColor: color }"
    />
  </Teleport>
</template>
