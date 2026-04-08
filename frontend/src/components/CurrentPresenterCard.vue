<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/api/client';
import WaveButton from './WaveButton.vue';
import type { Participant } from '@/types';

interface Props {
  participant: Participant;
  hasWaved?: boolean;
  showWaveButton?: boolean;
  isYou?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasWaved: false,
  showWaveButton: true,
  isYou: false,
});

const emit = defineEmits<{
  wave: [participant: Participant];
  click: [participant: Participant];
}>();

const profileImageUrl = computed(() => {
  return api.getUploadUrl(props.participant.profile_image_path);
});

const mediaUrl = computed(() => {
  return api.getUploadUrl(props.participant.presentation_media_path);
});

const isVideo = computed(() => {
  return props.participant.media_type === 'video';
});

function handleClick(): void {
  emit('click', props.participant);
}
</script>

<template>
  <div
    :class="[
      'card bg-surface-elevated border overflow-hidden cursor-pointer hover-lift',
      isYou ? 'border-coral/50 ring-1 ring-coral/30' : 'border-white/5',
    ]"
    @click="handleClick"
  >
    <div class="flex flex-col md:flex-row">
      <!-- Media -->
      <div v-if="mediaUrl" class="w-full md:w-2/5 shrink-0">
        <video
          v-if="isVideo"
          :src="mediaUrl"
          autoplay
          muted
          loop
          playsinline
          class="w-full h-48 md:h-full object-cover"
        ></video>
        <img
          v-else
          :src="mediaUrl"
          :alt="participant.project_name"
          class="w-full h-48 md:h-full object-cover"
        />
      </div>

      <!-- Info -->
      <div class="flex-1 p-5">
        <!-- Profile -->
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 rounded-full overflow-hidden avatar-ring shrink-0">
            <img
              v-if="profileImageUrl"
              :src="profileImageUrl"
              :alt="participant.name"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-coral/20 text-2xl font-display font-bold text-coral"
            >
              {{ participant.name?.charAt(0)?.toUpperCase() }}
            </div>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="font-display text-xl font-bold text-cream truncate">
                {{ participant.name }}
              </h2>
              <span
                v-if="isYou"
                class="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-coral/20 text-coral rounded shrink-0"
                >You</span
              >
            </div>
            <p v-if="participant.tagline" class="text-subtle truncate">
              {{ participant.tagline }}
            </p>
          </div>
        </div>

        <!-- Project -->
        <div class="mb-4">
          <h3 class="font-display text-lg font-bold text-coral">
            {{ participant.project_name }}
          </h3>
          <a
            v-if="participant.project_url"
            :href="participant.project_url"
            target="_blank"
            rel="noopener"
            class="text-sm text-subtle hover:text-cream transition-colors"
            @click.stop
          >
            {{ participant.project_url }}
          </a>
        </div>

        <!-- Description -->
        <p class="text-cream/80 text-sm line-clamp-2 mb-4">
          {{ participant.project_description }}
        </p>

        <!-- Current Need -->
        <div
          v-if="participant.current_need"
          class="p-3 bg-coral/10 border border-coral/20 rounded-xl mb-4"
        >
          <span class="text-xs text-coral font-medium uppercase tracking-wider">Looking for:</span>
          <span class="ml-2 text-sm text-cream">{{ participant.current_need }}</span>
        </div>

        <!-- Wave Button -->
        <WaveButton
          v-if="showWaveButton"
          :has-waved="hasWaved"
          :label="`Wave at ${participant.name}`"
          size="lg"
          class="w-full"
          @wave="emit('wave', participant)"
          @click.stop
        />
      </div>
    </div>
  </div>
</template>
