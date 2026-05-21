// NODE — server.js  (WebSocket multiplayer edition)
// Run:  node server.js
// Open: http://localhost:3000

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'desktop.html');

// ── In-memory state ──────────────────────────────────────────
const clients   = new Map();   // uid -> { ws, name, color, x, y }
const chatHistory = {};        // channel -> [msg, ...]  (last 200 each)
const MAX_MSGS  = 200;

// ── HTTP server (serves desktop.html for every request) ──────
const server = http.createServer((req, res) => {
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

// ── WebSocket server ─────────────────────────────────────────
const wss = new WebSocketServer({ server });

function broadcast(msg, exceptUid = null) {
  const raw = JSON.stringify(msg);
  clients.forEach((client, uid) => {
    if (uid !== exceptUid && client.ws.readyState === 1 /* OPEN */) {
      client.ws.send(raw);
    }
  });
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

wss.on('connection', (ws) => {
  let myUid = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      // ── Client announces itself ──────────────────────────
      case 'join': {
        myUid = msg.uid;
        clients.set(myUid, { ws, name: msg.name || 'NODE', color: msg.color || '#B89A5C', x: 0.5, y: 0.5 });

        // Send them a snapshot of all current peers
        const peers = [];
        clients.forEach((c, uid) => {
          if (uid !== myUid) peers.push({ uid, name: c.name, color: c.color, x: c.x, y: c.y });
        });
        send(ws, { type: 'presence_snapshot', peers });

        // Tell everyone else this user joined
        broadcast({ type: 'presence', uid: myUid, name: msg.name, color: msg.color, x: 0.5, y: 0.5 }, myUid);
        console.log(`[+] ${msg.name} (${myUid}) joined — ${clients.size} online`);
        break;
      }

      // ── Cursor / identity update ─────────────────────────
      case 'presence': {
        if (!myUid) { myUid = msg.uid; clients.set(myUid, { ws, name: msg.name, color: msg.color, x: msg.x, y: msg.y }); }
        const c = clients.get(myUid);
        if (c) { c.name = msg.name || c.name; c.color = msg.color || c.color; c.x = msg.x ?? c.x; c.y = msg.y ?? c.y; }
        broadcast({ type: 'presence', uid: myUid, name: msg.name, color: msg.color, x: msg.x, y: msg.y }, myUid);
        break;
      }

      // ── Client asks for channel history ─────────────────
      case 'chat_history': {
        const ch = msg.channel || 'the-lounge';
        const history = chatHistory[ch] || [];
        history.forEach(m => send(ws, { type: 'chat', ...m }));
        break;
      }

      // ── Chat message ─────────────────────────────────────
      case 'chat': {
        const ch = msg.channel || 'the-lounge';
        if (!chatHistory[ch]) chatHistory[ch] = [];
        const entry = {
          id: msg.id || ('s_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
          channel: ch,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderColor: msg.senderColor,
          text: String(msg.text || '').slice(0, 1000),
          ts: Date.now(),
          system: !!msg.system
        };
        chatHistory[ch].push(entry);
        if (chatHistory[ch].length > MAX_MSGS) chatHistory[ch].shift();
        // Broadcast to everyone except sender (sender already added it locally)
        broadcast({ type: 'chat', ...entry }, myUid);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!myUid) return;
    const c = clients.get(myUid);
    console.log(`[-] ${c?.name || myUid} left — ${clients.size - 1} online`);
    clients.delete(myUid);
    broadcast({ type: 'presence_remove', uid: myUid });
  });

  ws.on('error', () => ws.close());
});

// ── Start ─────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n  NODE is running at  →  http://localhost:${PORT}`);
  console.log('  WebSocket multiplayer active.');
  console.log('  Put desktop.html in the same folder as server.js.');
  console.log('  Press Ctrl+C to stop.\n');
});
