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

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      vibrate();
    }
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
      >
        <div
          class="card bg-surface-elevated border border-coral/30 w-full max-w-sm next-pulse glow-coral animate-scale-in"
        >
          <div class="p-8 text-center">
            <!-- Icon -->
            <div
              class="w-20 h-20 mx-auto mb-6 rounded-full bg-coral/20 flex items-center justify-center"
            >
              <span class="text-5xl">⚡</span>
            </div>

            <!-- Title -->
            <h2 class="font-display text-3xl font-bold text-coral mb-2">YOU'RE UP NEXT!</h2>
            <p class="text-subtle mb-8">Get ready to take the stage</p>

            <!-- Button -->
            <button
              class="btn btn-primary btn-lg w-full font-display font-bold"
              @click="emit('close')"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
