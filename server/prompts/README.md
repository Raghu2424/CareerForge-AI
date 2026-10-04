# Prompt architecture

Prompt definitions are version-controlled in `server/ai.js` as `promptLibrary`. Each workflow carries its own system role, context/input expectation, task, JSON schema, anti-hallucination rules, and student-friendly tone. The Gemini API is called only by the backend and requests JSON MIME output. The application falls back to transparent deterministic demo logic if `GEMINI_API_KEY` is not set.

Workflows: `resumeAnalysis`, `skillExtraction`, `skillGapAnalysis`, `readinessScoring`, `roadmap`, `projectRecommendation`, `jobMatch`, `interviewPrep`, and `assistant`.
