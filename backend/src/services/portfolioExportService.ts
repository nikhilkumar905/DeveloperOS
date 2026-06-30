import { IPortfolioSettings } from '../models/PortfolioSettings';
import { IGithubStats } from '../models/GithubStats';
import { IDeveloperIntelligence } from '../models/DeveloperIntelligence';

export const generatePortfolioBundleHtml = (
  user: any,
  settings: IPortfolioSettings,
  githubStats: IGithubStats | null,
  intelligence: IDeveloperIntelligence | null
): string => {
  const name = user?.name || 'Developer Name';
  const primaryColor = settings.primaryColor || '#6366f1';
  const subtitle = settings.heroSubtitle || 'Full Stack Software Engineer & Systems Architect';
  const bio = settings.bio || `Passionate software developer specializing in scalable cloud applications, data structures, and intuitive user experiences. Demonstrated record of delivering high-impact code.`;
  const avatar = settings.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  // Theme styling
  let bgColor = '#0f172a';
  let cardBg = '#1e293b';
  let textColor = '#f8fafc';
  let textMuted = '#94a3b8';

  if (settings.theme === 'minimal-light') {
    bgColor = '#f8fafc';
    cardBg = '#ffffff';
    textColor = '#0f172a';
    textMuted = '#64748b';
  } else if (settings.theme === 'cyberpunk') {
    bgColor = '#050510';
    cardBg = '#12122a';
    textColor = '#00ffcc';
    textMuted = '#ff007f';
  }

  // Projects formatting
  const repos = githubStats?.repositories || [];
  let projectsHtml = '';
  repos.slice(0, 6).forEach(repo => {
    projectsHtml += `
      <div class="project-card">
        <div class="project-header">
          <h3>${repo.name}</h3>
          <span class="stars">★ ${repo.stars}</span>
        </div>
        <p class="project-desc">${repo.description || 'Full stack repository engineered with clean architecture.'}</p>
        <div class="project-tags">
          ${(repo.languages || [repo.language || 'Code']).map(l => `<span class="tag">${l}</span>`).join('')}
        </div>
        ${repo.url ? `<a href="${repo.url}" target="_blank" class="btn-link">View Repository →</a>` : ''}
      </div>
    `;
  });

  if (!projectsHtml) {
    projectsHtml = `
      <div class="project-card">
        <h3>DeveloperOS Architecture</h3>
        <p class="project-desc">Real-time developer analytics and knowledge graph visualization platform.</p>
        <div class="project-tags"><span class="tag">React</span><span class="tag">TypeScript</span><span class="tag">Node.js</span></div>
      </div>
    `;
  }

  // Skills formatting
  const strengths = intelligence?.strengths || ['System Architecture', 'REST APIs', 'Full Stack Development', 'React', 'TypeScript', 'Node.js', 'MongoDB'];
  const skillsHtml = strengths.map(s => `<span class="skill-pill">${s}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} | Portfolio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Outfit:wght@400;600;800&family=Fira+Code&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${primaryColor};
      --bg: ${bgColor};
      --card-bg: ${cardBg};
      --text: ${textColor};
      --text-muted: ${textMuted};
      --font: '${settings.fontFamily || 'Inter'}', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.6;
      overflow-x: hidden;
    }
    header {
      padding: 2rem 5%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo { font-size: 1.5rem; font-weight: 800; color: var(--primary); text-decoration: none; }
    nav a {
      color: var(--text);
      text-decoration: none;
      margin-left: 2rem;
      font-weight: 500;
      transition: color 0.2s;
    }
    nav a:hover { color: var(--primary); }
    .hero {
      padding: 6rem 5%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .hero-text { flex: 1; }
    .hero-text h1 { font-size: 3.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 1.5rem; }
    .hero-text h1 span { color: var(--primary); }
    .hero-text h2 { font-size: 1.5rem; font-weight: 400; color: var(--text-muted); margin-bottom: 2rem; }
    .hero-avatar img {
      width: 320px;
      height: 320px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid var(--primary);
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
    }
    section { padding: 5rem 5%; max-width: 1200px; margin: 0 auto; }
    .section-title { font-size: 2rem; font-weight: 700; margin-bottom: 3rem; position: relative; }
    .section-title::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 60px;
      height: 4px;
      background-color: var(--primary);
      border-radius: 2px;
    }
    .skills-container { display: flex; flex-wrap: wrap; gap: 1rem; }
    .skill-pill {
      background-color: var(--card-bg);
      color: var(--text);
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.2s, border-color 0.2s;
    }
    .skill-pill:hover { transform: translateY(-3px); border-color: var(--primary); }
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }
    .project-card {
      background-color: var(--card-bg);
      border-radius: 12px;
      padding: 2rem;
      border: 1px solid rgba(255,255,255,0.08);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .project-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      border-color: var(--primary);
    }
    .project-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .project-header h3 { font-size: 1.3rem; font-weight: 700; }
    .stars { color: #eab308; font-weight: 600; font-size: 0.9rem; }
    .project-desc { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; flex-grow: 1; }
    .project-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
    .tag {
      background: rgba(99, 102, 241, 0.15);
      color: var(--primary);
      padding: 0.25rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .btn-link { color: var(--primary); font-weight: 600; text-decoration: none; align-self: flex-start; }
    footer { text-align: center; padding: 4rem 2rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.08); margin-top: 4rem; }
    @media (max-width: 768px) {
      .hero { flex-direction: column-reverse; text-align: center; }
      .hero-text h1 { font-size: 2.5rem; }
      nav { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <a href="#" class="logo">${name.split(' ')[0]}<span>OS</span></a>
    <nav>
      <a href="#about">About</a>
      <a href="#skills">Skills</a>
      <a href="#projects">Projects</a>
    </nav>
  </header>

  <div class="hero" id="about">
    <div class="hero-text">
      <h1>Hello, I'm <span>${name}</span></h1>
      <h2>${subtitle}</h2>
      <p style="color: var(--text-muted); margin-bottom: 2rem;">${bio}</p>
      <a href="#projects" style="background: var(--primary); color: #fff; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Explore My Work</a>
    </div>
    <div class="hero-avatar">
      <img src="${avatar}" alt="${name}">
    </div>
  </div>

  ${settings.sectionVisibility.showSkills !== false ? `
  <section id="skills">
    <h2 class="section-title">Core Competencies & Skills</h2>
    <div class="skills-container">
      ${skillsHtml}
    </div>
  </section>` : ''}

  ${settings.sectionVisibility.showProjects !== false ? `
  <section id="projects">
    <h2 class="section-title">Featured Engineering Projects</h2>
    <div class="projects-grid">
      ${projectsHtml}
    </div>
  </section>` : ''}

  <footer>
    <p>Engineered with DeveloperOS Intelligence • &copy; ${new Date().getFullYear()} ${name}</p>
  </footer>
</body>
</html>`;
};
