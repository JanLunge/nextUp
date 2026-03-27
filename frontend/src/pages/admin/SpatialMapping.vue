<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api/client';
import { useWebSocket } from '@/composables/useWebSocket';
import type { WSMessage } from '@/types';

const route = useRoute();
const router = useRouter();
const roomId = computed(() => route.params.roomId as string);
const adminKey = computed(() => route.query.key as string);

// ── State ──
const loading = ref(true);
const error = ref<string | null>(null);
const isValid = ref(false);

type MappingStep = 'idle' | 'scanning' | 'ordering';
const step = ref<MappingStep>('idle');

// Participant data from server
const participants = ref<Array<{ id: number; name: string }>>([]);
const assignments = ref<Record<number, number>>({});
const totalTicks = ref(0);

// Camera
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const cameraStream = ref<MediaStream | null>(null);

// Detection state
const COLORS_HEX = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'] as const;
const SCALE = 6; // downscale factor for blob detection
const MIN_BLOB_PIXELS = 3;
const MATCH_DISTANCE = 0.12; // max distance for blob matching (normalized)

interface TrackedBlob {
  id: string;
  worldX: number;
  worldY: number;
  cameraX: number;
  cameraY: number;
  currentCycleColors: (number | null)[];
  decodedId: number | null;
  name: string | null;
  lastSeenFrame: number;
}

const trackedBlobs = ref<TrackedBlob[]>([]);
const cameraOffsetX = ref(0);
const cameraOffsetY = ref(0);
let frameCount = 0;
let captureTimeout: number | null = null;

// Map of assignedId -> participant info (reverse lookup)
const participantsByAssignedId = computed(() => {
  const map = new Map<number, { id: number; name: string }>();
  for (const p of participants.value) {
    const assignedId = assignments.value[p.id];
    if (assignedId !== undefined) {
      map.set(assignedId, p);
    }
  }
  return map;
});

const identifiedParticipants = computed(() =>
  trackedBlobs.value.filter(b => b.decodedId !== null)
);

const identifiedCount = computed(() => identifiedParticipants.value.length);

// Normalized positions for display (0-1 range)
const normalizedPositions = computed(() => {
  const identified = identifiedParticipants.value;
  if (identified.length === 0) return [];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const t of identified) {
    minX = Math.min(minX, t.worldX);
    maxX = Math.max(maxX, t.worldX);
    minY = Math.min(minY, t.worldY);
    maxY = Math.max(maxY, t.worldY);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const pad = 0.08;

  return identified.map(t => ({
    participant_id: t.decodedId!,
    x: pad + ((t.worldX - minX) / rangeX) * (1 - 2 * pad),
    y: pad + ((t.worldY - minY) / rangeY) * (1 - 2 * pad),
    name: t.name!,
  }));
});

// Ordering state
const orderPath = ref<number[]>([]);
const swipeStart = ref<{ x: number; y: number } | null>(null);
const swipeEnd = ref<{ x: number; y: number } | null>(null);
const swipeActive = ref(false);

// ── WebSocket ──
const { isConnected, connect } = useWebSocket(roomId, {
  role: 'admin',
  adminKey: adminKey.value,
  onMessage: handleWebSocketMessage,
});

function handleWebSocketMessage(message: WSMessage): void {
  if (message.type === 'mapping_tick' && step.value === 'scanning') {
    const tick = message.tick as number;
    // Capture frame 200ms after tick (give phones time to update)
    if (captureTimeout) clearTimeout(captureTimeout);
    captureTimeout = window.setTimeout(() => {
      processCurrentFrame(tick);
    }, 200);
  }
}

