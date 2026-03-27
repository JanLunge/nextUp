<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useWebSocket } from '@/composables/useWebSocket';
import type { WSMessage, SpatialPosition } from '@/types';

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);
const adminKey = computed(() => route.query.key as string);

// State
const loading = ref(true);
const error = ref<string | null>(null);
const isValid = ref(false);

// Mapping state
type MappingStep = 'idle' | 'scanning' | 'identifying' | 'positioning' | 'ordering';
const step = ref<MappingStep>('idle');
const participants = ref<Array<{ id: number; name: string }>>([]);
const assignments = ref<Record<number, number>>({});
const numPhases = ref(0);
const currentPhase = ref(0);

// Camera state
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const cameraStream = ref<MediaStream | null>(null);
const cameraActive = ref(false);

// Position mapping - admin taps where each person is
const positions = ref<Array<{ participant_id: number; x: number; y: number; name: string }>>([]);
const currentIdentifyIndex = ref(0);
const capturedFrames = ref<ImageData[]>([]);

// Canvas for spatial map
const mapCanvasEl = ref<HTMLCanvasElement | null>(null);

// Presentation order
const orderPath = ref<number[]>([]); // participant IDs in order

// WebSocket
const { isConnected, connect } = useWebSocket(roomId, {
  role: 'admin',
  adminKey: adminKey.value,
  onMessage: handleWebSocketMessage,
});

function handleWebSocketMessage(message: WSMessage): void {
  // Handle any relevant messages
}

// Validate admin key
async function validateKey(): Promise<void> {
  if (!adminKey.value) {
    error.value = 'Admin key required';
    loading.value = false;
    return;
  }
  try {
    const result = await api.validateAdminKey(roomId.value, adminKey.value);
    if (result.valid) {
      isValid.value = true;
      // Load existing positions if any
      await loadExistingData();
      connect();
    } else {
      error.value = 'Invalid admin key';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Validation failed';
  } finally {
    loading.value = false;
  }
}

async function loadExistingData(): Promise<void> {
  try {
    const [posResult, orderResult, participantsResult] = await Promise.all([
      api.getSpatialPositions(roomId.value),
      api.getSpatialOrder(roomId.value),
      api.getParticipants(roomId.value),
    ]);

    if (posResult.positions.length > 0) {
      positions.value = posResult.positions.map(p => ({
        participant_id: p.participant_id,
        x: p.x,
        y: p.y,
        name: p.name,
      }));
      step.value = 'ordering';
    }

    if (orderResult.order.length > 0) {
      orderPath.value = orderResult.order.map(o => o.participant_id);
    }

    participants.value = participantsResult.participants
      .filter(p => p.status !== 'withdrawn')
      .map(p => ({ id: p.id, name: p.name }));
  } catch (e) {
    console.error('Failed to load existing data:', e);
  }
}

// Camera management
async function startCamera(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    cameraStream.value = stream;
    cameraActive.value = true;
    await nextTick();
    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      await videoEl.value.play();
    }
  } catch (e) {
    error.value = 'Camera access denied. Please allow camera access.';
    console.error('Camera error:', e);
  }
}

function stopCamera(): void {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(t => t.stop());
    cameraStream.value = null;
  }
  cameraActive.value = false;
}

