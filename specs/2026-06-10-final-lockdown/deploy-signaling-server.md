# Deploying BaatCheet Signaling Server to Production

This guide covers everything from buying a domain to having a fully working HTTPS WebSocket server.

---

## Table of Contents

1. [Buy a VPS](#1-buy-a-vps)
2. [Buy a Domain & Point DNS](#2-buy-a-domain--point-dns)
3. [Initial Server Setup](#3-initial-server-setup)
4. [Open Firewall Ports](#4-open-firewall-ports)
5. [Install Node.js & Bun](#5-install-nodejs--bun)
6. [Deploy the Server Code](#6-deploy-the-server-code)
7. [Install & Configure Nginx](#7-install--configure-nginx)
8. [Get an SSL Certificate with Let's Encrypt](#8-get-an-ssl-certificate-with-lets-encrypt)
9. [Secure Nginx](#9-secure-nginx)
10. [Set Up the Server as a Systemd Service](#10-set-up-the-server-as-a-systemd-service)
11. [Test Everything](#11-test-everything)
12. [Clerk Production Keys](#12-clerk-production-keys)
13. [Build the Electron App](#13-build-the-electron-app)

---

## 1. Buy a VPS

You need a cheap Linux VPS. mediasoup (voice engine) requires at least 1GB RAM and a real CPU.

**Recommended providers (cheapest first):**

| Provider | Cheapest Plan | RAM | Location | Notes |
|----------|--------------|-----|----------|-------|
| [Hetzner](https://hetzner.com) | CX22 | 4GB | Germany/Finland | Best value, €4.45/mo |
| [DigitalOcean](https://digitalocean.com) | Basic Droplet | 1GB | Worldwide | $6/mo, easy UI |
| [Vultr](https://vultr.com) | Cloud Compute | 1GB | Worldwide | $6/mo |
| [Linode/Akamai](https://akamai.com) | Shared | 1GB | Worldwide | $5/mo |

**What to select:**
- OS: **Ubuntu 22.04 LTS** (or 24.04 LTS)
- Region: Pick closest to where you and your friends live
- Plan: 1 vCPU, 1GB RAM minimum (2GB recommended for voice)

When you create the VPS, you will receive:
- IP address (e.g. `123.45.67.89`)
- Root password (or SSH key)

---

## 2. Buy a Domain & Point DNS

You need a domain so you can get an SSL certificate (HTTPS). A subdomain works too.

**Where to buy:**
- [Namecheap](https://namecheap.com) — cheapest, ~$8/year for .com
- [Cloudflare Registrar](https://cloudflare.com) — at-cost pricing, no markup
- [Google Domains](https://domains.google) — simple

**Example: `signal.baatcheet.com`**

After buying, set up DNS records. In your domain registrar's DNS panel, add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | signal | 123.45.67.89 | Auto |

This means `signal.baatcheet.com` points to your VPS IP.

**Wait 5-30 minutes for DNS propagation.** Verify with:
```bash
ping signal.baatcheet.com
```
It should return your VPS IP.

---

## 3. Initial Server Setup

SSH into your VPS:
```bash
ssh root@123.45.67.89
```

Update the system:
```bash
apt update && apt upgrade -y
```

Create a non-root user (security best practice):
```bash
adduser baatcheet
usermod -aG sudo baatcheet
```

Switch to the new user:
```bash
su - baatcheet
```

---

## 4. Open Firewall Ports

UFW (Uncomplicated Firewall) is the standard firewall on Ubuntu.

```bash
# Allow SSH so you don't lock yourself out
sudo ufw allow OpenSSH

# Allow HTTP (needed for Let's Encrypt certificate verification)
sudo ufw allow 80/tcp

# Allow HTTPS (secure WebSocket connections)
sudo ufw allow 443/tcp

# Enable the firewall
sudo ufw enable
```

**Do NOT open port 3001.** Nginx will handle incoming connections on port 443 and forward them to port 3001 internally. The signaling server should never be directly exposed to the internet.

Verify:
```bash
sudo ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
OpenSSH (v6)               ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
443/tcp (v6)               ALLOW       Anywhere (v6)
```

---

## 5. Install Node.js & Bun

```bash
# Install Node.js 22 LTS (via nvm for easy version management)
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node --version  # Should show v22.x.x

# Install Bun (our runtime)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version  # Should show 1.x.x
```

Install build tools for mediasoup (native module):
```bash
sudo apt install -y build-essential python3 git
```

---

## 6. Deploy the Server Code

**Option A: Git (recommended)**
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/baatcheet.git
cd baatcheet/apps/server
```

**Option B: Upload via SCP (from your local machine)**
```bash
# Run this on YOUR machine, not the VPS
scp -r apps/server/ baatcheet@123.45.67.89:~/baatcheet-server/
```

**On the VPS, install dependencies:**
```bash
cd ~/baatcheet/apps/server   # or ~/baatcheet-server if using SCP
bun install
```

**Create the production `.env` file:**
```bash
cat > .env << 'EOF'
SERVER_PORT=3001
CORS_ORIGIN=https://signal.baatcheet.com
CLERK_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
EOF
```

Replace:
- `signal.baatcheet.com` with your actual domain
- `sk_live_YOUR_LIVE_SECRET_KEY_HERE` with your Clerk **production** secret key

**Test the server starts:**
```bash
bun run dev
```

You should see:
```
[VoiceManager] mediasoup Worker created (pid XXXX)
Server listening at http://[::]:3001
```

Press `Ctrl+C` to stop. It works.

---

## 7. Install & Configure Nginx

### Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Verify it's running:
```bash
curl http://localhost
```
You should see the default "Welcome to nginx!" page.

### Create the Nginx Config

```bash
sudo nano /etc/nginx/sites-available/baatcheet
```

Paste this entire config (replace `signal.baatcheet.com` with your domain):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name signal.baatcheet.com;

    # Allow Let's Encrypt certificate verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server with WebSocket reverse proxy
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name signal.baatcheet.com;

    # SSL will be configured by certbot in Step 8.
    # For now, use a self-signed cert so Nginx can start.
    ssl_certificate /etc/ssl/self-signed/baatcheet.crt;
    ssl_certificate_key /etc/ssl/self-signed/baatcheet.key;

    # ── Proxy to BaatCheet signaling server ───────────────────────────────
    location / {
        proxy_pass http://127.0.0.1:3001;

        # Required for WebSocket (Socket.IO) upgrade
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forward client info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-lived WebSocket connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # ── Health check endpoint (optional, for monitoring) ──────────────────
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Generate a Temporary Self-Signed Certificate

Nginx won't start without an SSL certificate. We generate a temporary one now, then replace it with Let's Encrypt in Step 8.

```bash
sudo mkdir -p /etc/ssl/self-signed

sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/self-signed/baatcheet.key \
  -out /etc/ssl/self-signed/baatcheet.crt \
  -subj "/CN=signal.baatcheet.com"
```

### Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/baatcheet /etc/nginx/sites-enabled/

# Remove default site to avoid conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Test config for syntax errors
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

You should see:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## 8. Get an SSL Certificate with Let's Encrypt

Let's Encrypt gives you a **free** trusted SSL certificate. We use `certbot`.

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Get the Certificate

```bash
sudo certbot --nginx -d signal.baatcheet.com
```

Certbot will:
1. Verify you own the domain (via the DNS A record)
2. Obtain a certificate from Let's Encrypt
3. Automatically modify your Nginx config to use it
4. Set up auto-renewal

When prompted:
- Enter your email address
- Agree to terms of service
- Choose option 2 (redirect HTTP to HTTPS)

### Verify Auto-Renewal

```bash
sudo systemctl status certbot.timer
```

Let's Encrypt certificates expire every 90 days. Certbot auto-renews them.

Test renewal:
```bash
sudo certbot renew --dry-run
```

### Updated Nginx Config (after certbot)

Certbot modified your config. The SSL section should now look like:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name signal.baatcheet.com;

    ssl_certificate /etc/letsencrypt/live/signal.baatcheet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/signal.baatcheet.com/privkey.pem;

    # ... rest of your config
}
```

Reload Nginx:
```bash
sudo systemctl reload nginx
```

---

## 9. Secure Nginx

### Add Security Headers

```bash
sudo nano /etc/nginx/snippets/security-headers.conf
```

Paste:
```nginx
# Prevent MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Enable XSS protection
add_header X-XSS-Protection "1; mode=block" always;

# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# HSTS (only enable after confirming HTTPS works)
# add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Referrer policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Add to Your Nginx Config

```bash
sudo nano /etc/nginx/sites-available/baatcheet
```

Add this line inside the `server { }` block for port 443, right after `server_name`:

```nginx
    server_name signal.baatcheet.com;

    # Security headers
    include /etc/nginx/snippets/security-headers.conf;
```

### Rate Limiting (protect against abuse)

Add this **above** both `server` blocks (at the top level):

```nginx
# Rate limit: 10 connections per second per IP
limit_conn_zone $binary_remote_addr zone=ws_conn:10m;
```

Add inside the HTTPS `server` block, after `location /`:

```nginx
    location / {
        limit_conn ws_conn 50;  # Max 50 concurrent connections per IP
        # ... rest of your proxy config
    }
```

### Test and Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. Set Up the Server as a Systemd Service

This ensures the BaatCheet server starts automatically on boot and restarts if it crashes.

```bash
sudo nano /etc/systemd/system/baatcheet.service
```

Paste:
```ini
[Unit]
Description=BaatCheet Signaling Server
After=network.target

[Service]
Type=simple
User=baatcheet
WorkingDirectory=/home/baatcheet/baatcheet/apps/server
ExecStart=/home/baatcheet/.bun/bin/bun run src/index.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=baatcheet

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=false
ReadWritePaths=/home/baatcheet/baatcheet/apps/server

[Install]
WantedBy=multi-user.target
```

**Important:** Verify the path to bun:
```bash
which bun
# Should be something like /home/baatcheet/.bun/bin/bun
```

### Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable baatcheet
sudo systemctl start baatcheet
```

### Check Status

```bash
sudo systemctl status baatcheet
```

Expected output:
```
● baatcheet.service - BaatCheet Signaling Server
     Loaded: loaded (/etc/systemd/system/baatcheet.service; enabled; vendor preset: enabled)
     Active: active (running) since ...
   Main PID: 12345 (bun)
```

### View Logs

```bash
sudo journalctl -u baatcheet -f
```

You should see:
```
[VoiceManager] mediasoup Worker created (pid XXXX)
Server listening at http://[::]:3001
```

### Restart After Changes

```bash
sudo systemctl restart baatcheet
```

---

## 11. Test Everything

### Test 1: HTTPS Health Check

```bash
curl https://signal.baatcheet.com/health
```

Expected:
```json
{"status":"ok","timestamp":1234567890}
```

### Test 2: WebSocket Connection

```bash
# Install wscat
npm install -g wscat

# Test WebSocket upgrade
wscat -c wss://signal.baatcheet.com/socket.io/?EIO=4&transport=websocket
```

If it connects without errors, WebSocket is working.

### Test 3: SSL Certificate

Visit in a browser:
```
https://signal.baatcheet.com
```

You should see a padlock icon in the address bar (the connection is secure). The page itself may show an error since Socket.IO expects a proper handshake — that's fine.

### Test 4: From the Electron App

On your local machine, in `apps/desktop/.env.local`:
```
VITE_SOCKET_URL=https://signal.baatcheet.com
```

Restart the dev server and open the app. The Socket.IO connection should succeed.

---

## 12. Clerk Production Keys

**Do this after Nginx is working (Step 8-11).**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. In the left sidebar, find the toggle between **Development** and **Production**
3. Switch to **Production**
4. Set your application domain (any domain works for now)
5. Copy the **production** keys:

| Variable | Format | Example |
|----------|--------|---------|
| Publishable Key | `pk_live_...` | `pk_live_abc123...` |
| Secret Key | `sk_live_...` | `sk_live_xyz789...` |

6. Go to **JWT Templates** → click **convex** (you created it in dev) → recreate it in production:
   - Name: `convex`
   - Issuer: auto-filled (keep default)
   - Save

7. Update the signaling server's `.env` on the VPS:
```bash
sudo nano /home/baatcheet/baatcheet/apps/server/.env
```

```
SERVER_PORT=3001
CORS_ORIGIN=https://signal.baatcheet.com
CLERK_SECRET_KEY=sk_live_YOUR_LIVE_KEY
```

8. Restart the server:
```bash
sudo systemctl restart baatcheet
```

---

## 13. Build the Electron App

On your **local machine** (not the VPS):

Create `apps/desktop/.env.production`:
```
VITE_CONVEX_URL=https://adorable-kangaroo-842.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
VITE_SOCKET_URL=https://signal.baatcheet.com
```

Build:
```bash
cd apps/desktop

# Set env vars and build
VITE_CONVEX_URL=https://adorable-kangaroo-842.convex.cloud \
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY \
VITE_SOCKET_URL=https://signal.baatcheet.com \
npm run build
```

The installer will be at:
```
apps/desktop/dist/BaatCheet Setup 0.0.0.exe
```

Send this `.exe` to your friends. They install it, sign up with Clerk, and they're in.

---

## Troubleshooting

### "WebSocket connection failed" in the app

Check:
1. `sudo systemctl status baatcheet` — is the server running?
2. `curl https://signal.baatcheet.com/health` — does it return OK?
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Check server logs: `sudo journalctl -u baatcheet -f`

### "SSL certificate problem"

```bash
# Verify certbot certificate exists
ls -la /etc/letsencrypt/live/signal.baatcheet.com/

# Force renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### "Clerk verifyToken fails"

1. Make sure you're using `sk_live_...` (not `sk_test_...`)
2. Make sure the signaling server's CORS_ORIGIN matches your app's URL
3. Check that the Clerk production domain matches

### Nginx "502 Bad Gateway"

The BaatCheet server isn't running:
```bash
sudo systemctl status baatcheet
sudo journalctl -u baatcheet -n 50
```

### Port 443 already in use

```bash
sudo lsof -i :443
# Kill whatever is using it, then restart nginx
```

---

## Cost Summary

| Item | Cost |
|------|------|
| VPS (Hetzner CX22) | ~$5/mo |
| Domain (Namecheap) | ~$8/year |
| SSL Certificate | Free (Let's Encrypt) |
| Clerk | Free tier (10,000 MAUs) |
| Convex | Free tier (1GB database) |
| **Total** | **~$5/mo + ~$0.67/mo domain** |

---

## Quick Reference: Common Commands

```bash
# Server management
sudo systemctl status baatcheet        # Check status
sudo systemctl restart baatcheet       # Restart server
sudo journalctl -u baatcheet -f        # Tail logs

# Nginx
sudo nginx -t                           # Test config syntax
sudo systemctl reload nginx             # Reload after config changes
sudo tail -f /var/log/nginx/error.log   # Nginx error logs

# SSL
sudo certbot renew --dry-run            # Test certificate renewal
sudo certbot certificates               # Show certificate status

# Firewall
sudo ufw status                         # Show open ports
sudo ufw allow 80/tcp                   # Open a port
sudo ufw deny 80/tcp                    # Close a port

# Update the server code
cd ~/baatcheet
git pull
cd apps/server
bun install
sudo systemctl restart baatcheet
```
