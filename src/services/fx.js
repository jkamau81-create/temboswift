const pool = require('../db/pool');
const axios = require('axios');
const logger = require('../config/logger');

const SPREAD = 0.008; // 0.8% spread - best rate in market

async function getLiveRate() {
  try {
    const { data } = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
    const midRate = data.rates['KES'];
    if (!midRate) throw new Error('KES rate not found');
    const clientRate = parseFloat((midRate * (1 - SPREAD)).toFixed(4));
    await pool.query(
      'INSERT INTO fx_rates (from_currency, to_currency, rate, fee_usd) VALUES ($1, $2, $3, $4) ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = $3, fee_usd = $4, fetched_at = NOW()',
      ['USD', 'KES', clientRate, 0]
    );
    return { mid_rate: midRate, client_rate: clientRate };
  } catch (err) {
    logger.warn('FX rate fetch failed, using fallback', { error: err.message });
    try {
      const { rows } = await pool.query("SELECT rate FROM fx_rates WHERE from_currency = 'USD' AND to_currency = 'KES'");
      if (rows.length) {
        const clientRate = parseFloat(rows[0].rate);
        const midRate = parseFloat((clientRate / (1 - SPREAD)).toFixed(4));
        return { mid_rate: midRate, client_rate: clientRate };
      }
    } catch (dbErr) { logger.error('DB fallback failed', { error: dbErr.message }); }
    const midRate = 129.59;
    return { mid_rate: midRate, client_rate: parseFloat((midRate * (1 - SPREAD)).toFixed(4)) };
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
