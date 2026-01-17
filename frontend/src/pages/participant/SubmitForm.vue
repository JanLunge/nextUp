<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { usePassphrase } from '@/composables/usePassphrase';
import MediaUpload from '@/components/MediaUpload.vue';

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);

const { passphrase } = usePassphrase();

// Form state
const projectName = ref('');
const projectDescription = ref('');
const projectUrl = ref('');
const tagline = ref('');
const currentNeed = ref('');
const presentationMediaPath = ref<string | null>(null);
const mediaType = ref<'image' | 'video' | null>(null);

const loading = ref(false);
const error = ref<string | null>(null);

// Check if already has submission
async function checkExistingSubmission(): Promise<void> {
  if (!passphrase.value) {
    router.push({ name: 'join', params: { roomId: roomId.value } });
    return;
  }

  try {
    const result = await api.checkPassphraseInRoom(roomId.value, passphrase.value);
    if (result.has_submission_in_room) {
      router.push({ name: 'mySubmission', params: { roomId: roomId.value } });
    }
  } catch (e) {
    console.error('Failed to check submission:', e);
  }
}

// Submit to present
async function submit(): Promise<void> {
  if (!projectName.value.trim() || !projectDescription.value.trim()) {
    error.value = 'Project name and description are required';
    return;
  }

  if (!passphrase.value) {
    error.value = 'You need to join the room first';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    await api.createParticipant(roomId.value, passphrase.value, {
      project_name: projectName.value.trim(),
      project_description: projectDescription.value.trim(),
      project_url: projectUrl.value.trim() || undefined,
      tagline: tagline.value.trim() || undefined,
      current_need: currentNeed.value.trim() || undefined,
      presentation_media_path: presentationMediaPath.value || undefined,
      media_type: mediaType.value || undefined,
    });

    router.push({ name: 'mySubmission', params: { roomId: roomId.value } });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to submit';
  } finally {
    loading.value = false;
  }
}

// Go back
function goBack(): void {
  router.push({ name: 'roomView', params: { roomId: roomId.value } });
}

onMounted(() => {
  checkExistingSubmission();
});
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Header -->
    <header class="bg-base-100 shadow-sm">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center gap-4">
          <button class="btn btn-ghost btn-sm" @click="goBack">
            ← Back
          </button>
          <h1 class="font-semibold">Submit to Present</h1>
        </div>
      </div>
    </header>

    <!-- Form -->
    <main class="container mx-auto px-4 py-6">
      <div class="card bg-base-100 shadow-lg max-w-lg mx-auto">
        <div class="card-body">
          <!-- Project Name -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Project Name *</span>
            </label>
            <input
              v-model="projectName"
              type="text"
              placeholder="My Awesome Project"
              class="input input-bordered"
            />
          </div>

          <!-- Tagline -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Your Tagline</span>
            </label>
            <input
              v-model="tagline"
              type="text"
              placeholder="Software Engineer at Company"
              class="input input-bordered"
            />
          </div>

          <!-- Project URL -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Project URL</span>
            </label>
            <input
              v-model="projectUrl"
              type="url"
              placeholder="https://github.com/you/project"
              class="input input-bordered"
            />
          </div>

          <!-- Project Description -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Description *</span>
            </label>
            <textarea
              v-model="projectDescription"
              placeholder="Tell everyone about your project..."
              class="textarea textarea-bordered h-24"
            ></textarea>
          </div>

          <!-- Current Need -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Looking for (shown during final 1/3 of timer)</span>
            </label>
            <input
              v-model="currentNeed"
              type="text"
              placeholder="Feedback, collaborators, beta testers..."
              class="input input-bordered"
            />
          </div>

          <!-- Media Upload -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Presentation Media (image or video)</span>
            </label>
            <MediaUpload
              v-model="presentationMediaPath"
              type="presentation"
              label="Upload Image or Video"
              @update:media-type="mediaType = $event"
            />
          </div>

          <!-- Error -->
          <p v-if="error" class="text-error text-sm mt-2">{{ error }}</p>

          <!-- Submit Button -->
          <div class="card-actions mt-6">
            <button
              class="btn btn-primary w-full"
              :disabled="loading || !projectName.trim() || !projectDescription.trim()"
              @click="submit"
            >
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              <span v-else>Submit to Queue</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
