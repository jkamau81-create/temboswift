const fs = require('fs');
let c = fs.readFileSync('src/services/email.js', 'utf8');

const verifyFn = `
async function sendVerificationEmail(email, name, token) {
  const verifyUrl = \`https://temboswift-backend.onrender.com/api/auth/verify-email/\${token}\`;
  await resend.emails.send({
    from: 'notifications@temboswift.com',
    to: email,
    subject: 'Verify your TemboSwift email',
    html: \`
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:40px 20px">
        <img src="https://temboswift.com/logo.png" width="120" style="margin-bottom:24px"/>
        <h2 style="color:#0b5e35">Welcome to TemboSwift, \${name}!</h2>
        <p style="color:#666;font-size:15px">Please verify your email address to start sending money.</p>
        <a href="\${verifyUrl}" style="display:inline-block;background:#0b5e35;color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:700;font-size:15px;margin:20px 0">
          Verify Email Address
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">TemboSwift · Fast · Secure · Transparent</p>
      </div>
    \`
  });
}
`;

// Add before module.exports
c = c.replace('module.exports = {', verifyFn + '\nmodule.exports = {');

// Add to exports
c = c.replace('module.exports = {', 'module.exports = {\n  sendVerificationEmail,');

fs.writeFileSync('src/services/email.js', c, 'utf8');
console.log('Done');
