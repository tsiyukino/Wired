# Cloudflare Setup

How to point `tsiyukino.com` at the server through Cloudflare.

## 1. Add your site to Cloudflare

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Add a Site** → enter `tsiyukino.com`
3. Select the **Free** plan
4. Cloudflare will scan your existing DNS records — review them, then continue
5. Cloudflare will give you two nameserver addresses (e.g. `aria.ns.cloudflare.com`). Go to your domain registrar and replace the current nameservers with these two. This can take up to 24 hours to propagate.

## 2. Add the DNS record

In the Cloudflare dashboard → **DNS** → **Records** → **Add record**:

| Type | Name | IPv4 address | Proxy status |
|------|------|-------------|--------------|
| A | `tsiyukino.com` | `YOUR_SERVER_IP` | Proxied (orange cloud ✅) |

The orange cloud is important — it means traffic goes through Cloudflare, not directly to your server.

## 3. Set SSL/TLS mode

**SSL/TLS** → **Overview** → set mode to **Full**.

Do not use Flexible (insecure) or Full Strict (requires a cert on the server).

## 4. Enable WebSockets

**Network** → **WebSockets** → toggle **On**.

Without this the lobby will fail to connect.

## 5. Add cache bypass rules for API and WebSocket

**Caching** → **Cache Rules** → **Create rule**:

**Rule 1 — API bypass**
- Rule name: `Bypass API`
- When: `URI Path` → `starts with` → `/api/`
- Then: Cache eligibility → **Bypass cache**
- Save

**Rule 2 — WebSocket bypass**
- Rule name: `Bypass WebSocket`
- When: `URI Path` → `starts with` → `/ws/`
- Then: Cache eligibility → **Bypass cache**
- Save

## 6. Lock the server firewall to Cloudflare IPs

Once DNS has propagated and the site is loading through Cloudflare, run this on the server to block direct access:

```bash
cd /root/wired
chmod +x deploy/ufw-cloudflare.sh
sudo bash deploy/ufw-cloudflare.sh
```

This allows only Cloudflare's IP ranges to reach port 3000 and blocks everyone else.

Verify it worked — this should now be blocked from your local machine:
```
http://YOUR_SERVER_IP:3000
```

And this should work:
```
https://tsiyukino.com
```

## 7. Verify everything

```bash
# From the server — confirms Node is still reachable locally
curl http://localhost:3000/api/board/threads
# → {"threads":[]}

# From your browser
https://tsiyukino.com/copland-os.html        # → site loads over HTTPS
https://tsiyukino.com/api/board/threads      # → {"threads":[]}
https://tsiyukino.com/Reference/             # → 404
```

Lobby WebSocket — open `https://tsiyukino.com/lobby/cli.html` and confirm it connects.

## Updating Cloudflare IP ranges

Cloudflare occasionally updates their IP ranges. The current list is always at:
`https://www.cloudflare.com/ips/`

If ranges change, update `deploy/ufw-cloudflare.sh` and re-run it on the server.
