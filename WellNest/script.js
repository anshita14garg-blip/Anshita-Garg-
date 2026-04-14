/**
 * WellNest – Smart Student Health Companion
 * script.js – Complete Application Logic
 * UN SDG 3: Good Health and Well-Being
 * -----------------------------------------------
 * Features:
 *  - Mood, Sleep, Water trackers (localStorage)
 *  - Health Score Engine
 *  - Smart Suggestions
 *  - Chart.js Trends
 *  - Breathing Exercise (4-7-8 method)
 *  - Rule-based AI Chatbot (+ optional OpenAI)
 *  - PDF Report (jsPDF)
 *  - Browser Notifications
 *  - Late Night Mode
 *  - Firebase-ready hooks
 */

// ============================================================
// CONFIGURATION  (edit these to enable optional features)
// ============================================================

/** Optional: Paste your OpenAI API key here for GPT responses */
const OPENAI_KEY = '';   // e.g. 'sk-...'

/**
 * Optional: Firebase config object.
 * Replace with your project's config from Firebase Console.
 * Leave as null to use localStorage only.
 */
const FIREBASE_CONFIG = null;
/*
  Example:
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "YOUR_APP_ID"
  };
*/

// Daily goals
const WATER_GOAL   = 8;   // glasses per day
const SLEEP_GOAL   = 8;   // ideal hours

// ============================================================
// STATE  – loaded from localStorage on startup
// ============================================================
let state = {
  mood:          null,        // 'happy' | 'neutral' | 'sad'
  sleep:         7,           // hours (float)
  water:         0,           // glasses (int)
  score:         0,
  breathSessions:0,
  lateNightOverride: false,
  moodHistory:   [],          // [{ date, mood }] last 7 days
  sleepHistory:  [],          // [{ date, hours }] last 7 days
};

/** Maps for converting mood string → numeric score */
const MOOD_SCORE = { happy: 100, neutral: 55, sad: 15 };
const MOOD_EMOJI = { happy: '😊', neutral: '😐', sad: '😢', null: '—' };
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  startClock();
  detectLateNight();
  renderWaterGlasses();
  renderStreak();
  updateAllUI();
  initCharts();
  scheduleBrowserReminders();
  initChat();

  // Refresh clock and late-night check every minute
  setInterval(() => {
    startClock();
    detectLateNight();
  }, 60_000);
});

// ============================================================
// PERSISTENCE  – localStorage
// ============================================================

function saveState() {
  localStorage.setItem('wellnest_state', JSON.stringify(state));
  pushToFirebase(); // no-op if Firebase not configured
}

function loadState() {
  const raw = localStorage.getItem('wellnest_state');
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      state = { ...state, ...saved };
    } catch(e) {
      console.warn('WellNest: Failed to parse saved state', e);
    }
  }
  // Guard array fields
  if (!Array.isArray(state.moodHistory))  state.moodHistory  = [];
  if (!Array.isArray(state.sleepHistory)) state.sleepHistory = [];

  // Pre-fill input
  const sleepInput = document.getElementById('sleepInput');
  if (sleepInput) sleepInput.value = state.sleep;
}

// ============================================================
// FIREBASE (stub – extend with your own logic)
// ============================================================
function pushToFirebase() {
  if (!FIREBASE_CONFIG) return;
  // If you have Firebase SDK loaded:
  // firebase.firestore().collection('wellnest').doc('user').set(state);
  console.log('WellNest: Firebase push (implement SDK)');
}

// ============================================================
// CLOCK & LATE NIGHT
// ============================================================
function startClock() {
  const el = document.getElementById('datetimeBadge');
  if (!el) return;
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
  el.textContent = `${date}  ${time}`;
}

function detectLateNight() {
  const hour = new Date().getHours();
  const isLate = hour >= 22 || hour < 5;
  if (isLate || state.lateNightOverride) {
    document.body.classList.add('late-night');
  } else {
    document.body.classList.remove('late-night');
  }
}

function toggleLateNight() {
  state.lateNightOverride = !state.lateNightOverride;
  detectLateNight();
  toast(state.lateNightOverride ? '🌙 Late Night Mode ON' : '☀️ Late Night Mode OFF');
}

