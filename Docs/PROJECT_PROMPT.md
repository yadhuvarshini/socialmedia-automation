# Blazly – Project Description (Prompt)

Use this as a prompt or reference when describing the Blazly project to others, AI assistants, or documentation tools.

---

## Project overview

**Blazly** is a social media automation and content management app. Users create, schedule, and publish posts to multiple platforms (LinkedIn, Facebook, Twitter/X, Threads, Instagram) from one dashboard. The app supports AI-generated content, AI-generated images, and smart scheduling with best-time suggestions.

---

## Tech stack

- **Backend**: Node.js (Express), MongoDB, OAuth 2.0 / OAuth 1.0a for platforms
- **Frontend**: React, Vite, dark glossy UI
- **AI**: Google Gemini API (content generation, image generation, best-time suggestions)
- **Scheduler**: Node-cron for scheduled posts

---

## Core features

### Authentication
- Email/password signup and login
- Social login: LinkedIn, Facebook, Twitter
- Persistent sessions and integrations stored in MongoDB

### Integrations (connect once, persist in DB)
- **LinkedIn** – Post to personal feed
- **Facebook** – Post to selected Facebook Page
- **Twitter/X** – Post tweets
- **Threads** – Post to Threads
- **Instagram** – Post images to Instagram Business/Creator (requires Facebook Page link)

### Post creation
- Write posts manually or use AI to generate content by topic
- Platform selector (post to one or many)
- Post now or schedule for later
- Media support: text-only, image, video, carousel
- Draft persistence in sessionStorage
- Character limits per platform

### AI features
- **AI Post**: Generate caption from topic (Gemini, platform-aware)
- **AI Image**: Generate images from text prompt (Gemini 2.5 Flash / 3 Pro Image, or Unsplash/Pexels if configured)
- **Best times**: AI-suggested posting times per platform
- **Custom instructions**: Per-platform or global (Profile page)

### Content calendar & planner
- `/planner` – Calendar view of scheduled posts
- Click dates to schedule or view scheduled posts
- View modal for scheduled posts (content, image, platforms, time)
- Delete or add more posts per day

### Posts & reports
- `/posts` – List, filter, export (CSV, JSON, PDF)
- Filters: platform, status, date range

### Profile & inbox
- Profile page: custom AI instructions, integrations
- Inbox: placeholder for future messaging

---

## Key env vars (backend)

- `MONGO_URI` – MongoDB connection
- `GEMINI_API_KEY` – Content + image generation
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`
- `UPLOAD_BASE_URL` – Optional. Leave empty for local (/uploads via proxy). Set for S3/Firebase.

---

## Image generation flow

1. **Gemini** (multiple models) – Native image generation from prompt
2. If fail → clear error (requires GEMINI_API_KEY)

Prompt handler: `Create an image: ${userPrompt}` – passes user input through with minimal framing.

---

## Project structure (high level)

```
backend/src/
  routes/       auth, auth-integrations, posts, ai
  services/     linkedin, facebook, twitter, threads, instagram, gemini, imageGen
  models/       User, Integration, Post, GeneratedImage
  scheduler.js  Cron for scheduled posts

frontend/src/
  pages/        Landing, Home, Planner, Posts, Profile, Integrations, etc.
  components/   PostComposer, PostList, LoadingScreen, AppLayout
  hooks/        useAuth
```

---

## One-liner prompts

- **Short**: "Blazly: multi-platform social media automation app with AI content and image generation, scheduling, and a content calendar."
- **Medium**: "Blazly is a social media automation app where users create and schedule posts to LinkedIn, Facebook, Twitter, Threads, and Instagram. It includes AI-powered content and image generation (Gemini), a content calendar planner, and export/reporting."
- **For onboarding**: "Blazly lets creators manage multiple social accounts in one place: write or AI-generate posts, attach AI-generated or uploaded images, schedule for optimal times, and view everything in a calendar. Connect LinkedIn, Facebook, Twitter, Threads, or Instagram once; integrations persist in the database."
