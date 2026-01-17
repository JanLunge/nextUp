<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/api/client';
import type { Participant } from '@/types';

interface Props {
  participant?: Participant | null;
  timerRunning?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  participant: null,
  timerRunning: false,
});

const profileImageUrl = computed(() => {
  if (!props.participant) return null;
  return api.getUploadUrl(props.participant.profile_image_path);
});
</script>

<template>
  <div class="bg-base-300 p-4 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <span class="text-base-content/60 font-medium">Up next:</span>

      <template v-if="participant">
        <!-- Avatar -->
        <div class="avatar">
          <div class="w-10 rounded-full">
            <img
              v-if="profileImageUrl"
              :src="profileImageUrl"
              :alt="participant.name"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-neutral text-neutral-content"
            >
              {{ participant.name?.charAt(0)?.toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- Info -->
        <div>
          <span class="font-semibold">{{ participant.name }}</span>
          <span class="mx-2">—</span>
          <span class="text-primary">"{{ participant.project_name }}"</span>
        </div>
      </template>

      <span v-else class="text-base-content/40">No one in queue</span>
    </div>

    <!-- Hint -->
    <div v-if="!timerRunning" class="text-base-content/60 text-sm">
      [SPACE to start]
    </div>
  </div>
</template>
