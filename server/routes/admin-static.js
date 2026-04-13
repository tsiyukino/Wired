import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_HTML = path.resolve(__dirname, '../../admin/index.html');

// Serves admin/index.html at GET /<secretPath>.
// Any other request under that path returns 404.
export function registerAdminStatic(app, secretPath) {
  const base = `/${secretPath}`;

  app.get(base, (req, res) => {
    res.sendFile(ADMIN_HTML);
  });

  // Block directory traversal attempts under the secret path
  app.use(base + '/', (req, res) => {
    res.status(404).end();
  });
}
