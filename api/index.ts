import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage for rooms (this will reset on each function invocation)
const rooms = new Map<string, any>();

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (url === '/api/health') {
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    });
  }

  // For now, return an error message explaining WebSocket limitation
  if (url?.includes('/ws') || method === 'POST') {
    return res.status(501).json({
      error: 'WebSocket functionality not available in Vercel serverless environment',
      message: 'This feature requires a persistent WebSocket server. Consider using a different deployment platform for full functionality.',
      suggestion: 'You can still use the app for UI testing, but real-time file transfer will not work.'
    });
  }

  return res.status(404).json({ error: 'Not found' });
}