// ============================================================
// VIEW ROUTER
// ============================================================
function showView(name, btn, isMobile = false) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // Show target
  const target = document.getElementById('view-' + name);
  if (target) target.classList.add('active');

  // Update desktop nav
  if (!isMobile) {
    document.querySelectorAll('#desktopNav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }

  // Update mobile nav
  if (isMobile) {
    document.querySelectorAll('#mobileNav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    // Sync desktop nav
    const names = ['dashboard','trackers','breathing','chatbot','report'];
    const idx = names.indexOf(name);
    const dBtns = document.querySelectorAll('#desktopNav button');
    dBtns.forEach(b => b.classList.remove('active'));
    if (dBtns[idx]) dBtns[idx].classList.add('active');
  }

  // Refresh charts when trackers view is opened
  if (name === 'trackers')  { updateMoodChart(); }
  if (name === 'dashboard') { updateTrendChart(); }
  if (name === 'report')    { fillReport(); }
}

// ============================================================
// MOOD TRACKER
// ============================================================
function selectMood(mood, btn) {
  state.mood = mood;
  // Update button styles
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function logMood() {
  if (!state.mood) {
    toast('👆 Please select a mood first!', 'warn');
    return;
  }
  // Store to history (today only – one entry per day)
  const today = todayKey();
  state.moodHistory = state.moodHistory.filter(e => e.date !== today);
  state.moodHistory.push({ date: today, mood: state.mood });
  // Keep last 7 days
  state.moodHistory = state.moodHistory.slice(-7);

  saveState();
  updateAllUI();
  toast(`${MOOD_EMOJI[state.mood]} Mood logged: ${capitalize(state.mood)}!`);
}

// ============================================================
// SLEEP TRACKER
// ============================================================
function updateSleepPreview() {
  const val   = parseFloat(document.getElementById('sleepInput').value) || 0;
  const warn  = document.getElementById('sleepWarning');
  const fill  = document.getElementById('sleepQualityFill');
  const label = document.getElementById('sleepQualityLabel');

  warn.classList.toggle('show', val < 6 && val > 0);

  const pct = Math.min((val / SLEEP_GOAL) * 100, 100);
  fill.style.width = pct + '%';

  if      (val === 0)  { fill.style.background = 'rgba(255,255,255,0.1)'; label.textContent = 'Enter hours above'; }
  else if (val < 5)    { fill.style.background = 'var(--red)';            label.textContent = '😓 Very low — aim for 7–9h'; }
  else if (val < 6)    { fill.style.background = 'var(--amber)';          label.textContent = '⚠️ Below recommended'; }
  else if (val < 7)    { fill.style.background = 'var(--blue-mid)';       label.textContent = '😴 Acceptable — try for more'; }
  else if (val <= 9)   { fill.style.background = 'linear-gradient(90deg,var(--blue-mid),var(--blue-bright))'; label.textContent = '✨ Great sleep!'; }
  else                 { fill.style.background = 'var(--teal)';            label.textContent = '😪 Possibly oversleeping'; }
}

function logSleep() {
  const val = parseFloat(document.getElementById('sleepInput').value);
  if (isNaN(val) || val < 0 || val > 24) {
    toast('❌ Please enter a valid sleep duration (0–24h)', 'warn');
    return;
  }
  state.sleep = val;

  // History
  const today = todayKey();
  state.sleepHistory = state.sleepHistory.filter(e => e.date !== today);
  state.sleepHistory.push({ date: today, hours: val });
  state.sleepHistory = state.sleepHistory.slice(-7);

  saveState();
  updateAllUI();
  toast(`😴 Sleep saved: ${val}h`);
}

// ============================================================
// WATER TRACKER
// ============================================================
function addWater() {
  if (state.water >= 15) { toast('💧 Maximum tracked!', 'warn'); return; }
  state.water++;
  saveState();
  updateWaterUI();
  updateScore();
  updateSuggestions();
}

function removeWater() {
  if (state.water <= 0) return;
  state.water--;
  saveState();
  updateWaterUI();
  updateScore();
  updateSuggestions();
}

function renderWaterGlasses() {
  const container = document.getElementById('waterGlasses');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < WATER_GOAL; i++) {
    const filled = i < state.water;
    const g = document.createElement('div');
    g.className = 'glass';
    g.title = filled ? 'Click to remove' : 'Click to add';
    g.onclick = filled ? removeWater : addWater;
    g.innerHTML = `
      <svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5 L4 45 Q4 47 6 47 L34 47 Q36 47 36 45 L32 5 Z"
              fill="${filled ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.04)'}"
              stroke="${filled ? 'rgba(45,212,191,0.5)' : 'rgba(255,255,255,0.12)'}"
              stroke-width="1.5"/>
        ${filled ? `<path d="M9 20 L5 45 Q5 46 6 46 L34 46 Q35 46 35 45 L31 20 Z" fill="rgba(45,212,191,0.55)"/>` : ''}
        <path d="M8 5 L32 5" stroke="${filled ? 'rgba(45,212,191,0.5)' : 'rgba(255,255,255,0.12)'}" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
    container.appendChild(g);
  }
}

function updateWaterUI() {
  const pct = Math.min((state.water / WATER_GOAL) * 100, 100);
  const fill = document.getElementById('waterFill');
  const count = document.getElementById('waterCount');
  const badge = document.getElementById('waterBadge');

  if (fill)  fill.style.width  = pct + '%';
  if (count) count.textContent = state.water;

  if (badge) {
    if      (state.water >= WATER_GOAL)       { badge.className = 'badge green';  badge.textContent = '✅ Goal Met!'; }
    else if (state.water >= WATER_GOAL * 0.6) { badge.className = 'badge amber';  badge.textContent = 'On Track'; }
    else                                      { badge.className = 'badge red';    badge.textContent = 'Low'; }
  }

  renderWaterGlasses();
}

// ============================================================
// HEALTH SCORE ENGINE
// ============================================================
function computeScore() {
  let moodPts  = 0;
  let sleepPts = 0;
  let waterPts = 0;

  // Mood contribution (40%)
  if (state.mood) {
    moodPts = MOOD_SCORE[state.mood] || 0;
  }

  // Sleep contribution (35%)
  const sl = state.sleep;
  if      (sl >= 7 && sl <= 9) sleepPts = 100;
  else if (sl >= 6)            sleepPts = 70;
  else if (sl >= 5)            sleepPts = 40;
  else                         sleepPts = 15;

  // Water contribution (25%)
  waterPts = Math.min((state.water / WATER_GOAL) * 100, 100);

  const total = Math.round(moodPts * 0.40 + sleepPts * 0.35 + waterPts * 0.25);
  state.score = total;

  return { total, moodPts, sleepPts, waterPts };
}

function updateScore() {
  const { total, moodPts, sleepPts, waterPts } = computeScore();

  // Ring
  const ring = document.getElementById('scoreRingFill');
  const circumference = 2 * Math.PI * 55; // ~345.4
  const offset = circumference - (total / 100) * circumference;
  if (ring) ring.style.strokeDashoffset = offset;

  // Number
  const numEl = document.getElementById('scoreNumber');
  if (numEl) animateNumber(numEl, total);

  // Status
  const statusEl = document.getElementById('scoreStatus');
  if (statusEl) {
    if      (total >= 80) { statusEl.textContent = '🌟 Excellent'; statusEl.style.color = 'var(--green)'; }
    else if (total >= 55) { statusEl.textContent = '👍 Good';      statusEl.style.color = 'var(--blue-bright)'; }
    else                  { statusEl.textContent = '⚠️ Needs Improvement'; statusEl.style.color = 'var(--amber)'; }
  }

  // Mini bars
  const mb = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.style.width = val + '%';
  };
  mb('moodBar',  moodPts);
  mb('sleepBar', sleepPts);
  mb('waterBar', waterPts);

  // Stat cards
  const ss = document.getElementById('stat-score');
  if (ss) ss.textContent = total;
  const sw = document.getElementById('stat-water');
  if (sw) sw.textContent = state.water;
  const sl2 = document.getElementById('stat-sleep');
  if (sl2) sl2.textContent = state.sleep + 'h';
  const sm = document.getElementById('stat-mood');
  if (sm) sm.textContent = MOOD_EMOJI[state.mood] || '—';
}

function animateNumber(el, target) {
  const start = parseInt(el.textContent) || 0;
  const diff  = target - start;
  const dur   = 800;
  const step  = 16;
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed += step;
    const progress = Math.min(elapsed / dur, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * ease);
    if (elapsed >= dur) clearInterval(timer);
  }, step);
}

// ============================================================
// SUGGESTIONS ENGINE
// ============================================================
const SUGGESTIONS = {
  sad: [
    { icon:'🧘', title:'Try a 5-min meditation', text:'Apps like Calm or simply sitting quietly can reset your emotional state.' },
    { icon:'🎵', title:'Music therapy',           text:'Create a feel-good playlist. Music activates dopamine pathways.' },
    { icon:'🚶', title:'Take a short walk',       text:'Even 10 minutes of sunlight and movement significantly boosts mood.' },
    { icon:'📖', title:'Journal your thoughts',   text:'Writing down feelings helps process emotions and gain perspective.' },
  ],
  neutral: [
    { icon:'💪', title:'Light exercise',          text:'Try 20 push-ups or a quick stretch session to boost energy.' },
    { icon:'🫁', title:'Deep breathing',          text:'Use the Breathing tab for a 4-7-8 exercise right now.' },
    { icon:'📵', title:'Digital detox',           text:'Take a 30-minute break from screens to recharge your mind.' },
  ],
  happy: [
    { icon:'🎯', title:'Great energy! Set a goal',text:'Use your positive state to plan tomorrow\'s study schedule.' },
    { icon:'🤝', title:'Pay it forward',          text:'Connect with a friend — happiness spreads!' },
  ],
  lowSleep: [
    { icon:'🛏️', title:'Power nap',               text:'A 20-min nap (no more) can restore alertness without grogginess.' },
    { icon:'📵', title:'Screen curfew',            text:'Avoid screens 1 hour before bed. Blue light delays melatonin.' },
    { icon:'🌡️', title:'Cool your room',           text:'Ideal sleep temperature is 65–68°F (18–20°C).' },
    { icon:'☕', title:'Limit caffeine',            text:'Avoid caffeine after 2 PM to protect your sleep quality.' },
  ],
  lowWater: [
    { icon:'💧', title:'Hydration reminder',       text:'Sip water right now! Dehydration causes fatigue and headaches.' },
    { icon:'🍉', title:'Eat water-rich foods',     text:'Cucumber, watermelon, and oranges are 90%+ water.' },
    { icon:'⏰', title:'Set hourly reminders',     text:'Use your phone to remind you to drink every hour.' },
  ],
  lateNight: [
    { icon:'🌙', title:'Wind-down routine',        text:'Dim lights, avoid heavy meals, and start your sleep routine.' },
    { icon:'📵', title:'Night mode on',            text:'Enable blue-light filters on all screens.' },
    { icon:'🫖', title:'Chamomile tea',            text:'Warm chamomile tea can reduce anxiety and improve sleep quality.' },
  ],
};

function updateSuggestions() {
  const container = document.getElementById('suggestionsList');
  if (!container) return;

  const items = [];
  const hour  = new Date().getHours();

  if (state.mood === 'sad')       items.push(...SUGGESTIONS.sad.slice(0, 2));
  else if (state.mood === 'neutral') items.push(...SUGGESTIONS.neutral.slice(0, 1));
  else if (state.mood === 'happy')   items.push(...SUGGESTIONS.happy.slice(0, 1));

  if (state.sleep < 6 && state.sleep > 0) items.push(...SUGGESTIONS.lowSleep.slice(0, 2));
  if (state.water < 4)                    items.push(...SUGGESTIONS.lowWater.slice(0, 1));
  if (hour >= 22 || hour < 5)             items.push(...SUGGESTIONS.lateNight.slice(0, 1));

  if (items.length === 0) {
    container.innerHTML = `<div class="suggestion-item"><div class="suggestion-icon">🎉</div><div class="suggestion-text"><strong>You're doing great!</strong>Keep up your healthy habits. Log data daily for better insights.</div></div>`;
    return;
  }

  container.innerHTML = items.map((s, i) => `
    <div class="suggestion-item" style="animation-delay:${i * 60}ms">
      <div class="suggestion-icon">${s.icon}</div>
      <div class="suggestion-text"><strong>${s.title}</strong>${s.text}</div>
    </div>`).join('');
}

// ============================================================
// UPDATE ALL UI (called after any state change)
// ============================================================
function updateAllUI() {
  updateSleepPreview();
  updateWaterUI();
  updateScore();
  updateSuggestions();
  renderStreak();
  updateTrendChart();
}

// ============================================================
// STREAK RENDER
// ============================================================
function renderStreak() {
  const container = document.getElementById('streakRow');
  if (!container) return;
  container.innerHTML = '';

  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key   = dateKey(d);
    const label = DAY_LABELS[d.getDay()];

    const hasMood  = state.moodHistory.some(e => e.date === key);
    const hasSleep = state.sleepHistory.some(e => e.date === key);
    const done     = hasMood || hasSleep;
    const isToday  = i === 0;

    const dot = document.createElement('div');
    dot.className = `streak-dot ${done ? 'done' : ''} ${isToday ? 'today' : ''}`;
    dot.title = `${label}: ${done ? '✅ Logged' : '⬜ Not logged'}`;
    dot.textContent = label.slice(0,1);
    container.appendChild(dot);
  }
}

// ============================================================
// CHARTS
// ============================================================
let trendChartInstance = null;
let moodChartInstance  = null;

function initCharts() {
  Chart.defaults.color = '#a09bbf';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  updateTrendChart();
  updateMoodChart();
}

function updateTrendChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  const { labels, moodData, sleepData } = buildChartData();

  if (trendChartInstance) trendChartInstance.destroy();

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Mood Score',
          data: moodData,
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167,139,250,0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#a78bfa',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        },
        {
          label: 'Sleep (×10)',
          data: sleepData.map(v => v * 10),
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96,165,250,0.06)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#60a5fa',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          borderDash: [4,3],
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 16 } }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, min: 0, max: 110 }
      },
      animation: { duration: 700, easing: 'easeInOutQuart' }
    }
  });
}

