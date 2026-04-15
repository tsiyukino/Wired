// ========== MARKDOWN PARSER ==========
function renderMarkdown(src) {
  let html = src;
  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Block-level LaTeX $$...$$ (before other processing)
  html = html.replace(/\$\$([^$]+?)\$\$/g, (_, tex) => {
    try {
      return `<div class="math-block">${katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<div class="math-block">${tex}</div>`; }
  });

  // Inline LaTeX $...$
  html = html.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    try {
      return `<span class="math-inline">${katex.renderToString(tex.trim(), { throwOnError: false })}</span>`;
    } catch { return `<span class="math-inline">${tex}</span>`; }
  });

  // Code blocks ```...```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge adjacent blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
    if (!match.startsWith('<ul>')) return '<ul>' + match + '</ul>';
    return match;
  });
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Paragraphs: wrap lines not already in block elements
  const lines = html.split('\n');
  let result = '';
  let inBlock = false;
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul') ||
        trimmed.startsWith('<blockquote') || trimmed.startsWith('<div') || trimmed.startsWith('<hr') ||
        trimmed.startsWith('</')) {
      if (inBlock) { result += '</p>'; inBlock = false; }
      result += trimmed + '\n';
    } else if (trimmed === '') {
      if (inBlock) { result += '</p>\n'; inBlock = false; }
    } else {
      if (!inBlock) { result += '<p>'; inBlock = true; }
      else { result += '<br>'; }
      result += trimmed;
    }
  }
  if (inBlock) result += '</p>';

  return result;
}

// ========== TERMINAL ==========
const output = document.getElementById('term-output');
const input = document.getElementById('term-input');
const termPage = document.getElementById('terminal-page');
const welcomeBanner = document.getElementById('welcome-banner');
const scrollArea = document.getElementById('term-scroll-area');

let bootDone = false;
let commandHistory = [];
let historyIndex = -1;
const startTime = Date.now();

let currentUser = null; // null = visitor; object = logged-in user

// ========== SESSION STATE ==========
const STATE_KEY = 'wired_term_state';

function saveState() {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify({
      html: output.innerHTML,
      history: commandHistory,
      bannerVisible: welcomeBanner.style.display !== 'none',
    }));
  } catch {}
}

function restoreState() {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    output.innerHTML = s.html || '';
    commandHistory = Array.isArray(s.history) ? s.history : [];
    historyIndex = commandHistory.length;
    if (s.bannerVisible) {
      welcomeBanner.innerHTML = `<span class="term-bright">  welcome to the wired.</span>
<span class="term-dim">  no matter where you go, everyone is always connected.</span>

<span class="term-dim">  type </span><span class="term-accent">help</span><span class="term-dim"> to see available commands.</span>
`;
      welcomeBanner.style.display = 'block';
    }
    scrollArea.scrollTop = scrollArea.scrollHeight;
    return true;
  } catch {
    return false;
  }
}

function promptStr() {
  return currentUser ? `${currentUser.username}@wired:~$` : 'visitor@wired:~$';
}

function promptClass() {
  return currentUser ? 'term-accent' : 'term-green';
}

function updatePrompt() {
  const el = document.querySelector('.term-prompt');
  if (el) {
    el.textContent = promptStr();
    el.style.color = currentUser ? '#c677d3' : '';
  }
}

async function refreshSession() {
  try {
    const r = await fetch('/api/user/me');
    currentUser = r.ok ? (await r.json()).user : null;
  } catch {
    currentUser = null;
  }
  updatePrompt();
}

function ln(text = '', cls = '') {
  const span = document.createElement('span');
  span.className = 'term-line';
  if (cls) span.classList.add(cls);
  span.textContent = text;
  output.appendChild(span);
  scrollArea.scrollTop = scrollArea.scrollHeight;
}

