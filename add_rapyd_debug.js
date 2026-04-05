const fs = require('fs');
let c = fs.readFileSync('src/services/rapyd.js', 'utf8');

if (!c.includes("console.log('RAPYD BODY:')")) {
  c = c.replace(
    "  const response = await makeRequest(",
    "  console.log('RAPYD BODY:');\n  console.log(JSON.stringify(body, null, 2));\n  const response = await makeRequest("
  );
}

fs.writeFileSync('src/services/rapyd.js', c, 'utf8');
console.log('Done');
