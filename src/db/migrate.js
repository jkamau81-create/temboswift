require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const schema = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(30),
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  kyc_status VARCHAR(20) DEFAULT 'pending',
  kyc_inquiry_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  delivery_method VARCHAR(20) DEFAULT 'mpesa',
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS fx_rates (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(18,6) NOT NULL,
  fee_usd NUMERIC(10,2) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES recipients(id),
  amount_usd NUMERIC(10,2) NOT NULL,
  fee_usd NUMERIC(10,2) NOT NULL,
  fx_rate NUMERIC(18,6) NOT NULL,
  amount_kes NUMERIC(14,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  delivery_method VARCHAR(20) DEFAULT 'mpesa',
  stripe_payment_intent_id VARCHAR(255),
  mpesa_conversation_id VARCHAR(255),
  mpesa_transaction_id VARCHAR(255),
  compliance_passed BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  funded_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES transfers(id),
  check_type VARCHAR(30) NOT NULL,
  result VARCHAR(20) NOT NULL,
  provider VARCHAR(50),
  raw_response JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  transfer_id UUID REFERENCES transfers(id),
  action VARCHAR(100) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients(user_id);
`;
async function migrate() {
  console.log('Running migrations...');
  try {
    await pool.query(schema);
    console.log('Migrations complete');
    await pool.query("INSERT INTO fx_rates (from_currency, to_currency, rate, fee_usd) VALUES ('USD', 'KES', 131.20, 4.99) ON CONFLICT DO NOTHING;");
    console.log('Default FX rate seeded');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
migrate();
