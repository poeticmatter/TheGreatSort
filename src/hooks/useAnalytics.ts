import { useCallback } from 'react';
import { AnalyticsService, AnalyticsFactory } from '../services/analytics';
import { GameMode } from '../../types';

export function useAnalytics() {

  const trackPageView = useCallback((path: string) => {
    AnalyticsService.pageView(path);
  }, []);

  const trackPuzzleStarted = useCallback((mode: GameMode) => {
    AnalyticsService.track(AnalyticsFactory.puzzleStarted(mode));
  }, []);

  const trackSequenceSubmitted = useCallback((mode: GameMode, score: number, result: 'SOLVED' | 'UNSOLVED', compliance_percentage: number, target_yield: number) => {
    AnalyticsService.track(AnalyticsFactory.sequenceSubmitted(mode, score, result, compliance_percentage, target_yield));
  }, []);

  const trackReportViewed = useCallback((mode: GameMode, score: number, result: 'SOLVED' | 'UNSOLVED') => {
    AnalyticsService.track(AnalyticsFactory.reportViewed(mode, score, result));
  }, []);

  const trackPuzzleRetried = useCallback((mode: GameMode) => {
    AnalyticsService.track(AnalyticsFactory.puzzleRetried(mode));
  }, []);

  const trackPuzzleNext = useCallback((mode: GameMode) => {
    AnalyticsService.track(AnalyticsFactory.puzzleNext(mode));
  }, []);

  const trackResistanceJoined = useCallback((mode: GameMode) => {
    AnalyticsService.track(AnalyticsFactory.resistanceJoined(mode));
  }, []);

  const trackShare = useCallback((context: string, mode: GameMode) => {
    AnalyticsService.track(AnalyticsFactory.share(context, mode));
  }, []);

  return {
    trackPageView,
    trackPuzzleStarted,
    trackSequenceSubmitted,
    trackReportViewed,
    trackPuzzleRetried,
    trackPuzzleNext,
    trackResistanceJoined,
    trackShare
  };
}
