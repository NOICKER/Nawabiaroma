import { query } from '../server/config/database.js';

export async function beginWebhookProcessing(input: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payload: unknown;
}) {
    const existingResult = await query<{ status: string }>(
        `
            SELECT status
            FROM webhook_events
            WHERE provider_event_id = $1
            LIMIT 1
        `,
        [input.providerEventId],
    );

    if ((existingResult.rowCount ?? 0) > 0) {
        return {
            alreadyProcessed: true,
            status: existingResult.rows[0].status,
        };
    }

    await query(
        `
            INSERT INTO webhook_events (
                provider,
                provider_event_id,
                event_type,
                payload,
                status
            )
            VALUES ($1, $2, $3, $4::jsonb, 'processing')
        `,
        [input.provider, input.providerEventId, input.eventType, JSON.stringify(input.payload)],
    );

    return {
        alreadyProcessed: false,
        status: 'processing',
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