function updateMoodChart() {
  const ctx = document.getElementById('moodChart');
  if (!ctx) return;

  const { labels, moodData } = buildChartData();
  if (moodChartInstance) moodChartInstance.destroy();

  moodChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Mood Score',
        data: moodData,
        backgroundColor: moodData.map(v => {
          if (v >= 80) return 'rgba(52,211,153,0.6)';
          if (v >= 40) return 'rgba(96,165,250,0.6)';
          return 'rgba(248,113,113,0.6)';
        }),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, min: 0, max: 110 }
      },
      animation: { duration: 600 }
    }
  });
}

function buildChartData() {
  const today = new Date();
  const labels   = [];
  const moodData = [];
  const sleepData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key   = dateKey(d);
    const label = DAY_LABELS[d.getDay()];
    labels.push(label);

    const moodEntry  = state.moodHistory.find(e => e.date === key);
    const sleepEntry = state.sleepHistory.find(e => e.date === key);

    moodData.push(moodEntry  ? MOOD_SCORE[moodEntry.mood] : 0);
    sleepData.push(sleepEntry ? sleepEntry.hours : 0);
  }

  return { labels, moodData, sleepData };
}

// ============================================================
// BREATHING EXERCISE  (4-7-8 technique)
// ============================================================
let breathTimer  = null;
let breathRunning = false;
let breathPhase  = 'inhale'; // 'inhale' | 'hold' | 'exhale'
let breathCount  = 0;
let breathCycle  = 0;
const BREATH_PHASES = [
  { name: 'inhale', label: 'INHALE',  seconds: 4, class: 'inhale' },
  { name: 'hold',   label: 'HOLD',    seconds: 7, class: 'hold'   },
  { name: 'exhale', label: 'EXHALE',  seconds: 8, class: 'exhale' },
];
let breathPhaseIdx = 0;

