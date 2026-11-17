# StudyFlow — AI Study Planner

A full-stack study planner built with React, Tailwind CSS, Express and SQLite. Plan study sessions on a weekly calendar, track streaks and progress, and let Google Gemini generate study plans, suggestions and tips.

## Features

- **Accounts**: register, log in, JWT sessions (30 days), export your data, delete your account
- **Dashboard**: today's sessions, completion ring, streak with this week's study days, weekly chart and goal
- **Planner**: 7-day calendar with week navigation; add, edit, complete and delete sessions on any day
- **AI Coach** (Gemini):
  - Generate a multi-day plan for chosen subjects, review it, then add the sessions you want in one click
  - "What should I study next?" suggestions based on your last 14 days
  - Topic-specific study tips
- **Progress**: weekly study time chart (browse past weeks), completed/planned sessions, goal %, subject breakdown (week or all time)
- **Subjects**: custom names and colours, hours studied per subject
- **Settings**: profile, weekly goal, personal Gemini API key (stored server-side, never sent back to the browser)
- **Responsive**: sidebar on desktop and tablet, bottom tab bar on phones

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7, Axios |
| Backend | Node.js, Express, better-sqlite3, bcryptjs, JWT |
| AI | Google Gemini via `@google/genai` (default model `gemini-2.5-flash`) |

## Run locally

Requires Node.js 20+.

```bash
# 1. Install dependencies
npm install
npm run server:install

# 2. Configure the backend
cp server/.env.example server/.env
#    Set JWT_SECRET. GEMINI_API_KEY is optional: each user can add a key in Settings.

# 3. Start both (two terminals)
npm run server:dev   # API on http://localhost:5000
npm run dev          # App on http://localhost:5173 (proxies /api to :5000)
```

Open http://localhost:5173, create an account, and start planning. Get a free Gemini key at [Google AI Studio](https://aistudio.google.com/apikey).

### Environment variables (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes in production | Secret used to sign login tokens. The server refuses to start without it when `NODE_ENV=production`. |
| `PORT` | No | API port (default `5000`) |
| `GEMINI_API_KEY` | No | Shared fallback key for users who haven't added their own |
| `GEMINI_MODEL` | No | Gemini model ID (default `gemini-2.5-flash`). `gemini-2.0-flash` was shut down on 2026-06-01. |
| `DB_PATH` | No | SQLite file location (default `server/studyflow.db`) |
| `CLIENT_ORIGIN` | No | Restrict CORS to this origin |

## Production

```bash
npm run build                    # builds the frontend into dist/
NODE_ENV=production npm start    # Express serves the API and dist/ on one port
```

## Project structure

```
ai-study-planner/
├── src/
│   ├── components/   # Layout, Sidebar, MobileNav, SessionModal, Toast, Icon, ...
│   ├── context/      # AuthContext (user/session), StudyContext (sessions, subjects, stats)
│   ├── lib/          # format.js: local-date helpers, time formatting, subject colours
│   ├── pages/        # Dashboard, Planner, AICoach, Progress, Subjects, Settings, Login, Register
│   └── services/     # api.js: Axios client and error helper
├── server/
│   ├── routes/       # auth, sessions, subjects, progress, settings, ai
│   ├── middleware/   # JWT auth
│   ├── lib/          # validation and date helpers
│   ├── db.js         # SQLite schema
│   └── index.js      # Express entry point
└── vite.config.js
```

## API

All routes except register/login need `Authorization: Bearer <token>`. Dates are local calendar days (`YYYY-MM-DD`) sent by the client, so streaks and "today" follow the user's timezone.

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account `{ name, email, password, fieldOfStudy? }` |
| POST | `/api/auth/login` | Log in `{ email, password }` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/sessions?date=` or `?from=&to=` | Sessions for a day or date range |
| POST | `/api/sessions` | Create `{ title, subjectId?, date, time, duration }` |
| POST | `/api/sessions/bulk` | Create many `{ sessions: [...] }` |
| PUT / DELETE | `/api/sessions/:id` | Update (incl. `done`) / delete |
| GET / POST | `/api/subjects` | List (with minutes studied) / create `{ name, color }` |
| PUT / DELETE | `/api/subjects/:id` | Update / delete (sessions are kept, unlinked) |
| GET | `/api/progress/weekly?date=` | Mon–Sun stats for the week containing `date` |
| GET | `/api/progress/streak?today=` | Current and longest streak |
| GET | `/api/progress/subjects[?from=&to=]` | Completed minutes per subject |
| GET | `/api/progress/summary` | All-time totals |
| GET / PUT | `/api/settings` | Profile, weekly goal, Gemini key |
| GET | `/api/settings/export` | Download all your data as JSON |
| DELETE | `/api/settings/account` | Delete account `{ password }` |
| POST | `/api/ai/generate-plan` | `{ subjectIds, availableHoursPerDay, daysCount, startDate, goals }` |
| POST | `/api/ai/suggestions` | `{ today }` |
| POST | `/api/ai/tips` | `{ subject, topic }` |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Frontend dev server |
| `npm run server:dev` | Backend with auto-reload |
| `npm run build` | Production build of the frontend |
| `npm run lint` | ESLint (frontend and server) |
| `npm start` | Start the backend (serves `dist/` if built) |
