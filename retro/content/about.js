// ================================================================
// content/about.js — ABOUT PAGE CONFIG
// ================================================================
// Edit the fields below to update your about page.
// All fields are plain strings. HTML is allowed in `bio`.
// ================================================================

const ABOUT = {
  name:      '[your name here]',
  handle:    '[your handle]',
  location:  '[city] / the wired',

  // Multi-line bio — HTML allowed, or just plain text
  bio: `ここに自己紹介を書いてください。<br>
Replace this with your actual bio.<br>
何をしている人か、何に興味があるか。`,

  interests: '[your interests / placeholder]',

  // Social links — set href to '#' to hide, or remove entries
  links: [
    { label: 'github', href: '#' },
    { label: 'email',  href: '#' },
    { label: 'signal', href: '#' },
  ],

  // Retro NAVI spec block (cosmetic flavor text)
  naviSpecs: [
    'NAVI :: TACHIBANA LABS GEN-7',
    'OS :: COPLAND OS ENTERPRISE v4.017.2',
    'WIRED_ACCESS :: LEVEL 02',
    'PROTOCOL :: 7',
  ],

  // Footer
  copyrightName: '[your name]',
  since: '20XX',
};
