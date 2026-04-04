require('dotenv').config();
const { sendMpesaPayout } = require('./src/services/rapyd');
async function test() {
  try {
    const result = await sendMpesaPayout('+254712345678', 1000, 'Test User', 'test-123');
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
    if (e.response) console.error('Response:', JSON.stringify(e.response.data, null, 2));
  }
}
test();
