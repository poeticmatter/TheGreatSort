import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnalyticsService } from '../services/analytics';

/**
 * AnalyticsTracker component listens for route changes using useLocation
 * and automatically triggers a page view event in AnalyticsService.
 * Must be rendered as a child of a Router component.
 */
export const AnalyticsTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Track the current path whenever it changes
        AnalyticsService.pageView(location.pathname + location.search);
    }, [location]);

    return null;
};
