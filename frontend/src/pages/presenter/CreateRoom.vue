<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/client';
import type { RoomCreateResponse } from '@/types';

const router = useRouter();

const timerDuration = ref(60);
const loading = ref(false);
const error = ref<string | null>(null);
const createdRoom = ref<RoomCreateResponse | null>(null);

async function createRoom(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    createdRoom.value = await api.createRoom(timerDuration.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create room';
  } finally {
    loading.value = false;
  }
}

function goToPresenter(): void {
  if (createdRoom.value) {
    router.push({
      name: 'presenter',
      params: { roomId: createdRoom.value.id },
      query: { key: createdRoom.value.admin_key },
    });
  }
}

function copyAdminKey(): void {
  if (createdRoom.value) {
    navigator.clipboard.writeText(createdRoom.value.admin_key);
  }
}

const presetDurations = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 90, label: '90s' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
  { value: 300, label: '5m' },
];
</script>

<template>
  <div class="min-h-screen bg-gradient-stage relative overflow-hidden">
    <!-- Ambient glow -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-coral/10 rounded-full blur-[120px] pointer-events-none"
    ></div>

    <!-- Content -->
    <div class="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
      <!-- Logo / Brand -->
      <div class="mb-12 text-center animate-fade-up">
        <h1 class="font-display text-5xl md:text-6xl font-bold text-gradient mb-3">NextUp</h1>
        <p class="text-subtle text-lg">Live presentation queue system</p>
      </div>

      <!-- Main Card -->
      <div class="w-full max-w-md animate-fade-up delay-150">
        <!-- Create Form -->
        <template v-if="!createdRoom">
          <div
            class="card bg-surface-elevated/80 backdrop-blur-xl border border-white/5 shadow-2xl"
          >
            <div class="card-body p-8">
              <h2 class="font-display text-2xl font-bold text-cream mb-6 text-center">
                Create a Room
              </h2>

              <!-- Timer Duration -->
              <div class="space-y-4">
                <label class="block">
                  <span class="text-sm font-medium text-subtle uppercase tracking-wider">
                    Presentation Timer
                  </span>
                </label>

                <!-- Duration Presets -->
                <div class="grid grid-cols-6 gap-2">
                  <button
                    v-for="preset in presetDurations"
                    :key="preset.value"
                    type="button"
                    :class="[
                      'py-3 rounded-lg font-medium text-sm transition-all duration-200',
                      timerDuration === preset.value
                        ? 'bg-coral text-white glow-coral-sm'
                        : 'bg-surface-overlay text-subtle hover:bg-slate hover:text-cream',
                    ]"
                    @click="timerDuration = preset.value"
                  >
                    {{ preset.label }}
                  </button>
                </div>

                <!-- Custom Input -->
                <div class="flex items-center gap-3">
                  <span class="text-sm text-subtle">or</span>
                  <input
                    v-model.number="timerDuration"
                    type="number"
                    min="10"
                    max="600"
                    class="input input-bordered flex-1 bg-surface-overlay border-white/10 text-center font-mono text-lg"
                    placeholder="Custom"
                  />
                  <span class="text-sm text-subtle">seconds</span>
                </div>
              </div>

              <!-- Create Button -->
              <button
                class="btn btn-primary btn-lg w-full mt-8 font-display font-bold text-lg h-14"
                :disabled="loading"
                @click="createRoom"
              >
                <span v-if="loading" class="loading loading-spinner"></span>
                <span v-else class="flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Launch Room
                </span>
              </button>

              <p v-if="error" class="text-error text-sm mt-4 text-center">
                {{ error }}
              </p>
            </div>
          </div>

          <!-- Features hint -->
          <div class="mt-8 grid grid-cols-3 gap-4 text-center animate-fade-up delay-300">
            <div class="space-y-2">
              <div class="text-2xl">📱</div>
              <p class="text-xs text-subtle">QR Code<br />Scanning</p>
            </div>
            <div class="space-y-2">
              <div class="text-2xl">👋</div>
              <p class="text-xs text-subtle">Wave to<br />Connect</p>
            </div>
            <div class="space-y-2">
              <div class="text-2xl">⏱️</div>
              <p class="text-xs text-subtle">Live<br />Timer</p>
            </div>
          </div>
        </template>

        <!-- Room Created Success -->
        <template v-else>
          <div
            class="card bg-surface-elevated/80 backdrop-blur-xl border border-white/5 shadow-2xl animate-scale-in"
          >
            <div class="card-body p-8 text-center">
              <!-- Success Icon -->
              <div
                class="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 flex items-center justify-center glow-success"
              >
                <svg
                  class="w-10 h-10 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 class="font-display text-2xl font-bold text-cream mb-2">Room Created!</h2>

              <!-- Room Code -->
              <div class="my-6 p-6 bg-surface-overlay rounded-2xl border border-white/5">
                <p class="text-xs text-subtle uppercase tracking-wider mb-2">Room Code</p>
                <p class="room-code text-3xl text-coral">{{ createdRoom.id }}</p>
              </div>

              <!-- Admin Key Warning -->
              <div class="p-4 bg-warning/10 border border-warning/30 rounded-xl mb-6">
                <div class="flex items-start gap-3">
                  <svg
                    class="w-5 h-5 text-warning shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div class="text-left">
                    <p class="text-sm font-medium text-warning mb-2">Save your Admin Key</p>
                    <div class="flex items-center gap-2 bg-surface rounded-lg p-2">
                      <code class="font-mono text-sm text-cream flex-1 truncate">
                        {{ createdRoom.admin_key }}
                      </code>
                      <button
                        class="btn btn-ghost btn-xs text-warning hover:text-warning"
                        @click="copyAdminKey"
                      >
                        Copy
                      </button>
                    </div>
                    <p class="text-xs text-subtle mt-2">
                      Required to control room from another device
                    </p>
                  </div>
                </div>
              </div>

              <!-- Launch Button -->
              <button
                class="btn btn-primary btn-lg w-full font-display font-bold text-lg h-14"
                @click="goToPresenter"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Open Presenter Display
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
