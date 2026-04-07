-- Core Loop Migration
-- Adds risk classification columns and guardian notification tables

-- Add risk scoring columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk_score INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS classification TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_risk_score ON transactions(risk_score);
CREATE INDEX IF NOT EXISTS idx_transactions_classification ON transactions(classification);

-- Guardians table (MVP: single guardian per user, no auth yet)
CREATE TABLE IF NOT EXISTS guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will link to users table when auth is added
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    relationship TEXT, -- 'partner', 'parent', 'friend', 'counsellor'
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guardian notifications table
CREATE TABLE IF NOT EXISTS guardian_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- pattern type or 'CONVERSATION_SUMMARY', 'TEST'
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    delivery_status TEXT DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardians_user_id ON guardians(user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_guardian_id ON guardian_notifications(guardian_id);
CREATE INDEX IF NOT EXISTS idx_guardian_notifications_sent_at ON guardian_notifications(sent_at DESC);

-- Add updated_at trigger to guardians
CREATE TRIGGER update_guardians_updated_at
    BEFORE UPDATE ON guardians
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_notifications ENABLE ROW LEVEL SECURITY;

-- MVP: allow all (single user)
CREATE POLICY "Allow all access to guardians"
    ON guardians FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all access to guardian_notifications"
    ON guardian_notifications FOR ALL
    USING (true)
    WITH CHECK (true);

-- Update the recent_alerts view to include risk scoring
CREATE OR REPLACE VIEW recent_alerts AS
SELECT
    t.id,
    t.transaction_id,
    t.amount,
    t.payee_name,
    t.description,
    t.timestamp,
    t.risk_score,
    t.classification,
    t.intervention_completed,
    t.voice_memo_transcript
FROM transactions t
WHERE t.is_whitelisted = FALSE
ORDER BY t.timestamp DESC
LIMIT 50;
