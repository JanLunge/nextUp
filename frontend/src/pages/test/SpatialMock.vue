<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { api } from '@/api/client';

const NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan',
  'Fiona', 'George', 'Hannah', 'Ivan', 'Julia',
  'Kevin', 'Luna', 'Marcus', 'Nina', 'Oscar',
  'Petra', 'Quinn', 'Rosa', 'Sam', 'Tina',
];

const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'];

// Generate scattered positions that look like people in a room
function generatePositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  // Use a seeded pattern for reproducibility — roughly 4 rows of 5
  const rows = 4;
  const cols = 5;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({
      x: 0.1 + (col / (cols - 1)) * 0.8 + (Math.random() - 0.5) * 0.06,
      y: 0.1 + (row / (rows - 1)) * 0.8 + (Math.random() - 0.5) * 0.06,
    });
  }
  return positions;
}

interface MockClient {
  name: string;
  participantId: number;
  passphrase: string;
  assignedId: number | null;
  currentColor: string;
  ws: WebSocket | null;
  position: { x: number; y: number };
  connected: boolean;
}

const status = ref('Initializing...');
const roomId = ref('');
const adminKey = ref('');
const clients = ref<MockClient[]>([]);
const mappingActive = ref(false);
const currentTick = ref(-1);
const currentCycle = ref(0);
const positions = generatePositions(20);

const adminUrl = computed(() => {
  if (!roomId.value || !adminKey.value) return '';
  return `${window.location.origin}/room/${roomId.value}/admin/spatial?key=${adminKey.value}`;
});

const adminControllerUrl = computed(() => {
  if (!roomId.value || !adminKey.value) return '';
  return `${window.location.origin}/room/${roomId.value}/admin?key=${adminKey.value}`;
});

function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

async function setup(): Promise<void> {
  try {
    // 1. Create room
    status.value = 'Creating room...';
    const room = await api.createRoom(120);
    roomId.value = room.id;
    adminKey.value = room.admin_key;
    status.value = `Room created: ${room.id}`;

    // 2. Create 20 profiles and submit to queue
    status.value = 'Creating 20 mock participants...';
    const mockClients: MockClient[] = [];

    for (let i = 0; i < 20; i++) {
      const name = NAMES[i];
      const submitResult = await api.submitToQueue(roomId.value, {
        name,
        project_name: `Project ${name}`,
        project_description: `${name}'s awesome project`,
      });

      mockClients.push({
        name,
        participantId: submitResult.id,
        passphrase: submitResult.passphrase,
        assignedId: null,
        currentColor: '#333333',
        ws: null,
        position: positions[i],
        connected: false,
      });
    }

    clients.value = mockClients;
    status.value = `Created ${mockClients.length} participants. Connecting WebSockets...`;

    // 3. Connect each as audience via WebSocket
    const wsUrl = getWsUrl();
    for (const client of clients.value) {
      connectClient(client, wsUrl);
    }

    status.value = 'Ready! Open the admin spatial mapping URL to start scanning.';
  } catch (e) {
    status.value = `Error: ${e instanceof Error ? e.message : String(e)}`;
    console.error('Setup error:', e);
  }
}

function connectClient(client: MockClient, wsUrl: string): void {
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    // Send join message
    ws.send(JSON.stringify({
      type: 'join',
      roomId: roomId.value,
      role: 'audience',
      passphrase: client.passphrase,
    }));
    client.connected = true;
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'mapping_start') {
        mappingActive.value = true;
        const assignments = msg.assignments as Record<number, number>;
        if (assignments[client.participantId] !== undefined) {
          client.assignedId = assignments[client.participantId];
        }
        client.currentColor = '#000000';
      }

      if (msg.type === 'mapping_tick') {
        const tick = msg.tick as number;
        currentTick.value = tick;
        currentCycle.value = msg.cycle as number;

        if (client.assignedId !== null) {
          const colorIndex = (client.assignedId >> (tick * 2)) & 3;
          client.currentColor = COLORS[colorIndex];
        } else {
          client.currentColor = '#000000';
        }

        // Send ack
        ws.send(JSON.stringify({
          type: 'mapping_ack',
          roomId: roomId.value,
        }));
      }

      if (msg.type === 'mapping_end') {
        mappingActive.value = false;
        client.currentColor = '#333333';
        client.assignedId = null;
      }
    } catch {
      // ignore parse errors
    }
  };

  ws.onclose = () => {
    client.connected = false;
  };

  client.ws = ws;
}

function cleanup(): void {
  for (const client of clients.value) {
    client.ws?.close();
  }
}

onMounted(() => {
  setup();
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex flex-col">
    <!-- Control panel (top bar) -->
    <div class="bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 class="text-white font-bold text-lg">Spatial Mapping Test</h1>
          <p class="text-gray-400 text-sm">{{ status }}</p>
        </div>
        <div class="flex items-center gap-4">
          <div v-if="mappingActive" class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span class="text-red-400 text-sm font-mono">
              Tick {{ currentTick + 1 }} &middot; Cycle {{ currentCycle + 1 }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div
              v-for="(c, i) in clients"
              :key="i"
              class="w-2 h-2 rounded-full"
              :class="c.connected ? 'bg-green-500' : 'bg-red-500'"
              :title="c.name"
            ></div>
          </div>
        </div>
      </div>

      <!-- Admin URLs -->
      <div v-if="roomId" class="mt-2 flex flex-wrap gap-3 text-xs">
        <div class="flex items-center gap-2">
          <span class="text-gray-500">Room:</span>
          <code class="text-cyan-400">{{ roomId }}</code>
        </div>
        <a
          v-if="adminUrl"
          :href="adminUrl"
          target="_blank"
          class="text-orange-400 hover:text-orange-300 underline"
        >
          Open Spatial Mapping →
        </a>
        <a
          v-if="adminControllerUrl"
          :href="adminControllerUrl"
          target="_blank"
          class="text-blue-400 hover:text-blue-300 underline"
        >
          Admin Controller →
        </a>
      </div>
    </div>

    <!-- Mock phone display area — this is what the camera sees -->
    <div class="flex-1 relative bg-black overflow-hidden">
      <!-- Each "phone screen" as a colored circle -->
      <div
        v-for="(client, i) in clients"
        :key="i"
        class="absolute rounded-lg flex items-center justify-center transition-colors duration-100"
        :style="{
          left: `${client.position.x * 100}%`,
          top: `${client.position.y * 100}%`,
          width: '70px',
          height: '100px',
          marginLeft: '-35px',
          marginTop: '-50px',
          backgroundColor: client.currentColor,
          boxShadow: mappingActive ? `0 0 20px ${client.currentColor}40` : 'none',
        }"
      >
        <!-- Show name label when not mapping -->
        <span
          v-if="!mappingActive"
          class="text-white text-[10px] font-bold text-center leading-tight"
          style="text-shadow: 0 1px 3px rgba(0,0,0,0.8)"
        >
          {{ client.name }}
          <br />
          <span class="text-gray-400 font-normal">#{{ client.participantId }}</span>
        </span>
      </div>

      <!-- Assignment debug overlay (bottom) -->
      <div class="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur px-3 py-2">
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono">
          <div
            v-for="(client, i) in clients"
            :key="'debug-' + i"
            class="flex items-center gap-1"
          >
            <div
              class="w-3 h-3 rounded-sm border border-white/20"
              :style="{ backgroundColor: client.currentColor }"
            ></div>
            <span class="text-gray-400">{{ client.name }}</span>
            <span v-if="client.assignedId !== null" class="text-yellow-500">={{ client.assignedId }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
