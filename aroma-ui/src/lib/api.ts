// Vite relies on static string replacement for import.meta.env
// Direct property access is required for production builds to inject the value
const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

export const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, '');

export function buildApiUrl(path: string) {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}
