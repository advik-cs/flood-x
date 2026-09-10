import express, { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Allow embedding inside Main Website iframe
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' http://localhost:* http://127.0.0.1:* https://*.vercel.app https://*.onrender.com"
  );
  next();
});

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
  : ['*'];

const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Mount API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve frontend build in production if available
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req: Request, res: Response, next: NextFunction) => {
  if (_req.path.startsWith('/api') || _req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err: Error | null) => {
    if (err) {
      res.status(200).send('FLOOD-X Backend API Server Running. Start frontend with npm run dev.');
    }
  });
});

app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`FLOOD-X Disaster Intelligence API Server running on port ${config.port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Copernicus CDSE API: ${config.copernicusClientId ? 'CONFIGURED' : 'UNCONFIGURED (DEMO FALLBACK ACTIVE)'}`);
  console.log(`Gemini AI Assistant: ${config.geminiApiKey ? 'LIVE KEY DETECTED' : 'HEURISTIC DECISION ENGINE'}`);
  console.log(`====================================================`);
});