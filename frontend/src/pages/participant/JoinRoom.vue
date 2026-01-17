<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { usePassphrase } from '@/composables/usePassphrase';
import type { Room } from '@/types';

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);

const { passphrase: storedPassphrase, setPassphrase } = usePassphrase();

// Form state
const name = ref('');
const passphraseInput = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const roomInfo = ref<Room | null>(null);

// Join confirmation
const showConfirmation = ref(false);
const newPassphrase = ref<string | null>(null);

// Fetch room info
async function fetchRoomInfo(): Promise<void> {
  try {
    roomInfo.value = await api.getRoom(roomId.value);
  } catch (e) {
    error.value = 'Room not found';
  }
}

// Join as new user
async function joinAsNew(): Promise<void> {
  if (!name.value.trim()) {
    error.value = 'Name is required';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const result = await api.createProfile(name.value.trim());
    newPassphrase.value = result.passphrase;
    setPassphrase(result.passphrase);
    showConfirmation.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create profile';
  } finally {
    loading.value = false;
  }
}

// Join with passphrase
async function joinWithPassphrase(): Promise<void> {
  if (!passphraseInput.value.trim()) {
    error.value = 'Passphrase is required';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const result = await api.checkPassphraseInRoom(roomId.value, passphraseInput.value.trim());

    if (!result.profile_exists) {
      error.value = 'Invalid passphrase';
      return;
    }

    setPassphrase(passphraseInput.value.trim());

    if (result.has_submission_in_room) {
      router.push({ name: 'mySubmission', params: { roomId: roomId.value } });
    } else {
      router.push({ name: 'roomView', params: { roomId: roomId.value } });
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to validate passphrase';
  } finally {
    loading.value = false;
  }
}

// Continue to room after confirmation
function continueToRoom(): void {
  router.push({ name: 'roomView', params: { roomId: roomId.value } });
}

// Copy passphrase
function copyPassphrase(): void {
  if (newPassphrase.value) {
    navigator.clipboard.writeText(newPassphrase.value);
  }
}

onMounted(() => {
  fetchRoomInfo();

  // Check if already has stored passphrase
  if (storedPassphrase.value) {
    passphraseInput.value = storedPassphrase.value;
  }
});
</script>

<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <!-- Join Confirmation -->
    <div v-if="showConfirmation" class="card bg-base-100 w-full max-w-md shadow-xl">
      <div class="card-body items-center text-center">
        <div class="text-5xl mb-4">✅</div>
        <h2 class="card-title">Welcome, {{ name }}!</h2>

        <div class="w-full mt-4">
          <p class="text-sm text-base-content/70 mb-2">Your passphrase:</p>
          <div class="bg-base-200 rounded-lg p-4 flex items-center justify-between gap-2">
            <code class="font-mono text-lg">{{ newPassphrase }}</code>
            <button class="btn btn-ghost btn-sm" @click="copyPassphrase">
              Copy
            </button>
          </div>
        </div>

        <div class="alert alert-warning mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="text-sm">Save this to rejoin later or reuse your profile!</span>
        </div>

        <div class="card-actions mt-6 w-full">
          <button class="btn btn-primary w-full" @click="continueToRoom">
            Enter Room
          </button>
        </div>
      </div>
    </div>

    <!-- Join Form -->
    <div v-else class="card bg-base-100 w-full max-w-md shadow-xl">
      <div class="card-body">
        <h1 class="card-title text-2xl justify-center mb-2">
          Presentation Queue
        </h1>

        <!-- Room Code -->
        <div class="bg-base-200 rounded-lg p-3 text-center mb-4">
          <p class="text-sm text-base-content/70">Room code</p>
          <p class="font-mono text-lg font-semibold">{{ roomId }}</p>
        </div>

        <!-- Room Status -->
        <div v-if="roomInfo" class="text-sm text-base-content/70 text-center mb-4">
          <p v-if="roomInfo.current_participant">
            Currently presenting: <span class="font-medium">{{ roomInfo.current_participant.name }}</span>
          </p>
          <p>In queue: <span class="font-medium">{{ roomInfo.queue_count }}</span> people</p>
        </div>

        <!-- Join as New -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Your Name *</span>
          </label>
          <input
            v-model="name"
            type="text"
            placeholder="John Smith"
            class="input input-bordered"
            @keyup.enter="joinAsNew"
          />
        </div>

        <button
          class="btn btn-primary w-full"
          :disabled="loading || !name.trim()"
          @click="joinAsNew"
        >
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          <span v-else>Join Room</span>
        </button>

        <!-- Divider -->
        <div class="divider">or</div>

        <!-- Join with Passphrase -->
        <p class="text-sm text-base-content/70 mb-2">Have a passphrase?</p>
        <div class="form-control mb-4">
          <input
            v-model="passphraseInput"
            type="text"
            placeholder="apple-mountain-river"
            class="input input-bordered font-mono"
            @keyup.enter="joinWithPassphrase"
          />
        </div>

        <button
          class="btn btn-outline w-full"
          :disabled="loading || !passphraseInput.trim()"
          @click="joinWithPassphrase"
        >
          Join with Passphrase
        </button>

        <!-- Error -->
        <p v-if="error" class="text-error text-sm mt-4 text-center">
          {{ error }}
        </p>
      </div>
    </div>
  </div>
</template>
