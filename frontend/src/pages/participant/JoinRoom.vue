<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
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

// Template refs
const nameInput = ref<HTMLInputElement | null>(null);

// Join confirmation
const showConfirmation = ref(false);
const newPassphrase = ref<string | null>(null);
const copied = ref(false);

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
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  }
}

onMounted(async () => {
  fetchRoomInfo();

  // Check if already has stored passphrase
  if (storedPassphrase.value) {
    passphraseInput.value = storedPassphrase.value;
  }

  // Auto-focus name input
  await nextTick();
  nameInput.value?.focus();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-stage relative overflow-hidden">
    <!-- Ambient glow -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-coral/10 rounded-full blur-[100px] pointer-events-none"></div>

    <div class="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">

      <!-- Join Confirmation (Success State) -->
      <div v-if="showConfirmation" class="w-full max-w-md animate-scale-in">
        <div class="card bg-surface-elevated/80 backdrop-blur-xl border border-white/5 shadow-2xl">
          <div class="p-8 text-center">
            <!-- Success Icon -->
            <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center glow-success">
              <svg class="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 class="font-display text-2xl font-bold text-cream mb-2">
              Welcome, {{ name }}!
            </h2>
            <p class="text-subtle">You're in the room</p>

            <!-- Passphrase -->
            <div class="my-6 p-4 bg-surface-overlay rounded-xl border border-white/5">
              <p class="text-xs text-subtle uppercase tracking-wider mb-2">Your Passphrase</p>
              <div class="flex items-center justify-center gap-3">
                <code class="font-mono text-xl text-coral">{{ newPassphrase }}</code>
                <button
                  class="btn btn-ghost btn-sm"
                  :class="copied ? 'text-success' : 'text-subtle'"
                  @click="copyPassphrase"
                >
                  {{ copied ? 'Copied!' : 'Copy' }}
                </button>
              </div>
            </div>

            <!-- Warning -->
            <div class="p-4 bg-warning/10 border border-warning/30 rounded-xl mb-6 text-left">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p class="text-sm text-warning">
                  Save this passphrase! You'll need it to rejoin or reuse your profile.
                </p>
              </div>
            </div>

            <button
              class="btn btn-primary btn-lg w-full font-display font-bold"
              @click="continueToRoom"
            >
              Enter Room
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Join Form -->
      <div v-else class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8 animate-fade-up">
          <h1 class="font-display text-4xl font-bold text-gradient mb-2">NextUp</h1>
          <p class="text-subtle">Join the presentation queue</p>
        </div>

        <div class="card bg-surface-elevated/80 backdrop-blur-xl border border-white/5 shadow-2xl animate-fade-up delay-150">
          <div class="p-8">
            <!-- Room Code Badge -->
            <div class="flex justify-center mb-6">
              <div class="px-6 py-3 bg-surface-overlay rounded-2xl border border-white/5">
                <p class="text-xs text-subtle uppercase tracking-wider mb-1 text-center">Room Code</p>
                <p class="room-code text-2xl text-coral text-center">{{ roomId }}</p>
              </div>
            </div>

            <!-- Room Status -->
            <div v-if="roomInfo" class="text-center mb-6 p-3 bg-surface-overlay/50 rounded-xl">
              <p v-if="roomInfo.current_participant" class="text-sm text-cream">
                Now presenting: <span class="font-semibold text-coral">{{ roomInfo.current_participant.name }}</span>
              </p>
              <p class="text-sm text-subtle">
                <span class="font-semibold text-cream">{{ roomInfo.queue_count }}</span> people in queue
              </p>
            </div>

            <!-- Join as New User -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-subtle uppercase tracking-wider mb-2">
                  Your Name
                </label>
                <input
                  ref="nameInput"
                  v-model="name"
                  type="text"
                  placeholder="Enter your name"
                  class="input input-bordered w-full bg-surface-overlay border-white/10 text-lg"
                  @keyup.enter="joinAsNew"
                />
              </div>

              <button
                class="btn btn-primary btn-lg w-full font-display font-bold"
                :disabled="loading || !name.trim()"
                @click="joinAsNew"
              >
                <span v-if="loading" class="loading loading-spinner"></span>
                <span v-else>Join Room</span>
              </button>
            </div>

            <!-- Divider -->
            <div class="flex items-center gap-4 my-6">
              <div class="flex-1 h-px bg-white/10"></div>
              <span class="text-sm text-subtle">or</span>
              <div class="flex-1 h-px bg-white/10"></div>
            </div>

            <!-- Join with Passphrase -->
            <div class="space-y-3">
              <p class="text-sm text-subtle">Returning? Use your passphrase</p>
              <input
                v-model="passphraseInput"
                type="text"
                placeholder="word-word-word"
                class="input input-bordered w-full bg-surface-overlay border-white/10 font-mono"
                @keyup.enter="joinWithPassphrase"
              />
              <button
                class="btn btn-outline w-full border-white/20 hover:bg-white/5 hover:border-coral/50"
                :disabled="loading || !passphraseInput.trim()"
                @click="joinWithPassphrase"
              >
                Continue with Passphrase
              </button>
            </div>

            <!-- Error -->
            <div v-if="error" class="mt-4 p-3 bg-error/10 border border-error/30 rounded-xl">
              <p class="text-sm text-error text-center">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
