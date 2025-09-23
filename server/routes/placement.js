import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// lightweight demo postings (in-memory demo)
const JOB_POSTINGS = [
  {
    id: 'job-1',
    title: 'Frontend Engineer (React)',
    company: 'Acme Tech',
    location: 'Remote / Bangalore',
    postedAt: new Date().toISOString(),
    description: 'Build responsive React applications. 2+ years experience preferred.',
    tags: ['javascript', 'react', 'css'],
    salary: '₹6-10 LPA',
    applyUrl: 'https://example.com/apply/job-1'
  },
  {
    id: 'job-2',
    title: 'Backend Engineer (Node.js)',
    company: 'ByteWorks',
    location: 'Hyderabad',
    postedAt: new Date().toISOString(),
    description: 'Design scalable APIs and services with Node.js and databases.',
    tags: ['node', 'express', 'sql'],
    salary: '₹7-12 LPA',
    applyUrl: 'https://example.com/apply/job-2'
  }
];

const INTERNSHIP_POSTINGS = [
  {
    id: 'intern-1',
    title: 'Frontend Intern (React)',
    company: 'Startup Hub',
    location: 'Remote',
    postedAt: new Date().toISOString(),
    description: '3-month internship working with React + TypeScript.',
    tags: ['javascript', 'react', 'typescript'],
    stipend: '₹10,000 / month',
    applyUrl: 'https://example.com/apply/intern-1'
  },
  {
    id: 'intern-2',
    title: 'Data Science Intern',
    company: 'DataDive',
    location: 'Pune',
    postedAt: new Date().toISOString(),
    description: 'Work on ML pipelines and EDA tasks. Python & pandas required.',
    tags: ['python', 'pandas', 'ml'],
    stipend: '₹15,000 / month',
    applyUrl: 'https://example.com/apply/intern-2'
  }
];

// Public (authenticated) – list demo postings
router.get('/postings', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      jobs: JOB_POSTINGS,
      internships: INTERNSHIP_POSTINGS
    });
  } catch (err) {
    console.error('Get postings error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch postings' });
  }
});

/**
 * POST /api/placement/resume-review
 * Body: { text: string }
 * Returns a simple heuristic review and recommendations (NO external AI calls).
 */
router.post('/resume-review', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Resume text is required' });
    }

    const lower = text.toLowerCase();
    const wordCount = lower.split(/\s+/).filter(Boolean).length;

    // basic sections detection
    const hasExperience = /experience|work experience|professional experience/.test(lower);
    const hasEducation = /education|bachelor|master|degree|graduat/.test(lower);
    const hasSkills = /skills|technical skills|competenc/.test(lower);
    const hasProjects = /projects?|portfolio/.test(lower);

    // detect tech keywords
    const skillKeywords = ['javascript','react','node','express','typescript','python','java','sql','docker','kubernetes','aws','azure','git','html','css','machine learning','pandas','numpy'];
    const foundSkills = skillKeywords.filter(s => lower.includes(s));
    const uniqueFoundSkills = Array.from(new Set(foundSkills));

    // score heuristics
    let score = 40;
    if (wordCount >= 400) score += 20;
    if (hasExperience) score += 15;
    if (hasSkills) score += 10;
    if (hasProjects) score += 10;
    score += Math.min(15, uniqueFoundSkills.length * 2);
    score = Math.max(0, Math.min(100, score));

    // missing recommended skills (simple)
    const recommendedSkillSet = {
      frontend: ['javascript','react','typescript','css','html'],
      backend: ['node','express','sql','docker','aws'],
      data: ['python','pandas','numpy','scikit-learn','sql']
    };

    // infer target area by detected skills
    let area = 'general';
    if (uniqueFoundSkills.some(s => ['react','javascript','typescript','css','html'].includes(s))) area = 'frontend';
    else if (uniqueFoundSkills.some(s => ['node','express','docker','aws','sql'].includes(s))) area = 'backend';
    else if (uniqueFoundSkills.some(s => ['python','pandas','numpy','scikit-learn'].includes(s))) area = 'data';

    const missingSkills = (recommendedSkillSet[area] || []).filter(s => !uniqueFoundSkills.includes(s));
    const suggestions = [];

    if (!hasExperience) suggestions.push('Add a concise "Experience" section with company, role, dates, and 2–4 bullet achievements each.');
    if (!hasProjects) suggestions.push('Add a "Projects" section with 2–3 projects showing tech stack and measurable impact.');
    if (!hasSkills) suggestions.push('Add a "Skills" section listing technologies and your proficiency (e.g., React – Advanced).');
    if (wordCount < 250) suggestions.push('Consider expanding resume content to 2–3 pages for experienced candidates or ~1 page for freshers with detailed projects.');
    if (missingSkills.length > 0) suggestions.push(`Consider learning/adding these ${area} skills: ${missingSkills.join(', ')}.`);

    // resource recommendations for missing skills (demo links)
    const resourcesMap = {
      'react': 'https://reactjs.org/docs/getting-started.html',
      'javascript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
      'typescript': 'https://www.typescriptlang.org/docs/',
      'node': 'https://nodejs.org/en/docs/guides/',
      'express': 'https://expressjs.com/en/starter/installing.html',
      'python': 'https://docs.python.org/3/tutorial/',
      'pandas': 'https://pandas.pydata.org/docs/getting_started/index.html',
      'sql': 'https://www.w3schools.com/sql/',
      'docker': 'https://docs.docker.com/get-started/',
      'aws': 'https://aws.amazon.com/getting-started/'
    };

    const recommendedResources = missingSkills.slice(0, 5).map(skill => ({
      skill,
      url: resourcesMap[skill] || `https://www.google.com/search?q=learn+${encodeURIComponent(skill)}`
    }));

    // action items: short bullets
    const actionItems = [
      'Quantify achievements: use numbers (e.g., "improved load time by 30%").',
      'Tailor resume to the role: move relevant skills and projects to top.',
      'Remove irrelevant details and keep formatting consistent (single font, clear headings).'
    ];

    res.json({
      success: true,
      score,
      wordCount,
      detectedSkills: uniqueFoundSkills,
      inferredArea: area,
      suggestions,
      recommendedResources,
      actionItems
    });
  } catch (err) {
    console.error('Resume review error', err);
    res.status(500).json({ success: false, message: 'Failed to review resume' });
  }
});

export default router;
