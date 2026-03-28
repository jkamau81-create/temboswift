require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  // Fix fx_rates unique constraint
  await pool.query("ALTER TABLE fx_rates ADD CONSTRAINT IF NOT EXISTS fx_rates_pair_unique UNIQUE (from_currency, to_currency)").catch(() => {});
  // Test email service
  const { sendVerificationEmail } = require('./src/services/email');
  console.log('sendVerificationEmail:', typeof sendVerificationEmail);
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
