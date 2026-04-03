import { createServer } from 'http';
import next from 'next';
import { parse } from 'url';
import { initSocketServer } from './src/lib/socket/server';
import { runMigrations } from './src/lib/db/migrations';
import fs from 'fs';
import path from 'path';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Ensure data directory exists
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Run database migrations
  runMigrations();
  console.log('Database initialized');

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO on the same HTTP server
  initSocketServer(httpServer);
  console.log('Socket.IO server initialized');

  httpServer.listen(port, () => {
    console.log(`> tRetro ready on http://localhost:${port}`);
    console.log(`> Environment: ${dev ? 'development' : 'production'}`);
  });
});
