// ================================================================
// retro-utils.js — shared helpers for retro section pages
// ================================================================

// Hit counter display
function hitCounter(n) {
  const digits = String(n).padStart(6, '0').split('');
  return `<span class="hit-counter">${digits.map(d => `<span class="hit-digit">${d}</span>`).join('')}</span>`;
}

function counter() {
  const dashSpans = Array.from({length: 6}, () => `<span class="hit-digit">-</span>`).join('');
  const placeholder = `<div class="retro-counter">あなたは <span class="hit-counter">${dashSpans}</span> 人目の訪問者です</div>`;

  const render = (n) => {
    document.querySelectorAll('.retro-counter').forEach(el => {
      el.outerHTML = `<div class="retro-counter">あなたは ${hitCounter(n)} 人目の訪問者です</div>`;
    });
  };

  const alreadyVisited = sessionStorage.getItem('wired_visited');
  const url = alreadyVisited ? '/api/visitors' : '/api/visitors/hit';
  const opts = alreadyVisited ? {} : { method: 'POST' };

  fetch(url, opts)
    .then(r => r.json())
    .then(data => {
      if (!alreadyVisited) sessionStorage.setItem('wired_visited', '1');
      render(data.count);
    })
    .catch(() => {}); // leave placeholder on network failure

  return placeholder;
}

// Sparkle row — pass a chars array, or a [char, char] pair + count to repeat
function sparkles(chars = ['★','☆','★','☆','★','☆','★','☆']) {
  return `<div class="sparkle-row">${chars.map(c => `<span class="spark">${c}</span>`).join('')}</div>`;
}


// Shared nav (injected into pages)
const NAV_HTML = `<div class="retro-nav">
  <a onclick="goTo('blog')">[日記]</a><span class="sep"> | </span><a onclick="goTo('portfolio')">[作品]</a><span class="sep"> | </span><a onclick="goTo('micro')">[一言]</a><span class="sep"> | </span><a onclick="goTo('about')">[自己紹介]</a><span class="sep"> | </span><a onclick="goTo('links')">[リンク]</a>
</div>`;

// Section → canonical path
const SECTION_PATHS = {
  terminal:  '/',
  blog:      '/blog',
  portfolio: '/works',
  works:     '/works',
  micro:     '/micro',
  about:     '/about',
  links:     '/links',
  login:     '/login',
  me:        '/me',
  members:   '/members',
};

function goTo(section) {
  window.location.href = SECTION_PATHS[section] ?? '/';
}

// ── Pixel SVG icons ────────────────────────────────────────────────
// Pixel art drawn as SVG rects, rendered at 22×22 for larger buttons.

const ICON_BACK = `<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="2" y="7" width="8" height="2" fill="#333"/>
  <rect x="2" y="5" width="2" height="2" fill="#333"/>
  <rect x="4" y="3" width="2" height="2" fill="#333"/>
  <rect x="2" y="9" width="2" height="2" fill="#333"/>
  <rect x="4" y="11" width="2" height="2" fill="#333"/>
  <rect x="6" y="5" width="6" height="6" fill="none"/>
  <rect x="10" y="5" width="2" height="6" fill="#333"/>
  <rect x="8" y="5" width="2" height="2" fill="#333"/>
  <rect x="8" y="9" width="2" height="2" fill="#333"/>
</svg>`;

const ICON_REFRESH = `<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="5" y="2" width="6" height="2" fill="#333"/>
  <rect x="3" y="4" width="2" height="2" fill="#333"/>
  <rect x="11" y="4" width="2" height="2" fill="#333"/>
  <rect x="2" y="6" width="2" height="4" fill="#333"/>
  <rect x="12" y="6" width="2" height="4" fill="#333"/>
  <rect x="3" y="10" width="2" height="2" fill="#333"/>
  <rect x="5" y="12" width="6" height="2" fill="#333"/>
  <rect x="11" y="10" width="2" height="2" fill="#333"/>
  <rect x="9" y="1" width="4" height="2" fill="#333"/>
  <rect x="11" y="3" width="2" height="2" fill="#333"/>
</svg>`;

