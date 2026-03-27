<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Props {
  active: boolean;
  color: string; // hex color to display
  participantName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  color: '#000000',
  participantName: '',
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="active"
      class="fixed inset-0 z-[9999] flex items-center justify-center transition-colors duration-150"
      :style="{ backgroundColor: color }"
    >
      <div class="text-center">
        <p
          class="text-2xl font-bold font-display"
          :style="{ color: color === '#FFFFFF' || color === '#ffffff' ? '#000' : '#fff' }"
        >
          {{ participantName }}
        </p>
        <p
          class="text-sm mt-2 opacity-70"
          :style="{ color: color === '#FFFFFF' || color === '#ffffff' ? '#000' : '#fff' }"
        >
          Hold your phone up
        </p>
      </div>
    </div>
  </Teleport>
</template>
