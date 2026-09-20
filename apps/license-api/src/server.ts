import Fastify from 'fastify';
import cors from '@fastify/cors';
import { licenseRoutes } from './routes/license.js';
import { adminRoutes } from './routes/admin.js';

export async function createServer() {
  const server = Fastify({
    logger: {
      level: 'info',
    },
  });

  await server.register(cors, {
    origin: true,
  });

  // Health check
  server.get('/health', async () => {
    return {
      status: 'UP',
      service: 'lab-billing-license-server',
      timestamp: new Date().toISOString(),
    };
  });

  // API Routes
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
    console.log(`🚀 Lab Billing License API running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Run server only if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  start();
}
