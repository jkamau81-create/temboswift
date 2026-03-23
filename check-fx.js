require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fx_rates'")
  .then(r => { console.log(r.rows.map(x => x.column_name)); pool.end(); })
  .catch(err => { console.error(err.message); pool.end(); });
