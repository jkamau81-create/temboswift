require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("UPDATE fx_rates SET rate = 128.55, fetched_at = NOW() WHERE from_currency = 'USD'")
  .then(() => { console.log('Rate updated to 128.55'); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
