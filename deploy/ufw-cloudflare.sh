#!/bin/bash
# Configures ufw to:
#   - Keep SSH open (port 22)
#   - Allow Cloudflare IPs on port 3000
#   - Block all other access to port 3000
#
# Run once on the server after Cloudflare DNS is active.
# Cloudflare IP ranges: https://www.cloudflare.com/ips/

set -e

echo "Configuring ufw for Cloudflare proxying..."

# Always keep SSH open first — prevents locking yourself out
ufw allow 22/tcp

# Cloudflare IPv4 ranges (current as of 2026-04)
ufw allow from 173.245.48.0/20  to any port 3000
ufw allow from 103.21.244.0/22  to any port 3000
ufw allow from 103.22.200.0/22  to any port 3000
ufw allow from 103.31.4.0/22    to any port 3000
ufw allow from 141.101.64.0/18  to any port 3000
ufw allow from 108.162.192.0/18 to any port 3000
ufw allow from 190.93.240.0/20  to any port 3000
ufw allow from 188.114.96.0/20  to any port 3000
ufw allow from 197.234.240.0/22 to any port 3000
ufw allow from 198.41.128.0/17  to any port 3000
ufw allow from 162.158.0.0/15   to any port 3000
ufw allow from 104.16.0.0/13    to any port 3000
ufw allow from 104.24.0.0/14    to any port 3000
ufw allow from 172.64.0.0/13    to any port 3000
ufw allow from 131.0.72.0/22    to any port 3000

# Cloudflare IPv6 ranges
ufw allow from 2400:cb00::/32   to any port 3000
ufw allow from 2606:4700::/32   to any port 3000
ufw allow from 2803:f800::/32   to any port 3000
ufw allow from 2405:b500::/32   to any port 3000
ufw allow from 2405:8100::/32   to any port 3000
ufw allow from 2a06:98c0::/29   to any port 3000
ufw allow from 2c0f:f248::/32   to any port 3000

# Block all other access to port 3000
ufw deny 3000

# Enable ufw if not already active
ufw --force enable

echo "Done. ufw status:"
ufw status numbered
