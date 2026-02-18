<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/api/client';
import type { Participant } from '@/types';

interface Props {
  participant?: Participant | null;
  timerRunning?: boolean;
  queueCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  participant: null,
  timerRunning: false,
  queueCount: 0,
});

const profileImageUrl = computed(() => {
  if (!props.participant) return null;
  return api.getUploadUrl(props.participant.profile_image_path);
});
</script>

<template>
  <div class="glass-dark px-8 py-5 flex items-center justify-between">
    <div class="flex items-center gap-6">
      <!-- Up Next Label -->
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
        </svg>
        <span class="text-sm font-medium text-subtle uppercase tracking-wider">Up Next</span>
      </div>

      <template v-if="participant">
        <!-- Divider -->
        <div class="w-px h-8 bg-white/10"></div>

        <!-- Avatar -->
        <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-coral/30">
          <img
            v-if="profileImageUrl"
            :src="profileImageUrl"
            :alt="participant.name"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center bg-surface-overlay text-lg font-display font-bold text-coral"
          >
            {{ participant.name?.charAt(0)?.toUpperCase() }}
          </div>
        </div>

        <!-- Info -->
        <div>
          <p class="font-display font-bold text-lg text-cream">{{ participant.name }}</p>
          <p class="text-coral text-sm">"{{ participant.project_name }}"</p>
        </div>
      </template>

      <template v-else>
        <div class="w-px h-8 bg-white/10"></div>
        <p class="text-subtle">
          {{ queueCount > 0 ? 'Preparing next presenter...' : 'No one in queue' }}
        </p>
      </template>
    </div>

    <!-- Keyboard Hint -->
    <div class="flex items-center gap-6">
      <div v-if="!timerRunning && participant" class="flex items-center gap-3 text-subtle">
        <kbd
          class="px-3 py-1.5 rounded-lg bg-surface-overlay border border-white/10 text-sm font-mono"
        >
          SPACE
        </kbd>
        <span class="text-sm">to start timer</span>
      </div>

      <!-- Queue indicator -->
      <div
        v-if="queueCount > 1"
        class="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-overlay border border-white/5"
      >
        <span class="text-coral font-display font-bold">+{{ queueCount - 1 }}</span>
        <span class="text-sm text-subtle">more in queue</span>
      </div>
    </div>
  </div>
</template>
