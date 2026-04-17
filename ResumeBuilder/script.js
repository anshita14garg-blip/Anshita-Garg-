
/* ── STATE ── */
let currentTemplate = 'modern';
let expCount = 0, eduCount = 0, projCount = 0, certCount = 0, sbCount = 0;
let hiddenSections = new Set();
let showSkillBars = true;
let toastTimer;

/* ── HELPERS ── */
function v(id) { const e = document.getElementById(id); return e ? e.value.trim() : ''; }
function esc(s) { if (!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function live() { renderResume(); updateScore(); }

/* ── NAVIGATION ── */
function showPanel(name, el) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (el) el.classList.add('active');
}

/* ── TOGGLES ── */
function toggleSection(sec, btn) {
  btn.classList.toggle('on');
  btn.classList.contains('on') ? hiddenSections.delete(sec) : hiddenSections.add(sec);
  live();
}
function toggleSkillBars(btn) {
  btn.classList.toggle('on');
  showSkillBars = btn.classList.contains('on');
  live();
}

/* ── SKILL BARS ── */
function addSkillBar(name='', level=70) {
  const id = 'sb' + (++sbCount);
  const wrap = document.getElementById('skill-bar-list');
  const row = document.createElement('div');
  row.className = 'skill-bar-item';
  row.id = 'sbrow-' + id;
  row.innerHTML = `
    <input type="text" id="${id}-name" placeholder="JavaScript" value="${esc(name)}" oninput="live()">
    <span class="skill-level-label" id="${id}-label">${getLevelLabel(level)}</span>
    <input type="range" class="skill-range" id="${id}-range" min="10" max="100" value="${level}" style="--val:${level}%" oninput="updateSkillBar('${id}',this)">
    <button class="ic-btn del" onclick="document.getElementById('sbrow-${id}').remove();live();">✕</button>`;
  wrap.appendChild(row);
  live();
}
function updateSkillBar(id, input) {
  input.style.setProperty('--val', input.value + '%');
  const lbl = document.getElementById(id + '-label');
  if (lbl) lbl.textContent = getLevelLabel(parseInt(input.value));
  live();
}
function getLevelLabel(val) {
  if (val >= 90) return 'Expert';
  if (val >= 75) return 'Advanced';
  if (val >= 55) return 'Proficient';
  if (val >= 35) return 'Intermediate';
  return 'Beginner';
}
function getSkillBars() {
  const bars = [];
  document.querySelectorAll('[id^="sbrow-"]').forEach(row => {
    const id = row.id.replace('sbrow-', '');
    const name = v(id + '-name');
    const rangeEl = document.getElementById(id + '-range');
    if (name && rangeEl) bars.push({ name, level: parseInt(rangeEl.value) });
  });
  return bars;
}

/* ── ENTRY CARDS ── */
function makeCard(type, id, innerHtml, titleFn) {
  const card = document.createElement('div');
  card.className = 'entry-card';
  card.dataset.type = type;
  card.dataset.id = id;
  card.innerHTML = `
    <div class="ec-head" onclick="toggleCard(this)">
      <span class="ec-drag">⠿</span>
      <div class="ec-info">
        <div class="ec-title" id="${id}-etitle">New entry</div>
        <div class="ec-sub" id="${id}-esub">Click to expand</div>
      </div>
      <div class="ec-actions">
        <button class="ic-btn del" title="Delete" onclick="event.stopPropagation();this.closest('.entry-card').remove();live();">✕</button>
        <button class="ic-btn" title="Toggle">▾</button>
      </div>
    </div>
    <div class="ec-body open">${innerHtml}</div>`;
  card.querySelectorAll('input,textarea').forEach(el => {
    el.addEventListener('input', () => { titleFn(id); live(); });
  });
  return card;
}
function toggleCard(head) { head.nextElementSibling.classList.toggle('open'); }

function addExp(role='', company='', start='', end='', loc='', desc='') {
  const id = 'exp' + (++expCount);
  const inner = `
    <div class="row2">
      <div class="field"><label>Job Title</label><input id="${id}-role" value="${esc(role)}" placeholder="Frontend Developer"></div>
      <div class="field"><label>Company</label><input id="${id}-company" value="${esc(company)}" placeholder="Google"></div>
    </div>
    <div class="row3">
      <div class="field"><label>Start</label><input id="${id}-start" value="${esc(start)}" placeholder="Jun 2022"></div>
      <div class="field"><label>End</label><input id="${id}-end" value="${esc(end)}" placeholder="Present"></div>
      <div class="field"><label>Location</label><input id="${id}-loc" value="${esc(loc)}" placeholder="Remote"></div>
    </div>
    <div class="field">
      <label>Responsibilities / Achievements</label>
      <textarea id="${id}-desc" rows="4" placeholder="• Built React dashboard reducing page load by 40%&#10;• Led team of 3 engineers to deliver features 2 weeks ahead of schedule">${esc(desc)}</textarea>
    </div>`;
  const card = makeCard('exp', id, inner, id => {
    const t = document.getElementById(id+'-etitle');
    const s = document.getElementById(id+'-esub');
    if (t) t.textContent = v(id+'-role') || 'New position';
    if (s) s.textContent = v(id+'-company') || 'Company';
  });
  document.getElementById('exp-entries').appendChild(card);
  live();
}

function addEdu(degree='', school='', year='', grade='') {
  const id = 'edu' + (++eduCount);
  const inner = `
    <div class="row2">
      <div class="field"><label>Degree / Course</label><input id="${id}-degree" value="${esc(degree)}" placeholder="B.Tech Computer Science"></div>
      <div class="field"><label>Institution</label><input id="${id}-school" value="${esc(school)}" placeholder="IIT Bombay"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Duration / Year</label><input id="${id}-year" value="${esc(year)}" placeholder="2018 – 2022"></div>
      <div class="field"><label>GPA / Grade</label><input id="${id}-grade" value="${esc(grade)}" placeholder="9.1/10 | First Class"></div>
    </div>`;
  const card = makeCard('edu', id, inner, id => {
    const t = document.getElementById(id+'-etitle');
    const s = document.getElementById(id+'-esub');
    if (t) t.textContent = v(id+'-degree') || 'Degree';
    if (s) s.textContent = v(id+'-school') || 'Institution';
  });
  document.getElementById('edu-entries').appendChild(card);
  live();
}

function addProj(name='', tech='', link='', desc='') {
  const id = 'proj' + (++projCount);
  const inner = `
    <div class="row2">
      <div class="field"><label>Project Name</label><input id="${id}-name" value="${esc(name)}" placeholder="AI Resume Builder"></div>
      <div class="field"><label>Tech Stack</label><input id="${id}-tech" value="${esc(tech)}" placeholder="React, Node.js, MongoDB"></div>
    </div>
    <div class="field"><label>GitHub / Live URL</label><input id="${id}-link" value="${esc(link)}" placeholder="github.com/you/project"></div>
    <div class="field">
      <label>Description</label>
      <textarea id="${id}-desc" rows="3" placeholder="Developed a full-stack AI-powered resume builder with live preview and PDF export.">${esc(desc)}</textarea>
    </div>`;
  const card = makeCard('proj', id, inner, id => {
    const t = document.getElementById(id+'-etitle');
    const s = document.getElementById(id+'-esub');
    if (t) t.textContent = v(id+'-name') || 'New project';
    if (s) s.textContent = v(id+'-tech') || 'Tech stack';
  });
  document.getElementById('proj-entries').appendChild(card);
  live();
}

function addCert(name='', org='', year='') {
  const id = 'cert' + (++certCount);
  const inner = `
    <div class="row2">
      <div class="field"><label>Certification Name</label><input id="${id}-name" value="${esc(name)}" placeholder="AWS Solutions Architect"></div>
      <div class="field"><label>Issuer</label><input id="${id}-org" value="${esc(org)}" placeholder="Amazon Web Services"></div>
    </div>
    <div class="field"><label>Year</label><input id="${id}-year" value="${esc(year)}" placeholder="2024"></div>`;
  const card = makeCard('cert', id, inner, id => {
    const t = document.getElementById(id+'-etitle');
    const s = document.getElementById(id+'-esub');
    if (t) t.textContent = v(id+'-name') || 'Certification';
    if (s) s.textContent = v(id+'-org') || 'Issuer';
  });
  document.getElementById('cert-entries').appendChild(card);
  live();
}

/* ── HTML SECTION BUILDERS ── */
function getContactsHtml(sep='') {
  const parts = [];
  if (v('email'))    parts.push(`<span>✉ ${esc(v('email'))}</span>`);
  if (v('phone'))    parts.push(`<span>📞 ${esc(v('phone'))}</span>`);
  if (v('location')) parts.push(`<span>📍 ${esc(v('location'))}</span>`);
  if (v('linkedin')) parts.push(`<span>in ${esc(v('linkedin'))}</span>`);
  if (v('github'))   parts.push(`<span>⌥ ${esc(v('github'))}</span>`);
  if (v('website'))  parts.push(`<span>🌐 ${esc(v('website'))}</span>`);
  return parts.join(sep);
}

function getExpHtml() {
  const cards = document.querySelectorAll('[data-type="exp"]');
  if (!cards.length) return '';
  let h = `<div class="r-section"><div class="r-sec-head"><span class="r-sec-title">Experience</span><span class="r-sec-line"></span></div>`;
  cards.forEach(card => {
    const id = card.dataset.id;
    const role = v(id+'-role'), company = v(id+'-company');
    if (!role && !company) return;
    const dateStr = (v(id+'-start') || v(id+'-end')) ? `${esc(v(id+'-start'))} – ${esc(v(id+'-end'))}` : '';
    h += `<div class="r-entry"><div class="r-row"><span class="r-role">${esc(role)}</span><span class="r-date">${dateStr}</span></div>`;
    if (company) h += `<div class="r-org">${esc(company)}${v(id+'-loc') ? ' · '+esc(v(id+'-loc')) : ''}</div>`;
    if (v(id+'-desc')) h += `<div class="r-desc">${esc(v(id+'-desc'))}</div>`;
    h += '</div>';
  });
  return h + '</div>';
}

function getEduHtml() {
  const cards = document.querySelectorAll('[data-type="edu"]');
  if (!cards.length) return '';
  let h = `<div class="r-section"><div class="r-sec-head"><span class="r-sec-title">Education</span><span class="r-sec-line"></span></div>`;
  cards.forEach(card => {
    const id = card.dataset.id;
    const degree = v(id+'-degree'), school = v(id+'-school');
    if (!degree && !school) return;
    h += `<div class="r-entry"><div class="r-row"><span class="r-role">${esc(degree)}</span><span class="r-date">${esc(v(id+'-year'))}</span></div>`;
    if (school) h += `<div class="r-org">${esc(school)}${v(id+'-grade') ? ' · '+esc(v(id+'-grade')) : ''}</div>`;
    h += '</div>';
  });
  return h + '</div>';
}

function getProjHtml() {
  if (hiddenSections.has('projects')) return '';
  const cards = document.querySelectorAll('[data-type="proj"]');
  if (!cards.length) return '';
  let h = `<div class="r-section"><div class="r-sec-head"><span class="r-sec-title">Projects</span><span class="r-sec-line"></span></div>`;
  cards.forEach(card => {
    const id = card.dataset.id;
    const name = v(id+'-name');
    if (!name) return;
    h += `<div class="r-entry"><div class="r-row"><span class="r-role">${esc(name)}</span>${v(id+'-link') ? `<span class="r-date">${esc(v(id+'-link'))}</span>` : ''}</div>`;
    if (v(id+'-tech')) h += `<div class="r-org">${esc(v(id+'-tech'))}</div>`;
    if (v(id+'-desc')) h += `<div class="r-desc">${esc(v(id+'-desc'))}</div>`;
    h += '</div>';
  });
  return h + '</div>';
}

function getCertHtml() {
  if (hiddenSections.has('certifications')) return '';
  const cards = document.querySelectorAll('[data-type="cert"]');
  if (!cards.length) return '';
  let h = `<div class="r-section"><div class="r-sec-head"><span class="r-sec-title">Certifications</span><span class="r-sec-line"></span></div>`;
  cards.forEach(card => {
    const id = card.dataset.id;
    const name = v(id+'-name');
    if (!name) return;
    h += `<div class="r-entry"><div class="r-row"><span class="r-role">${esc(name)}</span><span class="r-date">${esc(v(id+'-year'))}</span></div>`;
    if (v(id+'-org')) h += `<div class="r-org">${esc(v(id+'-org'))}</div>`;
    h += '</div>';
  });
  return h + '</div>';
}

function getSkillsMainHtml() {
  const bars = getSkillBars();
  const extra = v('extraSkills').split(',').map(s=>s.trim()).filter(Boolean);
  const langs = v('languages');
  let h = '';
  if (showSkillBars && bars.length) {
    h += `<div class="r-section"><div class="r-sec-head"><span class="r-sec-title">Skills</span><span class="r-sec-line"></span></div>`;
    bars.forEach(b => {
      h += `<div class="r-skill-bar-row"><span class="r-skill-bar-name">${esc(b.name)}</span><div class="r-skill-bar-track"><div class="r-skill-bar-fill" style="width:${b.level}%"></div></div></div>`;
    });
    h += '</div>';
  }
  if (extra.length) {
    const heading = (!showSkillBars || !bars.length) ? '<div class="r-sec-head"><span class="r-sec-title">Skills</span><span class="r-sec-line"></span></div>' : '';
    h += `<div class="r-section">${heading}<div class="r-skill-tags">${extra.map(s=>`<span class="r-skill-tag">${esc(s)}</span>`).join('')}</div></div>`;
  }
  if (langs) {
    h += `<div class="r-section"><div class="r-sec-head"><span class="r-sec-title">Languages</span><span class="r-sec-line"></span></div><div class="r-summary-text">${esc(langs)}</div></div>`;
  }
  return h;
}

/* ── RENDERERS ── */
function renderResume() {
  const paper = document.getElementById('resume-paper');
  paper.className = 'resume-paper tmpl-' + currentTemplate;
  if (currentTemplate === 'professional') renderProfessional(paper);
  else if (currentTemplate === 'minimal') renderMinimal(paper);
  else renderModern(paper);
}

function renderModern(paper) {
  const name = [v('firstName'), v('lastName')].filter(Boolean).join(' ') || 'Your Name';
  let html = `<div class="r-accent-bar"></div><div class="r-body">
    <div class="r-name">${esc(name)}</div>
    ${v('jobTitle') ? `<div class="r-jobtitle">${esc(v('jobTitle'))}</div>` : ''}
    <div class="r-contacts">${getContactsHtml()}</div>`;
  if (v('summary')) html += `<div class="r-section"><div class="r-sec-head"><span class="r-sec-title">Summary</span><span class="r-sec-line"></span></div><div class="r-summary-text">${esc(v('summary'))}</div></div>`;
  html += getExpHtml() + getEduHtml() + getProjHtml() + getCertHtml() + getSkillsMainHtml() + '</div>';
  paper.innerHTML = html;
}

function renderMinimal(paper) {
  const name = [v('firstName'), v('lastName')].filter(Boolean).join(' ') || 'Your Name';
  let html = `<div class="r-body">
    <div class="r-name">${esc(name)}</div>
    ${v('jobTitle') ? `<div class="r-jobtitle">${esc(v('jobTitle'))}</div>` : ''}
    <div class="r-contacts">${getContactsHtml()}</div>`;
  if (v('summary')) html += `<div class="r-section"><div class="r-sec-title">About</div><div class="r-summary-text">${esc(v('summary'))}</div></div>`;
  html += getExpHtml() + getEduHtml() + getProjHtml() + getCertHtml() + getSkillsMainHtml() + '</div>';
  paper.innerHTML = html;
}

function renderProfessional(paper) {
  const name = [v('firstName'), v('lastName')].filter(Boolean).join(' ') || 'Your Name';
  const bars = getSkillBars();
  const extra = v('extraSkills').split(',').map(s=>s.trim()).filter(Boolean);
  let sidebar = `<div class="r-sidebar">
    <div class="r-name">${esc(name)}</div>
    ${v('jobTitle') ? `<div class="r-jobtitle">${esc(v('jobTitle'))}</div>` : ''}
    <div class="r-contacts">${getContactsHtml('<br>')}</div>`;
  if (v('summary')) sidebar += `<div class="r-sidebar-sec-title">About</div><div class="r-sidebar-text">${esc(v('summary'))}</div>`;
  if (showSkillBars && bars.length) {
    sidebar += `<div class="r-sidebar-sec-title">Skills</div>`;
    bars.forEach(b => {
      sidebar += `<div class="r-skill-bar-row"><span class="r-skill-bar-name">${esc(b.name)}</span><div class="r-skill-bar-track"><div class="r-skill-bar-fill" style="width:${b.level}%"></div></div></div>`;
    });
  }
  if (extra.length) sidebar += `<div class="r-sidebar-sec-title">Tools</div><div class="r-skill-tags">${extra.map(s=>`<span class="r-skill-tag">${esc(s)}</span>`).join('')}</div>`;
  if (v('languages')) sidebar += `<div class="r-sidebar-sec-title">Languages</div><div class="r-sidebar-text">${esc(v('languages'))}</div>`;
  sidebar += '</div>';
  paper.innerHTML = sidebar + `<div class="r-main">${getExpHtml()}${getEduHtml()}${getProjHtml()}${getCertHtml()}</div>`;
}

/* ── TEMPLATE SWITCHER ── */
function setTemplate(name, btn) {
  document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  currentTemplate = name;
  live();
  showToast('Template switched to ' + name.charAt(0).toUpperCase() + name.slice(1));
}

/* ── SCORE ── */
function updateScore() {
  const checks = [
    !!v('firstName'), !!v('email'), !!v('jobTitle'), !!v('phone'),
    v('summary').length > 30,
    document.querySelectorAll('[data-type="exp"]').length > 0,
    document.querySelectorAll('[data-type="edu"]').length > 0,
    !!(v('extraSkills') || getSkillBars().length)
  ];
  const score = Math.round(checks.filter(Boolean).length / checks.length * 100);
  document.getElementById('score-num').textContent = score + '%';
  const navChecks = {
    basics:         !!(v('firstName') && v('email')),
    summary:        v('summary').length > 20,
    experience:     document.querySelectorAll('[data-type="exp"]').length > 0,
    education:      document.querySelectorAll('[data-type="edu"]').length > 0,
    skills:         !!(v('extraSkills') || getSkillBars().length),
    projects:       document.querySelectorAll('[data-type="proj"]').length > 0,
    certifications: document.querySelectorAll('[data-type="cert"]').length > 0
  };
  Object.entries(navChecks).forEach(([sec, done]) => {
    const nav = document.getElementById('nav-' + sec);
    if (nav) nav.classList.toggle('done', !!done);
  });
}

/* ── PDF EXPORT (FIXED) ── */
function exportPDF() {
  const loading = document.getElementById('export-loading');
  loading.classList.add('show');

  const element = document.getElementById('resume-paper');
  const prevBoxShadow = element.style.boxShadow;
  const prevBorderRadius = element.style.borderRadius;
  element.style.boxShadow = 'none';
  element.style.borderRadius = '0';

  const filename = (v('firstName') || 'resume') + '_resume.pdf';

  const opt = {
    margin:      [0, 0, 0, 0],
    filename:    filename,
    image:       { type: 'jpeg', quality: 0.99 },
    html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0, backgroundColor: '#ffffff' },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  requestAnimationFrame(() => {
    html2pdf().set(opt).from(element).save()
      .then(() => {
        element.style.boxShadow = prevBoxShadow;
        element.style.borderRadius = prevBorderRadius;
        loading.classList.remove('show');
        showToast('PDF downloaded!', 'success');
      })
      .catch(err => {
        console.error('PDF export error:', err);
        element.style.boxShadow = prevBoxShadow;
        element.style.borderRadius = prevBorderRadius;
        loading.classList.remove('show');
        showToast('Export failed. Try again.', 'error');
      });
  });
}

/* ── AI SUGGESTIONS ── */
const SUMMARY_TEMPLATES = [
  (role, skills) => `Results-driven ${role || 'professional'} with hands-on experience building scalable solutions. Proficient in ${skills || 'modern technologies'} with a strong focus on clean code and performance optimization. Adept at collaborating in agile teams to ship impactful features.`,
  (role, skills) => `Passionate ${role || 'developer'} skilled in ${skills || 'full-stack development'}, delivering end-to-end solutions from ideation to deployment. Known for strong problem-solving ability and a commitment to writing maintainable, well-documented code. Excited to contribute to high-impact products.`
];
const BULLET_TEMPLATES = [
  input => `• Developed and deployed ${input}, reducing manual effort by 35% and improving team productivity`,
  input => `• Designed and implemented ${input}, resulting in a 25% improvement in application performance and scalability`
];
const PROJECT_TEMPLATES = [
  input => `Engineered ${input} from scratch using modern web technologies. Implemented user authentication, real-time data sync, and a responsive UI. Deployed on cloud infrastructure and used by 100+ users.`,
  input => `Built ${input} as a full-stack application with clean architecture and RESTful API design. Features include dynamic filtering, search, and offline support. Open-sourced with 50+ GitHub stars.`
];

function renderSuggestions(containerId, suggestions, onUse) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = suggestions.map((text, i) => `
    <div class="ai-suggestion" onclick="useSuggestion('${containerId}',${i})">
      <span style="flex:1">${esc(text)}</span>
      <span class="use-btn">USE ↗</span>
    </div>`).join('');
  box._suggestions = suggestions;
  box._onUse = onUse;
}
function useSuggestion(containerId, idx) {
  const box = document.getElementById(containerId);
  if (!box || !box._suggestions) return;
  if (box._onUse) box._onUse(box._suggestions[idx]);
}

