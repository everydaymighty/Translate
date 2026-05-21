# NODE // ROADMAP

> A virtual operating system that lives in a browser tab. You log in. Your friends are there. You share a desktop, a disk, and — eventually — a rented machine that does the heavy thinking for all of you.

---

## THE GOAL (one paragraph, keep this in your head)

**NODE is a place, not a tool.** A shared computer your friends hang out inside. You drag files to each other. You draw on the same canvas at the same time. You open an "AI Studio" window and the image renders on a GPU you all chipped in to rent — and everyone watches it appear. Friends can write their own apps and drop them in like installing a program on a real OS. It feels like its own world, with its own aesthetic, its own rules, its own software ecosystem. It's a `discord` you can `walk around in`, a `Minecraft server` for productivity and creativity, a `LAN party` that never ends.

---

## END STATE — what "done" looks like

When this is finished, here is what a Tuesday night in NODE looks like:

You open `node.yourdomain.com`. The boot screen flashes. You log in. The taskbar shows three friends already online. Your desktop loads exactly as you left it — your wallpaper, your pinned apps, the half-finished drawing in Paint from last week. You double-click **Rooms** and join "The Lounge." Now you're seeing your friends' cursors moving across the same desktop, each with a colored name label. Someone opens the shared **Whiteboard** and starts sketching. Someone else opens **AI Studio**, types "asiimov-style space cowboy," and you all watch the image appear over the next 8 seconds — rendered on the rented GPU you share. Someone drops a `.txt` file into the room and it shows up on everyone's desktop. There's a music app playing the same song in everyone's tabs, synced. Voice chat is a small floating window. The terminal works — a real Linux shell on the rented box. Someone wrote a custom blackjack game last week and it's now a shared app in the menu. It feels like your computer, and like a hangout, at the same time.

That's the destination.

---

## PHASES

Each phase ships something usable. You don't have to do all of them. You can stop at any point and have a real product.

---

### PHASE 0 — Local Shell ✓ DONE

What you have right now: a single fullscreen HTML file with a working window manager, Paint, a taskbar, a Start menu. Lives on your machine. No backend. No friends yet.

---

### PHASE 1 — Polish the local shell (you, weekends, ~1–2 weeks)

**Goal:** Make NODE feel like a real OS even before networking exists. So that when friends finally do join, they're walking into something that already has soul.

Build these apps (still single-player, still one HTML file):