function toggleBreath() {
  if (breathRunning) {
    pauseBreath();
  } else {
    startBreath();
  }
}

function startBreath() {
  breathRunning = true;
  document.getElementById('breathBtn').textContent = '⏸ Pause';
  runBreathPhase();
}

function pauseBreath() {
  breathRunning = false;
  clearTimeout(breathTimer);
  document.getElementById('breathBtn').textContent = '▶ Resume';
}

function resetBreath() {
  breathRunning = false;
  clearTimeout(breathTimer);
  breathPhaseIdx = 0;
  breathCount    = 0;
  breathCycle    = 0;
  document.getElementById('breathBtn').textContent   = '▶ Start';
  document.getElementById('breathPhaseLabel').textContent = 'Press Start';
  document.getElementById('breathCounter').textContent    = '—';
  document.getElementById('breathCircle').className       = 'breath-circle';
  document.getElementById('breathCenterText').textContent = 'Ready';
}

function runBreathPhase() {
  if (!breathRunning) return;
  const phase = BREATH_PHASES[breathPhaseIdx];

  document.getElementById('breathPhaseLabel').textContent = phase.label;
  document.getElementById('breathCircle').className       = 'breath-circle ' + phase.class;
  document.getElementById('breathCenterText').textContent = phase.label;

  breathCount = phase.seconds;
  updateBreathCounter();
}

