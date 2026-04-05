require('dotenv').config();
process.env.RAPYD_ACCESS_KEY = 'rak_7D9E45520D2D7B4B6BAB';
process.env.RAPYD_SECRET_KEY = 'rsk_0894147495020198d424a4a922b242beb2dbc025d1cf1c38b37e846649b481a16ed0701926ec2160';
const { sendMpesaPayout } = require('./src/services/rapyd');
async function test() {
  try {
    const result = await sendMpesaPayout('+254712345678', 100, 'Test User', 'test-123');
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
    if (e.response) console.error('Details:', JSON.stringify(e.response.data, null, 2));
  }
}
test();
