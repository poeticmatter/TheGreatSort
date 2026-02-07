/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
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

export const AnalyticsService = {
  initialize: () => {
    if (!GA_ID) {
      if (isDev) console.warn('[Analytics] No VITE_GA_ID found, skipping initialization.');
      return;
    }

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('config', GA_ID);
    } else if (isDev) {
      console.log(`[Analytics] Initialize: ${GA_ID}`);
    }
  },

  track: (eventName: string, params: AnalyticsEvent) => {
    if (!GA_ID) return;

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    } else if (isDev) {
      console.log(`[Analytics] Event: ${eventName}`, params);
    }
  },

  pageView: (path: string) => {
    if (!GA_ID) return;

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: path
      });
    } else if (isDev) {
      console.log(`[Analytics] Page View: ${path}`);
    }
  }
};