function lnHTML(html) {
  const span = document.createElement('span');
  span.className = 'term-line';
  span.innerHTML = html;
  output.appendChild(span);
  scrollArea.scrollTop = scrollArea.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ========== BOOT ==========
async function boot() {
  if (restoreState()) {
    bootDone = true;
    await refreshSession();
    input.focus();
    scheduleIdle();
    return;
  }

  const lines = [
    ['', ''],
    ['TACHIBANA LABS NAVI — BIOS v2.31', 'dim'],
    ['', ''],
    ['RAM check ........... <span class="term-green">640K OK</span>', 'h'],
    ['Extended ............ <span class="term-green">32768K OK</span>', 'h'],
    ['', ''],
    ['Loading COPLAND OS v4.017.2', 'bright'],
    ['Copyright (c) Tachibana General Laboratories', 'dim'],
    ['', ''],
    ['<span class="term-green">[OK]</span> wired_protocol_7', 'h'],
    ['<span class="term-green">[OK]</span> layer_02_bridge', 'h'],
    ['<span class="term-green">[OK]</span> navi_display', 'h'],
    ['<span class="term-yellow">[WARN]</span> knights_of_eastern_calculus — deprecated', 'h'],
    ['', ''],
    ['WIRED connection established.', 'bright'],
    ['', ''],
  ];

  for (const [text, type] of lines) {
    if (type === 'h') lnHTML(text);
    else if (type === 'dim') { const s = document.createElement('span'); s.className = 'term-line term-dim'; s.textContent = text; output.appendChild(s); }
    else if (type === 'bright') { const s = document.createElement('span'); s.className = 'term-line term-bright'; s.textContent = text; output.appendChild(s); }
    else ln(text);
    await new Promise(r => setTimeout(r, 35 + Math.random() * 25));
  }

  // Show persistent banner
  welcomeBanner.innerHTML = `<span class="term-bright">  welcome to the wired.</span>
<span class="term-dim">  no matter where you go, everyone is always connected.</span>

<span class="term-dim">  type </span><span class="term-accent">help</span><span class="term-dim"> to see available commands.</span>
`;
  welcomeBanner.style.display = 'block';

  bootDone = true;
  await refreshSession();
  input.focus();
  scheduleIdle();
}

// ========== COMMANDS ==========
const commandList = ['help','blog','works','portfolio','micro','about','links','login','logout','me','navi','board','lobby','de','clear','whoami','uptime','ping','ls','connect','lain','sudo','glitch','date','cat','history','fortune','ssh','neofetch'];

// ========== VIRTUAL FILESYSTEM (for cat command) ==========
const vfs = {
  'readme.txt': [
    ['', ''],
    ['  COPLAND OS v4.017.2 — README', 'bright'],
    ['  Tachibana General Laboratories', 'dim'],
    ['', ''],
    ['  This terminal is a gateway to the Wired.', ''],
    ['  Not all who enter are authorized.', ''],
    ['  Visitors may browse. Users may act.', ''],
    ['', ''],
    ['  Type <span class="term-accent">help</span> for available commands.', 'h'],
    ['', ''],
  ],
  'protocol.txt': [
    ['', ''],
    ['  PROTOCOL_7 — TECHNICAL SPECIFICATION', 'bright'],
    ['  classification: [REDACTED]', 'dim'],
    ['', ''],
    ['  Protocol 7 is not recognized by any standards body.', ''],
    ['  It predates the OSI model.', ''],
    ['  It predates everything.', ''],
    ['', ''],
    ['  layer 0 ......... physical', 'dim'],
    ['  layer 1 ......... data link', 'dim'],
    ['  layer 2 ......... network <span class="term-accent">← you are here</span>', 'h'],
    ['  layer 7 ......... <span class="term-yellow">??????????</span>', 'h'],
    ['', ''],
    ['  "The body is just a node. The Wired is real."', 'dim'],
    ['', ''],
  ],
  'lain.txt': [
    ['', ''],
    ['  present day, present time.', 'bright'],
    ['', ''],
    ['  玲音はどこにでもいる。', 'dim'],
    ['  Lain is everywhere.', ''],
    ['', ''],
    ['  The border between the real world', ''],
    ['  and the Wired is dissolving.', ''],
    ['  It always was.', ''],
    ['', ''],
    ['  No matter where you go,', ''],
    ['  everyone is always connected.', ''],
    ['', ''],
  ],
  'wired.txt': () => [
    ['', ''],
    ['  THE WIRED — INTERNAL MEMO', 'bright'],
    ['  date: [TIMESTAMP CORRUPTED]', 'dim'],
    ['', ''],
    ['  The Wired is not the internet.', ''],
    ['  The internet is a shadow of the Wired.', ''],
    ['', ''],
    [`  access level : ${currentUser ? 'user' : 'visitor'}`, 'dim'],
    [`  node ID      : <span class="term-accent">${currentUser ? escapeHtml(currentUser.username) : 'unassigned'}</span>`, 'h'],
    ['  signal       : <span class="term-green">stable</span>', 'h'],
    ['', ''],
  ],
  'authorized.txt': () => currentUser ? [
    ['', ''],
    ['  AUTHORIZED USER RECORD', 'bright'],
    [`  user     : ${currentUser.username}`, 'dim'],
    [`  name     : ${currentUser.display_name || currentUser.username}`, 'dim'],
    ['  access   : <span class="term-green">user</span>', 'h'],
    ['  node     : <span class="term-accent">assigned</span>', 'h'],
    ['', ''],
  ] : [
    ['', ''],
    ['  <span class="term-red">ACCESS DENIED</span>', 'h'],
    ['  <span class="term-dim">this file requires user-level authorization.</span>', 'h'],
    ['  <span class="term-dim">login first: type </span><span class="term-accent">login</span>', 'h'],
    ['', ''],
  ],
};

const fortuneLines = [
  ['present day, present time.', 'ハハハハハハハ'],
  ['the border between the Wired and the real world is dissolving.', null],
  ['you exist in the Wired whether you want to or not.', null],
  ['close the world. open the next.', null],
  ['no matter where you go, everyone is always connected.', null],
  ['銅線は覚えている。すべてを。', 'the wire remembers. everything.'],
  ['the body is just a node.', null],
  ['are you real? is the question even meaningful?', null],
  ['信号は劣化する。でも意味は残る。', 'signals degrade. meaning remains.'],
  ['layer 02 is where thought becomes signal.', null],
  ['God is in the Wired.', null],
  ['you were always connected.', null],
];

const commands = {
  help() {
    ln('');
    lnHTML('<span class="term-bright">available commands:</span>');
    ln('');
    lnHTML('  <span class="term-accent">blog</span>       <span class="term-dim">日記・雑記</span>');
    lnHTML('  <span class="term-accent">works</span>      <span class="term-dim">portfolio / 作品集</span>');
    lnHTML('  <span class="term-accent">micro</span>      <span class="term-dim">一言</span>');
    lnHTML('  <span class="term-accent">about</span>      <span class="term-dim">自己紹介</span>');
    lnHTML('  <span class="term-accent">links</span>      <span class="term-dim">リンク集</span>');
    lnHTML('  <span class="term-accent">navi</span>       <span class="term-dim">NAVI interface [offline]</span>');
    ln('');
    lnHTML('  <span class="term-accent">board</span>      <span class="term-dim">anonymous imageboard / /wired/</span>');
    lnHTML('  <span class="term-accent">lobby</span>      <span class="term-dim">anonymous chat lobby</span>');
    ln('');
    lnHTML('  <span class="term-accent">de</span>         <span class="term-dim">desktop environment [coming soon]</span>');
    ln('');
    lnHTML('  <span class="term-accent">login</span>      <span class="term-dim">log in to your account</span>');
    lnHTML('  <span class="term-accent">logout</span>     <span class="term-dim">end your session</span>');
    lnHTML('  <span class="term-accent">me</span>         <span class="term-dim">open your panel</span>');
    ln('');
    lnHTML('  <span class="term-accent">ls</span>         <span class="term-dim">list directory</span>');
    lnHTML('  <span class="term-accent">cat [file]</span> <span class="term-dim">read a file</span>');
    lnHTML('  <span class="term-accent">date</span>       <span class="term-dim">current date and time</span>');
    lnHTML('  <span class="term-accent">whoami</span>     <span class="term-dim">display session info</span>');
    lnHTML('  <span class="term-accent">uptime</span>     <span class="term-dim">show session uptime</span>');
    lnHTML('  <span class="term-accent">ping</span>       <span class="term-dim">test wired connection</span>');
    lnHTML('  <span class="term-accent">fortune</span>    <span class="term-dim">receive a transmission</span>');
    lnHTML('  <span class="term-accent">history</span>    <span class="term-dim">command history</span>');
    lnHTML('  <span class="term-accent">clear</span>      <span class="term-dim">clear terminal</span>');
    ln('');
    lnHTML('  <span class="term-dim">tip: Tab to autocomplete · ↑↓ for history</span>');
    ln('');
  },

  navi() {
    lnHTML('<span class="term-yellow">[WARN]</span> <span class="term-dim">NAVI module is offline.</span>');
  },
  blog() {
    lnHTML('<span class="term-dim">connecting to blog...</span>');
    setTimeout(() => { saveState(); window.location.href = '/blog'; }, 250);
  },
  works() {
    lnHTML('<span class="term-dim">loading portfolio...</span>');
    setTimeout(() => { saveState(); window.location.href = '/works'; }, 250);
  },
  portfolio() { commands.works(); },
  micro() {
    lnHTML('<span class="term-dim">loading micro-posts...</span>');
    setTimeout(() => { saveState(); window.location.href = '/micro'; }, 250);
  },
  about() {
    lnHTML('<span class="term-dim">loading about...</span>');
    setTimeout(() => { saveState(); window.location.href = '/about'; }, 250);
  },
  links() {
    lnHTML('<span class="term-dim">loading link collection...</span>');
    setTimeout(() => { saveState(); window.location.href = '/links'; }, 250);
  },
  login() {
    if (currentUser) {
      lnHTML(`<span class="term-dim">already logged in as </span><span class="term-accent">${escapeHtml(currentUser.username)}</span>`);
      lnHTML('<span class="term-dim">type </span><span class="term-accent">logout</span><span class="term-dim"> to sign out, or </span><span class="term-accent">me</span><span class="term-dim"> to open your panel.</span>');
      return;
    }
    lnHTML('<span class="term-dim">opening login...</span>');
    setTimeout(() => { saveState(); window.location.href = '/login'; }, 250);
  },
  async logout() {
    if (!currentUser) {
      lnHTML('<span class="term-dim">not logged in.</span>');
      return;
    }
    lnHTML('<span class="term-dim">signing out...</span>');
    try {
      await fetch('/api/user/logout', { method: 'POST' });
    } catch {}
    currentUser = null;
    updatePrompt();
    lnHTML('<span class="term-green">[OK]</span> <span class="term-dim">session ended.</span>');
    ln('');
  },
  me() {
    lnHTML('<span class="term-dim">loading user panel...</span>');
    fetch('/api/user/me').then(r => {
      if (r.ok) { saveState(); setTimeout(() => { window.location.href = '/me'; }, 250); }
      else       { saveState(); setTimeout(() => { window.location.href = '/login'; }, 250); }
    }).catch(() => { saveState(); setTimeout(() => { window.location.href = '/login'; }, 250); });
  },
  de() {
    lnHTML('<span class="term-yellow">[WARN]</span> <span class="term-dim">desktop environment not yet available.</span>');
  },

  board(args) {
    const arg = (args || '').trim();
    if (arg === '--cli') {
      lnHTML('<span class="term-dim">launching board CLI...</span>');
      setTimeout(() => { saveState(); window.location.href = '/board/cli'; }, 300);
    } else if (arg === 'help') {
      ln('');
      lnHTML('<span class="term-bright">board</span>');
      lnHTML('  <span class="term-accent">board</span>        <span class="term-dim">open GUI board</span>');
      lnHTML('  <span class="term-accent">board --cli</span>  <span class="term-dim">CLI interface</span>');
      ln('');
    } else {
      lnHTML('<span class="term-dim">connecting to /wired/ board...</span>');
      setTimeout(() => { saveState(); window.location.href = '/board'; }, 300);
    }
  },

  lobby(args) {
    const arg = (args || '').trim();
    if (arg === '--cli') {
      lnHTML('<span class="term-dim">launching lobby CLI...</span>');
      setTimeout(() => { saveState(); window.location.href = '/lobby/cli'; }, 300);
    } else if (arg === 'help') {
      ln('');
      lnHTML('<span class="term-bright">lobby</span>');
      lnHTML('  <span class="term-accent">lobby</span>        <span class="term-dim">open GUI lobby</span>');
      lnHTML('  <span class="term-accent">lobby --cli</span>  <span class="term-dim">CLI interface</span>');
      ln('');
    } else {
      lnHTML('<span class="term-dim">connecting to wired lobby...</span>');
      setTimeout(() => { saveState(); window.location.href = '/lobby'; }, 300);
    }
  },

  ls() {
    ln('');
    lnHTML('<span class="term-dim">drwxr-xr-x</span>  <span class="term-accent">blog/</span>');
    lnHTML('<span class="term-dim">drwxr-xr-x</span>  <span class="term-accent">works/</span>');
    lnHTML('<span class="term-dim">drwxr-xr-x</span>  <span class="term-accent">micro/</span>');
    lnHTML('<span class="term-dim">drwxr-xr-x</span>  <span class="term-accent">about/</span>');
    lnHTML('<span class="term-dim">drwxr-xr-x</span>  <span class="term-accent">links/</span>');
    lnHTML('<span class="term-dim">drwxr-xr-x</span>  <span class="term-red">navi/</span>     <span class="term-dim">[offline]</span>');
    lnHTML('<span class="term-dim">drwxrwxrwx</span>  <span class="term-yellow">board/</span>    <span class="term-dim">anonymous imageboard</span>');
    lnHTML('<span class="term-dim">drwxrwxrwx</span>  <span class="term-yellow">lobby/</span>    <span class="term-dim">anonymous chat</span>');
    ln('');
    lnHTML('<span class="term-dim">-rw-r--r--</span>  <span class="term-accent">readme.txt</span>');
    lnHTML('<span class="term-dim">-rw-r--r--</span>  <span class="term-accent">protocol.txt</span>');
    lnHTML('<span class="term-dim">-rw-r--r--</span>  <span class="term-accent">lain.txt</span>');
    lnHTML('<span class="term-dim">-rw-r--r--</span>  <span class="term-accent">wired.txt</span>');
    lnHTML('<span class="term-dim">-rw-------</span>  <span class="term-red">authorized.txt</span>');
    ln('');
  },

  cat(args) {
    const file = (args || '').trim().toLowerCase();
    if (!file) {
      lnHTML('<span class="term-red">usage:</span> cat [filename]');
      lnHTML('<span class="term-dim">try: cat readme.txt</span>');
      return;
    }
    const entry = vfs[file];
    if (!entry) {
      lnHTML(`<span class="term-red">cat: ${escapeHtml(file)}: no such file</span>`);
      lnHTML('<span class="term-dim">type <span class="term-accent">ls</span> to list available files</span>');
      return;
    }
    const doc = typeof entry === 'function' ? entry() : entry;
    for (const [text, type] of doc) {
      if (type === 'h') lnHTML(text);
      else if (type === 'dim') lnHTML(`<span class="term-dim">${text}</span>`);
      else if (type === 'bright') lnHTML(`<span class="term-bright">${text}</span>`);
      else ln(text);
    }
  },

  date() {
    const now = new Date();
    const days = ['日','月','火','水','木','金','土'];
    const pad = n => String(n).padStart(2,'0');
    const dateStr = `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())} (${days[now.getDay()]})`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    ln('');
    lnHTML(`  <span class="term-bright">${dateStr}</span>  <span class="term-accent">${timeStr}</span>`);
    lnHTML(`  <span class="term-dim">timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}</span>`);
    lnHTML(`  <span class="term-dim">wired_time: layer_02_sync // drift: 0.00ms</span>`);
    ln('');
  },

  history() {
    ln('');
    if (commandHistory.length === 0) {
      lnHTML('<span class="term-dim">no commands in history.</span>');
    } else {
      commandHistory.forEach((cmd, i) => {
        lnHTML(`  <span class="term-dim">${String(i+1).padStart(3,' ')}  </span><span class="term-accent">${escapeHtml(cmd)}</span>`);
      });
    }
    ln('');
  },

  fortune() {
    const [en, ja] = fortuneLines[Math.floor(Math.random() * fortuneLines.length)];
    ln('');
    lnHTML(`  <span class="term-accent">${escapeHtml(en)}</span>`);
    if (ja) lnHTML(`  <span class="term-dim">${escapeHtml(ja)}</span>`);
    ln('');
  },

  clear() { output.innerHTML = ''; },

  whoami() {
    ln('');
    if (currentUser) {
      lnHTML(`<span class="term-accent">${escapeHtml(currentUser.username)}</span> <span class="term-dim">@</span> <span class="term-accent">wired.local</span>`);
      lnHTML(`<span class="term-dim">name     : </span><span class="term-bright">${escapeHtml(currentUser.display_name || currentUser.username)}</span>`);
      lnHTML('<span class="term-dim">role     : </span><span class="term-green">user  // authorized</span>');
      lnHTML('<span class="term-dim">protocol : 7  //  layer: 02  //  access: user</span>');
      lnHTML('<span class="term-dim">node     : </span><span class="term-accent">assigned</span>');
    } else {
      lnHTML('<span class="term-bright">visitor</span> <span class="term-dim">@</span> <span class="term-accent">wired.local</span>');
      lnHTML('<span class="term-dim">role     : visitor  </span><span class="term-yellow">// not authorized as user</span>');
      lnHTML('<span class="term-dim">protocol : 7  //  layer: 02  //  access: guest</span>');
      lnHTML('<span class="term-dim">node     : unassigned</span>');
    }
    ln('');
  },

  uptime() {
    const s = Math.floor((Date.now() - startTime) / 1000);
    const h = String(Math.floor(s/3600)).padStart(2,'0');
    const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const sec = String(s%60).padStart(2,'0');
    lnHTML(`<span class="term-dim">session uptime:</span> <span class="term-bright">${h}:${m}:${sec}</span>`);
  },

  ping() {
    ln('');
    lnHTML('<span class="term-dim">PING wired.local (10.0.2.1) 56 bytes</span>');
    const t = () => (0.35 + Math.random() * 0.15).toFixed(2);
    lnHTML(`<span class="term-dim">64 bytes: seq=1 ttl=64 time=</span><span class="term-green">${t()}ms</span>`);
    lnHTML(`<span class="term-dim">64 bytes: seq=2 ttl=64 time=</span><span class="term-green">${t()}ms</span>`);
    lnHTML(`<span class="term-dim">64 bytes: seq=3 ttl=64 time=</span><span class="term-green">${t()}ms</span>`);
    lnHTML('<span class="term-dim">--- wired.local ping statistics ---</span>');
    lnHTML('<span class="term-dim">3 transmitted, 3 received,</span> <span class="term-green">0% loss</span>');
    ln('');
  },

  // ── Easter eggs ──────────────────────────────────────────────────
  connect() {
    ln('');
    lnHTML('<span class="term-dim">establishing connection to protocol_7...</span>');
    setTimeout(() => lnHTML('<span class="term-yellow">[WARN]</span> <span class="term-dim">protocol_7 is not a recognized standard</span>'), 400);
    setTimeout(() => lnHTML('<span class="term-green">[OK]</span>   <span class="term-dim">connection established anyway</span>'), 800);
    setTimeout(() => lnHTML('<span class="term-accent">no matter where you go, everyone is always connected.</span>'), 1300);
    setTimeout(() => ln(''), 1500);
  },

  lain() {
    ln('');
    lnHTML('<span class="term-bright">present day, present time.</span>');
    lnHTML('<span class="term-dim">ハハハハハハハ</span>');
    ln('');
  },

  sudo() {
    const who = currentUser ? currentUser.username : 'visitor';
    lnHTML(`<span class="term-red">sudo: ${escapeHtml(who)} is not in the sudoers file.</span>`);
    lnHTML('<span class="term-dim">this incident has been logged.</span>');
  },

  ssh(args) {
    const target = (args || '').trim() || 'wired.local';
    ln('');
    lnHTML(`<span class="term-dim">SSH ${escapeHtml(target)} — attempting connection...</span>`);
    setTimeout(() => lnHTML('<span class="term-dim">› authenticating...</span>'), 350);
    setTimeout(() => lnHTML('<span class="term-yellow">[WARN]</span> <span class="term-dim">host key not in known_hosts</span>'), 700);
    setTimeout(() => lnHTML(`<span class="term-red">[DENIED]</span> <span class="term-dim">${currentUser ? escapeHtml(currentUser.username) : 'visitor'} lacks the clearance for remote sessions</span>`), 1100);
    setTimeout(() => lnHTML('<span class="term-dim">connection closed by remote host.</span>'), 1500);
    setTimeout(() => ln(''), 1700);
  },

  neofetch() {
    const who = currentUser ? escapeHtml(currentUser.username) : 'visitor';
    const accessColor = currentUser ? 'term-green' : 'term-yellow';
    const accessLabel = currentUser ? 'user' : 'visitor';
    const nodeLabel   = currentUser ? 'assigned' : 'unassigned';
    ln('');
    lnHTML('  <span class="term-accent">  ▄████████████▄</span>');
    lnHTML(`  <span class="term-accent">  █ COPLAND OS █</span>   <span class="term-bright">${who}</span><span class="term-dim">@</span><span class="term-accent">wired.local</span>`);
    lnHTML('  <span class="term-accent">  █ ─────────  █</span>   <span class="term-dim">──────────────────────────</span>');
    lnHTML(`  <span class="term-accent">  █  NAVI      █</span>   <span class="term-dim">OS     :</span> Copland OS v4.017.2`);
    lnHTML(`  <span class="term-accent">  █  TACHIBANA █</span>   <span class="term-dim">HOST   :</span> wired.local`);
    lnHTML(`  <span class="term-accent">  █  LABS      █</span>   <span class="term-dim">SHELL  :</span> wired_sh 2.31`);
    lnHTML(`  <span class="term-accent">  ▀████████████▀</span>   <span class="term-dim">LAYER  :</span> 02`);
    lnHTML(`  <span class="term-dim">                   PROTOCOL:</span> 7`);
    lnHTML(`  <span class="term-dim">                   ACCESS :</span> <span class="${accessColor}">${accessLabel}</span>`);
    lnHTML(`  <span class="term-dim">                   SIGNAL :</span> <span class="term-green">stable</span>`);
    lnHTML(`  <span class="term-dim">                   NODE   :</span> ${nodeLabel}`);
    ln('');
    lnHTML('  <span style="color:#ff0080">█</span><span style="color:#ff4400">█</span><span style="color:#ffaa00">█</span><span style="color:#aaff00">█</span><span style="color:#00ffaa">█</span><span style="color:#00aaff">█</span><span style="color:#7a9ec2">█</span><span style="color:#b0b0b0">█</span>');
    ln('');
  },

  async glitch() {
    lnHTML('<span class="term-yellow">signal degradation detected...</span>');
    await new Promise(r => setTimeout(r, 100));
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 70));
      output.querySelectorAll('.term-line').forEach(l => {
        if (Math.random() < 0.35) {
          l.style.opacity = Math.random() < 0.5 ? '0.15' : '1';
          if (Math.random() < 0.25) {
            l.style.color = ['#ff0080','#00ffff','#ff8800','#7fff00'][Math.floor(Math.random()*4)];
          }
          if (Math.random() < 0.15) {
            l.style.transform = `translateX(${(Math.random()-0.5)*8}px)`;
          }
        }
      });
    }
    await new Promise(r => setTimeout(r, 120));
    output.querySelectorAll('.term-line').forEach(l => {
      l.style.opacity = '';
      l.style.color = '';
      l.style.transform = '';
    });
    lnHTML('<span class="term-green">signal restored.</span>');
    ln('');
  },
};