- **Notes** — markdown editor with autosave to `localStorage`
- **File Explorer** — virtual in-memory filesystem with folders, drag-to-move, right-click menu
- **Terminal** — fake shell with `help`, `ls`, `cat`, `open <app>`, easter eggs
- **Calculator** — straightforward
- **Image Viewer** — opens dropped images
- **Music** — drop in `.mp3`s, basic player UI
- **Clock / Stopwatch / Timer**
- **Settings** — theme switcher (light Mirror's Edge / dark Asiimov / custom accent), wallpaper picker, username

Shell upgrades:
- **Boot screen** — short animated NODE logo before desktop loads
- **Window snapping** — drag a window to screen edge → snap to half/quarter
- **Right-click context menus** on desktop and inside apps
- **Notifications** — small toasts that slide up from the taskbar
- **Sound design** — subtle click, window-open whoosh, boot chime
- **Persistence** — everything saves to `localStorage` so it survives refresh

**Stack:** Still pure HTML/CSS/JS. No server yet.
**Cost:** $0.
**Why this phase matters:** You'll learn how your apps want to talk to each other (the "OS APIs") before you complicate it with networking.

---

### PHASE 2 — Backend foundation (~1 weekend)

**Goal:** Get NODE onto the internet. Friends can visit a URL and see the desktop. Still no shared state — everyone is alone — but it's now a thing that exists at an address.

What you build:
- Rent a tiny VPS — **Hetzner CX11 (~$4/mo)** or **DigitalOcean droplet ($6/mo)**
- Install Node.js, set up an **Express** server that serves the HTML
- Point a domain at it (Namecheap, ~$10/yr)
- Set up **HTTPS** via Caddy or Cloudflare (free)
- Deploy via `git pull` + `pm2` to keep it running

**Stack:** Linux VPS, Node.js, Express, Caddy.
**Cost:** ~$5/mo + $10/yr.
**New skill:** SSH, basic Linux, `systemd` or `pm2`, domain DNS.

After this: you can text a friend a URL and they're inside NODE.

---

### PHASE 3 — Accounts & cloud persistence (~1 week)

**Goal:** Your stuff follows you. Log in from any browser, see your files, notes, settings.

What you build:
- **SQLite** database (single file, zero setup)
- **Sign up / log in** — start with username + password (bcrypt), upgrade to magic-link email later
- Server endpoints: save/load user files, notes, settings as JSON
- Client switches from `localStorage` to API calls

**Stack:** Node + Express + SQLite + bcrypt + JWT (or session cookies).
**Cost:** still $5/mo.
**New skill:** auth basics, REST APIs, schema design.

---

### PHASE 4 — Multiplayer presence (~1–2 weeks)

**Goal:** See your friends. The "wow this feels real" moment.

What you build:
- **WebSocket layer** via `socket.io`
- **Live cursors** — every connected user is a colored cursor with their name floating above it
- **Online list** in the taskbar tray
- **Voice chat** via **PeerJS** or **LiveKit** (free tier) — drop-in WebRTC, no need to roll your own
- **Text chat** overlay window
- **Status messages** ("alex is using Paint")

**Stack:** add `socket.io` + WebRTC layer.
**Cost:** still $5/mo. LiveKit has a generous free tier.
**New skill:** WebSocket events, real-time state, NAT traversal basics.

This is the phase where NODE starts to feel like an MMO, not a website.

---

### PHASE 5 — Shared workspaces & collaborative apps (~2–3 weeks)

**Goal:** Not just "see each other" but *do things together*.

What you build:
- **Rooms** — invite-only spaces. You're not in one big chaotic desktop, you join named rooms.
- **Shared windows** — when you open Paint in a room, your friends can watch your strokes in real time. Multi-cursor Paint.
- **Shared Whiteboard** — infinite canvas, everyone draws at once, with sticky notes
- **Drop zone** — drag a file from your desktop into a room → everyone in the room sees it
- **Shared clipboard** — copy on your machine, paste on theirs

**Stack:** CRDTs (use **Yjs** — it's the gold standard, plays nicely with WebSocket and gives you free conflict resolution).
**Cost:** still $5/mo.
**New skill:** CRDTs / operational transform, conflict resolution, "last writer wins vs merge."

This is the hard phase. Real-time collaborative state is genuinely difficult. Yjs hides 80% of the pain.

---

### PHASE 6 — The rented brain 🧠 (~2–4 weeks)

**Goal:** This is the "rent a computer and run it off its parts" idea. NODE gets a body. Apps stop being toys and start doing real work.

You rent a beefier box — a **GPU server**. Cheapest options:
- **Vast.ai** — community-rented GPUs, ~$0.20–0.50/hr, pay-per-use
- **RunPod** — similar, slightly more polished, ~$0.30/hr for an RTX 3090
- **Hetzner GPU dedicated** — ~$200/mo flat for a real machine if you go all-in

The compute box runs a **worker service** (Python + FastAPI). Your main NODE server passes it jobs. Results stream back to the browser.

What this unlocks — these become real apps in NODE:
- **AI Studio** — Stable Diffusion, image-to-image, inpainting (Automatic1111 or ComfyUI under the hood)
- **AI Chat** — a local LLM (Llama 3, Mistral) running on your hardware — free unlimited messages once it's up
- **Code Sandbox** — actually runs Python/JS, returns output. Like a tiny Replit inside NODE.
- **Video Editor** — ffmpeg-powered trim/convert/compress
- **Music Generator** — local audio model
- **Whisper** — transcribe any audio file dropped into NODE
- **Real Terminal** — actual shell on the rented box (this is powerful and dangerous; sandbox carefully)

**Stack:** rented GPU box, Docker, FastAPI, a job queue (Redis + BullMQ or just simple polling at first).
**Cost:** $0–60/mo depending on usage. Vast.ai you pay per second of GPU time, so it can be near-zero if nobody's generating.
**New skill:** Docker, job queues, sandboxing untrusted code, model hosting.

After this phase, NODE is no longer "a fancy website." It's a small distributed system.

---

### PHASE 7 — Plugin / App SDK (~2 weeks)

**Goal:** Anyone — you, your friends, strangers eventually — can write apps for NODE.

App format:
```
my-app/
  manifest.json     name, icon, permissions
  index.html        app UI
  app.js            logic
  icon.svg
```

Apps get a runtime API:
- `node.fs` — read/write to the user's virtual filesystem
- `node.compute` — submit jobs to the rented brain
- `node.room` — broadcast/listen to room events
- `node.ui` — open dialogs, notifications, file pickers
- `node.user` — who am I, who else is here

Apps run in a sandboxed `iframe` for security. Friends can write a poker game over a weekend and it shows up in everyone's app menu.

**Stack:** iframe sandboxing, `postMessage` for the SDK, an app registry (just a folder + DB table).
**Cost:** $0 marginal.
**New skill:** sandboxing, designing a small API surface, versioning.

This is where NODE transitions from "thing you built" to "platform other people build on."

---

### PHASE 8 — The cool stuff (ongoing forever)

Once the platform is real, you keep adding:

- **Watch Party** — paste a YouTube/Twitch URL, everyone watches in sync with a chat sidebar
- **Music Rooms** — collaborative queue, listening together
- **Public rooms** — discover other people's NODEs, drop in
- **Themes & wallpapers** — user-made, share-able
- **Custom desktops** — let users rearrange the whole shell
- **Mobile build** — pinch-zoom, touch-first
- **App store** — browse and install community apps
- **Mod support** — let people fork the shell itself
- **Achievements / unlockables** — give it game feel
- **Easter eggs** — a hidden CRT mode, a secret password that turns the whole UI red, etc.

---

## COST LADDER

| Phase | Monthly cost | What you're paying for |
|---|---|---|
| 0–1 | $0 | Nothing yet, runs locally |
| 2–5 | ~$5/mo | One small VPS, one domain |
| 6 | ~$5–60/mo | VPS + GPU rental (pay-per-use is cheaper than you think) |
| 7+ | scales with usage | Maybe S3 for file storage, maybe a bigger box if friends multiply |

You can run this for under $10/mo basically forever if you stay disciplined.

---

## SKILLS YOU'LL PICK UP, IN ORDER

1. JavaScript DOM + canvas → Phase 0–1
2. Linux + SSH + a VPS → Phase 2
3. Node + Express + SQL → Phase 3
4. WebSockets + real-time state → Phase 4
5. CRDTs (Yjs) → Phase 5
6. Python + Docker + GPU model hosting → Phase 6
7. Plugin architecture + sandboxing → Phase 7

By Phase 6 you'll have shipped a real distributed system. That's a portfolio piece that beats 90% of bootcamp grads.

---

## RISKS / THINGS THAT WILL HURT

- **Real-time multiplayer state is genuinely hard.** Yjs makes it 10x easier but still expect a rough week.
- **Hosting AI models well takes ML knowledge.** Start with hosted APIs (Replicate, Together AI) for Phase 6 if you don't want to manage GPUs yet — you can swap to self-hosted later.
- **Security gets serious the moment NODE is public.** Friends-only via invite codes for a long time. Don't expose the terminal to randos.
- **Scope creep.** You will want to build every cool app idea. Force yourself through the phases in order.
- **You'll get bored in Phase 3.** Auth is unsexy. Push through. It unlocks everything.

---

## OPINIONATED RECOMMENDATIONS

- **Domain name:** pick one early — `node.gg`, `node.so`, `node-os.app`. Owning the name makes the project feel real.
- **Stack:** **Node + Express + SQLite + Socket.io + Yjs** is the path of least resistance. Don't switch frameworks mid-project. Boring is fast.
- **Don't build accounts before you have rooms.** It's tempting to build login first because it feels foundational. But getting two browsers to see each other's cursors is a 10x better motivation booster than a login page.
- **Ship to one friend in Phase 4.** Not five. One. They'll tell you what's broken and what's magic.
- **Keep the aesthetic consistent.** The orange + white + chunky black borders is your brand. Every new app must look like it belongs.

---

## IMMEDIATE NEXT STEP

Pick one of these to start Phase 1:

- **Notes app** — easiest, gives you persistence patterns you'll reuse
- **Terminal** — most fun, opens the door to easter eggs and "fake commands" that become real commands later
- **File Explorer** — most architecturally important, this is the data model the whole OS will revolve around

My vote: **File Explorer first.** Get the virtual filesystem right early, because every other app reads and writes to it. Everything else gets easier after.

---

*NODE // v0.1 — a project, a place, a thing made for friends.*
