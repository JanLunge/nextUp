<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/api/client';
import type { Participant } from '@/types';

interface Props {
  participant?: Participant | null;
  showNeed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  participant: null,
  showNeed: false,
});

const profileImageUrl = computed(() => {
  if (!props.participant) return null;
  return api.getUploadUrl(props.participant.profile_image_path);
});

const mediaUrl = computed(() => {
  if (!props.participant) return null;
  return api.getUploadUrl(props.participant.presentation_media_path);
});

const isVideo = computed(() => {
  return props.participant?.media_type === 'video';
});
</script>

<template>
  <div v-if="participant" class="flex gap-8 p-8">
    <!-- Media Section -->
    <div class="w-1/2">
      <div class="aspect-video bg-base-300 rounded-xl overflow-hidden">
        <video
          v-if="isVideo && mediaUrl"
          :src="mediaUrl"
          autoplay
          muted
          loop
          playsinline
          class="w-full h-full object-cover"
        ></video>
        <img
          v-else-if="mediaUrl"
          :src="mediaUrl"
          :alt="participant.project_name"
          class="w-full h-full object-cover"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-base-content/40"
        >
          No media
        </div>
      </div>
    </div>

    <!-- Info Section -->
    <div class="w-1/2 flex flex-col justify-center">
      <!-- Profile -->
      <div class="flex items-center gap-4 mb-6">
        <div class="avatar">
          <div class="w-20 rounded-full bg-base-300">
            <img
              v-if="profileImageUrl"
              :src="profileImageUrl"
              :alt="participant.name"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-3xl bg-neutral text-neutral-content"
            >
              {{ participant.name?.charAt(0)?.toUpperCase() }}
            </div>
          </div>
        </div>
        <div>
          <h2 class="text-3xl font-bold">{{ participant.name }}</h2>
          <p v-if="participant.tagline" class="text-xl text-base-content/70">
            {{ participant.tagline }}
          </p>
        </div>
      </div>

      <!-- Project -->
      <div class="mb-4">
        <h3 class="text-2xl font-semibold">{{ participant.project_name }}</h3>
        <a
          v-if="participant.project_url"
          :href="participant.project_url"
          class="text-primary hover:underline"
        >
          {{ participant.project_url }}
        </a>
      </div>

      <!-- Description -->
      <p class="text-lg text-base-content/80 mb-6">
        {{ participant.project_description }}
      </p>

      <!-- Current Need (fades in) -->
      <div
        v-if="showNeed && participant.current_need"
        class="p-4 bg-primary/10 border-2 border-primary/30 rounded-xl need-fade-in"
      >
        <p class="text-lg">
          <span class="font-semibold">Looking for:</span>
          <span class="ml-2">{{ participant.current_need }}</span>
        </p>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else class="flex items-center justify-center h-full text-base-content/40 text-2xl">
    No presenter yet
  </div>
</template>
