<script setup lang="ts">
import { computed } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { api } from '@/api/client';
import type { Participant } from '@/types';

interface Props {
  participant?: Participant | null;
  showNeed?: boolean;
  timerProgress?: number;
  isOvertime?: boolean;
  roomId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  participant: null,
  showNeed: false,
  timerProgress: 100,
  isOvertime: false,
  roomId: '',
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

const joinUrl = computed(() => {
  return `${window.location.origin}/room/${props.roomId}`;
});
</script>

<template>
  <div v-if="participant" class="h-full flex p-8 lg:p-12 gap-8 lg:gap-12 animate-fade-up">
    <!-- Left: Media Section (larger) -->
    <div class="w-1/2 lg:w-3/5 flex flex-col">
      <!-- Media Container -->
      <div class="flex-1 relative rounded-2xl overflow-hidden bg-surface-elevated border border-white/5">
        <!-- Glow effect on media (disabled for now) -->
        <!-- <div
          v-if="!isOvertime"
          class="absolute inset-0 pointer-events-none"
          :style="{
            background: `radial-gradient(ellipse at center, rgba(255, 107, 74, ${0.1 * (timerProgress / 100)}) 0%, transparent 70%)`
          }"
        ></div> -->

        <!-- Overtime pulse border (disabled for now) -->
        <!-- <div
          v-if="isOvertime"
          class="absolute inset-0 rounded-2xl border-4 border-error/50 animate-pulse pointer-events-none z-10"
        ></div> -->

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
          class="w-full h-full flex items-center justify-center"
        >
          <!-- Large initial as placeholder -->
          <span class="text-[200px] font-display font-bold text-coral/20">
            {{ participant.name?.charAt(0)?.toUpperCase() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Right: Info Section -->
    <div class="w-1/2 lg:w-2/5 flex flex-col justify-center">
      <!-- Profile Section -->
      <div class="flex items-center gap-5 mb-8">
        <div class="relative">
          <!-- Avatar with glow ring -->
          <div class="w-24 h-24 rounded-full overflow-hidden avatar-ring">
            <img
              v-if="profileImageUrl"
              :src="profileImageUrl"
              :alt="participant.name"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-surface-overlay text-4xl font-display font-bold text-coral"
            >
              {{ participant.name?.charAt(0)?.toUpperCase() }}
            </div>
          </div>
        </div>
        <div>
          <h2 class="font-display text-4xl lg:text-5xl font-bold text-cream leading-tight">
            {{ participant.name }}
          </h2>
          <p v-if="participant.tagline" class="text-xl text-subtle mt-1">
            {{ participant.tagline }}
          </p>
        </div>
      </div>

      <!-- Project Info -->
      <div class="space-y-4 mb-8">
        <h3 class="font-display text-3xl lg:text-4xl font-bold text-coral">
          {{ participant.project_name }}
        </h3>
        <a
          v-if="participant.project_url"
          :href="participant.project_url"
          class="inline-flex items-center gap-2 text-subtle hover:text-cream transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {{ participant.project_url }}
        </a>
      </div>

      <!-- Description -->
      <p class="text-lg lg:text-xl text-cream/80 leading-relaxed mb-8">
        {{ participant.project_description }}
      </p>

      <!-- Current Need (fades in during final third) -->
      <div
        v-if="showNeed && participant.current_need"
        class="p-6 rounded-2xl bg-coral/10 border-2 border-coral/30 need-fade-in"
      >
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-full bg-coral/20 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-coral uppercase tracking-wider mb-1">Looking For</p>
            <p class="text-lg text-cream">{{ participant.current_need }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Empty State with QR Code -->
  <div v-else class="w-full h-full flex flex-col items-center justify-center animate-fade-in">
    <div class="text-center">
      <!-- QR Code Container with slow pulse -->
      <div class="relative mb-8">
        <!-- Slow pulsing rings -->
        <div class="absolute -inset-8 rounded-3xl border-2 border-coral/20 pulse-slow"></div>
        <div class="absolute -inset-4 rounded-2xl border-2 border-coral/30 pulse-slow" style="animation-delay: 1s;"></div>

        <!-- QR Code -->
        <div class="relative p-8 bg-surface-elevated rounded-2xl border border-white/10 inline-block">
          <div class="w-[200px] h-[200px]">
            <QrcodeVue :value="joinUrl" :size="200" level="M" render-as="svg" foreground="#FAF7F2" background="transparent" class="block" />
          </div>
        </div>
      </div>

      <!-- Text -->
      <h2 class="font-display text-4xl text-cream mb-3">Scan to Join</h2>
      <p class="text-subtle text-lg mb-2">Submit your project to present</p>
      <p class="room-code text-2xl text-coral">{{ roomId }}</p>
    </div>
  </div>
</template>

<style scoped>
.pulse-slow {
  animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.02);
  }
}
</style>
