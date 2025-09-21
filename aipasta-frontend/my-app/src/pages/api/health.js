// Health check endpoint for API status
import { getDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'unknown',
      openrouter: 'unknown',
      huggingface: 'unknown'
    }
  };

  // Check MongoDB connection
  try {
    const db = await getDatabase();
    await db.admin().ping();
    healthCheck.services.database = 'connected';
  } catch (error) {
    healthCheck.services.database = 'error';
    healthCheck.status = 'degraded';
  }

  // Check OpenRouter API
  if (process.env.OPENROUTER_API_KEY) {
    healthCheck.services.openrouter = 'configured';
  } else {
    healthCheck.services.openrouter = 'not configured';
    healthCheck.status = 'degraded';
  }

  // Check Hugging Face API
  if (process.env.HUGGINGFACE_API_KEY) {
    healthCheck.services.huggingface = 'configured';
  } else {
    healthCheck.services.huggingface = 'not configured';
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
}