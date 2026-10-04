async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const api = {
  profile: () => request('/profile'),
  updateProfile: body => request('/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  assessment: targetRole => request('/assessment', json({ targetRole })),
  skills: targetRole => request('/skills/analyze', json({ targetRole })),
  roadmap: () => request('/roadmap'),
  toggleTask: (title, done) => request('/roadmap/task', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, done }) }),
  resume: file => { const body = new FormData(); body.append('resume', file); return request('/resume/analyze', { method: 'POST', body }); },
  projects: () => request('/projects/recommend', json({})),
  jobMatch: jobDescription => request('/jobs/match', json({ jobDescription })),
  interview: () => request('/interview/prep', json({})),
  assistant: message => request('/assistant', json({ message })),
};
