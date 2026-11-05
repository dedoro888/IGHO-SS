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

  // SSE Client Connections for instant real-time live push
  const sseClients = new Set<express.Response>();

  function broadcastLiveEvent(eventType: string, data: any) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch (e) {
        sseClients.delete(client);
      }
    }
  }

  // SSE Real-Time Event Stream Endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`);

    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Public configuration endpoint for frontend client initialization
  app.get('/api/config', (req, res) => {
    const rawUrl = process.env.SUPABASE_URL || '';
    let supabaseUrl = '';
    if (rawUrl) {
      try {
        supabaseUrl = new URL(rawUrl).origin;
      } catch {
        supabaseUrl = rawUrl.replace(/\/+$/, '');
      }
    }
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
    const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || '';

    res.json({
      supabaseUrl,
      supabasePublishableKey,
      paystackPublicKey,
    });
  });

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
    broadcastLiveEvent('state_updated', { timestamp: Date.now() });
    res.json({ success });
  });

  // Dedicated real-time room action endpoint (add, update, delete)
  app.post('/api/rooms/live-action', (req, res) => {
    const { action, room, roomId, hotelId, timestamp } = req.body;
    const state = getDbState() || {};
    let rooms = state.rooms || [];

    if (action === 'add' && room) {
      if (!rooms.some((r: any) => r.id === room.id)) {
        rooms = [room, ...rooms];
      }
    } else if (action === 'update' && room) {
      rooms = rooms.map((r: any) => (r.id === room.id ? { ...r, ...room } : r));
    } else if (action === 'delete' && roomId) {
      rooms = rooms.filter((r: any) => r.id !== roomId);
    }

    state.rooms = rooms;
    saveDbState(state);

    // Broadcast immediately to all connected browsers in <10ms
    broadcastLiveEvent('room_changed', {
      action,
      room,
      roomId,
      hotelId,
      timestamp: timestamp || Date.now(),
    });

    res.json({ success: true, count: rooms.length });
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
