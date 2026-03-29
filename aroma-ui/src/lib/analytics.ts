import ReactGA from 'react-ga4';

export interface AnalyticsAdapter {
    initialize: (measurementId: string) => void;
    send: (payload: { hitType: 'pageview'; page: string; title?: string }) => void;
}

interface AnalyticsControllerOptions {
    measurementId: string;
    adapter: AnalyticsAdapter;
}

function resolveAnalyticsMeasurementId() {
    return import.meta.env?.VITE_GA_MEASUREMENT_ID?.trim() ?? '';
}

const reactGaAdapter: AnalyticsAdapter = {
    initialize(measurementId) {
        ReactGA.initialize(measurementId);
    },
    send(payload) {
        ReactGA.send(payload);
    },
};

export function createAnalyticsController({ measurementId, adapter }: AnalyticsControllerOptions) {
    let hasInitialized = false;

    return {
        initialize() {
            if (!measurementId || hasInitialized) {
                return false;
            }

            adapter.initialize(measurementId);
            hasInitialized = true;
            return true;
        },
        trackPageView(page: string, title?: string) {
            if (!hasInitialized) {
                return false;
            }

            adapter.send({
                hitType: 'pageview',
                page,
                title,
            });

            return true;
        },
    };
}

export function isStorefrontPath(pathname: string) {
    return !pathname.startsWith('/admin');
}

const storefrontAnalytics = createAnalyticsController({
    measurementId: resolveAnalyticsMeasurementId(),
    adapter: reactGaAdapter,
});

export function initializeAnalytics() {
    return storefrontAnalytics.initialize();
}

export function trackAnalyticsPageView(page: string, title?: string) {
    return storefrontAnalytics.trackPageView(page, title);
}
