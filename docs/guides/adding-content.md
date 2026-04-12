# Using the board and lobby

Both features are backed by the real server. The GUI views at `board/index.html` and `lobby/index.html` and the CLI views at `board/cli.html` and `lobby/cli.html` all talk to the live API.

## Accessing the site

The root URL (`/`) serves the Copland OS entry point directly. Clean URLs work without `.html`:

| URL | Page |
|-----|------|
| `tsiyukino.com/` | Copland OS terminal |
| `tsiyukino.com/copland-os` | Same as above |
| `tsiyukino.com/board` | GUI board view |
| `tsiyukino.com/lobby` | GUI lobby view |

## Board

Open `http://localhost:3000/board` (or your domain).

| Command | What it does |
|---------|-------------|
| `ls` | List all threads |
| `read <no>` | Open a thread by its post number |
| `post` | Start a new thread (prompts for subject, name, then body) |
| `reply` | Reply to the currently open thread |
| `quote <no>` | Reply with `>>no` pre-filled |
| `back` | Return to the thread list |
| `gui` | Switch to the graphical board view |

Posts are rate-limited server-side to one per 60 seconds per IP (configurable via `POST_COOLDOWN_MS`). If you post too soon, the form shows the exact wait time from the server's response.

## Lobby

Open `http://localhost:3000/lobby` (or your domain).

The page loads recent message history, then opens a WebSocket connection at `/ws/lobby`. Type anything to send. Your color is assigned by the server for the duration of your session. If the connection drops, the page reconnects automatically with exponential backoff (starting at 2s, capping at 30s).

| Command | What it does |
|---------|-------------|
| `/name <handle>` | Change your display name for this session |
| `/clear` | Clear the message area |
| `/board` | Go to the board CLI |
| `/gui` | Switch to the graphical lobby view |
| `/exit` | Return to the terminal |

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP/WS listen port |
| `DB_PATH` | `./wired.db` | Path to the SQLite database file |
| `LOBBY_MAX_HISTORY` | `50` | Messages kept in DB and returned by `/api/lobby/history` |
| `BOARD_MAX_THREADS` | `100` | Maximum threads before old ones are pruned |
| `POST_COOLDOWN_MS` | `60000` | Minimum ms between board posts from the same IP |