async function suggestSummary() {
  const input = v('summary-ai-input') || `${v('jobTitle')} with skills in ${v('extraSkills')}`;
  const role = v('jobTitle') || input;
  const skills = v('extraSkills') || input;
  const key = v('openai-key');
  if (key) { await openAISuggest('summary', input, key); return; }
  renderSuggestions('summary-suggestions', SUMMARY_TEMPLATES.map(fn => fn(role, skills)), text => {
    document.getElementById('summary').value = text; live(); showToast('Summary applied!', 'success');
  });
}

async function suggestBullets() {
  const input = v('bullet-ai-input');
  if (!input) { showToast('Enter a brief description first.'); return; }
  const key = v('openai-key');
  if (key) { await openAISuggest('bullets', input, key); return; }
  renderSuggestions('bullet-suggestions', BULLET_TEMPLATES.map(fn => fn(input)), text => {
    const tas = document.querySelectorAll('[id$="-desc"][id*="exp"]');
    if (tas.length) { const last = tas[tas.length-1]; last.value = (last.value ? last.value+'\n':'') + text; live(); showToast('Bullet added!','success'); }
    else showToast('Add an experience entry first.');
  });
}

async function suggestProject() {
  const input = v('proj-ai-input');
  if (!input) { showToast('Enter a project description first.'); return; }
  const key = v('openai-key');
  if (key) { await openAISuggest('project', input, key); return; }
  renderSuggestions('proj-suggestions', PROJECT_TEMPLATES.map(fn => fn(input)), text => {
    const tas = document.querySelectorAll('[id$="-desc"][id*="proj"]');
    if (tas.length) { tas[tas.length-1].value = text; live(); showToast('Applied!','success'); }
    else showToast('Add a project entry first.');
  });
}

