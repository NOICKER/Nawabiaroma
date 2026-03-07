import type { Request } from 'express';

export type LogOutcome = 'success' | 'failure';

export interface LogEntry {
    event_type: string;
    ip?: string;
    user_agent?: string;
    user_id?: string;
    outcome?: LogOutcome;
    [key: string]: unknown;
}

type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, entry: LogEntry) {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        ...entry,
    };

    const message = JSON.stringify(payload);

    if (level === 'error') {
        console.error(message);
        return;
    }

    if (level === 'warn') {
        console.warn(message);
        return;
    }

    console.log(message);
}

export const logger = {
    info(entry: LogEntry) {
        write('info', entry);
    },
    warn(entry: LogEntry) {
        write('warn', entry);
    },
    error(entry: LogEntry) {
        write('error', entry);
    },
};

export function getRequestLogContext(
    req: Pick<Request, 'ip' | 'headers'> & { admin?: { sub?: string } },
): Pick<LogEntry, 'ip' | 'user_agent' | 'user_id'> {
    const userAgent = req.headers['user-agent'];

    return {
        ip: req.ip,
        user_agent: typeof userAgent === 'string' ? userAgent : undefined,
        user_id: req.admin?.sub,
    };
}

export function serializeError(error: unknown) {
    if (error instanceof Error) {
        return {
            error_name: error.name,
            error_message: error.message,
            stack: error.stack,
        };
    }

    return {
        error_message: typeof error === 'string' ? error : 'Unknown error',
    };
}
