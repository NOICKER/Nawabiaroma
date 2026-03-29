const viteEnv =
    typeof import.meta !== 'undefined' && 'env' in import.meta
        ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
        : undefined;

const rawApiBaseUrl = viteEnv?.VITE_API_BASE_URL?.trim() ?? '';

export const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, '');

export function buildApiUrl(path: string) {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}
