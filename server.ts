import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // Database path (inside src/data so it can be committed/saved or preserved)
  const DB_PATH = path.join(__dirname, 'src', 'data', 'database_store.json');

  // Fetch state
  function getDbState() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading backend database file:', err);
    }
    return null;
  }

  // Save state
  function saveDbState(state: any) {
    try {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error saving database file to backend storage:', err);
      return false;
    }
  }

  // API Endpoints
  app.get('/api/state', (req, res) => {
    const state = getDbState();
    if (!state) {
      return res.json({ success: false, state: null });
    }
    res.json({ success: true, state });
  });

  app.post('/api/state', (req, res) => {
    const success = saveDbState(req.body);
    res.json({ success });
  });

  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[IGHO Backend Server] Running in real-time sync database mode at http://localhost:${port}`);
  });
}

createServer();
