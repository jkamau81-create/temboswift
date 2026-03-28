require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token VARCHAR(255)");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMP");
  console.log('Columns added');
  const { rows } = await pool.query("SELECT id, email, email_verify_token FROM users WHERE email = 'test@kenyasend.com'");
  console.log('User:', rows[0]);
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