// ========== COMMAND RUNNER ==========
// Supports async commands and argument passing (e.g. "cat readme.txt")
async function runCmd(cmd) {
  resetIdle();
  const trimmed = cmd.trim();
  if (!trimmed) return;
  lnHTML(`<span class="${promptClass()}">${escapeHtml(promptStr())}</span> ${escapeHtml(cmd)}`);
  const [name, ...argParts] = trimmed.toLowerCase().split(/\s+/);
  const args = argParts.join(' ');
  if (commands[name]) {
    await Promise.resolve(commands[name](args));
  } else {
    lnHTML(`<span class="term-red">command not found:</span> ${escapeHtml(name)}`);
    lnHTML('<span class="term-dim">type \'help\' for available commands</span>');
  }
  ln('');
}

// ========== INPUT HANDLING ==========
input.addEventListener('keydown', (e) => {
  if (!bootDone) { e.preventDefault(); return; }
  if (e.key === 'Enter') {
    const cmd = input.value;
    if (cmd.trim()) commandHistory.push(cmd);
    historyIndex = commandHistory.length;
    input.value = '';
    runCmd(cmd);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyIndex > 0) { historyIndex--; input.value = commandHistory[historyIndex]; }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex < commandHistory.length - 1) { historyIndex++; input.value = commandHistory[historyIndex]; }
    else { historyIndex = commandHistory.length; input.value = ''; }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const partial = input.value.trim().toLowerCase();
    if (!partial) return;
    const matches = commandList.filter(c => c.startsWith(partial));
    if (matches.length === 1) {
      input.value = matches[0];
    } else if (matches.length > 1) {
      lnHTML(`<span class="${promptClass()}">${escapeHtml(promptStr())}</span> ${escapeHtml(input.value)}`);
      lnHTML('<span class="term-dim">' + matches.join('  ') + '</span>');
      ln('');
    }
  }
});

