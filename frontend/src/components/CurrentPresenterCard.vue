<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/api/client';
import WaveButton from './WaveButton.vue';
import type { Participant } from '@/types';

interface Props {
  participant: Participant;
  hasWaved?: boolean;
  showWaveButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasWaved: false,
  showWaveButton: true,
});

const emit = defineEmits<{
  wave: [participant: Participant];
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
</script>

<template>
  <div class="card bg-base-100 shadow-lg">
    <div class="card-body">
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Media -->
        <div v-if="mediaUrl" class="w-full md:w-1/2 lg:w-2/5">
          <video
            v-if="isVideo"
            :src="mediaUrl"
            autoplay
            muted
            loop
            playsinline
            class="w-full rounded-lg aspect-video object-cover"
          ></video>
          <img
            v-else
            :src="mediaUrl"
            :alt="participant.project_name"
            class="w-full rounded-lg aspect-video object-cover"
          />
        </div>

        <!-- Info -->
        <div class="flex-1">
          <!-- Profile -->
          <div class="flex items-center gap-4 mb-4">
            <div class="avatar">
              <div class="w-16 rounded-full">
                <img
                  v-if="profileImageUrl"
                  :src="profileImageUrl"
                  :alt="participant.name"
                />
                <div
                  v-else
                  class="bg-neutral text-neutral-content flex items-center justify-center w-full h-full text-xl"
                >
                  {{ participant.name?.charAt(0)?.toUpperCase() }}
                </div>
              </div>
            </div>
            <div>
              <h2 class="text-xl font-bold">{{ participant.name }}</h2>
              <p v-if="participant.tagline" class="text-base-content/70">
                {{ participant.tagline }}
              </p>
            </div>
          </div>

          <!-- Project -->
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-primary">
              {{ participant.project_name }}
            </h3>
            <a
              v-if="participant.project_url"
              :href="participant.project_url"
              target="_blank"
              rel="noopener"
              class="link link-primary text-sm"
            >
              {{ participant.project_url }}
            </a>
          </div>

          <!-- Description -->
          <p class="text-base-content/80 mb-4">
            {{ participant.project_description }}
          </p>

          <!-- Current Need -->
          <div
            v-if="participant.current_need"
            class="p-3 bg-primary/10 border border-primary/20 rounded-lg"
          >
            <span class="font-medium">Looking for:</span>
            <span class="ml-2">{{ participant.current_need }}</span>
          </div>

          <!-- Wave Button -->
          <div v-if="showWaveButton" class="mt-4">
            <WaveButton
              :has-waved="hasWaved"
              :label="`Wave at ${participant.name}`"
              size="lg"
              @wave="emit('wave', participant)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
