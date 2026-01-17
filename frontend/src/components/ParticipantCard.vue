<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/api/client';
import WaveButton from './WaveButton.vue';
import type { Participant } from '@/types';

interface Props {
  participant: Participant;
  hasWaved?: boolean;
  showWaveButton?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasWaved: false,
  showWaveButton: true,
  compact: false,
});

const emit = defineEmits<{
  wave: [participant: Participant];
  click: [participant: Participant];
}>();

const profileImageUrl = computed(() => {
  return api.getUploadUrl(props.participant.profile_image_path);
});

function handleClick(): void {
  emit('click', props.participant);
}
</script>

<template>
  <div
    class="card bg-base-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    @click="handleClick"
  >
    <div class="card-body p-4">
      <div class="flex items-start gap-3">
        <!-- Profile Image -->
        <div class="avatar">
          <div :class="compact ? 'w-10 rounded-full' : 'w-12 rounded-full'">
            <img
              v-if="profileImageUrl"
              :src="profileImageUrl"
              :alt="participant.name"
            />
            <div
              v-else
              class="bg-neutral text-neutral-content flex items-center justify-center w-full h-full"
            >
              {{ participant.name?.charAt(0)?.toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold truncate">{{ participant.name }}</h3>
          <p v-if="participant.tagline && !compact" class="text-sm text-base-content/70 truncate">
            {{ participant.tagline }}
          </p>
          <p class="text-sm font-medium text-primary truncate">
            {{ participant.project_name }}
          </p>
          <p v-if="participant.project_url && !compact" class="text-xs text-base-content/60 truncate">
            <a
              :href="participant.project_url"
              target="_blank"
              rel="noopener"
              class="link link-hover"
              @click.stop
            >
              {{ participant.project_url }}
            </a>
          </p>
        </div>

        <!-- Wave Button -->
        <WaveButton
          v-if="showWaveButton"
          :has-waved="hasWaved"
          size="sm"
          @wave="emit('wave', participant)"
          @click.stop
        />
      </div>

      <!-- Current Need -->
      <div
        v-if="participant.current_need && !compact"
        class="mt-2 p-2 bg-base-200 rounded-lg text-sm"
      >
        <span class="text-base-content/70">Looking for:</span>
        <span class="ml-1">{{ participant.current_need }}</span>
      </div>
    </div>
  </div>
</template>
