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
const name = ref('');
const tagline = ref('');
const profileImagePath = ref<string | null>(null);
const projectName = ref('');
const projectDescription = ref('');
const projectUrl = ref('');
const currentNeed = ref('');
const presentationMediaPath = ref<string | null>(null);
const mediaType = ref<'image' | 'video' | null>(null);

const loading = ref(false);
const error = ref<string | null>(null);
const prefilled = ref(false);

// Check if already has submission and prefill from profile
async function checkExistingSubmission(): Promise<void> {
  if (!passphrase.value) {
    router.push({ name: 'join', params: { roomId: roomId.value } });
    return;
  }

  try {
    const result = await api.checkPassphraseInRoom(roomId.value, passphrase.value);
    if (result.has_submission_in_room) {
      router.push({ name: 'mySubmission', params: { roomId: roomId.value } });
      return;
    }

    // Prefill from profile if exists
    if (result.profile_exists && result.profile) {
      name.value = result.profile.name || '';
      tagline.value = result.profile.tagline || '';
      profileImagePath.value = result.profile.profile_image_path || null;
      projectName.value = result.profile.project_name || '';
      projectDescription.value = result.profile.project_description || '';
      projectUrl.value = result.profile.project_url || '';
      currentNeed.value = result.profile.current_need || '';
      presentationMediaPath.value = result.profile.presentation_media_path || null;
      mediaType.value = result.profile.media_type || null;
      prefilled.value = true;
    }
  } catch (e) {
    console.error('Failed to check submission:', e);
  }
}

// Clear prefilled data
function clearForm(): void {
  name.value = '';
  tagline.value = '';
  profileImagePath.value = null;
  projectName.value = '';
  projectDescription.value = '';
  projectUrl.value = '';
  currentNeed.value = '';
  presentationMediaPath.value = null;
  mediaType.value = null;
  prefilled.value = false;
}

// Submit to present
async function submit(): Promise<void> {
  if (!name.value.trim()) {
    error.value = 'Your name is required';
    return;
  }

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
    await api.submitToQueue(roomId.value, {
      passphrase: passphrase.value,
      name: name.value.trim(),
      project_name: projectName.value.trim(),
      project_description: projectDescription.value.trim(),
      project_url: projectUrl.value.trim() || undefined,
      tagline: tagline.value.trim() || undefined,
      current_need: currentNeed.value.trim() || undefined,
      profile_image_path: profileImagePath.value || undefined,
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
          <!-- Prefilled Notice -->
          <div v-if="prefilled" class="alert alert-info mb-4">
            <span>Pre-filled from your previous submission</span>
            <button class="btn btn-sm btn-ghost" @click="clearForm">Clear and start fresh</button>
          </div>

          <!-- Profile Picture -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Profile Picture</span>
            </label>
            <MediaUpload
              v-model="profileImagePath"
              type="profile"
              label="Upload Photo"
            />
          </div>

          <!-- Your Name -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Your Name *</span>
            </label>
            <input
              v-model="name"
              type="text"
              placeholder="Jane Doe"
              class="input input-bordered"
            />
          </div>

          <!-- Tagline -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Tagline</span>
            </label>
            <input
              v-model="tagline"
              type="text"
              placeholder="UX Designer & Founder"
              class="input input-bordered"
            />
          </div>

          <!-- Project Name -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Project Name *</span>
            </label>
            <input
              v-model="projectName"
              type="text"
              placeholder="SnapFlow"
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
              placeholder="https://snapflow.io"
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
              placeholder="An app for quick photo sharing with friends..."
              class="textarea textarea-bordered h-24"
            ></textarea>
          </div>

          <!-- Presentation Media -->
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
            <label class="label">
              <span class="label-text-alt">Max 30s video, 10MB</span>
            </label>
          </div>

          <!-- Current Need -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">What do you need? (Your ask)</span>
            </label>
            <textarea
              v-model="currentNeed"
              placeholder="Looking for beta testers for iOS app launch..."
              class="textarea textarea-bordered h-20"
            ></textarea>
            <label class="label">
              <span class="label-text-alt">Shown during final 1/3 of your presentation</span>
            </label>
          </div>

          <!-- Error -->
          <p v-if="error" class="text-error text-sm mt-2">{{ error }}</p>

          <!-- Submit Button -->
          <div class="card-actions mt-6">
            <button
              class="btn btn-primary w-full"
              :disabled="loading || !name.trim() || !projectName.trim() || !projectDescription.trim()"
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
