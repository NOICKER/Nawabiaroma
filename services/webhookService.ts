import { query } from '../server/config/database.js';

export async function beginWebhookProcessing(input: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payload: unknown;
}) {
    const payload = JSON.stringify(input.payload);
    const insertResult = await query<{ status: string }>(
        `
            INSERT INTO webhook_events (
                provider,
                provider_event_id,
                event_type,
                payload,
                status
            )
            VALUES ($1, $2, $3, $4::jsonb, 'processing')
            ON CONFLICT (provider_event_id) DO NOTHING
            RETURNING status
        `,
        [input.provider, input.providerEventId, input.eventType, payload],
    );

    if ((insertResult.rowCount ?? 0) > 0) {
        return {
            alreadyProcessed: false,
            status: 'processing',
        };
    }

    const retryResult = await query<{ status: string }>(
        `
            UPDATE webhook_events
            SET provider = $2,
                event_type = $3,
                payload = $4::jsonb,
                status = 'processing',
                error_message = NULL,
                processed_at = NULL
            WHERE provider_event_id = $1
              AND status = 'failed'
            RETURNING status
        `,
        [input.providerEventId, input.provider, input.eventType, payload],
    );

    if ((retryResult.rowCount ?? 0) > 0) {
        return {
            alreadyProcessed: false,
            status: 'processing',
        };
    }

    const existingResult = await query<{ status: string }>(
        `
            SELECT status
            FROM webhook_events
            WHERE provider_event_id = $1
            LIMIT 1
        `,
        [input.providerEventId],
    );

    return {
        alreadyProcessed: true,
        status: existingResult.rows[0]?.status ?? 'processing',
    };
}

export async function completeWebhookProcessing(providerEventId: string) {
    await query(
        `
            UPDATE webhook_events
            SET status = 'completed',
                processed_at = NOW(),
                error_message = NULL
            WHERE provider_event_id = $1
        `,
        [providerEventId],
    );
}

export async function failWebhookProcessing(providerEventId: string, errorMessage: string) {
    await query(
        `
            UPDATE webhook_events
            SET status = 'failed',
                error_message = $2
            WHERE provider_event_id = $1
        `,
        [providerEventId, errorMessage.slice(0, 1000)],
    );
}