function updateBreathCounter() {
  if (!breathRunning) return;
  const counterEl = document.getElementById('breathCounter');
  counterEl.textContent = breathCount;

  if (breathCount > 0) {
    breathCount--;
    breathTimer = setTimeout(updateBreathCounter, 1000);
  } else {
    // Next phase
    breathPhaseIdx = (breathPhaseIdx + 1) % BREATH_PHASES.length;
    if (breathPhaseIdx === 0) {
      breathCycle++;
      if (breathCycle >= 4) {
        // One full session done
        completeBreathSession();
        return;
      }
    }
    breathTimer = setTimeout(runBreathPhase, 300);
  }
}

function completeBreathSession() {
  breathRunning = false;
  state.breathSessions++;
  saveState();
  document.getElementById('breathBtn').textContent        = '▶ Start';
  document.getElementById('breathPhaseLabel').textContent = 'Session Complete!';
  document.getElementById('breathCounter').textContent    = '✓';
  document.getElementById('breathCircle').className       = 'breath-circle';
  document.getElementById('breathSessions').textContent   = state.breathSessions;
  document.getElementById('breathCenterText').textContent = '🎉';
  breathPhaseIdx = 0;
  breathCycle    = 0;
  toast('🌬️ Breathing session complete! Great job.');
}

