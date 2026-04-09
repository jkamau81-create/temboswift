const fs = require('fs');
let c = fs.readFileSync('src/routes/stripe-webhook.js', 'utf8');

// Replace old mpesa payout with Rapyd
c = c.replace(
  `if (transfer.delivery_method === 'mpesa') {
      try {
        const payout = await mpesa.b2cPayout({ transferId, phoneNumber: recipient.phone, amountKes: transfer.amount_kes, remarks: \`KenyaSend \${transferId.slice(0,8)}\` });
        await pool.query('UPDATE transfers SET mpesa_conversation_id = $1 WHERE id = $2', [payout.conversationId, transferId]);
        logger.info('M-Pesa payout initiated', { transferId });
      } catch (mpesaErr) {
        await pool.query("UPDATE transfers SET status = 'failed', failure_reason = $1 WHERE id = $2", [\`M-Pesa error: \${mpesaErr.message}\`, transferId]);
      }
    }`,
  `try {
        const { sendMpesaPayout } = require('../services/rapyd');
        const payout = await sendMpesaPayout(recipient.phone, parseFloat(transfer.amount_kes), recipient.full_name, transferId);
        const rapydId = payout?.data?.id || null;
        await pool.query("UPDATE transfers SET status = 'processing', mpesa_conversation_id = $1 WHERE id = $2", [rapydId, transferId]);
        logger.info('Rapyd payout initiated', { transferId, rapydId });
      } catch (payoutErr) {
        logger.error('Rapyd payout error', { transferId, error: payoutErr.message });
        await pool.query("UPDATE transfers SET status = 'failed', failure_reason = $1 WHERE id = $2", [\`Payout error: \${payoutErr.message}\`, transferId]);
      }`
);

fs.writeFileSync('src/routes/stripe-webhook.js', c, 'utf8');
console.log('Done');
