require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function fix() {
  await pool.query("ALTER TABLE fx_rates ADD COLUMN IF NOT EXISTS from_currency VARCHAR(10)");
  await pool.query("ALTER TABLE fx_rates ADD COLUMN IF NOT EXISTS to_currency VARCHAR(10)");
  await pool.query("ALTER TABLE fx_rates ADD COLUMN IF NOT EXISTS rate DECIMAL(10,4)");
  await pool.query("UPDATE fx_rates SET from_currency='USD', to_currency='KES', rate=129.55");
  console.log('Fixed!');
  pool.end();
}
fix().catch(e => { console.error(e.message); pool.end(); });