async function openAISuggest(type, input, key) {
  const prompts = {
    summary: `Generate 2 concise resume professional summaries for a "${input}". Each 2-3 sentences. Return only a JSON array of 2 strings.`,
    bullets: `Generate 2 strong resume bullet points for: "${input}". Start with action verbs, include metrics. Return only a JSON array of 2 strings.`,
    project: `Generate 2 compelling project descriptions (2-3 sentences) for: "${input}". Return only a JSON array of 2 strings.`
  };
  const containerId = type === 'summary' ? 'summary-suggestions' : type === 'bullets' ? 'bullet-suggestions' : 'proj-suggestions';
  const box = document.getElementById(containerId);
  if (box) box.innerHTML = `<div style="text-align:center;padding:12px;color:var(--text3);font-size:12px"><span class="ai-spinner"></span> Generating with GPT-4…</div>`;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompts[type] }], max_tokens: 400 })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const suggestions = JSON.parse(data.choices[0].message.content.trim());
    if (type === 'summary') {
      renderSuggestions(containerId, suggestions, t => { document.getElementById('summary').value = t; live(); showToast('Summary applied!','success'); });
    } else if (type === 'bullets') {
      renderSuggestions(containerId, suggestions, t => {
        const tas = document.querySelectorAll('[id$="-desc"][id*="exp"]');
        if (tas.length) { const l = tas[tas.length-1]; l.value = (l.value ? l.value+'\n':'')+t; live(); showToast('Added!','success'); }
      });
    } else {
      renderSuggestions(containerId, suggestions, t => {
        const tas = document.querySelectorAll('[id$="-desc"][id*="proj"]');
        if (tas.length) { tas[tas.length-1].value = t; live(); showToast('Applied!','success'); }
      });
    }
  } catch(e) {
    if (box) box.innerHTML = `<div style="color:var(--red);font-size:12px;padding:10px">API Error: ${esc(e.message)}</div>`;
  }
}

/* ── TOAST ── */
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' '+type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── INIT — this must be last, runs on page load ── */
live();