// ── Validation ──
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

    participants.value = participantsResult.participants
      .filter(p => p.status !== 'withdrawn')
      .map(p => ({ id: p.id, name: p.name }));

    if (posResult.positions.length > 0) {
      // Restore positions as tracked blobs
      for (const p of posResult.positions) {
        trackedBlobs.value.push({
          id: `restored_${p.participant_id}`,
          worldX: p.x,
          worldY: p.y,
          cameraX: p.x,
          cameraY: p.y,
          currentCycleColors: [],
          decodedId: p.participant_id,
          name: p.name,
          lastSeenFrame: 0,
        });
      }
      step.value = 'ordering';
    }

    if (orderResult.order.length > 0) {
      orderPath.value = orderResult.order.map(o => o.participant_id);
    }
  } catch (e) {
    console.error('Failed to load existing data:', e);
  }
}

// ── Camera ──
async function startCamera(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    cameraStream.value = stream;
    await nextTick();
    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      await videoEl.value.play();
    }
  } catch {
    error.value = 'Camera access denied. Please allow camera access.';
  }
}

function stopCamera(): void {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(t => t.stop());
    cameraStream.value = null;
  }
}

function captureFrame(): ImageData | null {
  if (!videoEl.value || !canvasEl.value) return null;
  const ctx = canvasEl.value.getContext('2d');
  if (!ctx) return null;
  canvasEl.value.width = videoEl.value.videoWidth;
  canvasEl.value.height = videoEl.value.videoHeight;
  ctx.drawImage(videoEl.value, 0, 0);
  return ctx.getImageData(0, 0, canvasEl.value.width, canvasEl.value.height);
}

// ── Blob Detection ──
function classifyPixel(r: number, g: number, b: number): number {
  const brightness = (r + g + b) / 3;
  if (brightness < 60) return -1;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max > 0 ? (max - min) / max : 0;

  // White: low saturation, high brightness
  if (sat < 0.3 && brightness > 170) return 3;
  // Red: R dominant
  if (r > 120 && r > g * 1.8 && r > b * 1.8) return 0;
  // Green: G dominant
  if (g > 120 && g > r * 1.8 && g > b * 1.5) return 1;
  // Blue: B dominant
  if (b > 120 && b > r * 1.5 && b > g * 1.5) return 2;

  return -1;
}

interface RawBlob {
  x: number; // normalized 0-1
  y: number;
  color: number;
  size: number;
}

function detectBlobs(imageData: ImageData): RawBlob[] {
  const { data, width, height } = imageData;
  const sw = Math.floor(width / SCALE);
  const sh = Math.floor(height / SCALE);

  // Downsample and classify
  const grid = new Int8Array(sw * sh);
  for (let sy = 0; sy < sh; sy++) {
    for (let sx = 0; sx < sw; sx++) {
      const ox = sx * SCALE + Math.floor(SCALE / 2);
      const oy = sy * SCALE + Math.floor(SCALE / 2);
      const i = (oy * width + ox) * 4;
      grid[sy * sw + sx] = classifyPixel(data[i], data[i + 1], data[i + 2]);
    }
  }

  // Flood-fill connected components
  const visited = new Uint8Array(sw * sh);
  const blobs: RawBlob[] = [];

  for (let sy = 0; sy < sh; sy++) {
    for (let sx = 0; sx < sw; sx++) {
      const idx = sy * sw + sx;
      if (visited[idx] || grid[idx] === -1) continue;

      const color = grid[idx];
      const queue: number[] = [idx];
      visited[idx] = 1;
      let sumX = 0, sumY = 0, count = 0;

      while (queue.length > 0) {
        const ci = queue.pop()!;
        const cx = ci % sw;
        const cy = (ci - cx) / sw;
        sumX += cx;
        sumY += cy;
        count++;

        // 4-connected neighbors
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || nx >= sw || ny < 0 || ny >= sh) continue;
          const ni = ny * sw + nx;
          if (!visited[ni] && grid[ni] === color) {
            visited[ni] = 1;
            queue.push(ni);
          }
        }
      }

      if (count >= MIN_BLOB_PIXELS) {
        blobs.push({
          x: sumX / count / sw,
          y: sumY / count / sh,
          color,
          size: count,
        });
      }
    }
  }

  return blobs;
}

