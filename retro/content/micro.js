// ================================================================
// content/micro.js — SUPERSEDED
// Micro posts are now stored in the database and served via /api/micro.
// This file is no longer loaded by micro.html.
// ================================================================
// To add a micro-post:
//   1. Paste a new object at the TOP of the array (newest first).
//   2. Set time and text. Set isNew: true for the latest entry.
//   3. Set the previous top entry's isNew to false.
//   4. Save. Done.
// ================================================================

const MICRO_POSTS = [
  { time: '2025.12.15 03:42', text: 'placeholder: short thought goes here. ここに一言を。', isNew: true },
  { time: '2025.12.14 23:11', text: 'placeholder: 銅線は60Hzで唸っている。', isNew: false },
  { time: '2025.12.12 01:28', text: "placeholder: and you don't seem to understand...", isNew: false },
  { time: '2025.12.10 19:05', text: 'placeholder: close the world. open the next.', isNew: false },
  { time: '2025.12.08 14:32', text: 'placeholder: fill these with your actual thoughts.', isNew: false },
  { time: '2025.12.05 02:17', text: 'placeholder: 深夜のWiredは静か。', isNew: false },
];