const ICON_HOME = `<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="7" y="2" width="2" height="2" fill="#333"/>
  <rect x="5" y="4" width="6" height="2" fill="#333"/>
  <rect x="3" y="6" width="10" height="2" fill="#333"/>
  <rect x="4" y="8" width="8" height="6" fill="#333"/>
  <rect x="6" y="10" width="4" height="4" fill="#dddee7"/>
</svg>`;

const ICON_GLOBE = `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="4" y="1" width="6" height="1" fill="#336"/>
  <rect x="2" y="2" width="2" height="1" fill="#336"/><rect x="10" y="2" width="2" height="1" fill="#336"/>
  <rect x="1" y="3" width="1" height="1" fill="#336"/><rect x="12" y="3" width="1" height="1" fill="#336"/>
  <rect x="1" y="4" width="1" height="6" fill="#336"/><rect x="12" y="4" width="1" height="6" fill="#336"/>
  <rect x="2" y="10" width="2" height="1" fill="#336"/><rect x="10" y="10" width="2" height="1" fill="#336"/>
  <rect x="4" y="11" width="6" height="1" fill="#336"/>
  <rect x="2" y="3" width="10" height="8" fill="#aac4e8"/>
  <rect x="6" y="1" width="2" height="12" fill="#336"/>
  <rect x="2" y="6" width="10" height="1" fill="#336"/>
  <rect x="3" y="3" width="2" height="8" fill="#7aaad4"/>
  <rect x="9" y="3" width="2" height="8" fill="#7aaad4"/>
</svg>`;

// ── Section nav icons (18×18, purple theme) ───────────────────────
// diary: open book
const ICON_DIARY = `<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="2" y="3" width="5" height="10" fill="#6a0d91"/>
  <rect x="9" y="3" width="5" height="10" fill="#6a0d91"/>
  <rect x="7" y="3" width="2" height="10" fill="#c677d3"/>
  <rect x="3" y="4" width="3" height="1" fill="#fcd0fe"/>
  <rect x="3" y="6" width="3" height="1" fill="#fcd0fe"/>
  <rect x="3" y="8" width="3" height="1" fill="#fcd0fe"/>
  <rect x="10" y="4" width="3" height="1" fill="#fcd0fe"/>
  <rect x="10" y="6" width="3" height="1" fill="#fcd0fe"/>
  <rect x="10" y="8" width="3" height="1" fill="#fcd0fe"/>
</svg>`;

// works: pixel wrench
const ICON_WORKS = `<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="4" y="2" width="4" height="2" fill="#6a0d91"/>
  <rect x="3" y="4" width="2" height="2" fill="#6a0d91"/>
  <rect x="7" y="4" width="2" height="2" fill="#6a0d91"/>
  <rect x="3" y="6" width="6" height="2" fill="#6a0d91"/>
  <rect x="5" y="8" width="2" height="2" fill="#6a0d91"/>
  <rect x="6" y="9" width="2" height="2" fill="#6a0d91"/>
  <rect x="7" y="10" width="2" height="2" fill="#6a0d91"/>
  <rect x="8" y="11" width="2" height="2" fill="#6a0d91"/>
  <rect x="9" y="12" width="3" height="2" fill="#6a0d91"/>
  <rect x="5" y="4" width="2" height="2" fill="#c677d3"/>
</svg>`;

// micro: speech bubble
const ICON_MICRO = `<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="2" y="3" width="10" height="7" fill="#6a0d91"/>
  <rect x="3" y="4" width="8" height="5" fill="#fcd0fe"/>
  <rect x="4" y="5" width="2" height="1" fill="#6a0d91"/>
  <rect x="7" y="5" width="2" height="1" fill="#6a0d91"/>
  <rect x="4" y="7" width="6" height="1" fill="#6a0d91"/>
  <rect x="3" y="10" width="2" height="2" fill="#6a0d91"/>
  <rect x="2" y="12" width="2" height="1" fill="#6a0d91"/>
</svg>`;

