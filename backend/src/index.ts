import 'dotenv/config'

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { campaignsRouter } from './routes/campaigns';
import { oracleRouter } from './routes/oracle';
import { healthRouter } from './routes/health';
import { startEventListener } from './services/eventListener';
import { initDatabase, closeDatabase } from './db/init';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', logger());

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

// Routes
app.route('/api/v1/campaigns', campaignsRouter);
app.route('/api/v1/oracle', oracleRouter);
app.route('/api/v1', healthRouter);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Crowdfunding Backend Indexer',
    version: '1.0.0',
    database: 'PostgreSQL',
    status: 'running',
    endpoints: {
      campaigns: '/api/v1/campaigns',
      health: '/api/v1/health',
    }
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  }, 404);
});

// Initialize and start
const PORT = parseInt(process.env.PORT || '3000');

async function bootstrap() {
  try {
    console.log('🚀 Starting Crowdfunding Backend Indexer...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Initialize database
    console.log('📦 Initializing PostgreSQL database...');
    await initDatabase();
    console.log('');
    
    // Start event listener
    console.log('👂 Starting blockchain event listener...');
    startEventListener();
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 Server is running on http://localhost:${PORT}`);
    console.log(`📊 API Documentation: http://localhost:${PORT}/api/v1/campaigns`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/v1/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('❌ Failed to bootstrap application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n👋 Shutting down gracefully...');
  try {
    await closeDatabase();
    console.log('✅ Cleanup complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap();

export default {
  port: PORT,
  fetch: app.fetch,
};

serve({
  fetch: app.fetch,
  port: PORT,
});
