/* ── STATE ── */
let currentTemplate = 'modern';
let expCount = 0, eduCount = 0, projCount = 0, certCount = 0, sbCount = 0;
let hiddenSections = new Set();
let showSkillBars = true;
let toastTimer;

/* ── HELPERS ── */
const v = id => document.getElementById(id)?.value.trim() || '';
const esc = s => s ? s.replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c])) : '';

function live() {
  renderResume();
  updateScore();
  validateLiveInputs();
}

/* ── VALIDATION ── */
function validateForm() {
  const email = v('email');
  const phone = v('phone');

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[6-9]\d{9}$/;

  if (!v('firstName')) return showToast('First name required', 'error'), false;
  if (!emailPattern.test(email)) return showToast('Invalid email', 'error'), false;
  if (!phonePattern.test(phone)) return showToast('Invalid phone number', 'error'), false;

  showToast('Form validated!', 'success');
  return true;
}

function validateLiveInputs() {
  const emailEl = document.getElementById('email');
  const phoneEl = document.getElementById('phone');

  if (emailEl) emailEl.style.borderColor =
    emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value) ? 'red' : '';

  if (phoneEl) phoneEl.style.borderColor =
    phoneEl.value && !/^[6-9]\d{9}$/.test(phoneEl.value) ? 'red' : '';
}

/* ── NAVIGATION ── */
function showPanel(name, el) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  el?.classList.add('active');
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

/* ── SKILLS ── */
function getSkillBars() {
  return [...document.querySelectorAll('[id^="sbrow-"]')].map(row => {
    const id = row.id.replace('sbrow-', '');
    return {
      name: v(id + '-name'),
      level: parseInt(document.getElementById(id + '-range')?.value || 0)
    };
  }).filter(s => s.name);
}

/* ── RENDER ── */
function renderResume() {
  const paper = document.getElementById('resume-paper');
  paper.className = 'resume-paper tmpl-' + currentTemplate;

  const name = [v('firstName'), v('lastName')].filter(Boolean).join(' ') || 'Your Name';

  paper.innerHTML = `
    <div class="r-body">
      <div class="r-name">${esc(name)}</div>
      <div class="r-jobtitle">${esc(v('jobTitle'))}</div>
      <div class="r-contacts">
        ${esc(v('email'))} | ${esc(v('phone'))} | ${esc(v('location'))}
      </div>
    </div>
  `;
}

/* ── SCORE ── */
function updateScore() {
  const score = [
    v('firstName'),
    v('email'),
    v('phone'),
    v('jobTitle')
  ].filter(Boolean).length * 25;

  document.getElementById('score-num').textContent = score + '%';
}

/* ── PDF EXPORT ── */
function exportPDF() {
  const element = document.getElementById('resume-paper');

  html2pdf().from(element).save(
    (v('firstName') || 'resume') + '.pdf'
  );
}

/* ── AI (DISABLED FOR SECURITY) ── */
// API key usage removed intentionally

/* ── TOAST ── */
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── INIT ── */
live();