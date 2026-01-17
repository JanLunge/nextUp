import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { TimerPhase, WSMessage, WSTimerStartMessage, WSTimerTickMessage, WSTimerOvertimeMessage, WSTimerSyncMessage } from '@/types';

export interface UseTimerReturn {
  duration: Ref<number>;
  remaining: Ref<number>;
  overtime: Ref<number>;
  isRunning: Ref<boolean>;
  phase: Ref<TimerPhase>;
  isOvertime: ComputedRef<boolean>;
  timerClass: ComputedRef<string>;
  displayTime: ComputedRef<string>;
  progress: ComputedRef<number>;
  showNeed: ComputedRef<boolean>;
  handleTimerMessage: (message: WSMessage) => void;
  reset: () => void;
}

export function useTimer(): UseTimerReturn {
  const duration = ref(60);
  const remaining = ref(60);
  const overtime = ref(0);
  const isRunning = ref(false);
  const phase = ref<TimerPhase>('main');

  const isOvertime = computed(() => remaining.value <= 0 && isRunning.value);

  const timerClass = computed(() => {
    if (isOvertime.value) return 'timer-overtime';
    if (remaining.value <= 10) return 'timer-red';
    if (remaining.value <= 20) return 'timer-yellow';
    return 'timer-green';
  });

  const displayTime = computed(() => {
    if (isOvertime.value) {
      const mins = Math.floor(overtime.value / 60);
      const secs = overtime.value % 60;
      return `+${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const mins = Math.floor(remaining.value / 60);
    const secs = remaining.value % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  const progress = computed(() => {
    if (duration.value === 0) return 0;
    return Math.max(0, Math.min(100, (remaining.value / duration.value) * 100));
  });

  const showNeed = computed(() => phase.value === 'need');

  function handleTimerMessage(message: WSMessage): void {
    switch (message.type) {
      case 'timer_start': {
        const msg = message as WSTimerStartMessage;
        duration.value = msg.duration;
        remaining.value = msg.duration;
        overtime.value = 0;
        isRunning.value = true;
        phase.value = 'main';
        break;
      }

      case 'timer_tick': {
        const msg = message as WSTimerTickMessage;
        remaining.value = msg.remaining;
        phase.value = msg.phase || 'main';
        break;
      }

      case 'timer_end':
        remaining.value = 0;
        break;

      case 'timer_overtime': {
        const msg = message as WSTimerOvertimeMessage;
        overtime.value = msg.elapsed;
        break;
      }

      case 'timer_cleared':
        isRunning.value = false;
        remaining.value = duration.value;
        overtime.value = 0;
        phase.value = 'main';
        break;

      case 'timer_sync': {
        const msg = message as WSTimerSyncMessage;
        duration.value = msg.duration;
        remaining.value = msg.remaining;
        phase.value = msg.phase || 'main';
        overtime.value = msg.overtime || 0;
        isRunning.value = msg.running;
        break;
      }
    }
  }

  function reset(): void {
    remaining.value = duration.value;
    overtime.value = 0;
    isRunning.value = false;
    phase.value = 'main';
  }

  return {
    duration,
    remaining,
    overtime,
    isRunning,
    phase,
    isOvertime,
    timerClass,
    displayTime,
    progress,
    showNeed,
    handleTimerMessage,
    reset,
  };
}