// ============================================================
// CHATBOT (UPDATED & IMPROVED)
// ============================================================

const BOT_NAME = 'WellBot';

/** Rule-based response map (IMPROVED 🔥) */
const CHAT_RULES = [
  { pattern: /hello|hi|hey/i, reply: "Hey there! 👋 I'm WellBot, your wellness companion. How are you feeling today?" },

  { pattern: /done|completed|finished/i, reply: "Great job! 🌿 You're taking steps toward better health. Keep going 💜" },

  { pattern: /not good|bad day|feeling low/i, reply: "I'm here for you 💜 Try a breathing exercise 🌬️ or take a short break. Things will get better." },

  { pattern: /sleep|tired|exhausted/i, reply: "Sleep is crucial! 😴 Aim for 7–9 hours and avoid screens before bed." },

  { pattern: /stress|anxious|anxiety/i, reply: "Feeling stressed? 🧘 Try the breathing exercise or take a short walk." },

  { pattern: /sad|depress|unhappy/i, reply: "I hear you 💜 Try talking to someone or doing something you enjoy." },

  { pattern: /water|hydrat/i, reply: "💧 Stay hydrated! Aim for 7–8 glasses daily." },

  { pattern: /mood/i, reply: "Track your mood daily 😊 It helps understand your mental patterns." },

  { pattern: /exercise|workout|gym/i, reply: "Even 20–30 minutes of activity daily boosts your health 💪" },

  { pattern: /food|eat|diet|nutrition/i, reply: "Eat balanced meals 🍎 Include proteins, fruits, and healthy carbs." },

  { pattern: /focus|study|concentrate/i, reply: "Try Pomodoro: 25 min focus + 5 min break 📚 It works great!" },

  { pattern: /score|health/i, reply: () => `Your current health score is ${state.score}/100 📊 Keep tracking to improve!` },

  { pattern: /breath|breathe|calm/i, reply: "Go to the Breathing tab 🌬️ and follow the guided exercise." },

  { pattern: /thank/i, reply: "You're welcome 😊 Keep taking care of yourself!" },

  { pattern: /help/i, reply: "I can help with sleep, stress, hydration, mood, and wellness tips 🌿 Just ask!" },
];

