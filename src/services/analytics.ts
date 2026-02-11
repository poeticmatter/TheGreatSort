/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_ID = import.meta.env.VITE_GA_ID;
const isDev = import.meta.env.DEV;

export interface AnalyticsEvent {
  event_category: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
}

// Event Queue for the Command Pattern
const eventQueue: Array<() => void> = [];
let isInitialized = false;

// Helper to handle queue flushing
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
    eventQueue.push(callback);
  }
};

export const AnalyticsService = {
  initialize: () => {
    // Idempotent check
    if (isInitialized) return;

    if (!GA_ID) {
      if (isDev) console.warn('[Analytics] No VITE_GA_ID found, skipping initialization.');
      return;
    }

    // Check availability of the global object
    // Note: We check typical GTM/GA4 signature where window.gtag is defined
    const hasGtag = typeof window !== 'undefined' && typeof window.gtag === 'function';

    if (hasGtag) {
      // Configure GA4
      window.gtag('config', GA_ID, {
        send_page_view: false // Manual page view tracking
      });

      isInitialized = true;
      flushQueue();

      if (isDev) {
        console.log(`[Analytics] Initialized for ${GA_ID}`);
      }
    } else {
      // Fallback or dry-run in Dev
      if (isDev) {
        console.log(`[Analytics] Initialize (Dev/Dry Run): ${GA_ID}`);
        isInitialized = true; // Mark initialized to flush queue to console
        flushQueue();
      } else {
        // In Prod, if gtag is missing, we DO NOT initialize.
        // Events remain safely queued until script loads or manual retry.
        console.warn('[Analytics] window.gtag is missing in production. Events are buffered.');
      }
    }
  },

  track: (eventName: string, params: AnalyticsEvent) => {
    safelyCallGtag(() => {
      if (!GA_ID && !isDev) return;

      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
      } else if (isDev) {
        console.log(`[Analytics] Event: ${eventName}`, params);
      }
    });
  },

  pageView: (path: string) => {
    safelyCallGtag(() => {
      if (!GA_ID && !isDev) return;

      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: path
        });
      } else if (isDev) {
        console.log(`[Analytics] Page View: ${path}`);
      }
    });
  }
};