// ── Blob Tracking & Identification ──
function processCurrentFrame(tick: number): void {
  const frame = captureFrame();
  if (!frame) return;
  frameCount++;

  const blobs = detectBlobs(frame);
  const matched = new Set<number>(); // tracked indices
  const blobMatched = new Set<number>(); // blob indices

  // Camera motion estimation from identified blobs
  const motionDx: number[] = [];
  const motionDy: number[] = [];

  // Match blobs to tracked blobs by proximity
  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    let bestIdx = -1;
    let bestDist = MATCH_DISTANCE;

    for (let j = 0; j < trackedBlobs.value.length; j++) {
      if (matched.has(j)) continue;
      const t = trackedBlobs.value[j];
      const dx = blob.x - t.cameraX;
      const dy = blob.y - t.cameraY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      const t = trackedBlobs.value[bestIdx];

      // Estimate camera motion from already-identified blobs
      if (t.decodedId !== null) {
        motionDx.push(blob.x - t.cameraX);
        motionDy.push(blob.y - t.cameraY);
      }

      t.cameraX = blob.x;
      t.cameraY = blob.y;
      t.lastSeenFrame = frameCount;
      if (tick < t.currentCycleColors.length) {
        t.currentCycleColors[tick] = blob.color;
      }

      matched.add(bestIdx);
      blobMatched.add(i);
    }
  }

  // Apply camera motion correction
  if (motionDx.length >= 2) {
    const avgDx = motionDx.reduce((a, b) => a + b, 0) / motionDx.length;
    const avgDy = motionDy.reduce((a, b) => a + b, 0) / motionDy.length;
    if (Math.abs(avgDx) > 0.003 || Math.abs(avgDy) > 0.003) {
      cameraOffsetX.value -= avgDx;
      cameraOffsetY.value -= avgDy;
    }
  }

  // Add new (unmatched) blobs
  for (let i = 0; i < blobs.length; i++) {
    if (blobMatched.has(i)) continue;
    const blob = blobs[i];
    const colors: (number | null)[] = new Array(totalTicks.value).fill(null);
    colors[tick] = blob.color;
    trackedBlobs.value.push({
      id: `blob_${frameCount}_${i}`,
      worldX: blob.x + cameraOffsetX.value,
      worldY: blob.y + cameraOffsetY.value,
      cameraX: blob.x,
      cameraY: blob.y,
      currentCycleColors: colors,
      decodedId: null,
      name: null,
      lastSeenFrame: frameCount,
    });
  }

  // At end of cycle, try to decode unidentified blobs
  if (tick === totalTicks.value - 1) {
    decodeCycle();
  }

  // Prune stale blobs that were never identified
  trackedBlobs.value = trackedBlobs.value.filter(
    t => t.decodedId !== null || frameCount - t.lastSeenFrame < totalTicks.value * 3
  );
}

function decodeCycle(): void {
  const alreadyDecoded = new Set(
    trackedBlobs.value.filter(t => t.decodedId !== null).map(t => t.decodedId!)
  );

  for (const t of trackedBlobs.value) {
    if (t.decodedId !== null) {
      // Reset cycle for next round
      t.currentCycleColors = new Array(totalTicks.value).fill(null);
      continue;
    }

    const colors = t.currentCycleColors;
    if (colors.some(c => c === null)) {
      // Incomplete cycle
      t.currentCycleColors = new Array(totalTicks.value).fill(null);
      continue;
    }

    // Decode: reconstruct assignedId from 4-color sequence
    let decodedAssignedId = 0;
    for (let tick = 0; tick < totalTicks.value; tick++) {
      decodedAssignedId |= (colors[tick]! << (tick * 2));
    }

    // Look up participant
    const participant = participantsByAssignedId.value.get(decodedAssignedId);
    if (participant && !alreadyDecoded.has(participant.id)) {
      t.decodedId = participant.id;
      t.name = participant.name;
      t.worldX = t.cameraX + cameraOffsetX.value;
      t.worldY = t.cameraY + cameraOffsetY.value;
      alreadyDecoded.add(participant.id);
    }

    t.currentCycleColors = new Array(totalTicks.value).fill(null);
  }
}

