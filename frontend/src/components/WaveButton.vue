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

  setTimeout(() => {
    loading.value = false;
  }, 500);
}
</script>

<template>
  <button
    :class="[
      'btn gap-2 font-display font-semibold transition-all duration-200',
      hasWaved
        ? 'bg-success/20 border-success/30 text-success hover:bg-success/25'
        : 'btn-primary',
      size === 'sm' && 'btn-sm',
      size === 'lg' && 'btn-lg',
    ]"
    :disabled="hasWaved || disabled || loading"
    @click.stop="handleWave"
  >
    <span v-if="loading" class="loading loading-spinner loading-sm"></span>
    <template v-else>
      <span class="text-lg">{{ hasWaved ? '✓' : '👋' }}</span>
      <span>{{ hasWaved ? 'Waved' : label }}</span>
    </template>
  </button>
</template>
