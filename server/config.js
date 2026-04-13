// Configuration — reads environment variables, exports a single frozen object.
// All server modules import from here; nothing reads process.env directly.

const isProd = process.env.NODE_ENV === 'production';
const dbPath = process.env.DB_PATH || './wired.db';

if (isProd && dbPath === './wired.db') {
  console.error('ERROR: DB_PATH must be set to an absolute path in production.');
  console.error('       Set the DB_PATH environment variable before starting the server.');
  process.exit(1);
}

const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || '';
const sessionSecret     = process.env.SESSION_SECRET || '';

const adminPath = process.env.ADMIN_PATH || '';

if (isProd && !adminPath) {
  console.error('ERROR: ADMIN_PATH must be set in production.');
  process.exit(1);
}

if (isProd && !adminPasswordHash) {
  console.error('ERROR: ADMIN_PASSWORD_HASH must be set in production.');
  console.error('       Generate with: node -e "const b=require(\'bcryptjs\');console.log(b.hashSync(\'yourpass\',12))"');
  process.exit(1);
}

if (isProd && !sessionSecret) {
  console.error('ERROR: SESSION_SECRET must be set in production.');
  console.error('       Generate with: node -e "require(\'crypto\').randomBytes(32).toString(\'hex\')|0" ');
  process.exit(1);
}

const config = Object.freeze({
  port:              parseInt(process.env.PORT || '3000', 10),
  dbPath,
  lobbyMaxHistory:   parseInt(process.env.LOBBY_MAX_HISTORY || '50', 10),
  boardMaxThreads:   parseInt(process.env.BOARD_MAX_THREADS || '100', 10),
  postCooldownMs:    parseInt(process.env.POST_COOLDOWN_MS || '60000', 10),
  adminPath,
  adminPasswordHash,
  sessionSecret:     sessionSecret || 'dev-secret-do-not-use-in-prod',
  binTtlDays:        parseInt(process.env.BIN_TTL_DAYS || '7', 10),
});

export default config;
