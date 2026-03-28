const fs = require('fs');
let c = fs.readFileSync('src/routes/auth.js', 'utf8');

// Check if email verification already exists
if (c.includes('verify-email')) {
  console.log('Already exists');
} else {
  console.log('Need to add');
}
