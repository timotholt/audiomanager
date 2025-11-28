import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { getProjectPaths } from './utils/paths.js';
import { registerActorRoutes } from './server/routes/actors.js';
import { registerContentRoutes } from './server/routes/content.js';
import { registerTakeRoutes } from './server/routes/takes.js';
import { registerSectionRoutes } from './server/routes/sections.js';
import { registerDefaultsRoutes } from './server/routes/defaults.js';
import { registerProviderRoutes } from './server/routes/provider.js';
import { registerGenerationRoutes } from './server/routes/generation.js';

const fastify = Fastify({
  logger: false,
});

// Serve media files statically
const projectRoot = process.cwd();
const paths = getProjectPaths(projectRoot);
fastify.register(fastifyStatic, {
  root: paths.media,
  prefix: '/media/',
  decorateReply: false,
});

function getProjectRoot(): string {
  return process.cwd();
}

function getProjectContext() {
  const projectRoot = getProjectRoot();
  const paths = getProjectPaths(projectRoot);
  return { projectRoot, paths };
}

fastify.get('/api/health', async () => {
  return { status: 'ok' };
});

// Register all route modules
registerActorRoutes(fastify, getProjectContext);
registerContentRoutes(fastify, getProjectContext);
registerTakeRoutes(fastify, getProjectContext);
registerSectionRoutes(fastify, getProjectContext);
registerDefaultsRoutes(fastify, getProjectContext);
registerProviderRoutes(fastify, getProjectContext);
registerGenerationRoutes(fastify, getProjectContext);

async function start() {
  try {
    const port = 3000;
    const host = '127.0.0.1';
    await fastify.listen({ port, host });
    console.log(`VOF API server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// When this module is executed directly (e.g. via `tsx src/server.ts` or `pnpm dev`),
// start the Fastify server immediately.
void start();

export { fastify, start };
