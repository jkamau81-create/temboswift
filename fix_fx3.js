require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  // Delete duplicates keeping only the latest
  await pool.query(`
    DELETE FROM fx_rates WHERE id NOT IN (
      SELECT MAX(id) FROM fx_rates GROUP BY from_currency, to_currency
    )
  `);
  console.log('Duplicates removed');
  // Now add constraint
  await pool.query("ALTER TABLE fx_rates ADD CONSTRAINT fx_rates_pair_unique UNIQUE (from_currency, to_currency)");
  console.log('Constraint added');
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
