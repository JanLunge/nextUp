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
      :accept="accept"
      class="hidden"
      @change="handleFileChange"
    />

    <!-- Preview -->
    <div v-if="previewUrl" class="relative">
      <img
        :src="previewUrl"
        alt="Preview"
        class="w-full h-48 object-cover rounded-lg"
      />
      <button
        type="button"
        class="btn btn-circle btn-sm btn-error absolute top-2 right-2"
        @click="clearUpload"
      >
        ✕
      </button>
    </div>

    <!-- Upload Button -->
    <button
      v-else
      type="button"
      class="btn btn-outline w-full h-32 flex flex-col gap-2"
      :disabled="loading"
      @click="triggerUpload"
    >
      <span v-if="loading" class="loading loading-spinner"></span>
      <template v-else>
        <span class="text-2xl">+</span>
        <span>{{ label }}</span>
      </template>
    </button>

    <!-- Error -->
    <p v-if="error" class="text-error text-sm mt-2">{{ error }}</p>
  </div>
</template>
