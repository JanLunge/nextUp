import type { WSMessage } from '@/types';
import { useWebSocket as useVueWebSocket } from '@vueuse/core';
import { onUnmounted, ref, type ComputedRef, type Ref } from 'vue';

function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // Derive WebSocket URL from current page location
  // Use /ws path which gets proxied in development
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

const WS_BASE = getWsUrl();

export type WebSocketRole = 'presenter' | 'participant' | 'timer' | 'admin';

export interface UseWebSocketOptions {
  role?: WebSocketRole;
  passphrase?: string | null;
  adminKey?: string | null;
  onMessage?: (message: WSMessage) => void;
}

export interface UseWebSocketReturn {
  isConnected: Ref<boolean>;
  lastMessage: Ref<WSMessage | null>;
  error: Ref<string | null>;
  connect: (newRoomId?: string) => void;
  disconnect: () => void;
  sendMessage: (message: Record<string, unknown>) => void;
  startTimer: (duration?: number) => void;
  stopTimer: () => void;
  restartTimer: (duration?: number) => void;
}

export function useWebSocket(
  roomId: Ref<string> | ComputedRef<string> | string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    role = 'participant',
    passphrase = null,
    adminKey = null,
    onMessage = () => {},
  } = options;

  const isConnected = ref(false);
  const lastMessage = ref<WSMessage | null>(null);
  const error = ref<string | null>(null);

  const url = ref(WS_BASE);

  const getRoomId = (): string => {
    if (typeof roomId === 'string') return roomId;
    return roomId.value;
  };

  // Build WebSocket connection
  const { send, open, close } = useVueWebSocket(url, {
    autoReconnect: {
      retries: 5,
      delay: 1000,
      onFailed() {
        error.value = 'Failed to connect after 5 retries';
      },
    },
    immediate: false,
    onConnected() {
      isConnected.value = true;
      error.value = null;
      // Send join message
      const joinMessage = {
        type: 'join',
        roomId: getRoomId(),
        role,
        passphrase,
        adminKey,
      };
      console.log('[WS] Sending join message:', {
        ...joinMessage,
        passphrase: passphrase ? `${passphrase.substring(0, 10)}...` : null,
      });
      send(JSON.stringify(joinMessage));
    },
    onDisconnected() {
      isConnected.value = false;
    },
    onError(e) {
      error.value = 'WebSocket error';
      console.error('[WS] WebSocket error:', e);
      console.error('[WS] Attempted URL:', url.value);
    },
    onMessage(_ws, event) {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        lastMessage.value = message;
        onMessage(message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    },
  });

  function connect(newRoomId?: string): void {
    const targetRoomId = newRoomId || getRoomId();
    if (!targetRoomId) return;

    url.value = WS_BASE;
    open();
  }

  function disconnect(): void {
    close();
  }

  function sendMessage(message: Record<string, unknown>): void {
    if (isConnected.value) {
      send(JSON.stringify(message));
    }
  }

  // Timer control
  function startTimer(duration?: number): void {
    sendMessage({
      type: 'timer_control',
      action: 'start',
      roomId: getRoomId(),
      duration,
    });
  }

  function stopTimer(): void {
    sendMessage({
      type: 'timer_control',
      action: 'stop',
      roomId: getRoomId(),
    });
  }

  function restartTimer(duration?: number): void {
    sendMessage({
      type: 'timer_control',
      action: 'restart',
      roomId: getRoomId(),
      duration,
    });
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    startTimer,
    stopTimer,
    restartTimer,
  };
}
