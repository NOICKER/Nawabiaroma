import type { CorsOptions } from 'cors';

function stripWrappingQuotes(value: string) {
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1).trim();
    }

    return value;
}

export function normalizeCorsOrigin(value: string): string | null {
    const trimmedValue = stripWrappingQuotes(value.trim());

    if (!trimmedValue) {
        return null;
    }

    try {
        return new URL(trimmedValue).origin;
    } catch {
        return trimmedValue.replace(/\/+$/, '');
    }
}

export function parseCorsOrigins(value: string | undefined) {
    if (!value) {
        return [];
    }

    return [...new Set(value.split(/[,\r\n]+/).map(normalizeCorsOrigin).filter((origin) => origin !== null))];
}

export function createCorsOriginConfig(configuredOrigins: string[]): CorsOptions['origin'] {
    if (configuredOrigins.length === 0) {
        return true;
    }

    const allowedOrigins = new Set(configuredOrigins);

    return (requestOrigin, callback) => {
        if (!requestOrigin) {
            callback(null, true);
            return;
        }

        callback(null, allowedOrigins.has(normalizeCorsOrigin(requestOrigin) ?? ''));
    };
}
