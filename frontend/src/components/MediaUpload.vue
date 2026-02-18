<script setup lang="ts">
import { ref, computed } from 'vue';
import { api } from '@/api/client';

interface Props {
  modelValue?: string | null;
  type?: 'profile' | 'presentation';
  accept?: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  type: 'presentation',
  accept: 'image/*,video/*',
  label: 'Upload File',
});

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  'update:mediaType': [value: 'image' | 'video' | null];
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const previewUrl = computed(() => {
  return api.getUploadUrl(props.modelValue);
});

const isVideo = computed(() => {
  if (!props.modelValue) return false;
  return props.modelValue.match(/\.(mp4|webm|mov|avi)$/i) !== null;
});

const acceptTypes = computed(() => {
  if (props.type === 'profile') {
    return 'image/*';
  }
  return props.accept;
});

async function handleFileChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  loading.value = true;
  error.value = null;

  try {
    const result = await api.uploadFile(file, props.type);
    emit('update:modelValue', result.path);
    emit('update:mediaType', result.media_type);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed';
  } finally {
    loading.value = false;
  }
}

function triggerUpload(): void {
  fileInput.value?.click();
}

function clearUpload(): void {
  emit('update:modelValue', null);
  emit('update:mediaType', null);
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}
</script>

<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      :accept="acceptTypes"
      class="hidden"
      @change="handleFileChange"
    />

    <!-- Preview -->
    <div v-if="previewUrl" class="relative">
      <div
        :class="[
          'rounded-xl overflow-hidden bg-surface-overlay border border-white/10',
          type === 'profile' ? 'w-24 h-24' : 'w-full aspect-video',
        ]"
      >
        <video
          v-if="isVideo"
          :src="previewUrl"
          class="w-full h-full object-cover"
          muted
          playsinline
        ></video>
        <img v-else :src="previewUrl" alt="Preview" class="w-full h-full object-cover" />
      </div>
      <!-- Remove button -->
      <button
        type="button"
        class="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/80 transition-colors"
        @click="clearUpload"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Upload Button -->
    <button
      v-else
      type="button"
      :class="[
        'border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center gap-3 text-subtle hover:border-coral/50 hover:text-coral transition-all',
        type === 'profile' ? 'w-24 h-24' : 'w-full py-8',
      ]"
      :disabled="loading"
      @click="triggerUpload"
    >
      <span v-if="loading" class="loading loading-spinner loading-sm"></span>
      <template v-else>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <span v-if="type !== 'profile'" class="text-sm font-medium">{{ label }}</span>
      </template>
    </button>

    <!-- Error -->
    <p v-if="error" class="text-error text-xs mt-2">{{ error }}</p>
  </div>
</template>
