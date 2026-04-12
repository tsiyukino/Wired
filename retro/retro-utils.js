// ================================================================
// retro-utils.js — shared helpers for retro section pages
// ================================================================

// Hit counter display
function hitCounter(n) {
  const digits = String(n).padStart(6, '0').split('');
  return `<span class="hit-counter">${digits.map(d => `<span class="hit-digit">${d}</span>`).join('')}</span>`;
}

function counter() {
  const key = 'wired_hit_counter';
  let n = parseInt(localStorage.getItem(key) || '0', 10);
  if (!n) n = Math.floor(Math.random() * 900 + 100) + 50000;
  n += 1;
  localStorage.setItem(key, String(n));
  return `<div class="retro-counter">あなたは ${hitCounter(n)} 人目の訪問者です</div>`;
}

// Sparkle row
function sparkles(chars = ['★','☆','★','☆','★','☆','★','☆']) {
  return `<div class="sparkle-row">${chars.map(c => `<span class="spark">${c}</span>`).join('')}</div>`;
}

// Shared nav (injected into pages)
const NAV_HTML = `<div class="retro-nav">
  <a onclick="goTo('blog')">[日記]</a><span class="sep"> | </span><a onclick="goTo('portfolio')">[作品]</a><span class="sep"> | </span><a onclick="goTo('micro')">[一言]</a><span class="sep"> | </span><a onclick="goTo('about')">[自己紹介]</a><span class="sep"> | </span><a onclick="goTo('links')">[リンク]</a><span class="sep"> | </span><a onclick="goTo('terminal')">[terminal]</a>
</div>`;

// Navigation handler — pages post a message to the parent terminal,
// or fall back to window.history if opened standalone
function goTo(section) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ action: 'navigate', section }, '*');
  } else {
    // standalone: redirect to copland-os.html and trigger the section
    window.location.href = `../copland-os.html#${section}`;
  }
}

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
