const fs = require('fs');
let c = fs.readFileSync('src/routes/stripe-webhook.js', 'utf8');

// Add rapyd import
c = c.replace(
  "const mpesa = require('../services/mpesa');",
  "const mpesa = require('../services/mpesa');\nconst { sendMpesaPayout } = require('../services/rapyd');"
);

// Replace mpesa sandbox payout with Rapyd
c = c.replace(
  `if (transfer.delivery_method === 'mpesa') {
        const payout = await mpesa.b2cPayout({ transferId, phoneNumber: recipient.phone, amountKes: transfer.amount_kes, remarks: \`KenyaSend \${transferId.slice(0,8)}\` });
        await pool.query('UPDATE transfers SET mpesa_conversation_id = $1 WHERE id = $2', [payout.conversationId, transferId]);
        logger.info('M-Pesa payout initiated', { transferId });`,
  `if (transfer.delivery_method === 'mpesa') {
        const payout = await sendMpesaPayout(recipient.phone, parseFloat(transfer.amount_kes), recipient.full_name, transferId);
        const rapydId = payout?.data?.id || null;
        await pool.query('UPDATE transfers SET mpesa_conversation_id = $1, status = $2 WHERE id = $3', [rapydId, 'processing', transferId]);
        logger.info('Rapyd M-Pesa payout initiated', { transferId, rapydId });`
);

fs.writeFileSync('src/routes/stripe-webhook.js', c, 'utf8');
console.log('Done');
