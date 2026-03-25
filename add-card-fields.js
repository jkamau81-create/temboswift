require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255)");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4)");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS card_brand VARCHAR(20)");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS card_exp_month INTEGER");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS card_exp_year INTEGER");
  console.log('Done');
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
