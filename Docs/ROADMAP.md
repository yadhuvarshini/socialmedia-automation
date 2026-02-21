# Implementation Roadmap

## Completed (Current Session)

1. **Reddit removed** – From models, routes, frontend, config, env
2. **Post upload UX** – Full-screen overlay during publish/schedule, blocks UI; error modal for 503 and other failures
3. **Image generation toggle** – Optional; off by default
4. **Platform-specific posting** – Platform selector hidden when viewing a specific platform (e.g. LinkedIn)
5. **Draft persistence** – Content and schedule saved to `sessionStorage`, restored on return
6. **Schedule & font visibility** – Stronger contrast, no grey labels, better colors
7. **Error display** – Backend errors (503, etc.) surfaced in overlay with dismiss option

## Pending (Future Implementation)

### Profile page (ChatGPT-style custom instructions)

- Custom instructions per category
- Global vs platform-specific prompts
- Integration list with connect/disconnect
- AI profile suggestions per platform

### Separate Posts page

- Route: `/posts`
- Filters: date range, platform, status
- Export: CSV, PDF, JSON
- Reports section with export formats

### Content calendar & planner

- Route: `/planner`
- Notion-style calendar view
- Drag-and-drop scheduling
- AI template suggestions
- Separate from main dashboard

### Smart scheduling & best time ✓

- AI best-time suggestions per platform (shown when scheduling)
- Human-style copy for suggestions

### Realtime URL conversion ✓

- Share links shown after successful post (main flow)
- API GET /posts/:id/urls for platform URLs
