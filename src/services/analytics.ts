/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_ID = import.meta.env.VITE_GA_ID;
const isDev = import.meta.env.DEV;
const MAX_QUEUE_DEPTH = 50;
const INIT_RETRY_delay = 1000;
const MAX_INIT_RETRIES = 5;

let isInitialized = false;
let initRetries = 0;
const eventQueue: Array<() => void> = [];

// --- Event Schemas ---

import { GameMode } from '../../types';

export interface BaseEventParams {
  event_category: string;
  game_mode: GameMode;
  [key: string]: any;
}

// Strict Factory Methods replace loose tracking
export const AnalyticsFactory = {
  puzzleStarted: (mode: GameMode) => ({
    name: 'puzzle_started',
    params: {
      event_category: 'Lifecycle',
      game_mode: mode
    }
  }),

  sequenceSubmitted: (mode: GameMode, score: number, result: 'SOLVED' | 'UNSOLVED', compliance_percentage: number, target_yield: number) => ({
    name: 'sequence_submitted',
    params: {
      event_category: 'Gameplay',
      game_mode: mode,
      score,
      result,
      compliance_percentage,
      target_yield
    }
  }),

  reportViewed: (mode: GameMode, score: number, result: 'SOLVED' | 'UNSOLVED') => ({
    name: 'report_viewed',
    params: {
      event_category: 'Engagement',
      game_mode: mode,
      score,
      result
    }
  }),

  puzzleRetried: (mode: GameMode) => ({
    name: 'puzzle_retried',
    params: {
      event_category: 'Interaction',
      game_mode: mode
    }
  }),

  puzzleNext: (mode: GameMode) => ({
    name: 'puzzle_next',
    params: {
      event_category: 'Interaction',
      game_mode: mode
    }
  }),

  resistanceJoined: (mode: GameMode) => ({
    name: 'resistance_joined',
    params: {
      event_category: 'Conversion',
      game_mode: mode
    }
  }),

  share: (context: string, mode: GameMode) => ({
    name: 'share',
    params: {
      event_category: 'Engagement',
      context,
      game_mode: mode
    }
  })
};


// --- Internal Logic ---

const flushQueue = () => {
  while (eventQueue.length > 0) {
    const command = eventQueue.shift();
    if (command) {
      try {
        command();
      } catch (err) {
        console.error('[Analytics] Error processing queued event:', err);
      }
    }
  }
};

const safelyCallGtag = (callback: () => void) => {
  if (isInitialized) {
    callback();
  } else {
    if (eventQueue.length < MAX_QUEUE_DEPTH) {
      eventQueue.push(callback);
    } else {
      if (isDev) console.warn('[Analytics] Queue full, dropping event.');
    }
  }
};

// --- Service ---

export const AnalyticsService = {
  initialize: () => {
    if (isInitialized) return;

    if (!GA_ID) {
      if (isDev) console.warn('[Analytics] No VITE_GA_ID found, skipping initialization.');
      return;
    }

    const checkGtag = () => {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        // Success
        window.gtag('config', GA_ID, {
          send_page_view: false,
          anonymize_ip: true
        });
        isInitialized = true;
        flushQueue();
        if (isDev) console.log(`[Analytics] Initialized for ${GA_ID}`);
      } else {
        // Failure / Retry Logic
        if (initRetries < MAX_INIT_RETRIES) {
          initRetries++;
          setTimeout(checkGtag, INIT_RETRY_delay * Math.pow(1.5, initRetries)); // Exponential backoff
        } else {
          // Circuit Breaker: Stop trying, but maybe allow dev mode to "fake" init
          if (isDev) {
            console.log(`[Analytics] Dev Mode: Mocking Initialization after timeout.`);
            isInitialized = true;
            flushQueue();
          } else {
            console.warn('[Analytics] Failed to detect window.gtag after retries. Analytics disabled.');
            // Optionally clear queue to free memory
            eventQueue.length = 0;
          }
        }
      }
    };

    checkGtag();
  },

  track: (eventData: { name: string; params: BaseEventParams }) => {
    safelyCallGtag(() => {
      // Double check availability at runtime
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', eventData.name, eventData.params);
      } else if (isDev) {
        console.log(`[Analytics] Event: ${eventData.name}`, eventData.params);
      }
    });
  },

  pageView: (path: string) => {
    // Sanitize Path: Remove query parameters? The Prompt asks to avoid "state-heavy query parameters".
    // For a game, queries often hold state or share IDs.
    // Let's strip standard UTMs and maybe keep relevant game IDs if non-sensitive.
    // For safety, let's strip ALL query params unless whitelisted.
    // Or just log the pathname.

    // Safest approach: Log pathname only.
    const [cleanPath] = path.split('?');

    safelyCallGtag(() => {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: cleanPath
        });
      } else if (isDev) {
        console.log(`[Analytics] Page View: ${cleanPath}`);
      }
    });
  }
};
