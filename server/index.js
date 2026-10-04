import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { roles, defaultProfile, roadmapTemplate } from './data.js';
import { generate } from './ai.js';
import { getProfile, saveProfile } from './store.js';

const app = express();
const port = Number(process.env.PORT || 3001);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: true, legacyHeaders: false }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => {
  if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) return cb(new Error('Please upload a PDF file.'));
  cb(null, true);
} });
const skillSchema = z.array(z.object({ name: z.string().trim().min(1).max(60), level: z.enum(['Strong', 'Intermediate', 'Needs improvement']) })).max(60);
const profileSchema = z.object({ name: z.string().trim().min(1).max(80), education: z.string().max(120).optional(), year: z.string().max(60).optional(), targetRole: z.enum(Object.keys(roles)), skills: skillSchema.optional(), interests: z.array(z.string().max(80)).max(20).optional() });
const roleSchema = z.object({ targetRole: z.enum(Object.keys(roles)) });

function demoReadiness(profile) {
  const weights = { Strong: 12, Intermediate: 8, 'Needs improvement': 4 };
  const target = roles[profile.targetRole] || roles['Full Stack Developer'];
  const byName = new Map((profile.skills || []).map(s => [s.name.toLowerCase(), s.level]));
  const matches = target.map(name => ({ name, level: byName.get(name.toLowerCase()) || (name === 'REST APIs' && byName.get('apis') ? 'Needs improvement' : null) }));
  const points = matches.reduce((sum, skill) => sum + (weights[skill.level] || 0), 0);
  const projectBonus = Math.min((profile.projects || []).filter(p => p.completed).length * 4, 8);
  const score = Math.min(100, Math.round((points / (target.length * 12)) * 82 + projectBonus));
  return { score, skills: matches.map(s => ({ name: s.name, status: s.level || 'Missing', studentEvidence: s.level ? 'Listed in your profile' : 'Not listed in your profile', whyItMatters: `A core ${profile.targetRole} capability` })), strengths: matches.filter(s => s.level === 'Strong').map(s => s.name), gaps: matches.filter(s => !s.level || s.level === 'Needs improvement').map(s => s.name), nextSteps: matches.filter(s => !s.level || s.level === 'Needs improvement').slice(0, 3).map(s => `Build evidence in ${s.name} with a small, deployed project.`) };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, aiEnabled: Boolean(process.env.GEMINI_API_KEY), persistence: process.env.FIREBASE_PROJECT_ID ? 'firestore' : 'demo-local' }));
