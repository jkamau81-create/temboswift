const pool = require('../db/pool');
const axios = require('axios');
const logger = require('../config/logger');

const SPREAD = 0.008; // 2.2% spread — how we make money (no flat fees)

async function getLiveRate() {
  try {
    const { data } = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
    const midRate = data.rates['KES'];
    if (!midRate) throw new Error('KES rate not found');
    const clientRate = parseFloat((midRate * (1 - SPREAD)).toFixed(4));
    await pool.query(
      'INSERT INTO fx_rates (currency_pair, mid_rate, client_rate, source) VALUES ($1, $2, $3, $4) ON CONFLICT (currency_pair) DO UPDATE SET mid_rate = $2, client_rate = $3, updated_at = NOW()',
      ['USD_KES', midRate, clientRate, 'exchangerate-api']
    );
    return { mid_rate: midRate, client_rate: clientRate };
  } catch (err) {
    logger.warn('FX rate fetch failed, using fallback', { error: err.message });
    try {
      const { rows } = await pool.query("SELECT mid_rate, client_rate FROM fx_rates WHERE currency_pair = 'USD_KES'");
      if (rows.length) return { mid_rate: parseFloat(rows[0].mid_rate), client_rate: parseFloat(rows[0].client_rate) };
    } catch (dbErr) { logger.error('DB fallback failed', { error: dbErr.message }); }
    return { mid_rate: 131.0, client_rate: parseFloat((131.0 * (1 - SPREAD)).toFixed(4)) };
  }
}

async function getQuote(amountUsd) {
  const { mid_rate, client_rate } = await getLiveRate();
  const amountKes = parseFloat((amountUsd * client_rate).toFixed(2));
  return {
    amount_usd: amountUsd,
    amount_kes: amountKes,
    fee_usd: 0,
    total_usd: amountUsd,
    mid_rate,
    client_rate,
    spread_pct: (SPREAD * 100).toFixed(1),
  };
}

module.exports = { getLiveRate, getQuote };
