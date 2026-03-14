ALTER TABLE addresses
    ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_addresses_session_id ON addresses(session_id);
