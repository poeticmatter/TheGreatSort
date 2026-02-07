import { useCallback } from 'react';
import { AnalyticsService } from '../services/analytics';

export function useAnalytics() {
  const trackPageView = useCallback((path: string) => {
    AnalyticsService.pageView(path);
  }, []);

  const trackGameStart = useCallback((mode: 'DAILY' | 'PRACTICE', seed?: number) => {
    AnalyticsService.track('game_start', {
      event_category: 'Game',
      event_label: mode,
      value: seed,
      mode: mode
    });
  }, []);

  const trackGameComplete = useCallback((mode: 'DAILY' | 'PRACTICE', score: number, optimal: number | null, efficiency: number) => {
    AnalyticsService.track('game_complete', {
      event_category: 'Game',
      event_label: mode,
      value: score,
      mode: mode,
      score: score,
      optimal_score: optimal,
      efficiency: efficiency
    });
  }, []);

  const trackToolInteraction = useCallback((tool: string, action: 'select' | 'use') => {
    AnalyticsService.track('tool_interaction', {
      event_category: 'Gameplay',
      event_label: `${tool}_${action}`,
      tool_name: tool,
      action_type: action
    });
  }, []);

  const trackDailyAuditViewed = useCallback((date: string, outcome: 'passed' | 'failed') => {
    AnalyticsService.track('daily_audit_viewed', {
      event_category: 'Engagement',
      event_label: date,
      outcome: outcome
    });
  }, []);

  return {
    trackPageView,
    trackGameStart,
    trackGameComplete,
    trackToolInteraction,
    trackDailyAuditViewed
  };
}
