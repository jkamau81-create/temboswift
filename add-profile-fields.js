require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_otp VARCHAR(6),
  ADD COLUMN IF NOT EXISTS phone_otp_expires TIMESTAMP
`)
.then(() => { console.log('Migration complete'); pool.end(); })
.catch(err => { console.error(err.message); pool.end(); });
