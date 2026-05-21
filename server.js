// NODE — server.js
// Run with: node server.js
// Then open: http://localhost:3000

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'desktop.html');

const server = http.createServer((req, res) => {
  // Serve desktop.html for every request (single-page app)
  fs.readFile(FILE, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 — desktop.html not found next to server.js');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  NODE is running at  →  http://localhost:${PORT}\n`);
  console.log('  Put desktop.html in the same folder as server.js.');
  console.log('  Press Ctrl+C to stop.\n');
});
