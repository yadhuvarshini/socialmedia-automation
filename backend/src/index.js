import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import expressSession from 'express-session';
import { connectDb } from './db.js';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import authIntegrationsRoutes from './routes/auth-integrations.js';
import integrationsRoutes from './routes/integrations.js';
import meRoutes from './routes/me.js';
import postsRoutes from './routes/posts.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/upload.js';
import trendsRoutes from './routes/trends.js';
import profileRoutes from './routes/profile.js';
import onboardingRoutes from './routes/onboarding.js';
import schedulingRoutes from './routes/scheduling.js';
import inboxRoutes from './routes/inbox.js';
import { startScheduler } from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
const uploadsPath = path.resolve(__dirname, '../uploads');
console.log('[server] Static /uploads served from:', uploadsPath);
app.use('/uploads', (req, res, next) => {
  console.log('[server] /uploads request:', req.method, req.path);
  next();
}, express.static(uploadsPath));

const sessionOpts = {
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  name: 'blazly.sid',
  cookie: {
    maxAge: config.session.cookieMaxAge,
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    // In dev, cookie must work for frontend (5173) and backend (4000); same host different ports
    ...(config.nodeEnv === 'development' && { domain: 'localhost' }),
  },
};
if (config.nodeEnv === 'production') {
  // In production use MongoDB or Redis store for session
}
app.use(expressSession(sessionOpts));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/auth/integrations', authIntegrationsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/me', meRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/inbox', inboxRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

await connectDb();
startScheduler();

app.listen(config.port, () => {
  console.log(`Blazly API running at http://localhost:${config.port}`);
});
