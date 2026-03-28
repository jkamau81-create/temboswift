const fs = require('fs');
let c = fs.readFileSync('src/routes/auth.js', 'utf8');
c = c.replace(
  "  } catch (err) {\n    res.status(500).json({ error: 'Failed to send verification email' });\n  }\n});",
  "  } catch (err) {\n    console.error('Send verification error:', err.message, err.stack);\n    res.status(500).json({ error: err.message });\n  }\n});"
);
fs.writeFileSync('src/routes/auth.js', c, 'utf8');
console.log('Done');
