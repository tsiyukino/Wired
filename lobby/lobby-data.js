// ================================================================
// lobby-data.js — shared mock data for chat lobby demo
// In production messages come from WebSocket / database.
// ================================================================

const LOBBY_META = {
  name: 'WIRED LOBBY',
  desc: 'anonymous instant messaging // no logs kept',
  maxHistory: 50,
};

// Seed messages shown on load (simulates recent history)
const SEED_MESSAGES = [
  { id: 1, time: '03:31', name: 'Anonymous', color: '#7a9ec2', text: 'is anyone here' },
  { id: 2, time: '03:32', name: 'Anonymous', color: '#6a9a5a', text: 'always' },
  { id: 3, time: '03:32', name: 'Anonymous', color: '#9a6a9a', text: 'the lobby is never empty. someone is always watching.' },
  { id: 4, time: '03:33', name: 'Anonymous', color: '#7a9ec2', text: 'that is either comforting or terrifying' },
  { id: 5, time: '03:33', name: 'Anonymous', color: '#9a8a4a', text: 'why not both' },
  { id: 6, time: '03:35', name: 'Anonymous', color: '#6a9a5a', text: 'close the world. open the next.' },
  { id: 7, time: '03:36', name: 'Anonymous', color: '#9a6a9a', text: 'present day, present time. ha ha ha ha.' },
  { id: 8, time: '03:38', name: 'Anonymous', color: '#7a9ec2', text: 'what time is it where you are' },
  { id: 9, time: '03:38', name: 'Anonymous', color: '#9a8a4a', text: 'always 3am in the wired' },
  { id: 10, time: '03:40', name: 'Anonymous', color: '#6a9a5a', text: '銅線は覚えている' },
];

// Palette for assigning colors to new anonymous users per-session
const ANON_COLORS = [
  '#7a9ec2', '#6a9a5a', '#9a6a9a', '#9a8a4a',
  '#6a8a9a', '#9a6a6a', '#7a8a6a', '#8a7a9a',
];
