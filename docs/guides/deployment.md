# Deployment

How to get the server running on a fresh Ubuntu machine.

## 1. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:
```bash
node --version   # should print v20.x.x
which node       # note this path — you'll need it in step 4
```

## 2. Clone the repo

```bash
git clone <your-repo-url> /home/YOUR_USER/wired
cd /home/YOUR_USER/wired
npm install
```

## 3. Configure the environment

```bash
cp deploy/wired.env.example deploy/wired.env   # if you committed an example
# — or edit deploy/wired.env directly
nano deploy/wired.env
```

Fill in at minimum:
- `DB_PATH` — absolute path where the database file should live, e.g. `/var/lib/wired/wired.db`
- `NODE_ENV=production`

The server will refuse to start in production with a relative `DB_PATH`.

### Admin panel env vars

Three additional vars are required before the admin panel will work:

**`ADMIN_PASSWORD_HASH`** — bcrypt hash of your admin password. Generate it once on the server (or locally with Node installed):

```bash
node -e "const b=require('bcryptjs');console.log(b.hashSync('yourpassword',12))"
```

Paste the printed hash (starts with `$2a$12$…`) into `wired.env`.

**`SESSION_SECRET`** — random 32-byte hex string used to sign session cookies:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**`ADMIN_PATH`** — the URL slug for the admin panel. Choose something non-obvious; this is the only thing standing between the public and the login form.

**`BIN_TTL_DAYS`** — how many days soft-deleted board posts sit in the bin before being permanently purged on next server start. Default `7`.

The server will refuse to start in production if `ADMIN_PASSWORD_HASH` or `SESSION_SECRET` are missing.

## 4. Edit the service file

```bash
nano deploy/wired.service
```

Replace every `YOUR_USER` with your actual username and `YOUR_NODE_PATH` with the output of `which node`. Example:

```ini
User=alice
WorkingDirectory=/home/alice/wired
ExecStart=/usr/bin/node /home/alice/wired/server/index.js
EnvironmentFile=/home/alice/wired/deploy/wired.env
```

## 5. Install and start the service

```bash
sudo cp deploy/wired.service /etc/systemd/system/wired.service
sudo systemctl daemon-reload
sudo systemctl enable wired    # start on boot
sudo systemctl start wired
```

Check it started:
```bash
sudo systemctl status wired
```

You should see `active (running)`.

## 6. View logs

```bash
journalctl -u wired -f          # live tail
journalctl -u wired --since today
```

## 7. Updating the server

```bash
cd /home/YOUR_USER/wired
git pull
npm install                      # only needed if dependencies changed
sudo systemctl restart wired
```

## 8. Verify the exclusions are working

```bash
curl http://localhost:3000/Reference/fauux.neocities.org/index.html
# → 404

curl http://localhost:3000/copland-os-legacy.html
# → 404

curl http://localhost:3000/copland-os.html
# → 200
```

## Troubleshooting

**Service fails to start** — check the logs:
```bash
journalctl -u wired -n 50
```

Common causes:
- `YOUR_NODE_PATH` or `YOUR_USER` still not replaced in `wired.service`
- `DB_PATH` is relative and `NODE_ENV=production` — set an absolute path
- Port 3000 already in use — change `PORT` in `deploy/wired.env`

**Restarting after a crash** — systemd handles this automatically (`Restart=on-failure`). The process will restart after 5 seconds. Check `journalctl -u wired` to see what caused the crash.