/** Initialize chat */
function initChat() {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;

  messages.innerHTML = '';

  addBotMessage("👋 Hi! I'm **WellBot** 🌿 — your WellNest companion. Ask me anything about health, sleep, stress, or habits!");
}

/** Add bot message */
function addBotMessage(text) {
  const div = document.createElement('div');
  div.className = 'chat-msg bot';

  if (typeof text === "function") {
    text = text();
  }

  div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  document.getElementById('chatMessages').appendChild(div);
  scrollChat();
}

/** Add user message */
function addUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.textContent = text;
  document.getElementById('chatMessages').appendChild(div);
  scrollChat();
}

/** Scroll chat */
function scrollChat() {
  const msgs = document.getElementById('chatMessages');
  msgs.scrollTop = msgs.scrollHeight;
}

/** Send chat */
function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();

  if (!text) return;

  addUserMessage(text);
  input.value = '';

  setTimeout(() => {
    const reply = getBotReply(text);
    addBotMessage(reply);
  }, 500);
}

/** Get bot reply */
function getBotReply(text) {
  for (const rule of CHAT_RULES) {
    if (rule.pattern.test(text)) {
      return typeof rule.reply === "function" ? rule.reply() : rule.reply;
    }
  }

  // 🔥 Smart fallback (no more boring reply)
  if (state.score < 50) {
    return `Your health score is ${state.score}/100 📊 Try improving sleep, hydration, and mood habits 💪`;
  }

  const randomReplies = [
    "I'm WellBot 🌿 — try asking about sleep, stress, or hydration!",
    "Tell me more! I can help you improve your daily habits 😊",
    "Ask me about wellness tips, mood, or health tracking 💜"
  ];

  return randomReplies[Math.floor(Math.random() * randomReplies.length)];
}
     

// ============================================================
// BROWSER NOTIFICATIONS
// ============================================================
function requestNotifPermission() {
  if (!('Notification' in window)) {
    toast('❌ Notifications not supported in this browser', 'warn');
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      toast('🔔 Notifications enabled!');
    } else {
      toast('🔕 Notification permission denied', 'warn');
    }
  });
}

function sendNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🌿' });
  }
}

