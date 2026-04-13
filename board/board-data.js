// ================================================================
// board-data.js — shared mock data for board demo
// In production this comes from the server/database.
// ================================================================

const BOARD_META = {
  name: '/wired/',
  desc: 'no matter where you go, everyone is always connected',
  maxThreads: 100,
  postDelay: 60, // seconds between posts from same IP
};

const THREADS = [
  {
    id: 1,
    no: 1001,
    time: '2025.12.15 03:42',
    name: 'Anonymous',
    subject: '銅線について語るスレ',
    body: `The wire connects everything.\n\nNot just devices — people, memories, consciousness itself. Lain understood this before any of us.\n\nWhat does the wired mean to you?`,
    img: null,
    replies: [
      { no: 1002, time: '2025.12.15 03:51', name: 'Anonymous', body: '>>1001\nIt means the end of isolation. Or maybe the beginning of a new kind of loneliness.' },
      { no: 1003, time: '2025.12.15 04:02', name: 'Anonymous', body: 'protocol_7 was real and you all know it' },
      { no: 1004, time: '2025.12.15 04:18', name: 'Anonymous', body: '>>1003\nanon please' },
      { no: 1005, time: '2025.12.15 04:33', name: 'Anonymous', body: 'the copper in the walls is humming at 60hz right now. i can hear it.' },
    ],
    isNew: true,
    pinned: true,
  },
  {
    id: 2,
    no: 1010,
    time: '2025.12.14 22:17',
    name: 'Anonymous',
    subject: 'music thread // what are you listening to',
    body: `post what you're listening to right now.\n\ncurrently: yoshitaka amano - hotel grand papa`,
    img: null,
    replies: [
      { no: 1011, time: '2025.12.14 22:45', name: 'Anonymous', body: 'coaltar of the deepers — milky way' },
      { no: 1012, time: '2025.12.14 23:00', name: 'Anonymous', body: 'bôa — duvet on loop since 2007 and i will not stop' },
      { no: 1013, time: '2025.12.15 00:11', name: 'Anonymous', body: '>>1012\nsame anon. same.' },
    ],
    isNew: false,
    pinned: false,
  },
  {
    id: 3,
    no: 1020,
    time: '2025.12.14 18:05',
    name: 'Anonymous',
    subject: null,
    body: `does anyone else feel more real online than offline\n\nlike the wired version of me is the actual me and the physical one is just a shell`,
    img: null,
    replies: [
      { no: 1021, time: '2025.12.14 18:22', name: 'Anonymous', body: 'yes and i stopped fighting it' },
      { no: 1022, time: '2025.12.14 19:47', name: 'Anonymous', body: 'this is either profound or a cry for help and i cannot tell which' },
      { no: 1023, time: '2025.12.14 20:01', name: 'Anonymous', body: '>>1022\nwhy not both' },
      { no: 1024, time: '2025.12.14 21:33', name: 'Anonymous', body: 'the body is just hardware. the wired is where the software runs.' },
      { no: 1025, time: '2025.12.15 02:09', name: 'Anonymous', body: '>>1024\n最高の言葉' },
    ],
    isNew: false,
    pinned: false,
  },
  {
    id: 4,
    no: 1030,
    time: '2025.12.13 09:14',
    name: 'Anonymous',
    subject: 'programming thread',
    body: `what are you building?\n\nworking on a static site generator that outputs Y2K-aesthetic HTML. no javascript. pure hypertext.`,
    img: null,
    replies: [
      { no: 1031, time: '2025.12.13 10:00', name: 'Anonymous', body: 'writing a protocol_7 simulator in rust. no practical application. purely cursed.' },
      { no: 1032, time: '2025.12.13 11:45', name: 'Anonymous', body: 'i am the javascript' },
      { no: 1033, time: '2025.12.13 14:22', name: 'Anonymous', body: '>>1031\nplease share when done' },
    ],
    isNew: false,
    pinned: false,
  },
];
