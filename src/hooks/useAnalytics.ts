import { useCallback } from 'react';
import { AnalyticsService } from '../services/analytics';
import { useGameContext } from '../context/GameContext';

export function useAnalytics() {
  const context = useGameContext();
  // Safe access in case useAnalytics is used outside GameProvider (though it shouldn't be per requirements)
  // But to fail gracefully if context is missing (though useGameContext throws).
  const { gameMode } = context.state;

  const trackPageView = useCallback((path: string) => {
    AnalyticsService.pageView(path);
  }, []);

  const trackLevelStart = useCallback(() => {
    AnalyticsService.track('level_start', {
      event_category: 'Lifecycle',
      mode: gameMode
    });
  }, [gameMode]);

  const trackInspectorRun = useCallback((score: number, result: 'SOLVED' | 'UNSOLVED') => {
    AnalyticsService.track('inspector_run', {
      event_category: 'Gameplay',
      mode: gameMode,
      score: score,
      result: result
    });
  }, [gameMode]);

  const trackAuditViewed = useCallback((score: number, result: 'SOLVED' | 'UNSOLVED') => {
    AnalyticsService.track('audit_viewed', {
      event_category: 'Engagement',
      mode: gameMode,
      score: score,
      result: result
    });
  }, [gameMode]);

  const trackLevelAction = useCallback((action: 'retry' | 'next_level') => {
    AnalyticsService.track('level_action', {
      event_category: 'Interaction',
      action_type: action,
      mode: gameMode
    });
  }, [gameMode]);

  const trackResistanceJoined = useCallback(() => {
    AnalyticsService.track('resistance_joined', {
      event_category: 'Conversion'
    });
  }, []);

  const trackShare = useCallback((context: string) => {
    AnalyticsService.track('share', {
      event_category: 'Engagement',
      context: context,
      mode: gameMode
    });
  }, [gameMode]);

  const trackToolInteraction = useCallback((tool: string, action: 'select' | 'use') => {
    AnalyticsService.track('tool_interaction', {
      event_category: 'Gameplay',
      event_label: `${tool}_${action}`,
      tool_name: tool,
      action_type: action,
      mode: gameMode
    });
  }, [gameMode]);

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
