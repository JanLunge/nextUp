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
      query: { key: createdRoom.value.admin_key }
    });
  }
}

function copyAdminKey(): void {
  if (createdRoom.value) {
    navigator.clipboard.writeText(createdRoom.value.admin_key);
  }
}
</script>

<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="card bg-base-100 w-full max-w-md shadow-xl">
      <div class="card-body">
        <h1 class="card-title text-2xl justify-center mb-4">
          Presentation Queue
        </h1>

        <!-- Create Form -->
        <template v-if="!createdRoom">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Timer Duration (seconds)</span>
            </label>
            <input
              v-model.number="timerDuration"
              type="number"
              min="30"
              max="600"
              class="input input-bordered"
            />
          </div>

          <div class="card-actions mt-6">
            <button
              class="btn btn-primary w-full"
              :disabled="loading"
              @click="createRoom"
            >
              <span v-if="loading" class="loading loading-spinner"></span>
              <span v-else>Create Room</span>
            </button>
          </div>

          <p v-if="error" class="text-error text-sm mt-2 text-center">
            {{ error }}
          </p>
        </template>

        <!-- Room Created -->
        <template v-else>
          <div class="text-center">
            <div class="badge badge-success badge-lg mb-4">Room Created!</div>

            <div class="bg-base-200 rounded-lg p-4 mb-4">
              <p class="text-sm text-base-content/70">Room Code</p>
              <p class="text-xl font-mono font-bold">{{ createdRoom.id }}</p>
            </div>

            <div class="bg-warning/20 rounded-lg p-4 mb-4">
              <p class="text-sm text-warning font-medium mb-2">
                Save your Admin Key!
              </p>
              <div class="flex items-center gap-2 justify-center">
                <code class="bg-base-300 px-2 py-1 rounded font-mono">
                  {{ createdRoom.admin_key }}
                </code>
                <button
                  class="btn btn-ghost btn-xs"
                  @click="copyAdminKey"
                >
                  Copy
                </button>
              </div>
              <p class="text-xs text-base-content/60 mt-2">
                You'll need this to control the room from another device
              </p>
            </div>

            <button class="btn btn-primary w-full" @click="goToPresenter">
              Open Presenter Display
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