// ── Mapping Flow ──
async function startMapping(): Promise<void> {
  try {
    await startCamera();
    const result = await api.startMapping(roomId.value, adminKey.value);
    participants.value = result.participants;
    assignments.value = result.assignments;
    totalTicks.value = result.totalTicks;

    // Reset detection state
    trackedBlobs.value = [];
    cameraOffsetX.value = 0;
    cameraOffsetY.value = 0;
    frameCount = 0;
    orderPath.value = [];

    step.value = 'scanning';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to start mapping';
  }
}

async function finishScanning(): Promise<void> {
  try {
    await api.endMapping(roomId.value, adminKey.value);
  } catch {
    // Continue anyway
  }
  stopCamera();
  if (captureTimeout) clearTimeout(captureTimeout);

  // Save detected positions
  const positions = normalizedPositions.value;
  if (positions.length > 0) {
    try {
      await api.saveSpatialPositions(
        roomId.value,
        adminKey.value,
        positions.map(p => ({ participant_id: p.participant_id, x: p.x, y: p.y }))
      );
    } catch {
      // Non-critical
    }
  }

  step.value = 'ordering';
}

async function restartMapping(): Promise<void> {
  trackedBlobs.value = [];
  orderPath.value = [];
  swipeStart.value = null;
  swipeEnd.value = null;
  step.value = 'idle';
}

// ── Swipe-to-Order ──
function getEventPos(e: MouseEvent | TouchEvent, rect: DOMRect): { x: number; y: number } {
  let clientX: number, clientY: number;
  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if ('changedTouches' in e && (e as TouchEvent).changedTouches.length > 0) {
    clientX = (e as TouchEvent).changedTouches[0].clientX;
    clientY = (e as TouchEvent).changedTouches[0].clientY;
  } else {
    clientX = (e as MouseEvent).clientX;
    clientY = (e as MouseEvent).clientY;
  }
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}

function onSwipeStart(e: MouseEvent | TouchEvent): void {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const pos = getEventPos(e, rect);
  swipeStart.value = pos;
  swipeEnd.value = pos;
  swipeActive.value = true;
}

function onSwipeMove(e: MouseEvent | TouchEvent): void {
  if (!swipeActive.value || !swipeStart.value) return;
  e.preventDefault();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  swipeEnd.value = getEventPos(e, rect);
}

function onSwipeEnd(): void {
  if (!swipeActive.value || !swipeStart.value || !swipeEnd.value) return;
  swipeActive.value = false;

  const dx = swipeEnd.value.x - swipeStart.value.x;
  const dy = swipeEnd.value.y - swipeStart.value.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 0.05) return; // too short

  // Project all positions onto direction vector and sort
  const positions = normalizedPositions.value;
  const projections = positions.map(p => ({
    participant_id: p.participant_id,
    projection: ((p.x - swipeStart.value!.x) * dx + (p.y - swipeStart.value!.y) * dy) / len,
  }));

  projections.sort((a, b) => a.projection - b.projection);
  orderPath.value = projections.map(p => p.participant_id);
}