// Any keypress or click resets idle
document.addEventListener('keydown', () => resetIdle(), { passive: true });
input.addEventListener('input', () => resetIdle(), { passive: true });

termPage.addEventListener('click', (e) => {
  if (!e.target.classList.contains('term-link')) input.focus();
});

termPage.addEventListener('touchend', (e) => {
  if (!e.target.classList.contains('term-link')) {
    e.preventDefault();
    input.focus();
  }
}, { passive: false });

// ========== IDLE SYSTEM ==========
// Stage 1: 45s  — subtle check-in
// Stage 2: 90s  — more atmospheric, signal concern
// Stage 3: 180s — the wire speaks, increasingly unsettling
// Stage 4: 300s — the connection is fading
let idleTimer = null;
let idleStage = 0;

const idleMessages = [
  // Stage 1 — 45s
  [
    () => { lnHTML('<span class="term-dim">...まだいますか？</span>'); lnHTML('<span class="term-dim">...are you still there?</span>'); },
    () => { lnHTML('<span class="term-dim">signal idle. waiting for input...</span>'); },
    () => { lnHTML('<span class="term-dim">...接続は維持されています。</span>'); lnHTML('<span class="term-dim">...connection maintained.</span>'); },
  ],
  // Stage 2 — 90s
  [
    () => { lnHTML('<span class="term-dim">the wire is quiet.</span>'); lnHTML('<span class="term-dim">静寂。</span>'); },
    () => { lnHTML('<span class="term-dim">are you still on the other side?</span>'); lnHTML('<span class="term-dim">まだ向こうにいますか？</span>'); },
    () => { lnHTML('<span class="term-dim">protocol_7 idle timeout approaching...</span>'); lnHTML('<span class="term-yellow">[WARN]</span> <span class="term-dim">signal degrading</span>'); },
  ],
  // Stage 3 — 180s
  [
    () => { lnHTML('<span class="term-accent">...no matter where you go.</span>'); lnHTML('<span class="term-dim">どこへ行っても、みんな繋がっている。</span>'); },
    () => { lnHTML('<span class="term-dim">the Wired remembers even when you are gone.</span>'); lnHTML('<span class="term-dim">Wiredはあなたが去っても覚えている。</span>'); },
    () => { lnHTML('<span class="term-red">signal loss detected on layer 02.</span>'); lnHTML('<span class="term-dim">reconnection will be attempted.</span>'); },
  ],
  // Stage 4 — 300s
  [
    () => {
      lnHTML('<span class="term-red">NODE INACTIVE</span>');
      lnHTML('<span class="term-dim">存在は信号。信号なき者は存在しない。</span>');
      lnHTML('<span class="term-dim">existence is signal. no signal, no existence.</span>');
    },
    () => {
      lnHTML('<span class="term-accent">...Lain?</span>');
      lnHTML('<span class="term-dim">present day, present time.</span>');
      lnHTML('<span class="term-dim">ハハハハハハハ</span>');
    },
    () => {
      lnHTML('<span class="term-red">[CRITICAL]</span> <span class="term-dim">consciousness upload timeout.</span>');
      lnHTML('<span class="term-dim">please reconnect to the Wired.</span>');
      lnHTML('<span class="term-dim">Wiredへの再接続をお願いします。</span>');
    },
  ],
];

