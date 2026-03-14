const pool = require('../db/pool');
const logger = require('../config/logger');
const SANCTIONS_LIST = ['al-qaeda','isis','hamas','hezbollah','kim jong','maduro','lukashenko','taliban'];
function fraudScore({ amountUsd, isNewUser, hourOfDay }) {
  let score = 0;
  if (amountUsd > 2000) score += 30;
  if (amountUsd > 5000) score += 40;
  if (isNewUser) score += 20;
  if (hourOfDay < 5) score += 10;
  return score;
}
async function runChecks(transfer, user, recipient) {
  const checks = [];
  const name = (user.full_name + ' ' + recipient.full_name).toLowerCase();
  const sanctioned = SANCTIONS_LIST.some(s => name.includes(s));
  checks.push({ check_type: 'sanctions', result: sanctioned ? 'fail' : 'pass', provider: 'internal_ofac', raw: { name, sanctioned } });
  const createdAt = new Date(user.created_at);
  const isNewUser = (Date.now() - createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000;
  const hourOfDay = new Date().getUTCHours();
  const score = fraudScore({ amountUsd: transfer.amount_usd, isNewUser, hourOfDay });
  const fraudResult = score > 70 ? 'fail' : score > 40 ? 'review' : 'pass';
  checks.push({ check_type: 'fraud', result: fraudResult, provider: 'internal_rules', raw: { score, isNewUser, hourOfDay } });
  const { rows: recentTx } = await pool.query(
    "SELECT COALESCE(SUM(amount_usd), 0) as total FROM transfers WHERE user_id = $1 AND status = 'delivered' AND created_at > NOW() - INTERVAL '30 days'",
    [user.id]
  );
  const monthlyVolume = parseFloat(recentTx[0].total) + transfer.amount_usd;
  checks.push({ check_type: 'aml', result: monthlyVolume > 10000 ? 'review' : 'pass', provider: 'internal_velocity', raw: { monthlyVolume } });
  for (const c of checks) {
    await pool.query(
      'INSERT INTO compliance_checks (transfer_id, check_type, result, provider, raw_response) VALUES ($1, $2, $3, $4, $5)',
      [transfer.id, c.check_type, c.result, c.provider, JSON.stringify(c.raw)]
    );
  }
  const overallPass = checks.every(c => c.result === 'pass');
  const hasBlock = checks.some(c => c.result === 'fail');
  logger.info('Compliance checks complete', { transferId: transfer.id });
  return {
    passed: overallPass,
    blocked: hasBlock,
    checks,
    reason: hasBlock ? checks.find(c => c.result === 'fail').check_type + ' check failed' : null,
  };
}
module.exports = { runChecks };
