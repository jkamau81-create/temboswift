require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("UPDATE users SET kyc_status = 'approved' WHERE email = 'test@kenyasend.com'")
  .then(r => { console.log('KYC approved, rows updated:', r.rowCount); pool.end(); })
  .catch(err => { console.error(err.message); pool.end(); });
