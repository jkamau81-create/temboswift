require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    await pool.query("ALTER TABLE fx_rates ADD CONSTRAINT fx_rates_pair_unique UNIQUE (from_currency, to_currency)");
    console.log('Constraint added');
  } catch(e) {
    console.log('Constraint may already exist:', e.message);
  }
  pool.end();
}
run();
