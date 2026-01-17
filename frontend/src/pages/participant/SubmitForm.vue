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
  <div class="min-h-screen bg-surface pb-safe">
    <!-- Header -->
    <header class="glass-dark sticky top-0 z-10">
      <div class="px-4 py-4">
        <div class="flex items-center gap-4">
          <button class="btn btn-ghost btn-sm btn-square" @click="goBack">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="font-display font-bold text-cream">Submit to Present</h1>
            <p class="text-xs text-subtle">Share your project with the room</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Form -->
    <main class="px-4 py-6">
      <div class="max-w-lg mx-auto space-y-6">
        <!-- Prefilled Notice -->
        <div v-if="prefilled" class="p-4 bg-info/10 border border-info/30 rounded-xl animate-fade-up">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-info">Pre-filled from your profile</span>
            </div>
            <button class="btn btn-ghost btn-xs text-info" @click="clearForm">Clear</button>
          </div>
        </div>

        <!-- Section: About You -->
        <section class="card bg-surface-elevated border border-white/5 animate-fade-up">
          <div class="p-5">
            <h2 class="font-display font-bold text-cream mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-coral/20 flex items-center justify-center text-coral text-xs font-bold">1</span>
              About You
            </h2>

            <div class="space-y-4">
              <!-- Profile Picture -->
              <div>
                <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                  Profile Picture
                </label>
                <MediaUpload
                  v-model="profileImagePath"
                  type="profile"
                  label="Upload Photo"
                />
              </div>

              <!-- Name -->
              <div>
                <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                  Your Name <span class="text-coral">*</span>
                </label>
                <input
                  v-model="name"
                  type="text"
                  placeholder="Jane Doe"
                  class="input input-bordered w-full bg-surface-overlay border-white/10"
                />
              </div>

              <!-- Tagline -->
              <div>
                <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                  Tagline
                </label>
                <input
                  v-model="tagline"
                  type="text"
                  placeholder="UX Designer & Founder"
                  class="input input-bordered w-full bg-surface-overlay border-white/10"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Section: Your Project -->
        <section class="card bg-surface-elevated border border-white/5 animate-fade-up delay-150">
          <div class="p-5">
            <h2 class="font-display font-bold text-cream mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-coral/20 flex items-center justify-center text-coral text-xs font-bold">2</span>
              Your Project
            </h2>

            <div class="space-y-4">
              <!-- Project Name -->
              <div>
                <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                  Project Name <span class="text-coral">*</span>
                </label>
                <input
                  v-model="projectName"
                  type="text"
                  placeholder="SnapFlow"
                  class="input input-bordered w-full bg-surface-overlay border-white/10"
                />
              </div>

              <!-- Project URL -->
              <div>
                <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                  Project URL
                </label>
                <input
                  v-model="projectUrl"
                  type="url"
                  placeholder="https://snapflow.io"
                  class="input input-bordered w-full bg-surface-overlay border-white/10"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                  Description <span class="text-coral">*</span>
                </label>
                <textarea
                  v-model="projectDescription"
                  placeholder="An app for quick photo sharing with friends..."
                  class="textarea textarea-bordered w-full h-24 bg-surface-overlay border-white/10"
                ></textarea>
              </div>

              <!-- Presentation Media -->
              <div>
                <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                  Presentation Media
                </label>
                <MediaUpload
                  v-model="presentationMediaPath"
                  type="presentation"
                  label="Upload Image or Video"
                  @update:media-type="mediaType = $event"
                />
                <p class="text-xs text-subtle mt-2">Max 30s video, 10MB. This will be shown on the main display.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Section: Your Ask -->
        <section class="card bg-surface-elevated border border-white/5 animate-fade-up delay-200">
          <div class="p-5">
            <h2 class="font-display font-bold text-cream mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-coral/20 flex items-center justify-center text-coral text-xs font-bold">3</span>
              Your Ask
            </h2>

            <div>
              <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                What do you need?
              </label>
              <textarea
                v-model="currentNeed"
                placeholder="Looking for beta testers for iOS app launch..."
                class="textarea textarea-bordered w-full h-20 bg-surface-overlay border-white/10"
              ></textarea>
              <p class="text-xs text-subtle mt-2">
                This appears during the final third of your presentation time.
              </p>
            </div>
          </div>
        </section>

        <!-- Error -->
        <div v-if="error" class="p-4 bg-error/10 border border-error/30 rounded-xl">
          <p class="text-sm text-error text-center">{{ error }}</p>
        </div>

        <!-- Submit Button -->
        <button
          class="btn btn-primary btn-lg w-full font-display font-bold animate-fade-up delay-300"
          :disabled="loading || !name.trim() || !projectName.trim() || !projectDescription.trim()"
          @click="submit"
        >
          <span v-if="loading" class="loading loading-spinner"></span>
          <span v-else class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Join the Queue
          </span>
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 2rem);
}
</style>