// Capture a frame from the video
function captureFrame(): ImageData | null {
  if (!videoEl.value || !canvasEl.value) return null;
  const canvas = canvasEl.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = videoEl.value.videoWidth;
  canvas.height = videoEl.value.videoHeight;
  ctx.drawImage(videoEl.value, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Start the mapping process
async function startMapping(): Promise<void> {
  try {
    await startCamera();
    const result = await api.startMapping(roomId.value, adminKey.value);
    participants.value = result.participants;
    assignments.value = result.assignments;
    numPhases.value = result.numPhases;
    currentPhase.value = 0;
    capturedFrames.value = [];
    positions.value = [];
    step.value = 'scanning';

    // Wait a moment for phones to go dark, then capture the "all dark" baseline
    await new Promise(r => setTimeout(r, 1500));
    const baseline = captureFrame();
    if (baseline) capturedFrames.value.push(baseline);

    // Start first phase
    await advancePhase();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to start mapping';
    console.error('Mapping start error:', e);
  }
}

// Advance to next binary phase
async function advancePhase(): Promise<void> {
  if (currentPhase.value >= numPhases.value) {
    // All phases done, decode positions
    await finishScanning();
    return;
  }

  try {
    await api.advanceMappingPhase(
      roomId.value,
      adminKey.value,
      currentPhase.value,
      numPhases.value,
      assignments.value
    );

    // Wait for phones to update and stabilize
    await new Promise(r => setTimeout(r, 1200));

    // Capture this phase
    const frame = captureFrame();
    if (frame) capturedFrames.value.push(frame);

    currentPhase.value++;

    // Auto-advance through remaining phases
    if (currentPhase.value < numPhases.value) {
      await advancePhase();
    } else {
      await finishScanning();
    }
  } catch (e) {
    console.error('Phase advance error:', e);
  }
}

// Process captured frames to detect positions
async function finishScanning(): Promise<void> {
  // Use the simpler approach: switch to manual identification mode
  // Each participant's phone will light up one at a time
  step.value = 'identifying';
  currentIdentifyIndex.value = 0;

  // Light up the first participant
  await highlightParticipant(0);
}

// Highlight one participant at a time for manual positioning
async function highlightParticipant(index: number): Promise<void> {
  if (index >= participants.value.length) {
    // Done identifying all
    step.value = 'positioning';
    await endMappingMode();
    return;
  }

  currentIdentifyIndex.value = index;
  const participant = participants.value[index];

  // Create a special assignment where only this participant shows white
  const soloAssignments: Record<number, number> = {};
  participants.value.forEach(p => {
    soloAssignments[p.id] = p.id === participant.id ? 1 : 0;
  });

  try {
    await api.advanceMappingPhase(
      roomId.value,
      adminKey.value,
      0, // phase 0 = check bit 0, which is 1 for the target
      1,
      soloAssignments
    );
  } catch (e) {
    console.error('Highlight error:', e);
  }
}

// Admin taps on the camera feed to mark where a participant is
function handleCameraTap(event: MouseEvent | TouchEvent): void {
  if (step.value !== 'identifying') return;

  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  let clientX: number, clientY: number;
  if ('touches' in event) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  // Normalize to 0-1 range
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;

  const participant = participants.value[currentIdentifyIndex.value];
  if (!participant) return;

  // Add or update position
  const existingIdx = positions.value.findIndex(p => p.participant_id === participant.id);
  const pos = { participant_id: participant.id, x, y, name: participant.name };
  if (existingIdx >= 0) {
    positions.value[existingIdx] = pos;
  } else {
    positions.value.push(pos);
  }

  // Move to next participant
  highlightParticipant(currentIdentifyIndex.value + 1);
}

// Skip current participant (not visible on camera)
function skipParticipant(): void {
  highlightParticipant(currentIdentifyIndex.value + 1);
}

async function endMappingMode(): Promise<void> {
  try {
    await api.endMapping(roomId.value, adminKey.value);
  } catch (e) {
    console.error('End mapping error:', e);
  }
  stopCamera();
}

// Save positions to server
async function savePositions(): Promise<void> {
  try {
    await api.saveSpatialPositions(
      roomId.value,
      adminKey.value,
      positions.value.map(p => ({
        participant_id: p.participant_id,
        x: p.x,
        y: p.y,
      }))
    );
    step.value = 'ordering';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save positions';
  }
}

// Order management - toggle participant in order path
function toggleInOrder(participantId: number): void {
  const idx = orderPath.value.indexOf(participantId);
  if (idx >= 0) {
    // Remove from this point onwards
    orderPath.value = orderPath.value.slice(0, idx);
  } else {
    orderPath.value.push(participantId);
  }
}

// Save presentation order
async function saveOrder(): Promise<void> {
  try {
    await api.saveSpatialOrder(roomId.value, adminKey.value, orderPath.value);
    router.push({ name: 'admin', params: { roomId: roomId.value }, query: { key: adminKey.value } });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save order';
  }
}

// Clear order
function clearOrder(): void {
  orderPath.value = [];
}

// Restart mapping
async function restartMapping(): Promise<void> {
  positions.value = [];
  orderPath.value = [];
  step.value = 'idle';
}

// Get order number for a participant (1-indexed, or null if not in order)
function getOrderNumber(participantId: number): number | null {
  const idx = orderPath.value.indexOf(participantId);
  return idx >= 0 ? idx + 1 : null;
}

onMounted(() => {
  validateKey();
});

onUnmounted(() => {
  stopCamera();
});
</script>

<template>
  <div class="min-h-screen bg-surface">
    <!-- Loading -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-coral border-t-transparent animate-spin"></div>
        <p class="text-subtle">Connecting...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error && !isValid" class="min-h-screen flex flex-col items-center justify-center p-6">
      <div class="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mb-6">
        <svg class="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 class="font-display text-xl font-bold text-cream mb-2">Access Denied</h1>
      <p class="text-subtle text-center mb-6">{{ error }}</p>
    </div>

    <!-- Main Content -->
    <div v-else-if="isValid" class="min-h-screen flex flex-col">
      <!-- Header -->
      <header class="glass-dark px-4 py-4 sticky top-0 z-10">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-subtle uppercase tracking-wider">Spatial Mapping</p>
            <p class="room-code text-lg text-coral">{{ roomId }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span
              :class="[
                'status-dot',
                isConnected ? 'status-dot-live' : 'status-dot-offline'
              ]"
            ></span>
            <button
              class="btn btn-ghost btn-sm"
              @click="router.push({ name: 'admin', params: { roomId }, query: { key: adminKey } })"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <!-- Error banner -->
      <div v-if="error" class="mx-4 mt-4 p-3 bg-error/20 border border-error/30 rounded-xl text-error text-sm">
        {{ error }}
        <button class="ml-2 underline" @click="error = null">Dismiss</button>
      </div>

      <!-- Step: Idle - Start screen -->
      <main v-if="step === 'idle'" class="flex-1 p-4 flex flex-col items-center justify-center">
        <div class="text-center max-w-sm">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-coral/10 flex items-center justify-center">
            <svg class="w-10 h-10 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 class="font-display text-2xl font-bold text-cream mb-3">Map Participant Positions</h2>
          <p class="text-subtle mb-2">
            Point your camera at the audience. Each person's phone will light up one at a time.
          </p>
          <p class="text-subtle mb-6 text-sm">
            Tap where you see each lit-up phone to map their position. You can move the camera between people if not everyone fits in one frame.
          </p>
          <p class="text-cream font-medium mb-6">
            {{ participants.length }} participants to map
          </p>
          <button
            class="btn btn-primary btn-lg w-full font-display"
            :disabled="participants.length === 0"
            @click="startMapping"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Start Camera Mapping
          </button>
        </div>
      </main>

      <!-- Step: Scanning - Binary pattern capture (auto) -->
      <main v-else-if="step === 'scanning'" class="flex-1 p-4 flex flex-col items-center justify-center">
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-coral border-t-transparent animate-spin"></div>
          <h2 class="font-display text-xl font-bold text-cream mb-2">Scanning...</h2>
          <p class="text-subtle">Phase {{ currentPhase + 1 }} of {{ numPhases }}</p>
          <p class="text-subtle text-sm mt-2">Capturing color patterns from phones</p>
        </div>
      </main>

      <!-- Step: Identifying - Manual tap-to-place -->
      <main v-else-if="step === 'identifying'" class="flex-1 flex flex-col">
        <!-- Info bar -->
        <div class="px-4 py-3 bg-coral/10 border-b border-coral/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-coral">
                Tap where you see the lit phone
              </p>
              <p class="text-cream font-display font-bold text-lg">
                {{ participants[currentIdentifyIndex]?.name || 'Done' }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-subtle">{{ currentIdentifyIndex + 1 }} / {{ participants.length }}</p>
              <button class="text-xs text-coral underline mt-1" @click="skipParticipant">
                Skip (not visible)
              </button>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="mt-2 h-1.5 rounded-full bg-surface-overlay overflow-hidden">
            <div
              class="h-full rounded-full bg-coral transition-all duration-300"
              :style="{ width: `${(currentIdentifyIndex / participants.length) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Camera feed with tap handler -->
        <div
          class="flex-1 relative bg-black"
          @click="handleCameraTap"
          @touchstart.prevent="handleCameraTap"
        >
          <video
            ref="videoEl"
            class="w-full h-full object-cover"
            autoplay
            playsinline
            muted
          ></video>

          <!-- Position markers already placed -->
          <div
            v-for="pos in positions"
            :key="pos.participant_id"
            class="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-coral/80 border-2 border-white flex items-center justify-center text-xs font-bold text-white pointer-events-none"
            :style="{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }"
          >
            {{ pos.name.charAt(0) }}
          </div>

          <!-- Hidden canvas for frame capture -->
          <canvas ref="canvasEl" class="hidden"></canvas>
        </div>
      </main>

      <!-- Step: Positioning - Review and save -->
      <main v-else-if="step === 'positioning'" class="flex-1 p-4">
        <div class="text-center mb-6">
          <h2 class="font-display text-xl font-bold text-cream mb-2">Positions Mapped</h2>
          <p class="text-subtle">{{ positions.length }} of {{ participants.length }} participants located</p>
        </div>

        <!-- Mini map preview -->
        <div class="relative bg-surface-elevated border border-white/10 rounded-2xl aspect-video mb-6 overflow-hidden">
          <div
            v-for="pos in positions"
            :key="pos.participant_id"
            class="absolute w-10 h-10 -ml-5 -mt-5 rounded-full bg-coral/80 border-2 border-white flex items-center justify-center text-xs font-bold text-white"
            :style="{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }"
          >
            {{ pos.name.charAt(0) }}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button class="btn bg-surface-overlay border border-white/10" @click="restartMapping">
            Redo Mapping
          </button>
          <button class="btn btn-primary" @click="savePositions">
            Save & Set Order
          </button>
        </div>
      </main>

      <!-- Step: Ordering - Draw presentation path on map -->
      <main v-else-if="step === 'ordering'" class="flex-1 p-4">
        <div class="mb-4">
          <h2 class="font-display text-xl font-bold text-cream mb-1">Set Presentation Order</h2>
          <p class="text-subtle text-sm">Tap participants in the order they should present</p>
        </div>

        <!-- Spatial map with clickable dots -->
        <div class="relative bg-surface-elevated border border-white/10 rounded-2xl aspect-video mb-4 overflow-hidden">
          <!-- SVG overlay for connection lines -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none z-10">
            <line
              v-for="(_, i) in orderPath.slice(1)"
              :key="i"
              :x1="`${(positions.find(p => p.participant_id === orderPath[i])?.x || 0) * 100}%`"
              :y1="`${(positions.find(p => p.participant_id === orderPath[i])?.y || 0) * 100}%`"
              :x2="`${(positions.find(p => p.participant_id === orderPath[i + 1])?.x || 0) * 100}%`"
              :y2="`${(positions.find(p => p.participant_id === orderPath[i + 1])?.y || 0) * 100}%`"
              stroke="#FF6B4A"
              stroke-width="2"
              stroke-dasharray="6 3"
              opacity="0.7"
            />
          </svg>

          <!-- Participant dots -->
          <button
            v-for="pos in positions"
            :key="pos.participant_id"
            class="absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all z-20"
            :class="[
              getOrderNumber(pos.participant_id)
                ? 'bg-coral border-white text-white scale-110'
                : 'bg-surface-overlay border-white/30 text-cream hover:border-coral/50'
            ]"
            :style="{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }"
            @click="toggleInOrder(pos.participant_id)"
          >
            <span v-if="getOrderNumber(pos.participant_id)">{{ getOrderNumber(pos.participant_id) }}</span>
            <span v-else>{{ pos.name.charAt(0) }}</span>
          </button>
        </div>

        <!-- Order list -->
        <div v-if="orderPath.length > 0" class="mb-4">
          <p class="text-xs text-subtle uppercase tracking-wider mb-2">Presentation Order</p>
          <div class="space-y-1">
            <div
              v-for="(pid, i) in orderPath"
              :key="pid"
              class="flex items-center gap-3 p-2 rounded-lg bg-surface-overlay/50"
            >
              <span class="w-6 h-6 rounded-full bg-coral text-white text-xs font-bold flex items-center justify-center">
                {{ i + 1 }}
              </span>
              <span class="text-cream text-sm">
                {{ positions.find(p => p.participant_id === pid)?.name || 'Unknown' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-3 gap-3">
          <button class="btn bg-surface-overlay border border-white/10 text-sm" @click="restartMapping">
            Remap
          </button>
          <button class="btn bg-surface-overlay border border-white/10 text-sm" @click="clearOrder">
            Clear
          </button>
          <button
            class="btn btn-primary text-sm"
            :disabled="orderPath.length === 0"
            @click="saveOrder"
          >
            Save Order
          </button>
        </div>
      </main>
    </div>
  </div>
</template>
