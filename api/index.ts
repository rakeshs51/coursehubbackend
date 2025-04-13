import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../dist/server';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
} 