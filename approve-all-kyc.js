require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("UPDATE users SET kyc_status = 'approved' WHERE kyc_status != 'approved'")
  .then(r => { console.log('KYC approved for', r.rowCount, 'users'); pool.end(); })
  .catch(err => { console.error(err.message); pool.end(); });
