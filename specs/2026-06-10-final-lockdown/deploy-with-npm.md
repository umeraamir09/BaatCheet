# Deploy BaatCheet Signaling Server with Nginx Proxy Manager

You already have Nginx Proxy Manager (NPM) running on your server. This guide adds the BaatCheet signaling server alongside it.

## Architecture

```
Internet
   │
   ▼
:80/:443  Nginx Proxy Manager (Docker)
   │
   ├── signal.yourdomain.com → localhost:3001 (BaatCheet)
   └── everything else → whatever else you host
   │
   ▼
localhost:3001  BaatCheet signaling server (PM2 on host)
```

---

## Step 1 — Prepare the Server

SSH in and install dependencies:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22 LTS
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install build tools (needed for mediasoup native module)
sudo apt install -y build-essential python3 git

# Install PM2 (process manager)
npm install -g pm2
```

---

## Step 2 — Deploy the Server Code

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/baatcheet.git
cd baatcheet/apps/server

# Install dependencies
bun install
```

Create the `.env` file:

```bash
cat > .env << 'EOF'
SERVER_PORT=3001
CORS_ORIGIN=https://signal.yourdomain.com
CLERK_SECRET_KEY=sk_live_YOUR_LIVE_KEY_HERE
EOF
```

Replace with your actual values.

---

## Step 3 — Start the Server with PM2

```bash
cd ~/baatcheet/apps/server

# Start the server
pm2 start --interpreter bun src/index.ts --name baatcheet-server

# Verify it's running
pm2 status

# View logs
pm2 logs baatcheet-server

# Set PM2 to restart on system reboot
pm2 save
pm2 startup
```

Follow the instructions PM2 gives you for `pm2 startup` (it will print a `sudo env PATH=...` command to run).

Verify the server is listening:

```bash
curl http://localhost:3001/health
```

Expected:
```json
{"status":"ok","timestamp":1234567890}
```

---

## Step 4 — Expose the Server Through Your Firewall

Your NPM is already using ports 80 and 443. The signaling server runs on port 3001 internally. NPM will proxy external traffic to it.

**You do NOT need to open port 3001 to the internet.** NPM connects to `localhost:3001` from inside the server.

If UFW is active, nothing needs to change — ports 80 and 443 are already open for NPM.

```bash
sudo ufw status
```

---

## Step 5 — Point Your Domain

In your DNS provider, add:

| Type | Name | Value |
|------|------|-------|
| A | signal | YOUR_SERVER_IP |

Wait for propagation (5-30 minutes). Verify:

```bash
ping signal.yourdomain.com
```

---

## Step 6 — Configure Nginx Proxy Manager

1. Open NPM admin panel: `http://YOUR_SERVER_IP:81`
2. Log in (default: `admin@example.com` / `changeme`)

### 6a — Add a Proxy Host

1. Click **Proxy Hosts** in the left sidebar
2. Click **Add Proxy Host**

Fill in the **Domain** tab:

| Field | Value |
|-------|-------|
| Domain Names | `signal.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname / IP | `localhost` |
| Forward Port | `3001` |
| Block Common Exploits | ✅ ON |
| Websockets Support | ✅ **ON** (critical!) |

**WebSocket Support must be ON.** Without it, Socket.IO cannot connect.

Click **Save**.

### 6b — Enable SSL

1. Click **Edit** (three dots) on the host you just created
2. Go to the **SSL** tab
3. Select **Request a new SSL Certificate**
4. Toggle **Force SSL** ON
5. Toggle **HTTP/2 Support** ON
6. Enter your email address
7. Check **I Agree to the Let's Encrypt Terms of Service**
8. Click **Save**

NPM will automatically obtain a Let's Encrypt certificate. Wait 30 seconds.

### 6c — Add Custom WebSocket Headers

Still in the Edit screen, go to the **Custom Locations** tab (or **Advanced** tab depending on NPM version).

If you don't see a way to add custom headers, go to the **Advanced** tab and paste this in the **Custom Nginx Configuration** box:

```nginx
# WebSocket support (already enabled via toggle, but adding explicit config)

# Increase buffer sizes for large WebSocket frames
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# Timeouts for long-lived connections
proxy_read_timeout 86400s;
proxy_send_timeout 86400s;

# Forward client IP info
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

Click **Save**.

---

## Step 7 — Test

### Test 1: HTTPS Health Check

```bash
curl https://signal.yourdomain.com/health
```

Expected:
```json
{"status":"ok","timestamp":1234567890}
```

### Test 2: Check SSL

Open in a browser:
```
https://signal.yourdomain.com
```

You should see a **padlock icon** (secure). The page may show an error — that's fine, Socket.IO expects a handshake, not a regular HTTP request.

### Test 3: Check WebSocket

```bash
npm install -g wscat
wscat -c wss://signal.yourdomain.com/socket.io/?EIO=4&transport=websocket
```

If it connects, WebSocket is working.

### Test 4: Update the Electron App

In `apps/desktop/.env.local`:
```
VITE_SOCKET_URL=https://signal.yourdomain.com
```

Restart the dev server and test the app.

---

## Step 8 — Set Up Auto-Reboot Persistence

Make sure the server starts if the VPS reboots:

```bash
# PM2 startup (run once)
pm2 startup
# It will print a command — run that command

# Save current process list
pm2 save
```

If using Docker for NPM, make sure Docker is also set to restart:

```bash
sudo systemctl enable docker
```

---

## Step 9 — Update the Server Later

When you push new code:

```bash
cd ~/baatcheet
git pull
cd apps/server
bun install
pm2 restart baatcheet-server
```

---

## Common Issues

### "WebSocket connection failed"

- Open NPM admin → Edit the proxy host → **Confirm WebSocket Support is ON**
- Check PM2 logs: `pm2 logs baatcheet-server`
- Check NPM logs: `docker logs nginx-proxy-manager`

### SSL certificate fails

- Make sure DNS is pointing to the correct IP
- Make sure port 80 is reachable from the internet
- In NPM, delete the host and re-add it with SSL

### "502 Bad Gateway"

The signaling server isn't running:

```bash
pm2 status
pm2 restart baatcheet-server
pm2 logs baatcheet-server --lines 50
```

### Clerk verifyToken fails

- Use `sk_live_...` not `sk_test_...`
- Make sure `CORS_ORIGIN` in `.env` matches your app URL exactly
- Check the server logs for the full error

### mediasoup fails to start

Build tools might be missing:

```bash
sudo apt install -y build-essential python3
cd ~/baatcheet/apps/server
rm -rf node_modules
bun install
pm2 restart baatcheet-server
```

---

## PM2 Cheat Sheet

```bash
pm2 status                          # See all running processes
pm2 logs baatcheet-server           # Tail logs
pm2 logs baatcheet-server --lines 100  # Last 100 lines
pm2 restart baatcheet-server        # Restart after code changes
pm2 stop baatcheet-server           # Stop
pm2 delete baatcheet-server         # Remove from PM2
pm2 save                            # Save process list (for reboot)
pm2 startup                         # Set up auto-start on boot
```

---

## What Your NPM Setup Looks Like

```
External traffic (signal.yourdomain.com:443)
   │
   ▼
Nginx Proxy Manager (Docker, ports 80/443/81)
   │
   ├── SSL termination (Let's Encrypt)
   ├── WebSocket upgrade headers
   └── proxy_pass → localhost:3001
   │
   ▼
BaatCheet server (PM2, port 3001)
   │
   ├── Socket.IO (WebSocket auth, voice signaling)
   └── mediasoup (WebRTC media routing)
```
