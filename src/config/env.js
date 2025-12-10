const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

let loaded = false;

function loadEnv() {
  if (loaded) return;
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '.env'),
    path.join(cwd, 'backend', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      loaded = true;
      return;
    }
  }

  dotenv.config(); // fallback to default lookup
  loaded = true;
}

module.exports = { loadEnv };
