require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    // Drop and recreate fx_rates table with proper constraint
    const { rows } = await pool.query("SELECT * FROM fx_rates LIMIT 1");
    console.log('Current fx_rates:', rows);
    await pool.query("ALTER TABLE fx_rates ADD CONSTRAINT fx_rates_pair_unique UNIQUE (from_currency, to_currency)");
    console.log('Constraint added successfully');
  } catch(e) {
    if (e.message.includes('already exists')) {
      console.log('Constraint already exists - OK');
    } else {
      console.log('Error:', e.message);
    }
  }
  pool.end();
}
run();
