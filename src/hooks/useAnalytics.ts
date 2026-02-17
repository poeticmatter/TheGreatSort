import { useCallback } from 'react';
import { AnalyticsService, AnalyticsFactory } from '../services/analytics';
import { GameMode } from '../../types';

export function useAnalytics() {

  const trackPageView = useCallback((path: string) => {
    AnalyticsService.pageView(path);
  }, []);

  const trackLevelStart = useCallback((mode: GameMode) => {
    AnalyticsService.track(AnalyticsFactory.levelStart(mode));
  }, []);

  const trackInspectorRun = useCallback((mode: GameMode, score: number, result: 'SOLVED' | 'UNSOLVED') => {
    AnalyticsService.track(AnalyticsFactory.inspectorRun(mode, score, result));
  }, []);

  const trackAuditViewed = useCallback((mode: GameMode, score: number, result: 'SOLVED' | 'UNSOLVED') => {
    AnalyticsService.track(AnalyticsFactory.auditViewed(mode, score, result));
  }, []);

  const trackLevelAction = useCallback((action: 'retry' | 'next_level', mode: GameMode) => {
    AnalyticsService.track(AnalyticsFactory.levelAction(action, mode));
  }, []);

  const trackResistanceJoined = useCallback(() => {
    AnalyticsService.track(AnalyticsFactory.resistanceJoined());
  }, []);

  const trackShare = useCallback((context: string, mode: GameMode) => {
    AnalyticsService.track(AnalyticsFactory.share(context, mode));
  }, []);

  return {
    trackPageView,
    trackLevelStart,
    trackInspectorRun,
    trackAuditViewed,
    trackLevelAction,
    trackResistanceJoined,
    trackShare
  };
}