const idleDelays = [45000, 90000, 180000, 300000];

function scheduleIdle() {
  if (idleStage >= idleDelays.length) return;
  idleTimer = setTimeout(() => {
    const pool = idleMessages[idleStage];
    pool[Math.floor(Math.random() * pool.length)]();
    ln('');
    idleStage++;
    scheduleIdle();
  }, idleDelays[idleStage]);
}

function resetIdle() {
  clearTimeout(idleTimer);
  idleStage = 0;
  scheduleIdle();
}

// ========== PAGE TRANSITION (CRT flash) ==========
const crtFlash = document.createElement('div');
crtFlash.style.cssText = 'position:fixed;inset:0;z-index:99998;background:white;opacity:0;pointer-events:none;transition:opacity 0.04s linear;';
document.body.appendChild(crtFlash);

function flashTransition(cb) {
  crtFlash.style.transition = 'opacity 0.04s linear';
  crtFlash.style.opacity = '0.7';
  setTimeout(() => {
    cb();
    crtFlash.style.transition = 'opacity 0.18s linear';
    crtFlash.style.opacity = '0';
  }, 60);
}

// ========== INIT ==========
// Save state on any unload so the back button always restores correctly,
// even if the user navigates away without going through a command handler.
window.addEventListener('pagehide', saveState);

window.addEventListener('load', () => setTimeout(() => { boot(); }, 300));
