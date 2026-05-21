// NODE — server.js  (WebSocket multiplayer edition + Owner/Spectate/Main Desktop)
// Run:  node server.js
// Open: http://localhost:3000

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'desktop.html');

// ── In-memory state ──────────────────────────────────────────
const clients      = new Map();   // uid -> { ws, name, color, x, y, isOwner }
const chatHistory  = {};          // channel -> [msg, ...]  (last 200 each)
const MAX_MSGS     = 200;

let ownerUid = null;              // first user to join becomes owner

// Shared Main Desktop state
// mainDesktop: { notes: [{id,x,y,w,h,text,color}], icons: [{id,x,y,emoji,label}] }
let mainDesktop = { notes: [], icons: [] };

// Spectate registry: spectatorUid -> targetUid
const spectating = new Map();

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

function broadcastAll(msg) {
  const raw = JSON.stringify(msg);
  clients.forEach((client) => {
    if (client.ws.readyState === 1) client.ws.send(raw);
  });
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function sendToUid(uid, msg) {
  const c = clients.get(uid);
  if (c) send(c.ws, msg);
}

function buildAdminSnapshot() {
  const users = [];
  clients.forEach((c, uid) => {
    users.push({ uid, name: c.name, color: c.color, isOwner: c.isOwner || false });
  });
  return { type: 'admin_snapshot', users };
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
        // First joiner becomes owner
        const isOwner = (ownerUid === null);
        if (isOwner) ownerUid = myUid;

        clients.set(myUid, { ws, name: msg.name || 'NODE', color: msg.color || '#B89A5C', x: 0.5, y: 0.5, isOwner });

        // Send them a snapshot of all current peers
        const peers = [];
        clients.forEach((c, uid) => {
          if (uid !== myUid) peers.push({ uid, name: c.name, color: c.color, x: c.x, y: c.y, isOwner: c.isOwner || false });
        });
        send(ws, { type: 'presence_snapshot', peers });

        // Send owner status + main desktop state
        send(ws, { type: 'you_joined', uid: myUid, isOwner, ownerUid });
        send(ws, { type: 'main_desktop_snapshot', ...mainDesktop });

        // If owner, also send the full admin snapshot
        if (isOwner) send(ws, buildAdminSnapshot());

        // Tell everyone else this user joined
        broadcast({ type: 'presence', uid: myUid, name: msg.name, color: msg.color, x: 0.5, y: 0.5, isOwner }, myUid);
        // Update owner's admin panel
        sendToUid(ownerUid, buildAdminSnapshot());

        console.log(`[+] ${msg.name} (${myUid})${isOwner ? ' [OWNER]' : ''} joined — ${clients.size} online`);
        break;
      }

      // ── Cursor / identity update ─────────────────────────
      case 'presence': {
        if (!myUid) { myUid = msg.uid; clients.set(myUid, { ws, name: msg.name, color: msg.color, x: msg.x, y: msg.y, isOwner: false }); }
        const c = clients.get(myUid);
        if (c) { c.name = msg.name || c.name; c.color = msg.color || c.color; c.x = msg.x ?? c.x; c.y = msg.y ?? c.y; }
        broadcast({ type: 'presence', uid: myUid, name: msg.name, color: msg.color, x: msg.x, y: msg.y, isOwner: c?.isOwner || false }, myUid);
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
        broadcast({ type: 'chat', ...entry }, myUid);
        break;
      }

      // ── Main Desktop update (anyone can post sticky notes / move icons) ──
      case 'main_desktop_update': {
        if (msg.notes !== undefined) mainDesktop.notes = msg.notes;
        if (msg.icons !== undefined) mainDesktop.icons = msg.icons;
        // Broadcast to everyone except sender
        broadcast({ type: 'main_desktop_snapshot', ...mainDesktop }, myUid);
        break;
      }

      // ── Spectate: viewer wants to watch targetUid ────────
      case 'spectate_start': {
        if (!myUid || !msg.targetUid) break;
        spectating.set(myUid, msg.targetUid);
        // Tell target someone is watching them
        sendToUid(msg.targetUid, { type: 'being_watched', watcherUid: myUid, watcherName: clients.get(myUid)?.name || '???' });
        // Tell the spectator "ok, here is the target info"
        const target = clients.get(msg.targetUid);
        send(ws, { type: 'spectate_ack', targetUid: msg.targetUid, targetName: target?.name || '???' });
        break;
      }

      case 'spectate_stop': {
        if (!myUid) break;
        const oldTarget = spectating.get(myUid);
        spectating.delete(myUid);
        if (oldTarget) sendToUid(oldTarget, { type: 'watch_ended', watcherUid: myUid });
        break;
      }

      // ── Owner: kick a user ──────────────────────────────
      case 'kick': {
        const c = clients.get(myUid);
        if (!c || !c.isOwner) break; // only owner can kick
        if (msg.targetUid === myUid) break; // can't kick yourself
        const target = clients.get(msg.targetUid);
        if (target) {
          send(target.ws, { type: 'kicked', reason: msg.reason || 'Removed by owner.' });
          setTimeout(() => target.ws.close(), 200);
        }
        console.log(`[KICK] ${c.name} kicked ${target?.name || msg.targetUid}`);
        break;
      }

      // ── Owner: force-spectate (owner watches any user) ──
      case 'owner_spectate': {
        const c = clients.get(myUid);
        if (!c || !c.isOwner) break;
        const target = clients.get(msg.targetUid);
        if (!target) break;
        send(ws, { type: 'spectate_ack', targetUid: msg.targetUid, targetName: target.name, forced: true });
        sendToUid(msg.targetUid, { type: 'being_watched', watcherUid: myUid, watcherName: c.name, isOwner: true });
        break;
      }

      // ── Admin panel request (owner refreshes) ───────────
      case 'admin_refresh': {
        const c = clients.get(myUid);
        if (c?.isOwner) send(ws, buildAdminSnapshot());
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!myUid) return;
    const c = clients.get(myUid);
    console.log(`[-] ${c?.name || myUid} left — ${clients.size - 1} online`);

    // Clean up spectate relationships
    spectating.delete(myUid);
    spectating.forEach((targetUid, watcherUid) => {
      if (targetUid === myUid) {
        spectating.delete(watcherUid);
        sendToUid(watcherUid, { type: 'spectate_ended', reason: 'User disconnected.' });
      }
    });

    clients.delete(myUid);
    broadcast({ type: 'presence_remove', uid: myUid });

    // If owner left, promote next user
    if (ownerUid === myUid) {
      ownerUid = null;
      if (clients.size > 0) {
        const [newOwnerUid, newOwnerClient] = clients.entries().next().value;
        ownerUid = newOwnerUid;
        newOwnerClient.isOwner = true;
        send(newOwnerClient.ws, { type: 'promoted_owner' });
        send(newOwnerClient.ws, buildAdminSnapshot());
        broadcastAll({ type: 'presence', uid: newOwnerUid, name: newOwnerClient.name, color: newOwnerClient.color, x: newOwnerClient.x, y: newOwnerClient.y, isOwner: true });
        console.log(`[OWNER] Promoted ${newOwnerClient.name} (${newOwnerUid}) to owner`);
      }
    }

    // Refresh owner's admin panel
    if (ownerUid) sendToUid(ownerUid, buildAdminSnapshot());
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
