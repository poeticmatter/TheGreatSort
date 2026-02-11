import { useCallback } from 'react';
import { AnalyticsService } from '../services/analytics';

export function useAnalytics() {
  const trackPageView = useCallback((path: string) => {
    AnalyticsService.pageView(path);
  }, []);

  const trackLevelStart = useCallback((mode: 'DAILY' | 'PRACTICE' | 'RESISTANCE') => {
    AnalyticsService.track('level_start', {
      event_category: 'Lifecycle',
      mode: mode
    });
  }, []);

  const trackInspectorRun = useCallback((mode: 'DAILY' | 'PRACTICE' | 'RESISTANCE', score: number, result: 'SOLVED' | 'UNSOLVED') => {
    AnalyticsService.track('inspector_run', {
      event_category: 'Gameplay',
      mode: mode,
      score: score,
      result: result
    });
  }, []);

  const trackAuditViewed = useCallback((mode: 'DAILY' | 'PRACTICE' | 'RESISTANCE', score: number, result: 'SOLVED' | 'UNSOLVED') => {
    AnalyticsService.track('audit_viewed', {
      event_category: 'Engagement',
      mode: mode,
      score: score,
      result: result
    });
  }, []);

  const trackLevelAction = useCallback((action: 'retry' | 'next_level', mode: 'DAILY' | 'PRACTICE' | 'RESISTANCE') => {
    AnalyticsService.track('level_action', {
      event_category: 'Interaction',
      action_type: action,
      mode: mode
    });
  }, []);

  const trackResistanceJoined = useCallback(() => {
    AnalyticsService.track('resistance_joined', {
      event_category: 'Conversion'
    });
  }, []);

  const trackShare = useCallback((context: string) => {
    AnalyticsService.track('share', {
      event_category: 'Engagement',
      context: context
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

  return {
    trackPageView,
    trackLevelStart,
    trackInspectorRun,
    trackAuditViewed,
    trackLevelAction,
    trackResistanceJoined,
    trackShare,
    trackToolInteraction
  };
}
