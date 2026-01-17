<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  hasWaved?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  hasWaved: false,
  disabled: false,
  size: 'md',
  label: 'Wave',
});

const emit = defineEmits<{
  wave: [];
}>();

const loading = ref(false);

async function handleWave(): Promise<void> {
  if (props.hasWaved || props.disabled || loading.value) return;

  loading.value = true;
  emit('wave');

  // Reset loading after a short delay
  setTimeout(() => {
    loading.value = false;
  }, 500);
}
</script>

<template>
  <button
    :class="[
      'btn gap-2',
      hasWaved ? 'btn-ghost' : 'btn-primary',
      size === 'sm' && 'btn-sm',
      size === 'lg' && 'btn-lg',
    ]"
    :disabled="hasWaved || disabled || loading"
    @click="handleWave"
  >
    <span v-if="loading" class="loading loading-spinner loading-sm"></span>
    <template v-else>
      <span>{{ hasWaved ? '✓' : '👋' }}</span>
      <span>{{ hasWaved ? 'Waved' : label }}</span>
    </template>
  </button>
</template>
