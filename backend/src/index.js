import express from 'express';
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
import { startScheduler } from './scheduler.js';

const app = express();

// Required when behind Vite proxy so session cookie and X-Forwarded-* are correct
app.set('trust proxy', 1);

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

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
  max: 60,
  message: { error: 'Too many requests' },
});
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/auth/integrations', authIntegrationsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/me', meRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

await connectDb();
startScheduler();

app.listen(config.port, () => {
  console.log(`Blazly API running at http://localhost:${config.port}`);
});
