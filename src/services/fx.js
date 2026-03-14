const axios = require('axios');
const pool = require('../db/pool');
const logger = require('../config/logger');
const CACHE_TTL_MINUTES = 30;
const MARKUP = 0.015;
const BASE_FEE_USD = 4.99;
async function getQuote(amountUsd) {
  const midRate = await getMidRate();
  const clientRate = +(midRate * (1 - MARKUP)).toFixed(4);
  const fee = amountUsd >= 200 ? 4.99 : amountUsd >= 100 ? 3.99 : 2.99;
  const amountKes = +((amountUsd - fee) * clientRate).toFixed(2);
  return {
    from_currency: 'USD',
    to_currency: 'KES',
    amount_usd: amountUsd,
    fee_usd: fee,
    mid_rate: midRate,
    client_rate: clientRate,
    amount_kes: amountKes,
    expires_in: 300,
  };
}
async function getMidRate() {
  const { rows } = await pool.query(
    "SELECT rate FROM fx_rates WHERE from_currency = 'USD' AND to_currency = 'KES' AND fetched_at > NOW() - INTERVAL '30 minutes' ORDER BY fetched_at DESC LIMIT 1"
  );
  if (rows.length) return parseFloat(rows[0].rate);
  try {
    const resp = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.FX_API_KEY}/pair/USD/KES`
    );
    const rate = resp.data.conversion_rate;
    await pool.query(
      "INSERT INTO fx_rates (from_currency, to_currency, rate, fee_usd) VALUES ('USD', 'KES', $1, $2)",
      [rate, BASE_FEE_USD]
    );
    logger.info('FX rate refreshed', { rate });
    return rate;
  } catch (err) {
    logger.warn('FX rate fetch failed, using fallback', { error: err.message });
    return 131.20;
  }
}
module.exports = { getQuote, getMidRate };