app.get('/api/roles', (_req, res) => res.json({ roles: Object.entries(roles).map(([name, skills]) => ({ name, skills })) }));
app.get('/api/profile', async (req, res, next) => { try { res.json({ profile: await getProfile(req.query.userId || 'demo'), demo: !process.env.FIREBASE_PROJECT_ID }); } catch (e) { next(e); } });
app.put('/api/profile', async (req, res, next) => {
  try {
    const value = profileSchema.parse(req.body);
    const profile = { ...(await getProfile(req.body.userId || 'demo')), ...value, skills: value.skills || (await getProfile(req.body.userId || 'demo')).skills, updatedAt: new Date().toISOString() };
    await saveProfile(req.body.userId || 'demo', profile); res.json({ profile });
  } catch (e) { next(e); }
});
app.post('/api/assessment', async (req, res, next) => {
  try { const { targetRole } = roleSchema.parse(req.body); const profile = { ...(await getProfile(req.body.userId || 'demo')), targetRole }; const ai = await generate('readinessScoring', profile); res.json({ assessment: ai || demoReadiness(profile), source: ai ? 'gemini' : 'demo' }); }
  catch (e) { next(e); }
});
app.post('/api/skills/analyze', async (req, res, next) => {
  try { const profile = await getProfile(req.body.userId || 'demo'); if (req.body.targetRole) profile.targetRole = roleSchema.parse({ targetRole: req.body.targetRole }).targetRole; const ai = await generate('skillGapAnalysis', profile); res.json({ analysis: ai || demoReadiness(profile), source: ai ? 'gemini' : 'demo' }); }
  catch (e) { next(e); }
});
app.get('/api/roadmap', async (req, res, next) => { try { const profile = await getProfile(req.query.userId || 'demo'); res.json({ roadmap: roadmapTemplate.map(phase => ({ ...phase, tasks: phase.tasks.map(task => ({ ...task, done: profile.roadmapDone?.includes(task.title) || task.done })) })) }); } catch (e) { next(e); } });
app.patch('/api/roadmap/task', async (req, res, next) => {
  try { const schema = z.object({ title: z.string().min(1).max(120), done: z.boolean() }); const { title, done } = schema.parse(req.body); const profile = await getProfile(req.body.userId || 'demo'); const set = new Set(profile.roadmapDone || []); done ? set.add(title) : set.delete(title); profile.roadmapDone = [...set]; await saveProfile(req.body.userId || 'demo', profile); res.json({ roadmapDone: profile.roadmapDone }); }
  catch (e) { next(e); }
});
app.post('/api/resume/analyze', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A PDF resume is required.' });
    const parsed = await pdfParse(req.file.buffer); const text = parsed.text.slice(0, 30_000);
    if (!text.trim()) return res.status(422).json({ error: 'No selectable text found. Please upload a text-based PDF.' });
    const profile = await getProfile(req.body.userId || 'demo'); profile.resumeText = text.slice(0, 12_000); await saveProfile(req.body.userId || 'demo', profile);
    const ai = await generate('resumeAnalysis', profile, { resumeText: text, targetRole: profile.targetRole });
    res.json({ analysis: ai || { summary: 'Resume text extracted successfully. Add a Gemini API key to receive AI-powered feedback.', education: extractLines(text, /education|university|college|b\.tech|bachelor/i), skills: extractLines(text, /javascript|react|node|python|sql|java|typescript|html|css|git/i), projects: extractLines(text, /project|built|developed|created/i), experience: [], certifications: extractLines(text, /certification|certified/i), strengths: [], gaps: [], suggestions: ['Add measurable outcomes to project bullets.', 'Tailor the skills section to your target role.'] }, source: ai ? 'gemini' : 'demo' });
  } catch (e) { next(e); }
});
function extractLines(text, pattern) { return text.split(/\n+/).map(s => s.trim()).filter(s => s && pattern.test(s)).slice(0, 8); }
app.post('/api/projects/recommend', async (req, res, next) => { try { const profile = await getProfile(req.body.userId || 'demo'); const ai = await generate('projectRecommendation', profile); res.json({ projects: ai?.projects || [ { title: 'Student opportunity board', level: 'Beginner', description: 'Build a searchable board for campus roles with saved listings.', skills: ['React', 'REST APIs', 'HTML & CSS'], milestones: ['Design listings UI', 'Connect an API', 'Add saved roles'], whyItFits: 'Builds on your React foundation.' }, { title: 'Collaborative study planner', level: 'Intermediate', description: 'Create a full-stack planner with shared study groups.', skills: ['Node.js', 'SQL', 'Authentication'], milestones: ['Model users and plans', 'Build REST API', 'Add auth and deploy'], whyItFits: 'Creates evidence in your current backend gaps.' }, { title: 'Career readiness tracker', level: 'Advanced', description: 'Turn learning progress into a data-rich portfolio product.', skills: ['Testing', 'Deployment', 'System design'], milestones: ['Define data model', 'Add tests', 'Deploy and document'], whyItFits: 'Demonstrates end-to-end product ownership.' }], source: ai ? 'gemini' : 'demo' }); } catch (e) { next(e); } });
app.post('/api/jobs/match', async (req, res, next) => {
  try { const { jobDescription } = z.object({ jobDescription: z.string().trim().min(80).max(10_000) }).parse(req.body); const profile = await getProfile(req.body.userId || 'demo'); const ai = await generate('jobMatch', profile, { jobDescription });
    if (ai) return res.json({ result: ai, source: 'gemini' });
    const text = jobDescription.toLowerCase(); const target = roles[profile.targetRole] || []; const student = new Set((profile.skills || []).map(s => s.name.toLowerCase())); const required = target.filter(skill => text.includes(skill.toLowerCase())); const matchingSkills = required.filter(skill => student.has(skill.toLowerCase())); const missingSkills = required.filter(skill => !student.has(skill.toLowerCase())); const pct = required.length ? Math.round(matchingSkills.length / required.length * 100) : 0;
    res.json({ result: { matchPercentage: pct, matchingSkills: matchingSkills.map(name => ({ name, evidence: 'Listed in your profile' })), missingSkills: missingSkills.map(name => ({ name, priority: 'Consider gaining evidence' })), preparation: missingSkills.slice(0, 3).map(s => `Practice ${s} and add a project example.`), readiness: pct >= 70 ? 'Good alignment based on listed skills' : 'Build more evidence before applying', uncertainties: ['Demo matching checks role skills mentioned in the description; it may miss paraphrased requirements.'] }, source: 'demo' });
  } catch (e) { next(e); }
});
app.post('/api/interview/prep', async (req, res, next) => { try { const profile = await getProfile(req.body.userId || 'demo'); const ai = await generate('interviewPrep', profile); res.json({ prep: ai || { questions: [ { question: 'Walk me through a project you are proud of.', category: 'Project deep dive', whatToShow: 'Your decisions, trade-offs and contribution.', followUp: 'What would you improve next?' }, { question: 'How does a browser render a React component?', category: 'Frontend fundamentals', whatToShow: 'Clear reasoning about state and rendering.', followUp: 'How would you reduce unnecessary re-renders?' }, { question: 'How would you design a REST endpoint for saved jobs?', category: 'Backend fundamentals', whatToShow: 'Resources, validation and error handling.', followUp: 'How would you persist and test it?' } ], practicePlan: ['Prepare one project story using situation, action and result.', 'Practice explaining a technical choice out loud.', 'Review JavaScript fundamentals.'], tips: ['Use examples from your actual work.', 'It is fine to explain what you would learn next.'] }, source: ai ? 'gemini' : 'demo' }); } catch (e) { next(e); } });
app.post('/api/assistant', async (req, res, next) => {
  try { const { message } = z.object({ message: z.string().trim().min(1).max(2000) }).parse(req.body); const profile = await getProfile(req.body.userId || 'demo'); const ai = await generate('assistant', profile, { message, history: profile.conversations?.slice(-8) || [] });
    const reply = ai?.reply || `For your ${profile.targetRole} path, a useful next step is to build evidence in one role skill at a time. Your profile currently lists ${profile.skills.map(s => s.name).join(', ')}. Choose a small project that exercises your next gap, then write down what you learned. Add a Gemini API key for personalized conversational responses.`;
    profile.conversations = [...(profile.conversations || []), { role: 'user', text: message, at: new Date().toISOString() }, { role: 'assistant', text: reply, at: new Date().toISOString() }].slice(-20); await saveProfile(req.body.userId || 'demo', profile); res.json({ reply, source: ai ? 'gemini' : 'demo' });
  } catch (e) { next(e); }
});

// In production, serve the Vite build from the same origin as the API so a
// single Render service provides a working end-to-end demo without rewrites.
const frontendPath = fileURLToPath(new URL('../dist', import.meta.url));
if (existsSync(frontendPath)) {
  app.use(express.static(frontendPath, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(fileURLToPath(new URL('../dist/index.html', import.meta.url)));
  });
}

app.use((err, _req, res, _next) => { const status = err instanceof z.ZodError ? 400 : err.code === 'LIMIT_FILE_SIZE' ? 413 : err.message?.includes('PDF') ? 400 : 500; if (status === 500) console.error(err); res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : err instanceof z.ZodError ? err.issues.map(i => i.message).join(', ') : err.message }); });

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  if (!getApps().length) initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }) });
}
app.listen(port, () => console.log(`CareerForge API listening on http://localhost:${port}`));