// about: pixel person
const ICON_ABOUT = `<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="6" y="2" width="4" height="4" fill="#6a0d91"/>
  <rect x="5" y="3" width="1" height="2" fill="#6a0d91"/>
  <rect x="10" y="3" width="1" height="2" fill="#6a0d91"/>
  <rect x="5" y="6" width="6" height="2" fill="#6a0d91"/>
  <rect x="4" y="8" width="8" height="5" fill="#6a0d91"/>
  <rect x="3" y="9" width="2" height="4" fill="#6a0d91"/>
  <rect x="11" y="9" width="2" height="4" fill="#6a0d91"/>
  <rect x="6" y="3" width="4" height="2" fill="#c677d3"/>
</svg>`;

// links: chain link
const ICON_LINKS = `<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
  <rect x="2" y="5" width="6" height="2" fill="#6a0d91"/>
  <rect x="2" y="9" width="6" height="2" fill="#6a0d91"/>
  <rect x="2" y="7" width="2" height="2" fill="#6a0d91"/>
  <rect x="6" y="7" width="2" height="2" fill="#6a0d91"/>
  <rect x="8" y="5" width="6" height="2" fill="#6a0d91"/>
  <rect x="8" y="9" width="6" height="2" fill="#6a0d91"/>
  <rect x="12" y="7" width="2" height="2" fill="#6a0d91"/>
  <rect x="3" y="6" width="4" height="4" fill="#fcd0fe"/>
  <rect x="9" y="6" width="4" height="4" fill="#fcd0fe"/>
  <rect x="6" y="7" width="4" height="2" fill="#6a0d91"/>
</svg>`;

// Simple markdown renderer (shared)
function renderMarkdown(src) {
  let html = src;
  html = html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Block LaTeX
  html = html.replace(/\$\$([^$]+?)\$\$/g, (_, tex) => {
    try { return `<div class="math-block">${katex.renderToString(tex.trim(), { displayMode:true, throwOnError:false })}</div>`; }
    catch { return `<div class="math-block">${tex}</div>`; }
  });
  // Inline LaTeX
  html = html.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    try { return `<span class="math-inline">${katex.renderToString(tex.trim(), { throwOnError:false })}</span>`; }
    catch { return `<span class="math-inline">${tex}</span>`; }
  });

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_,__,code) => `<pre><code>${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images: ![alt](url) or ![alt](url "caption")
  html = html.replace(/!\[([^\]]*)\]\(([^)"]+?)(?:\s+"([^"]*)")?\)/g, (_, alt, src, caption) => {
    const img = `<img src="${src}" alt="${alt}" style="max-width:100%;display:block;margin:12px auto;">`;
    return caption
      ? `<figure style="margin:12px 0;text-align:center;">${img}<figcaption style="font-size:10px;opacity:0.6;margin-top:4px;">${caption}</figcaption></figure>`
      : img;
  });

  // Videos: @[video](url) — custom syntax for MP4/WebM embeds
  html = html.replace(/@\[video\]\(([^)]+)\)/g, (_, src) =>
    `<video src="${src}" controls style="max-width:100%;display:block;margin:12px auto;"></video>`
  );

  // YouTube / embed: @[youtube](VIDEO_ID)
  html = html.replace(/@\[youtube\]\(([^)]+)\)/g, (_, id) =>
    `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:12px 0;">` +
    `<iframe src="https://www.youtube-nocookie.com/embed/${id}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen loading="lazy"></iframe></div>`
  );

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, m => m.startsWith('<ul>') ? m : '<ul>'+m+'</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/^---$/gm, '<hr>');

  const lines = html.split('\n');
  let result = '', inBlock = false;
  for (let line of lines) {
    const t = line.trim();
    if (t.startsWith('<h') || t.startsWith('<pre') || t.startsWith('<ul') ||
        t.startsWith('<blockquote') || t.startsWith('<div') || t.startsWith('<hr') || t.startsWith('</')) {
      if (inBlock) { result += '</p>'; inBlock = false; }
      result += t + '\n';
    } else if (t === '') {
      if (inBlock) { result += '</p>\n'; inBlock = false; }
    } else {
      if (!inBlock) { result += '<p>'; inBlock = true; } else { result += '<br>'; }
      result += t;
    }
  }
  if (inBlock) result += '</p>';
  return result;
}
