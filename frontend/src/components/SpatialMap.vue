<script setup lang="ts">
import { computed } from 'vue';
import type { SpatialPosition, SpatialOrderEntry, Participant } from '@/types';

interface Props {
  positions: SpatialPosition[];
  order: SpatialOrderEntry[];
  currentParticipantId?: number | null;
  nextParticipantId?: number | null;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currentParticipantId: null,
  nextParticipantId: null,
  compact: false,
});

const emit = defineEmits<{
  (e: 'select', participantId: number): void;
}>();

// Build ordered path for lines
const orderedPositions = computed(() => {
  if (props.order.length === 0) return [];
  return props.order
    .sort((a, b) => a.order_index - b.order_index)
    .map(o => {
      const pos = props.positions.find(p => p.participant_id === o.participant_id);
      return pos ? { ...pos, order_index: o.order_index } : null;
    })
    .filter(Boolean) as (SpatialPosition & { order_index: number })[];
});

// Find which order index is currently presenting
const currentOrderIndex = computed(() => {
  if (!props.currentParticipantId) return -1;
  const entry = props.order.find(o => o.participant_id === props.currentParticipantId);
  return entry ? entry.order_index : -1;
});

function getParticipantState(participantId: number): 'current' | 'next' | 'done' | 'queued' {
  if (participantId === props.currentParticipantId) return 'current';
  if (participantId === props.nextParticipantId) return 'next';

  const orderEntry = props.order.find(o => o.participant_id === participantId);
  if (orderEntry && currentOrderIndex.value >= 0 && orderEntry.order_index < currentOrderIndex.value) {
    return 'done';
  }
  return 'queued';
}

function getOrderNumber(participantId: number): number | null {
  const entry = props.order.find(o => o.participant_id === participantId);
  return entry ? entry.order_index + 1 : null;
}
</script>

<template>
  <div
    class="relative bg-surface-elevated border border-white/10 rounded-2xl overflow-hidden"
    :class="compact ? 'aspect-[2/1]' : 'aspect-video'"
  >
    <!-- Connection lines -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none z-10">
      <!-- Already presented lines (dimmed) -->
      <line
        v-for="(pos, i) in orderedPositions.slice(0, -1)"
        :key="'line-' + i"
        :x1="`${pos.x * 100}%`"
        :y1="`${pos.y * 100}%`"
        :x2="`${orderedPositions[i + 1].x * 100}%`"
        :y2="`${orderedPositions[i + 1].y * 100}%`"
        :stroke="
          pos.order_index < currentOrderIndex
            ? '#4ade80'
            : pos.order_index === currentOrderIndex
            ? '#FF6B4A'
            : 'rgba(255,255,255,0.15)'
        "
        :stroke-width="pos.order_index === currentOrderIndex ? 3 : 2"
        :stroke-dasharray="pos.order_index >= currentOrderIndex ? '6 3' : 'none'"
        :opacity="pos.order_index < currentOrderIndex ? 0.4 : 0.8"
      />
    </svg>

    <!-- Participant dots -->
    <div
      v-for="pos in positions"
      :key="pos.participant_id"
      class="absolute z-20 flex flex-col items-center cursor-pointer transition-all duration-300"
      :style="{
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }"
      @click="emit('select', pos.participant_id)"
    >
      <!-- Pulse ring for current presenter -->
      <div
        v-if="getParticipantState(pos.participant_id) === 'current'"
        class="absolute w-14 h-14 rounded-full border-2 border-coral animate-ping opacity-30"
      ></div>

      <!-- Dot -->
      <div
        :class="[
          'rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all',
          compact ? 'w-8 h-8' : 'w-11 h-11',
          {
            'bg-coral border-white text-white scale-125 shadow-lg shadow-coral/30': getParticipantState(pos.participant_id) === 'current',
            'bg-coral/60 border-coral text-white animate-pulse': getParticipantState(pos.participant_id) === 'next',
            'bg-success/30 border-success/50 text-success': getParticipantState(pos.participant_id) === 'done',
            'bg-surface-overlay border-white/30 text-cream': getParticipantState(pos.participant_id) === 'queued',
          }
        ]"
      >
        <span v-if="getOrderNumber(pos.participant_id)">{{ getOrderNumber(pos.participant_id) }}</span>
        <span v-else>{{ pos.name.charAt(0) }}</span>
      </div>

      <!-- Name label -->
      <div
        v-if="!compact"
        class="mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap max-w-20 truncate"
        :class="{
          'bg-coral/20 text-coral': getParticipantState(pos.participant_id) === 'current',
          'bg-surface-overlay/80 text-cream': getParticipantState(pos.participant_id) !== 'current',
        }"
      >
        {{ pos.name }}
      </div>
    </div>
  </div>
</template>
