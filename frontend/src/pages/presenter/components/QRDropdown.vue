<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import QrcodeVue from 'qrcode.vue';

interface Props {
  roomId: string;
  adminKey?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  adminKey: null,
});

type QRType = 'audience' | 'admin' | 'timer';

interface QRTypeOption {
  id: QRType;
  label: string;
  icon: string;
  description: string;
}

const isOpen = ref(false);
const selectedType = ref<QRType>('audience');
const dropdownRef = ref<HTMLElement | null>(null);

const baseUrl = computed(() => {
  return window.location.origin;
});

const qrUrls = computed<Record<QRType, string>>(() => ({
  audience: `${baseUrl.value}/room/${props.roomId}/join`,
  admin: `${baseUrl.value}/room/${props.roomId}/admin?key=${props.adminKey}`,
  timer: `${baseUrl.value}/room/${props.roomId}/timer`,
}));

const currentUrl = computed(() => qrUrls.value[selectedType.value]);

const types: QRTypeOption[] = [
  { id: 'audience', label: 'Join', icon: '📱', description: 'For attendees to join' },
  { id: 'admin', label: 'Admin', icon: '🎛️', description: 'Remote controller' },
  { id: 'timer', label: 'Timer', icon: '⏱️', description: 'Speaker display' },
];

const toggleDropdown = (event?: Event) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  isOpen.value = !isOpen.value;
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

const copyUrl = () => {
  navigator.clipboard.writeText(currentUrl.value);
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger Button -->
    <button
      type="button"
      class="w-12 h-12 rounded-xl bg-surface-overlay border border-white/10 flex items-center justify-center hover:bg-slate hover:border-coral/30 transition-all"
      @click="toggleDropdown"
    >
      <svg class="w-6 h-6 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        />
      </svg>
    </button>

    <!-- Dropdown Panel -->
    <div
      v-if="isOpen"
      class="absolute right-0 top-full mt-3 w-80 rounded-2xl bg-surface-elevated border border-white/10 shadow-2xl overflow-hidden animate-scale-in z-50"
      @click.stop
    >
      <!-- Header -->
      <div class="p-4 border-b border-white/5">
        <h3 class="font-display font-bold text-cream">Share QR Code</h3>
        <p class="text-sm text-subtle mt-1">Scan to connect</p>
      </div>

      <!-- Type Selector -->
      <div class="p-3 border-b border-white/5">
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="type in types"
            :key="type.id"
            :class="[
              'p-3 rounded-xl text-center transition-all',
              selectedType === type.id
                ? 'bg-coral text-white'
                : 'bg-surface-overlay text-subtle hover:bg-slate hover:text-cream',
            ]"
            @click="selectedType = type.id"
          >
            <span class="text-xl block mb-1">{{ type.icon }}</span>
            <span class="text-xs font-medium">{{ type.label }}</span>
          </button>
        </div>
      </div>

      <!-- QR Code -->
      <div class="p-6 flex flex-col items-center">
        <div class="p-4 bg-white rounded-xl">
          <QrcodeVue :value="currentUrl" :size="180" level="M" />
        </div>

        <!-- Type Description -->
        <p class="text-sm text-subtle mt-4 text-center">
          {{ types.find((t) => t.id === selectedType)?.description }}
        </p>

        <!-- URL -->
        <div class="mt-4 w-full">
          <div class="flex items-center gap-2 p-2 bg-surface-overlay rounded-lg">
            <code class="text-xs text-cream/70 flex-1 truncate font-mono">
              {{ currentUrl }}
            </code>
            <button class="btn btn-ghost btn-xs text-coral hover:text-coral-light" @click="copyUrl">
              Copy
            </button>
          </div>
        </div>
      </div>

      <!-- Close -->
      <div class="p-3 border-t border-white/5">
        <button class="btn btn-ghost btn-sm w-full" @click="isOpen = false">Close</button>
      </div>
    </div>
  </div>
</template>
