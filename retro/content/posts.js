// ================================================================
// content/posts.js — BLOG POSTS
// ================================================================
// To add a post:
//   1. Copy one of the objects below and paste it at the TOP of the array.
//   2. Fill in id, date, title, excerpt, tags.
//   3. Either:
//      (a) Write your markdown inline in the `body` field, OR
//      (b) Create a .md file in content/posts/ and set bodyFile: 'posts/my-post.md'
//          (body will be ignored when bodyFile is set)
//   4. Save. Done.
// ================================================================

const POSTS = [
  {
    id: 'copper-remembers',
    date: '2025.12.15 (月)',
    title: '銅線は覚えている',
    excerpt: 'the wire carries everything, even the things we try to forget...',
    tags: '日記 / Wired / copper',
    isNew: true,
    // bodyFile: 'posts/copper-remembers.md',  // ← uncomment to load from file
    body: `# 銅線は覚えている

ここにあなたのブログ記事が入ります。

**Markdown** をサポートしています。

## 見出しも使えます

普通の文章なんだけど、
こうやって改行を入れると、
なんかそれっぽくなる。

\`\`\`
$ ping wired.local
64 bytes from 10.0.2.1: seq=1 ttl=64 time=0.42ms
\`\`\`

> 銅線は覚えている。すべてを。

数式も書ける: $$E = mc^2$$

インライン数式: $\\alpha + \\beta = \\gamma$ もOK。

*※これはプレースホルダーです。実際のコンテンツに置き換えてください。*`
  },
  {
    id: 'layer-07',
    date: '2025.11.28 (金)',
    title: 'Layer 07の観測',
    excerpt: "the protocol stack doesn't lie. observations from layer 07...",
    tags: '考察 / protocol',
    isNew: false,
    body: `# Layer 07の観測

ここにも記事が入ります。

テキストサイトの特徴は、

**文章が主役であること。**

画像は最小限。テキストで勝負する。
それが90年代後半〜2000年代初頭の個人サイト。

### リスト

- protocol 7 は存在しない
- だが layer 02 は確かにある
- 銅線の中を流れる信号

\`\`\`javascript
const wired = await connect('protocol_7');
wired.on('data', (packet) => {
  console.log('received:', packet.layer);
});
\`\`\`

Replace this with your actual thoughts.`
  },
  {
    id: 'signal-degradation',
    date: '2025.10.03 (金)',
    title: '信号劣化について',
    excerpt: '信号は劣化する。でもノイズの中にも意味がある...',
    tags: '雑記 / signal',
    isNew: false,
    body: `# 信号劣化について

好きなことを書いてください。日記でも、考察でも、レビューでも。

**テキストサイトは自由。**

信号対雑音比: $SNR = \\frac{P_{signal}}{P_{noise}}$

$$\\text{Shannon} = B \\log_2\\left(1 + \\frac{S}{N}\\right)$$

> 劣化した信号の中にも、元のメッセージは残っている。
> 問題はそれを復元できるかどうかだ。`
  }
];
