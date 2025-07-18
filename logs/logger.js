const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'logs');
const logPath = path.join(logDir, 'license.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

function logEvent(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  console.log(entry);
  fs.appendFile(logPath, entry, (err) => {
    if (err) console.error("⚠️ Failed to write log:", err.message);
  });
}

module.exports = { logEvent };
