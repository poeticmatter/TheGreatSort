/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

const isDev = import.meta.env.DEV;

export const AnalyticsService = {
  initialize: (trackingId: string) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('config', trackingId);
    } else if (isDev) {
      console.log(`[Analytics] Initialize: ${trackingId}`);
    }
  },

  track: (eventName: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    } else {
      if (isDev) {
        console.log(`[Analytics] Event: ${eventName}`, params);
      }
    }
  },

  pageView: (path: string) => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
            page_path: path
        });
    } else {
        if (isDev) {
            console.log(`[Analytics] Page View: ${path}`);
        }
    }
  }
};
