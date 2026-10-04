export const roles = {
  'Full Stack Developer': ['JavaScript', 'React', 'Node.js', 'REST APIs', 'SQL', 'Git', 'Testing', 'Deployment'],
  'Frontend Developer': ['HTML & CSS', 'JavaScript', 'React', 'Accessibility', 'TypeScript', 'Testing', 'Performance'],
  'Backend Developer': ['Node.js', 'REST APIs', 'SQL', 'Data structures', 'Authentication', 'Testing', 'Deployment'],
  'AI/ML Engineer': ['Python', 'Statistics', 'Machine learning', 'Data analysis', 'Model evaluation', 'SQL', 'Deployment'],
  'Data Analyst': ['SQL', 'Python', 'Statistics', 'Data visualization', 'Excel', 'Communication', 'Data cleaning'],
  'Cybersecurity Analyst': ['Networking', 'Linux', 'Security fundamentals', 'Python', 'SIEM', 'Incident response', 'Risk analysis'],
};

export const defaultProfile = {
  name: 'Alex Morgan', email: 'alex.morgan@email.com', education: 'B.Tech Computer Science', year: '3rd year',
  targetRole: 'Full Stack Developer', interests: ['Product building', 'Web development'],
  skills: [
    { name: 'JavaScript', level: 'Strong' }, { name: 'React', level: 'Strong' }, { name: 'HTML & CSS', level: 'Strong' },
    { name: 'Git', level: 'Intermediate' }, { name: 'Node.js', level: 'Intermediate' }, { name: 'SQL', level: 'Needs improvement' },
  ],
  projects: [
    { name: 'CampusConnect', description: 'Student community platform built with React', skills: ['React', 'JavaScript'], completed: true },
    { name: 'Weatherly', description: 'Weather dashboard using a public API', skills: ['JavaScript', 'APIs'], completed: true },
  ],
  certifications: ['Meta Front-End Developer (in progress)'], roadmapDone: ['Learn modern JavaScript', 'Build a responsive React app'],
  conversations: [], resumeText: '', updatedAt: new Date().toISOString(),
};

export const roadmapTemplate = [
  { phase: '01', title: 'Strengthen your foundation', duration: '2 weeks', description: 'Make core web concepts second nature.', tasks: [
    { title: 'Learn modern JavaScript', detail: 'Practice async/await, array methods and ES modules.', skill: 'JavaScript', done: true },
    { title: 'Refresh HTML & CSS', detail: 'Build accessible, responsive layouts from scratch.', skill: 'HTML & CSS', done: true },
    { title: 'Get comfortable with Git', detail: 'Use branches, pull requests and meaningful commits.', skill: 'Git', done: false },
  ] },
  { phase: '02', title: 'Build your backend toolkit', duration: '3 weeks', description: 'Connect your interfaces to reliable services.', tasks: [
    { title: 'Learn Node.js fundamentals', detail: 'Understand the event loop, modules and package management.', skill: 'Node.js', done: false },
    { title: 'Design REST APIs', detail: 'Build and document a resource-based API.', skill: 'REST APIs', done: false },
    { title: 'Practice SQL queries', detail: 'Model data and write joins, indexes and aggregations.', skill: 'SQL', done: false },
  ] },
  { phase: '03', title: 'Ship a real product', duration: '3 weeks', description: 'Bring frontend and backend together.', tasks: [
    { title: 'Build a full-stack project', detail: 'Create an app with auth, persistence and a clear user problem.', skill: 'Projects', done: false },
    { title: 'Add tests and deploy', detail: 'Cover key flows and publish a working version.', skill: 'Testing', done: false },
  ] },
  { phase: '04', title: 'Get interview-ready', duration: '2 weeks', description: 'Tell your story and practice the fundamentals.', tasks: [
    { title: 'Polish your portfolio and resume', detail: 'Lead with outcomes and link to your deployed work.', skill: 'Resume', done: false },
    { title: 'Practice technical interviews', detail: 'Review data structures and explain your design choices.', skill: 'Interview prep', done: false },
  ] },
];
