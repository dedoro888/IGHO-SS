import { Room } from '../types';

export type LiveRoomActionType = 'add' | 'update' | 'delete';

export interface LiveRoomEventPayload {
  action: LiveRoomActionType;
  room?: Room;
  roomId?: string;
  hotelId?: string;
  timestamp: number;
}

// In-browser BroadcastChannel for zero-latency (<1ms) multi-tab synchronization
const liveChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('igho_live_bus')
  : null;

/**
 * Dispatch a live room action across server (SSE) and local tabs (BroadcastChannel)
 */
export async function broadcastLiveRoomAction(
  action: LiveRoomActionType,
  room?: Room | null,
  roomId?: string,
  hotelId?: string
) {
  const payload: LiveRoomEventPayload = {
    action,
    room: room || undefined,
    roomId: roomId || room?.id,
    hotelId: hotelId || room?.hotelId,
    timestamp: Date.now(),
  };

  // 1. Broadcast locally across tabs immediately (0ms)
  try {
    liveChannel?.postMessage({ type: 'room_changed', payload });
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }

  // 2. Dispatch in current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('igho_live_room_event', { detail: payload })
    );
  }

  // 3. Post to backend server for multi-device SSE distribution
  try {
    await fetch('/api/rooms/live-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Server room live-action error:', err);
  }
}

/**
 * Hook or subscriber for live room events
 */
export function subscribeToLiveEvents(
  onRoomEvent: (payload: LiveRoomEventPayload) => void,
  onStateUpdated?: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Listen to local window events
  const handleLocalEvent = (e: Event) => {
    const customEvent = e as CustomEvent<LiveRoomEventPayload>;
    if (customEvent.detail) {
      onRoomEvent(customEvent.detail);
    }
  };
  window.addEventListener('igho_live_room_event', handleLocalEvent);

  // 2. Listen to BroadcastChannel across tabs
  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === 'room_changed' && event.data.payload) {
      onRoomEvent(event.data.payload);
    } else if (event.data?.type === 'state_updated') {
      onStateUpdated?.();
    }
  };
  liveChannel?.addEventListener('message', handleChannelMessage);

  // 3. Listen to Server-Sent Events (SSE) from the backend
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource('/api/events');

    eventSource.addEventListener('room_changed', (e: MessageEvent) => {
      try {
        const payload: LiveRoomEventPayload = JSON.parse(e.data);
        onRoomEvent(payload);
      } catch (err) {
        console.warn('Failed to parse SSE room_changed payload:', err);
      }
    });

    eventSource.addEventListener('state_updated', () => {
      onStateUpdated?.();
    });

    eventSource.onerror = () => {
      // EventSource automatically retries connection
    };
  } catch (err) {
    console.warn('Failed to initialize SSE EventSource:', err);
  }

  // Cleanup
  return () => {
    window.removeEventListener('igho_live_room_event', handleLocalEvent);
    liveChannel?.removeEventListener('message', handleChannelMessage);
    if (eventSource) {
      eventSource.close();
    }
  };
}
