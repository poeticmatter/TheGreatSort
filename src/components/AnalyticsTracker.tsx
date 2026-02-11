import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';

/**
 * AnalyticsTracker component listens for route changes using useLocation
 * and automatically triggers a page view event via useAnalytics.
 * Must be rendered as a child of a Router component and GameProvider.
 */
export const AnalyticsTracker = () => {
    const location = useLocation();
    const { trackPageView } = useAnalytics();

    useEffect(() => {
        // Track the current path whenever it changes
        trackPageView(location.pathname + location.search);
    }, [location, trackPageView]);

    return null;
};