function scheduleBrowserReminders() {
  // Water reminder every 60 minutes
  setInterval(() => {
    if (state.water < WATER_GOAL) {
      sendNotification('💧 Hydration Reminder', `You've had ${state.water} glasses. Try to reach ${WATER_GOAL} today!`);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Sleep reminder at 10 PM
  const now  = new Date();
  const tenPM = new Date(now);
  tenPM.setHours(22, 0, 0, 0);
  if (now < tenPM) {
    const delay = tenPM - now;
    setTimeout(() => {
      sendNotification('😴 Sleep Reminder', "It's 10 PM! Start winding down for a good night's sleep.");
    }, delay);
  }

  // Morning reminder at 8 AM
  const eightAM = new Date(now);
  eightAM.setHours(8, 0, 0, 0);
  if (now > eightAM) eightAM.setDate(eightAM.getDate() + 1);
  const morningDelay = eightAM - now;
  setTimeout(() => {
    sendNotification('🌅 Good Morning!', 'Log your mood and sleep in WellNest to track your wellness today.');
  }, morningDelay);
}

// ============================================================
// REPORT GENERATION (jsPDF)
// ============================================================
function fillReport() {
  const now  = new Date().toLocaleString();
  const { total } = computeScore();

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('rDate',   now);
  set('rMood',   state.mood ? `${MOOD_EMOJI[state.mood]} ${capitalize(state.mood)}` : 'Not logged');
  set('rSleep',  state.sleep ? `${state.sleep} hours` : 'Not logged');
  set('rWater',  `${state.water} / ${WATER_GOAL} glasses`);
  set('rScore',  `${total} / 100`);
  set('rBreath', `${state.breathSessions} session(s) today`);
  set('rStatus',
    total >= 80 ? '🌟 Excellent' :
    total >= 55 ? '👍 Good'      : '⚠️ Needs Improvement');
}

function downloadReport() {
  if (typeof window.jspdf === 'undefined') {
    toast('❌ jsPDF not loaded. Check your internet connection.', 'warn');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const { total } = computeScore();
  const date = new Date().toLocaleString();

  // Colors
  const PURPLE = [124, 58, 237];
  const GRAY   = [60,  60,  80];
  const LIGHT  = [245, 243, 255];

  // Header band
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, 210, 40, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('WellNest Health Report', 20, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${date}`, 20, 30);

  // UN SDG badge
  doc.setFontSize(9);
  doc.text('Aligned with UN SDG 3: Good Health & Well-Being', 20, 37);

  // Score big number
  doc.setFillColor(...LIGHT);
  doc.roundedRect(15, 50, 80, 40, 4, 4, 'F');
  doc.setTextColor(...PURPLE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text(String(total), 30, 78);
  doc.setFontSize(11);
  doc.text('/ 100 Health Score', 52, 78);
  doc.setFontSize(10);
  const statusText = total >= 80 ? 'EXCELLENT' : total >= 55 ? 'GOOD' : 'NEEDS IMPROVEMENT';
  doc.setTextColor(...GRAY);
  doc.text(`Status: ${statusText}`, 30, 84);

  // Divider
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.5);
  doc.line(15, 100, 195, 100);

  // Data rows
  const rows = [
    ['Mood Today',        state.mood ? capitalize(state.mood) : 'Not logged'],
    ['Sleep Last Night',  state.sleep ? `${state.sleep} hours` : 'Not logged'],
    ['Water Intake',      `${state.water} / ${WATER_GOAL} glasses`],
    ['Breathing Sessions',`${state.breathSessions}`],
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PURPLE);
  doc.text('Daily Metrics', 15, 112);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  let y = 122;
  rows.forEach(([label, val], i) => {
    if (i % 2 === 0) { doc.setFillColor(248, 246, 255); doc.rect(15, y - 5, 180, 12, 'F'); }
    doc.setTextColor(...GRAY);
    doc.text(label, 20, y + 2);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(val, 100, y + 2);
    doc.setFont('helvetica', 'normal');
    y += 14;
  });

  // Suggestions section
  y += 6;
  doc.setDrawColor(...PURPLE);
  doc.line(15, y, 195, y); y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PURPLE);
  doc.text('Personalized Suggestions', 15, y); y += 10;

  const suggestions = getReportSuggestions();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  suggestions.forEach(s => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.text(`• ${s}`, 20, y);
    y += 8;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...PURPLE);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('WellNest – Smart Student Health Companion | UN SDG 3', 15, 292);
    doc.text(`Page ${i}/${pageCount}`, 180, 292);
  }

  doc.save(`WellNest_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  toast('📄 Report downloaded!');
}

function getReportSuggestions() {
  const tips = [];
  if (state.mood === 'sad')       tips.push('Practice mindfulness or a short walk to lift your mood.');
  if (state.sleep < 6)            tips.push('Aim for 7–9 hours of sleep. Try a consistent bedtime routine.');
  if (state.water < 4)            tips.push('Increase water intake — aim for 8 glasses per day.');
  if (state.breathSessions === 0) tips.push('Try the 4-7-8 breathing exercise to reduce stress.');
  if (tips.length === 0)          tips.push('Great work! Keep up your healthy daily habits.');
  tips.push('Consistent logging helps you spot trends and improve over time.');
  tips.push('Remember: small daily habits create lasting health improvements (UN SDG 3).');
  return tips;
}

// ============================================================
// HELPERS
// ============================================================
function todayKey() {
  return dateKey(new Date());
}

function dateKey(date) {
  return date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { info: '✅', warn: '⚠️', error: '❌' };

  const el = document.createElement('div');
  el.className = 'toast';
  if (type === 'warn')  el.style.borderColor = 'rgba(251,191,36,0.5)';
  if (type === 'error') el.style.borderColor = 'rgba(248,113,113,0.5)';
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, 3500);
}

// ============================================================
// KEYBOARD SHORTCUT (Enter to log sleep input)
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement?.id === 'sleepInput') {
    logSleep();
  }
});

// ============================================================
// SERVICE WORKER (optional offline support)
// ============================================================
if ('serviceWorker' in navigator) {
  // You can register a service worker here for PWA support
  // navigator.serviceWorker.register('sw.js');
}

console.log('%c🌿 WellNest Loaded', 'color:#a78bfa;font-size:1.2rem;font-weight:bold;');
console.log('%cHealth tracking is active. SDG 3: Good Health & Well-Being', 'color:#60a5fa;');
