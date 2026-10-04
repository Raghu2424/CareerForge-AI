# CareerForge AI

CareerForge is a career-readiness workspace for students. It connects a student profile and target role to a transparent skill assessment, an actionable roadmap, resume feedback, project ideas, real job-description matching, and a career assistant.

## Architecture

```text
React + Vite + Tailwind browser app
        │ /api (same-origin in dev)
        ▼
Express API ── Zod input validation, Helmet, rate limits
    ├── Gemini (server-side JSON workflows; optional)
    ├── PDF text extraction (5 MB limit)
    └── Profile store ── in-memory demo or Firestore
```

The frontend never receives the Gemini key or Firebase Admin credential. API workflows ask Gemini for structured JSON and use explicit grounded demo responses when no key is configured. Demo scoring/matching makes the project testable without credentials; it is illustrative guidance, not hiring advice. The local in-memory store resets when the server restarts.

### Folder structure

```text
careerforge-ai/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api.js
│   └── styles.css
└── server/
    ├── index.js
    ├── ai.js
    ├── data.js
    ├── store.js
    └── prompts/README.md
```

## Requirements

- Node.js 20 or newer and npm
- Optional: Google Gemini API key
- Optional: Firebase project with Firestore enabled and Firebase Admin service account credentials

## Run locally

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

Open <http://localhost:5173>. The Express API uses port 3001 by default. Without API credentials, sample profile data and demo workflows are available immediately. `npm run build` generates the static frontend in `dist/`; `npm start` serves the API only, so deploy the static frontend separately or configure a reverse proxy for `/api`.

## Configure AI and persistence

Set `GEMINI_API_KEY` in `.env` to enable Gemini structured output. `GEMINI_MODEL` defaults to `gemini-2.0-flash`. The key is only read by the server. The default demo profile is Alex Morgan and can be changed from Settings. Demo profile persistence is per server process.

For Firestore persistence, set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (newlines may be written as `\\n`). Enable Firestore in the Firebase project. The server Admin SDK reads/writes the `profiles/{userId}` collection. Configure trusted user identity before exposing a production instance.

Firebase Authentication SDK is included and client Firebase variables are reserved in `.env.example`; production auth requires wiring the client sign-in flow and verifying Firebase ID tokens in Express. The demo app clearly labels its mode and does not pretend to authenticate users. Do not expose the demo endpoint publicly as multi-user auth.

## API reference

All routes are under `/api`. JSON is returned with `{ error }` on failures. Mutating bodies are validated. Rate limiting applies to `/api` (90 requests per IP per minute).

| Method | Endpoint | Body/query | Purpose |
|---|---|---|---|
| GET | `/health` | — | Service, AI and persistence status |
| GET | `/roles` | — | Target roles and baseline skill lists |
| GET | `/profile` | `?userId=demo` | Read profile |
| PUT | `/profile` | `{name, education?, year?, targetRole, skills?, interests?}` | Update profile |
| POST | `/assessment` | `{targetRole}` | Readiness score and skill evidence |
| POST | `/skills/analyze` | `{targetRole?}` | Skill gap analysis |
| GET | `/roadmap` | — | Phases and completion state |
| PATCH | `/roadmap/task` | `{title, done}` | Mark roadmap task complete/incomplete |
| POST | `/resume/analyze` | multipart field `resume` (PDF, max 5 MB) | Extract text and review evidence |
| POST | `/projects/recommend` | `{}` | Role-aligned project suggestions |
| POST | `/jobs/match` | `{jobDescription}` (80–10,000 chars) | Compare a supplied description with profile |
| POST | `/interview/prep` | `{}` | Interview questions and practice plan |
| POST | `/assistant` | `{message}` (1–2,000 chars) | Contextual career guidance |

The demo endpoints accept `userId` where applicable for local/Firestore profile lookup. Production deployments must derive this from a verified Firebase token, never trust arbitrary client-supplied IDs.

## Data model

Firestore uses `profiles/{uid}` documents:

```json
{
  "name": "Alex Morgan",
  "email": "alex.morgan@email.com",
  "education": "B.Tech Computer Science",
  "year": "3rd year",
  "targetRole": "Full Stack Developer",
  "interests": ["Product building"],
  "skills": [{"name": "React", "level": "Strong"}],
  "projects": [{"name": "CampusConnect", "skills": ["React"], "completed": true}],
  "certifications": [],
  "roadmapDone": ["Learn modern JavaScript"],
  "conversations": [],
  "resumeText": ""
}
```

Resume text and conversation history are personal data. Configure Firebase access controls, retention/deletion procedures, and privacy notices before production use.

## Prompt architecture

The prompts live in `server/ai.js` and specify role/context/input, task, JSON output shape, grounded-evidence requirements and student-friendly tone. The workflows cover resume analysis, skill extraction, skill-gap analysis, career readiness, roadmap generation, project recommendations, job matching, interview preparation and career assistant chat. Gemini response JSON is parsed server-side; failures surface as API errors rather than silently relabeling unreliable AI output as demo output.

## Sample job description for the matcher

```text
We are looking for a Full Stack Developer Intern to build accessible React interfaces and Node.js REST APIs. Candidates should understand JavaScript, SQL databases, Git, automated testing and deployment. You will collaborate with product and engineering on customer-facing features.
```

## Deployment notes

1. Deploy the Vite `dist/` output to Vercel or Netlify.
2. Deploy `server/` and its dependencies to a Node.js host (for example Render, Fly.io or a container platform).
3. Set the frontend `/api` rewrite/proxy to the backend origin and set `CLIENT_ORIGIN` to the deployed frontend origin.
4. Add secrets in the hosting provider environment, not in source control.
5. Configure Firebase ID token verification and real sign-in before allowing user-specific production data; restrict CORS, add monitoring, retention and deletion flows.

This repository has no CI or test suite yet. Before production, add unit/integration tests for scoring, validation, auth boundaries, file upload limits, Firestore rules, AI schema parsing and error handling. Do not run the demo in a public multi-user environment: demo identity is intentionally not authenticated.

## Future improvements

- Complete Firebase Authentication UI, token verification and user ownership checks.
- Persist consented resume analysis separately with deletion controls and encryption/retention policy.
- Add institution-managed role skill catalogs with source dates and citations.
- Add evaluation tests and JSON schema validation for model responses.
- Support accessible progress charts, timezone-aware reminders and real verified job integrations.
- Add recruiter views only with explicit student sharing and access controls.
