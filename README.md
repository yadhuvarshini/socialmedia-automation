# Blazly – LinkedIn Post Automation

Create and schedule LinkedIn posts from one place. Users sign in with LinkedIn (your app **Blazly Social Media Automation**), write posts, post now or schedule for later. Rate limiting and MongoDB are built in; the UI is simple and glossy.

## Architecture

- **Backend**: Node.js (Express), MongoDB, LinkedIn OAuth 2.0 (3-legged), Share on LinkedIn (UGC Post API), in-app rate limiting, cron-based scheduler.
- **Frontend**: React + Vite, dark glossy UI, proxy to API in dev.
- **Docs**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full plan, rate limits, and scalability notes.

## Prerequisites

- **Node.js** 18+
- **MongoDB** running locally (e.g. `mongodb://127.0.0.1:27017`) or a cloud URI
- **LinkedIn Developer App**  
  - App: Blazly Social Media Automation (Client ID: `86swiutwriegdi`)  
  - Products: Share on LinkedIn (`w_member_social`)  
  - In [Developer Portal](https://www.linkedin.com/developers/apps) → Your app → **Auth**: add redirect URL  
    - Local: `http://localhost:4000/api/auth/linkedin/callback`  
  - Copy **Client Secret** from the Auth tab (never commit it).

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set LINKEDIN_CLIENT_SECRET, SESSION_SECRET, MONGO_URI if needed
npm install
npm run dev
```

API runs at **http://localhost:4000**.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**. The Vite dev server proxies `/api` to the backend.

### 3. Use the app

1. Open http://localhost:5173
2. Click **Sign in with LinkedIn** (redirects to LinkedIn, then back to the app)
3. On the dashboard: write a post, choose **Post now** or **Schedule** (date/time)
4. Scheduled posts are published by the backend cron every minute (see `backend/src/scheduler.js`)

## Environment (backend)

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `4000`) |
| `MONGO_URI` | MongoDB connection string |
| `FRONTEND_URL` | Frontend origin for CORS and OAuth redirect (e.g. `http://localhost:5173`) |
| `LINKEDIN_CLIENT_ID` | LinkedIn app Client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn app Client Secret (**required**) |
| `LINKEDIN_REDIRECT_URI` | Must match a redirect URL in the LinkedIn app (e.g. `http://localhost:4000/api/auth/linkedin/callback`) |
| `LINKEDIN_APP_DAILY_LIMIT` | Max LinkedIn API calls per app per day (default `100`) |
| `LINKEDIN_USER_DAILY_LIMIT` | Max LinkedIn API calls per user per day (default `15`) |
| `SESSION_SECRET` | Secret for signing session cookies |

## Rate limiting

- **LinkedIn**: Application- and member-level limits (24h UTC). Exact quotas appear in Developer Portal → Your app → **Analytics** after you make requests. The app enforces conservative defaults; adjust in `.env` after checking Analytics.
- **Your API**: 60 requests per minute per IP (see `backend/src/index.js`).

## Project layout

```
├── ARCHITECTURE.md    # Plan, auth flow, rate limits, scalability
├── README.md          # This file
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config.js
│       ├── db.js
│       ├── index.js
│       ├── middleware/auth.js
│       ├── models/User.js, Post.js, RateLimit.js
│       ├── routes/auth.js, me.js, posts.js
│       ├── scheduler.js
│       └── services/linkedin.js, rateLimit.js
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── hooks/useAuth.js
        ├── pages/Landing.jsx, Dashboard.jsx
        └── components/PostComposer.jsx, PostList.jsx
```

## Production checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS; set `FRONTEND_URL` and `LINKEDIN_REDIRECT_URI` to HTTPS
- [ ] Store `LINKEDIN_CLIENT_SECRET` and `SESSION_SECRET` in a vault or env (never in repo)
- [ ] Use a proper session store (e.g. MongoDB or Redis) for `express-session`
- [ ] Consider encrypting LinkedIn tokens at rest
- [ ] Optional: move scheduler to a job queue (e.g. Bull + Redis) for scale

## License

Private / use as you need.
