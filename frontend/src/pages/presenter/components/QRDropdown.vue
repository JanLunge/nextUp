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
  { id: 'audience', label: 'Audience Join', icon: '📱' },
  { id: 'admin', label: 'Admin Controller', icon: '🎛️' },
  { id: 'timer', label: 'Timer Display', icon: '⏱️' },
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="dropdownRef" class="dropdown dropdown-end">
    <button type="button" class="btn btn-ghost btn-circle" @click="toggleDropdown">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      tabindex="0"
      class="dropdown-content z-50 card card-compact w-80 p-2 shadow-xl bg-base-100"
      @click.stop
    >
      <div class="card-body items-center">
        <!-- Type Selector -->
        <div class="tabs tabs-boxed mb-4">
          <a
            v-for="type in types"
            :key="type.id"
            :class="['tab', selectedType === type.id && 'tab-active']"
            @click="selectedType = type.id"
          >
            {{ type.icon }}
          </a>
        </div>

        <!-- Label -->
        <p class="text-sm font-medium mb-2">
          {{ types.find(t => t.id === selectedType)?.label }}
        </p>

        <!-- QR Code -->
        <div class="bg-white p-3 rounded-lg">
          <QrcodeVue :value="currentUrl" :size="200" level="M" />
        </div>

        <!-- URL -->
        <p class="text-xs text-base-content/60 break-all text-center mt-2">
          {{ currentUrl }}
        </p>

        <button
          class="btn btn-ghost btn-sm mt-2"
          @click="isOpen = false"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
