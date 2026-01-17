<script setup lang="ts">
import { watch } from 'vue';
import { useVibrate } from '@vueuse/core';

interface Props {
  show?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
});

const emit = defineEmits<{
  close: [];
}>();

const { vibrate } = useVibrate({ pattern: [200, 100, 200] });

watch(() => props.show, (newVal) => {
  if (newVal) {
    vibrate();
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div class="card bg-base-100 w-80 shadow-2xl next-pulse">
        <div class="card-body items-center text-center">
          <div class="text-6xl mb-4">⚡</div>
          <h2 class="card-title text-2xl">YOU'RE UP NEXT!</h2>
          <p class="text-base-content/70 mt-2">Get ready to present</p>
          <div class="card-actions mt-6">
            <button class="btn btn-primary btn-lg" @click="emit('close')">
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
