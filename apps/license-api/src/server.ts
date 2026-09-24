import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { licenseRoutes } from './routes/license.js';
import { adminRoutes } from './routes/admin.js';

// ─────────────────────────────────────────────────────────
// Admin API Key — set ADMIN_API_KEY in production env vars
// ─────────────────────────────────────────────────────────
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: ADMIN_API_KEY env var is not set. Refusing to start in production.');
    process.exit(1);
  } else {
    console.warn('⚠️  ADMIN_API_KEY not set. Admin routes are unprotected (dev mode only!).');
  }
}

// ─────────────────────────────────────────────────────────
// CORS Allowed Origins
// ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins: (string | RegExp)[] = [
  // Desktop app Tauri origin
  'tauri://localhost',
  'https://tauri.localhost',
];

if (ALLOWED_ORIGINS_ENV) {
  // e.g. ALLOWED_ORIGINS=https://medilab-admin.web.app,https://medilab-admin.firebaseapp.com
  ALLOWED_ORIGINS_ENV.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => {
    allowedOrigins.push(o);
  });
} else if (process.env.NODE_ENV !== 'production') {
  // Dev: allow localhost origins
  allowedOrigins.push('http://localhost:3001', 'http://localhost:5173', 'http://localhost:1420');
  console.warn('⚠️  No ALLOWED_ORIGINS set. Allowing localhost dev origins.');
}

export async function createServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  await server.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (allowedOrigins.some((o) => (o instanceof RegExp ? o.test(origin) : o === origin))) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: Origin '${origin}' is not allowed.`), false);
    },
    credentials: true,
  });

  // ─── Admin Auth Hook ────────────────────────────────────
  // All /api/v1/admin/* routes require X-Admin-Key header.
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith('/api/v1/admin')) return; // only admin routes
    if (!ADMIN_API_KEY) return; // dev mode: allow through

    const providedKey = request.headers['x-admin-key'];
    if (!providedKey || providedKey !== ADMIN_API_KEY) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Valid X-Admin-Key header is required for admin operations.',
      });
    }
  });

  // ─── Health Check ───────────────────────────────────────
  server.get('/health', async () => ({
    status: 'UP',
    service: 'lab-billing-license-server',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  }));

  // ─── API Routes ─────────────────────────────────────────
  await server.register(licenseRoutes, { prefix: '/api/v1/licenses' });
  await server.register(adminRoutes, { prefix: '/api/v1/admin' });

  return server;
}

async function start() {
  const server = await createServer();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  const host = '0.0.0.0';

  try {
    await server.listen({ port, host });
    console.log(`🚀 Lab Billing License API running on port ${port}`);
    console.log(`🌐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Run server only if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  start();
}
