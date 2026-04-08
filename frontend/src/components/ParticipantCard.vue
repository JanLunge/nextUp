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
  isYou?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasWaved: false,
  showWaveButton: true,
  compact: false,
  isYou: false,
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
    :class="[
      'card bg-surface-elevated border cursor-pointer hover-lift',
      isYou ? 'border-coral/50 ring-1 ring-coral/30' : 'border-white/5',
    ]"
    @click="handleClick"
  >
    <div :class="['p-4', compact ? 'py-3' : '']">
      <div class="flex items-start gap-4">
        <!-- Profile Image -->
        <div class="shrink-0 relative">
          <div :class="['rounded-full overflow-hidden', compact ? 'w-10 h-10' : 'w-12 h-12']">
            <img
              v-if="profileImageUrl"
              :src="profileImageUrl"
              :alt="participant.name"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              :class="[
                'w-full h-full flex items-center justify-center bg-coral/20 text-coral font-display font-bold',
                compact ? 'text-sm' : 'text-lg',
              ]"
            >
              {{ participant.name?.charAt(0)?.toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-display font-bold text-cream truncate">{{ participant.name }}</h3>
            <span
              v-if="isYou"
              class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-coral/20 text-coral rounded"
              >You</span
            >
          </div>
          <p v-if="participant.tagline && !compact" class="text-sm text-subtle truncate">
            {{ participant.tagline }}
          </p>
          <p class="text-sm font-medium text-coral truncate">
            {{ participant.project_name }}
          </p>
          <a
            v-if="participant.project_url && !compact"
            :href="participant.project_url"
            target="_blank"
            rel="noopener"
            class="text-xs text-subtle hover:text-cream transition-colors truncate inline-block"
            @click.stop
          >
            {{ participant.project_url }}
          </a>
        </div>

        <!-- Wave Button -->
        <WaveButton
          v-if="showWaveButton"
          :has-waved="hasWaved"
          :size="compact ? 'sm' : 'md'"
          @wave="emit('wave', participant)"
          @click.stop
        />
      </div>

      <!-- Current Need -->
      <div
        v-if="participant.current_need && !compact"
        class="mt-3 p-3 bg-coral/5 border border-coral/10 rounded-xl"
      >
        <span class="text-xs text-coral font-medium uppercase tracking-wider">Looking for:</span>
        <span class="ml-2 text-sm text-cream/80">{{ participant.current_need }}</span>
      </div>
    </div>
  </div>
</template>
