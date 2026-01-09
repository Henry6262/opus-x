/**
 * Vibr Coder State Machine
 *
 * Controls character animations based on trading/social events
 */

import { useEffect, useState, useCallback } from 'react';
import { AnimationState } from '@/components/VibrCoder';

// ============================================
// EVENT TYPES
// ============================================

export type TradingEventType =
  // Sniper Events
  | 'IDLE'
  | 'TOKEN_DETECTED'
  | 'ANALYSIS_START'
  | 'ANALYSIS_COMPLETE'
  | 'TOKEN_REJECTED'
  | 'BUY_EXECUTE'
  | 'BUY_SUCCESS'
  | 'BUY_FAILED'
  // Social Events
  | 'TWEET_DETECTED'
  | 'IMAGE_GENERATING'
  | 'IMAGE_READY'
  | 'TWEET_POSTED';

export interface TradingEvent {
  type: TradingEventType;
  data?: unknown;
  timestamp: number;
}

// ============================================
// STATE MACHINE
// ============================================

/**
 * Maps trading events to character animation states
 */
function mapEventToState(event: TradingEventType): AnimationState {
  const mapping: Record<TradingEventType, AnimationState> = {
    // Default
    IDLE: 'idle',

    // Sniper workflow
    TOKEN_DETECTED: 'idle',        // Keep scanning
    ANALYSIS_START: 'analyzing',   // Lean in and focus
    ANALYSIS_COMPLETE: 'idle',     // Return to scanning
    TOKEN_REJECTED: 'rejecting',   // Dismissive gesture
    BUY_EXECUTE: 'buying',         // FURIOUS TYPING
    BUY_SUCCESS: 'idle',           // Return to scanning
    BUY_FAILED: 'idle',            // Return to scanning

    // Social workflow
    TWEET_DETECTED: 'alert',       // Surprise reaction
    IMAGE_GENERATING: 'generating', // AR goggles mode
    IMAGE_READY: 'generating',     // Keep generating until posted
    TWEET_POSTED: 'posting',       // Finger gun
  };

  return mapping[event] || 'idle';
}

/**
 * Determines if an animation should auto-return to idle
 */
function shouldAutoReturn(state: AnimationState): boolean {
  // These states should automatically return to idle after playing
  return ['rejecting', 'buying', 'alert', 'posting'].includes(state);
}

// ============================================
// HOOK
// ============================================

interface UseVibrCoderStateOptions {
  /** WebSocket or event stream (optional) */
  eventStream?: {
    subscribe: (callback: (event: TradingEvent) => void) => () => void;
  };

  /** Auto-return to idle after non-looping animations (default: true) */
  autoReturn?: boolean;

  /** Delay before returning to idle (ms, default: 1000) */
  returnDelay?: number;
}

export function useVibrCoderState(options: UseVibrCoderStateOptions = {}) {
  const { eventStream, autoReturn = true, returnDelay = 1000 } = options;

  const [currentState, setCurrentState] = useState<AnimationState>('idle');
  const [eventQueue, setEventQueue] = useState<TradingEvent[]>([]);

  // Manual event trigger (for testing or direct control)
  const triggerEvent = useCallback((eventType: TradingEventType, data?: unknown) => {
    const event: TradingEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    setEventQueue(queue => [...queue, event]);
  }, []);

  // Process events from queue
  useEffect(() => {
    if (eventQueue.length === 0) return;

    const event = eventQueue[0];
    const newState = mapEventToState(event.type);

    console.log('[VibrCoder] Event:', event.type, '→ State:', newState);

    setCurrentState(newState);

    // Auto-return to idle for one-shot animations
    if (autoReturn && shouldAutoReturn(newState)) {
      const timer = setTimeout(() => {
        console.log('[VibrCoder] Auto-return to idle');
        setCurrentState('idle');
      }, returnDelay);

      return () => clearTimeout(timer);
    }

    // Remove processed event
    setEventQueue(queue => queue.slice(1));
  }, [eventQueue, autoReturn, returnDelay]);

  // Subscribe to external event stream
  useEffect(() => {
    if (!eventStream) return;

    const unsubscribe = eventStream.subscribe((event) => {
      setEventQueue(queue => [...queue, event]);
    });

    return unsubscribe;
  }, [eventStream]);

  return {
    /** Current animation state */
    state: currentState,

    /** Manually trigger an event */
    triggerEvent,

    /** Manually set state (bypass event system) */
    setState: setCurrentState,

    /** Pending events in queue */
    queueLength: eventQueue.length,
  };
}

// ============================================
// EXAMPLES
// ============================================

/**
 * Example 1: Manual control
 */
export function useManualVibrCoder() {
  const { state, triggerEvent } = useVibrCoderState();

  const handleTokenDetected = () => triggerEvent('TOKEN_DETECTED');
  const handleBuyExecute = () => triggerEvent('BUY_EXECUTE');
  const handleTweetDetected = () => triggerEvent('TWEET_DETECTED');

  return {
    state,
    handleTokenDetected,
    handleBuyExecute,
    handleTweetDetected,
  };
}

/**
 * Example 2: WebSocket integration
 */
export function useWebSocketVibrCoder(wsUrl: string) {
  const [eventStream] = useState(() => {
    const subscribers = new Set<(event: TradingEvent) => void>();

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as TradingEvent;
      subscribers.forEach(callback => callback(event));
    };

    return {
      subscribe: (callback: (event: TradingEvent) => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      close: () => ws.close(),
    };
  });

  return useVibrCoderState({ eventStream });
}