function getOrderNumber(participantId: number): number | null {
  const idx = orderPath.value.indexOf(participantId);
  return idx >= 0 ? idx + 1 : null;
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

onMounted(() => {
  validateKey();
});

onUnmounted(() => {
  stopCamera();
  if (captureTimeout) clearTimeout(captureTimeout);
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
              :class="['status-dot', isConnected ? 'status-dot-live' : 'status-dot-offline']"
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

      <!-- ═══ IDLE: Start screen ═══ -->
      <main v-if="step === 'idle'" class="flex-1 p-4 flex flex-col items-center justify-center">
        <div class="text-center max-w-sm">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-coral/10 flex items-center justify-center">
            <svg class="w-10 h-10 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 class="font-display text-2xl font-bold text-cream mb-3">Auto-Map Positions</h2>
          <p class="text-subtle mb-2">
            Point your camera at the audience. Phones will flash color patterns automatically.
          </p>
          <p class="text-subtle mb-6 text-sm">
            Slowly pan the camera to capture everyone. Dots appear on the map as people are detected.
          </p>
          <p class="text-cream font-medium mb-6">
            {{ participants.length }} participants to map
          </p>

          <!-- Color legend -->
          <div class="flex justify-center gap-3 mb-6">
            <div v-for="(color, i) in COLORS_HEX" :key="i" class="flex items-center gap-1.5">
              <div class="w-4 h-4 rounded-full border border-white/20" :style="{ backgroundColor: color }"></div>
              <span class="text-xs text-subtle">{{ ['Red', 'Green', 'Blue', 'White'][i] }}</span>
            </div>
          </div>

          <button
            class="btn btn-primary btn-lg w-full font-display"
            :disabled="participants.length === 0"
            @click="startMapping"
          >
            Start Auto-Scan
          </button>
        </div>
      </main>

      <!-- ═══ SCANNING: Camera + real-time map ═══ -->
      <main v-else-if="step === 'scanning'" class="flex-1 flex flex-col">
        <!-- Camera feed -->
        <div class="flex-[3] relative bg-black min-h-0">
          <video
            ref="videoEl"
            class="w-full h-full object-cover"
            autoplay
            playsinline
            muted
          ></video>

          <!-- Detected blob overlays on camera -->
          <div
            v-for="blob in trackedBlobs.filter(b => b.lastSeenFrame >= frameCount - 3)"
            :key="blob.id"
            class="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 transition-all duration-200"
            :class="blob.decodedId !== null ? 'border-coral bg-coral/50' : 'border-white/60 bg-white/20'"
            :style="{ left: `${blob.cameraX * 100}%`, top: `${blob.cameraY * 100}%` }"
          >
            <span v-if="blob.name" class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white font-bold bg-coral/80 px-1 rounded whitespace-nowrap">
              {{ blob.name }}
            </span>
          </div>

          <canvas ref="canvasEl" class="hidden"></canvas>

          <!-- Scanning status overlay -->
          <div class="absolute top-3 left-3 right-3 flex justify-between items-start">
            <div class="bg-black/60 backdrop-blur rounded-lg px-3 py-2">
              <p class="text-xs text-white/70">Detected</p>
              <p class="text-lg font-bold text-coral">{{ identifiedCount }}<span class="text-white/50 text-sm">/{{ participants.length }}</span></p>
            </div>
            <div class="bg-black/60 backdrop-blur rounded-lg px-3 py-2">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-coral animate-pulse"></div>
                <span class="text-xs text-white/70">Scanning</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Real-time 2D map preview -->
        <div class="flex-[2] bg-surface-elevated border-t border-white/10 relative min-h-0">
          <!-- Map dots -->
          <div
            v-for="pos in normalizedPositions"
            :key="pos.participant_id"
            class="absolute w-9 h-9 -ml-[18px] -mt-[18px] rounded-full bg-coral/80 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
            :style="{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }"
          >
            {{ pos.name.charAt(0) }}
          </div>

          <!-- Empty state -->
          <div v-if="normalizedPositions.length === 0" class="absolute inset-0 flex items-center justify-center">
            <p class="text-subtle text-sm">Pan camera across audience...</p>
          </div>

          <!-- Bottom controls -->
          <div class="absolute bottom-3 left-3 right-3 flex justify-between items-center">
            <span class="text-xs text-subtle">{{ identifiedCount }} of {{ participants.length }} mapped</span>
            <button
              class="btn btn-primary btn-sm"
              @click="finishScanning"
            >
              Done Scanning
            </button>
          </div>
        </div>
      </main>

      <!-- ═══ ORDERING: Full map + swipe to set direction ═══ -->
      <main v-else-if="step === 'ordering'" class="flex-1 p-4 flex flex-col">
        <div class="mb-4">
          <h2 class="font-display text-xl font-bold text-cream mb-1">Set Presentation Order</h2>
          <p class="text-subtle text-sm">Swipe across the map to set the direction people present in</p>
        </div>

        <!-- Spatial map with swipe gesture -->
        <div
          class="relative bg-surface-elevated border border-white/10 rounded-2xl flex-1 min-h-[280px] overflow-hidden touch-none"
          @mousedown="onSwipeStart"
          @mousemove="onSwipeMove"
          @mouseup="onSwipeEnd"
          @touchstart="onSwipeStart"
          @touchmove.prevent="onSwipeMove"
          @touchend="onSwipeEnd"
        >
          <!-- SVG overlays -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none z-10">
            <!-- Direction arrow (swipe preview) -->
            <line
              v-if="swipeStart && swipeEnd"
              :x1="`${swipeStart.x * 100}%`"
              :y1="`${swipeStart.y * 100}%`"
              :x2="`${swipeEnd.x * 100}%`"
              :y2="`${swipeEnd.y * 100}%`"
              stroke="#FF6B4A"
              stroke-width="3"
              stroke-dasharray="8 4"
              opacity="0.6"
            />
            <!-- Arrowhead -->
            <circle
              v-if="swipeEnd && swipeStart"
              :cx="`${swipeEnd.x * 100}%`"
              :cy="`${swipeEnd.y * 100}%`"
              r="5"
              fill="#FF6B4A"
              opacity="0.6"
            />

            <!-- Order path lines -->
            <template v-if="orderPath.length > 1">
              <line
                v-for="(_, i) in orderPath.slice(1)"
                :key="'line-' + i"
                :x1="`${(normalizedPositions.find(p => p.participant_id === orderPath[i])?.x || 0) * 100}%`"
                :y1="`${(normalizedPositions.find(p => p.participant_id === orderPath[i])?.y || 0) * 100}%`"
                :x2="`${(normalizedPositions.find(p => p.participant_id === orderPath[i + 1])?.x || 0) * 100}%`"
                :y2="`${(normalizedPositions.find(p => p.participant_id === orderPath[i + 1])?.y || 0) * 100}%`"
                stroke="#FF6B4A"
                stroke-width="2"
                opacity="0.5"
              />
            </template>
          </svg>

          <!-- Participant dots -->
          <div
            v-for="pos in normalizedPositions"
            :key="pos.participant_id"
            class="absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-2 flex flex-col items-center justify-center transition-all z-20 pointer-events-none"
            :class="[
              getOrderNumber(pos.participant_id)
                ? 'bg-coral border-white text-white scale-110'
                : 'bg-surface-overlay border-white/30 text-cream'
            ]"
            :style="{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }"
          >
            <span class="text-xs font-bold leading-none">
              {{ getOrderNumber(pos.participant_id) || pos.name.charAt(0) }}
            </span>
            <span class="text-[8px] leading-none mt-0.5 opacity-70 max-w-[40px] truncate">{{ pos.name }}</span>
          </div>

          <!-- Instruction overlay when no order set -->
          <div v-if="orderPath.length === 0 && !swipeActive" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
              <p class="text-white/80 text-sm font-medium">Swipe to set direction</p>
              <p class="text-white/50 text-xs mt-1">Draw a line across the map</p>
            </div>
          </div>
        </div>

        <!-- Order list -->
        <div v-if="orderPath.length > 0" class="mt-4 mb-3">
          <p class="text-xs text-subtle uppercase tracking-wider mb-2">Presentation Order</p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(pid, i) in orderPath"
              :key="pid"
              class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-overlay/50"
            >
              <span class="w-5 h-5 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center">
                {{ i + 1 }}
              </span>
              <span class="text-cream text-xs">
                {{ normalizedPositions.find(p => p.participant_id === pid)?.name || '?' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-2 gap-3 mt-auto pt-3">
          <button class="btn bg-surface-overlay border border-white/10" @click="restartMapping">
            Re-scan
          </button>
          <button
            class="btn btn-primary"
            :disabled="orderPath.length === 0"
            @click="saveOrder"
          >
            Apply Order
          </button>
        </div>
      </main>
    </div>
  </div>
</template>
