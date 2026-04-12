// ================================================================
// content/works.js — PORTFOLIO / WORKS
// ================================================================
// To add a work:
//   1. Copy one object and paste it at the TOP of the array.
//   2. Fill in id, title, desc, tech.
//   3. Either write body inline, or set bodyFile: 'works/my-project.md'
//   4. Save. Done.
// ================================================================

const WORKS = [
  {
    id: 'project-01',
    title: '[project_01] — placeholder',
    desc: 'ここにプロジェクトの説明が入ります。Replace with your actual project.',
    tech: 'rust / wasm / copper',
    isNew: true,
    // bodyFile: 'works/project-01.md',
    body: `# Project 01

## 概要

ここにプロジェクトの詳細な説明が入ります。Replace with your actual project writeup.

### 技術スタック

- **Rust** — systems programming
- **WebAssembly** — browser target
- \`copper\` — physical layer

\`\`\`rust
fn main() {
    let wired = Connection::new("protocol_7");
    wired.listen(Layer::Two);
}
\`\`\`

> このプロジェクトは実在しません。プレースホルダーです。`
  },
  {
    id: 'project-02',
    title: '[project_02] — placeholder',
    desc: 'Another project goes here. Fill in your actual work.',
    tech: 'node / protocol_7 / fiber',
    isNew: false,
    body: `# Project 02

Another project description. Fill in your actual work.

## Details

Replace this with a real writeup about what you built, why, and how.

- Goal: ...
- Result: ...
- Learnings: ...`
  },
  {
    id: 'project-03',
    title: '[project_03] — placeholder',
    desc: 'Third project placeholder.',
    tech: 'c / bare_metal / wire',
    isNew: false,
    body: `# Project 03

Third project. Your actual work goes here.

\`\`\`c
#include <stdio.h>
int main() {
    printf("connected to the wired\\n");
    return 0;
}
\`\`\``
  }
];
