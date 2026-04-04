// app.js — Main application logic for CIS-CMDB Practice Test
// Handles: state, localStorage, modes, rendering, scoring, timer, match questions

// ─── State ───────────────────────────────────────────────────────────────────
let state = {
  answered: {},
  scores: { correct: 0, wrong: 0 },
  multiSelections: {},
  matchSelections: {},   // { qId: { leftIdx: rightIdx|null } }
  matchAnswered: {},     // { qId: { leftIdx: rightIdx } } — final submitted
  mode: 'practice',
  theme: 'dark',
  fontScale: 1,
  sectionFilter: 'all',
  answerFilter: 'all',
  timerSeconds: 0,
  timerInterval: null,
  examQuestions: [],
  examStarted: false,
};

const STORAGE_KEY = 'cmdb_exam_state_v3';
const EXAM_TIME = 90 * 60;
const EXAM_Q_COUNT = 75;
const letters = 'ABCDEFGHIJKLMNO';

// ─── Persistence ─────────────────────────────────────────────────────────────
function saveState() {
  const toSave = {
    answered: state.answered,
    scores: state.scores,
    multiSelections: state.multiSelections,
    matchSelections: state.matchSelections,
    matchAnswered: state.matchAnswered,
    mode: state.mode,
    theme: state.theme,
    fontScale: state.fontScale,
    sectionFilter: state.sectionFilter,
    answerFilter: state.answerFilter,
    timerSeconds: state.timerSeconds,
    examQuestions: state.examQuestions,
    examStarted: state.examStarted,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
    return true;
  } catch(e) { return false; }
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
  state.answered = {};
  state.scores = { correct: 0, wrong: 0 };
  state.multiSelections = {};
  state.matchSelections = {};
  state.matchAnswered = {};
  state.timerSeconds = 0;
  state.examStarted = false;
  state.examQuestions = [];
}

// ─── Active questions ─────────────────────────────────────────────────────────
function getActiveQuestions() {
  if (state.mode === 'exam') {
    if (!state.examQuestions || state.examQuestions.length !== EXAM_Q_COUNT) {
      const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
      state.examQuestions = shuffled.slice(0, EXAM_Q_COUNT).map(q => q.id);
      saveState();
    }
    return state.examQuestions.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean);
  }
  return QUESTIONS;
}

function getDisplayQuestions() {
  let qs = getActiveQuestions();
  if (state.sectionFilter !== 'all') qs = qs.filter(q => q.section === state.sectionFilter);
  if (state.answerFilter === 'unanswered') qs = qs.filter(q => !state.answered[q.id]);
  else if (state.answerFilter === 'correct') qs = qs.filter(q => state.answered[q.id] === 'correct');
  else if (state.answerFilter === 'wrong') qs = qs.filter(q => state.answered[q.id] === 'wrong');
  return qs;
}

function getUniqueSections() {
  const seen = new Set();
  const sections = [];
  QUESTIONS.forEach(q => { if (!seen.has(q.section)) { seen.add(q.section); sections.push(q.section); }});
  return sections;
}

// ─── Theme ───────────────────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
}

// ─── Font scale ───────────────────────────────────────────────────────────────
function applyFontScale() {
  document.documentElement.style.setProperty('--font-scale', state.fontScale);
}

function changeFontScale(delta) {
  state.fontScale = Math.min(1.4, Math.max(0.8, +(state.fontScale + delta).toFixed(1)));
  applyFontScale();
  saveState();
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  if (state.mode !== 'exam') return;
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    updateTimerDisplay();
    saveState();
    const remaining = EXAM_TIME - state.timerSeconds;
    if (remaining <= 0) { stopTimer(); autoFinish(); }
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  if (state.mode !== 'exam') { el.closest('.timer-bar').style.display = 'none'; return; }
  el.closest('.timer-bar').style.display = 'flex';
  const remaining = Math.max(0, EXAM_TIME - state.timerSeconds);
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  el.textContent = `${m}:${s}`;
  el.className = remaining < 300 ? 'timer-display danger' : 'timer-display';
}

function autoFinish() {
  showToast('⏰ Time is up!');
  setTimeout(() => showResults(), 1500);
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────
function updateScoreboard() {
  const activeQs = getActiveQuestions();
  const total = activeQs.length;
  const answeredCount = activeQs.filter(q => state.answered[q.id]).length;
  const pct = answeredCount > 0 ? Math.round(state.scores.correct / answeredCount * 100) : 0;

  setText('sc-answered', answeredCount);
  setText('sc-correct', state.scores.correct);
  setText('sc-wrong', state.scores.wrong);
  setText('sc-pct', answeredCount > 0 ? pct + '%' : '—');
  setText('sc-remain', total - answeredCount);

  const pBar = document.getElementById('sticky-prog-fill');
  if (pBar) pBar.style.width = (answeredCount / total * 100) + '%';

  const finBtn = document.getElementById('finish-nav-btn');
  if (finBtn) finBtn.style.display = answeredCount === total ? 'block' : 'none';

  updateSectionCounts();
}

function updateSectionCounts() {
  const activeQs = getActiveQuestions();
  document.querySelectorAll('.sf-btn').forEach(btn => {
    const sec = btn.dataset.section;
    if (sec === 'all') {
      btn.textContent = `All (${activeQs.length})`;
    } else {
      const count = activeQs.filter(q => q.section === sec).length;
      btn.textContent = `${sec} (${count})`;
    }
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const container = document.getElementById('quiz-container');
  container.innerHTML = '';

  const activeQs = getActiveQuestions();
  const sections = {};
  activeQs.forEach(q => {
    if (!sections[q.section]) sections[q.section] = [];
    sections[q.section].push(q);
  });

  let globalIdx = 0;
  Object.entries(sections).forEach(([sectionName, qs]) => {
    const sh = document.createElement('div');
    sh.className = 'section-header';
    sh.id = `section-${sectionName.replace(/[^a-zA-Z0-9]/g, '-')}`;
    sh.innerHTML = `<span>${sectionName}</span><span class="sh-count">${qs.length} questions</span>`;
    container.appendChild(sh);

    qs.forEach(q => {
      globalIdx++;
      container.appendChild(buildCard(q, globalIdx));
    });
  });

  // Restore answered states
  activeQs.forEach(q => {
    if (state.answered[q.id]) restoreCardState(q);
  });

  applyFilter();
  updateScoreboard();
  updateTimerDisplay();

  if (state.mode === 'exam' && state.examStarted) {
    const activeQs2 = getActiveQuestions();
    const answeredCount = activeQs2.filter(q2 => state.answered[q2.id]).length;
    if (answeredCount < activeQs2.length) startTimer();
  }
}

// ─── Build card ───────────────────────────────────────────────────────────────
function buildCard(q, num) {
  const card = document.createElement('div');
  card.className = 'question-card';
  card.id = `q-card-${q.id}`;

  let typeLabel, bodyHTML;

  if (q.type === 'match') {
    typeLabel = 'Click to Match';
    bodyHTML = buildMatchBody(q);
    if (!state.matchSelections[q.id]) {
      state.matchSelections[q.id] = {};
      q.pairs.forEach((_, i) => { state.matchSelections[q.id][i] = null; });
    }
  } else if (q.type === 'multi') {
    typeLabel = 'Choose Multiple';
    bodyHTML = buildMultiBody(q);
    if (!state.multiSelections[q.id]) state.multiSelections[q.id] = [];
  } else {
    typeLabel = 'Single Answer';
    bodyHTML = buildSingleBody(q);
  }

  card.innerHTML = `
    <div class="q-meta">
      <span class="q-num">Q${num}</span>
      <span class="q-type">${typeLabel}</span>
      <span class="q-status-icon" id="status-${q.id}"></span>
    </div>
    <div class="q-text">${q.text}</div>
    ${bodyHTML}
    <div class="explanation" id="exp-${q.id}"></div>`;

  return card;
}

function buildSingleBody(q) {
  const opts = q.options.map((opt, i) =>
    `<button class="option" id="opt-${q.id}-${i}" onclick="app.selectSingle(${q.id},${i})">
      <span class="opt-letter">${letters[i]}</span><span>${opt}</span>
    </button>`
  ).join('');
  return `<div class="options" id="opts-${q.id}">${opts}</div>`;
}

function buildMultiBody(q) {
  const opts = q.options.map((opt, i) =>
    `<button class="option" id="opt-${q.id}-${i}" onclick="app.toggleMulti(${q.id},${i})">
      <div class="check-box" id="chk-${q.id}-${i}"></div><span>${opt}</span>
    </button>`
  ).join('');
  return `<div class="options" id="opts-${q.id}">${opts}</div>
    <div class="submit-wrap" id="submit-wrap-${q.id}">
      <button class="submit-btn" onclick="app.submitMulti(${q.id})">Submit Answer</button>
    </div>`;
}

function buildMatchBody(q) {
  // Shuffle right side for display
  const rightItems = q.pairs.map((p, i) => ({ text: p.right, pairIdx: i }))
    .sort(() => Math.random() - 0.5);

  // Store shuffle order so we can restore it
  // We use a stable element ID keyed by pairIdx
  const leftRows = q.pairs.map((p, i) =>
    `<div class="match-row" id="match-row-${q.id}-${i}">
      <div class="match-left" id="match-left-${q.id}-${i}">${p.left}</div>
      <div class="match-arrow">→</div>
      <div class="match-right-slot" id="match-slot-${q.id}-${i}">
        <span class="match-slot-placeholder">Select a match</span>
      </div>
    </div>`
  ).join('');

  const rightBtns = rightItems.map(item =>
    `<button class="match-right-btn" id="match-rbtn-${q.id}-${item.pairIdx}"
      onclick="app.selectMatchRight(${q.id},${item.pairIdx})">${item.text}</button>`
  ).join('');

  return `
    <div class="match-container" id="match-${q.id}">
      <div class="match-left-col">${leftRows}</div>
      <div class="match-right-pool" id="match-pool-${q.id}">
        <div class="match-pool-label">Click to assign ↓</div>
        ${rightBtns}
      </div>
    </div>
    <div class="submit-wrap" id="submit-wrap-${q.id}">
      <button class="submit-btn" onclick="app.submitMatch(${q.id})">Submit Answer</button>
    </div>`;
}

// ─── Match interaction ────────────────────────────────────────────────────────
// State: matchSelections[qid] = { leftIdx: rightIdx|null }
// selectedLeft[qid] = leftIdx currently selected (waiting for right click)
const selectedLeft = {};

function selectMatchLeft(qid, leftIdx) {
  if (state.answered[qid]) return;
  // Toggle selection
  if (selectedLeft[qid] === leftIdx) {
    selectedLeft[qid] = null;
    document.querySelectorAll(`#match-${qid} .match-row`).forEach(r => r.classList.remove('match-row-active'));
    return;
  }
  selectedLeft[qid] = leftIdx;
  document.querySelectorAll(`#match-${qid} .match-row`).forEach(r => r.classList.remove('match-row-active'));
  document.getElementById(`match-row-${qid}-${leftIdx}`).classList.add('match-row-active');
}

function selectMatchRight(qid, rightPairIdx) {
  if (state.answered[qid]) return;
  const q = QUESTIONS.find(q => q.id === qid);
  if (!state.matchSelections[qid]) {
    state.matchSelections[qid] = {};
    q.pairs.forEach((_, i) => { state.matchSelections[qid][i] = null; });
  }

  // Find if this rightPairIdx is already assigned somewhere — unassign it
  Object.keys(state.matchSelections[qid]).forEach(li => {
    if (state.matchSelections[qid][li] === rightPairIdx) {
      state.matchSelections[qid][li] = null;
    }
  });

  // If a left is selected, assign
  if (selectedLeft[qid] !== null && selectedLeft[qid] !== undefined) {
    const li = selectedLeft[qid];
    state.matchSelections[qid][li] = rightPairIdx;
    selectedLeft[qid] = null;
    document.querySelectorAll(`#match-${qid} .match-row`).forEach(r => r.classList.remove('match-row-active'));
  } else {
    // No left selected — highlight the right button as "pending"
    document.querySelectorAll(`#match-pool-${qid} .match-right-btn`).forEach(b => b.classList.remove('match-btn-pending'));
    document.getElementById(`match-rbtn-${qid}-${rightPairIdx}`).classList.add('match-btn-pending');
    // Store pending right
    selectedLeft[qid] = `right:${rightPairIdx}`;
    return;
  }

  // Handle pending right selection (right clicked first, then left)
  if (typeof selectedLeft[qid] === 'string' && selectedLeft[qid].startsWith('right:')) {
    // Already handled above — this path won't hit
  }

  refreshMatchDisplay(qid, q);
  checkMatchSubmitReady(qid, q);
}

// Alternative: clicking the LEFT row directly
function clickMatchRow(qid, leftIdx) {
  if (state.answered[qid]) return;
  // If there's a pending right, assign it
  const pending = selectedLeft[qid];
  if (typeof pending === 'string' && pending.startsWith('right:')) {
    const rightPairIdx = parseInt(pending.replace('right:', ''));
    const q = QUESTIONS.find(q => q.id === qid);
    if (!state.matchSelections[qid]) {
      state.matchSelections[qid] = {};
      q.pairs.forEach((_, i) => { state.matchSelections[qid][i] = null; });
    }
    // Unassign this right from anywhere else
    Object.keys(state.matchSelections[qid]).forEach(li => {
      if (state.matchSelections[qid][li] === rightPairIdx) state.matchSelections[qid][li] = null;
    });
    state.matchSelections[qid][leftIdx] = rightPairIdx;
    selectedLeft[qid] = null;
    document.querySelectorAll(`#match-pool-${qid} .match-right-btn`).forEach(b => b.classList.remove('match-btn-pending'));
    document.querySelectorAll(`#match-${qid} .match-row`).forEach(r => r.classList.remove('match-row-active'));
    refreshMatchDisplay(qid, q);
    checkMatchSubmitReady(qid, q);
  } else {
    selectMatchLeft(qid, leftIdx);
  }
}

function refreshMatchDisplay(qid, q) {
  const sel = state.matchSelections[qid] || {};
  q.pairs.forEach((_, li) => {
    const slot = document.getElementById(`match-slot-${qid}-${li}`);
    if (!slot) return;
    const assignedRight = sel[li];
    if (assignedRight !== null && assignedRight !== undefined) {
      slot.innerHTML = `<span class="match-slot-filled">${q.pairs[assignedRight].right}</span>`;
    } else {
      slot.innerHTML = `<span class="match-slot-placeholder">Select a match</span>`;
    }
  });

  // Grey out assigned right buttons
  q.pairs.forEach((_, ri) => {
    const btn = document.getElementById(`match-rbtn-${qid}-${ri}`);
    if (!btn) return;
    const isAssigned = Object.values(sel).includes(ri);
    btn.classList.toggle('match-btn-assigned', isAssigned);
  });
}

function checkMatchSubmitReady(qid, q) {
  const sel = state.matchSelections[qid] || {};
  const allAssigned = q.pairs.every((_, i) => sel[i] !== null && sel[i] !== undefined);
  const wrap = document.getElementById(`submit-wrap-${qid}`);
  if (wrap) wrap.className = allAssigned ? 'submit-wrap visible' : 'submit-wrap';
}

function submitMatch(qid) {
  if (state.answered[qid]) return;
  const q = QUESTIONS.find(q => q.id === qid);
  const sel = state.matchSelections[qid] || {};

  // Check: each leftIdx should map to the same pairIdx (i.e., sel[i] === i for correct)
  let allCorrect = true;
  q.pairs.forEach((_, i) => {
    if (sel[i] !== i) allCorrect = false;
  });

  state.matchAnswered[qid] = { ...sel };
  finalizeAnswer(qid, q, null, allCorrect, 'match');
}

// ─── Answer handlers ──────────────────────────────────────────────────────────
function toggleMulti(qid, idx) {
  if (state.answered[qid]) return;
  if (!state.multiSelections[qid]) state.multiSelections[qid] = [];
  const sel = state.multiSelections[qid];
  const pos = sel.indexOf(idx);
  const opt = document.getElementById(`opt-${qid}-${idx}`);
  const chk = document.getElementById(`chk-${qid}-${idx}`);
  if (pos === -1) {
    sel.push(idx);
    opt.style.borderColor = 'var(--accent)';
    opt.style.background = 'rgba(0,201,255,0.08)';
    chk.innerHTML = '✓';
    chk.style.cssText = 'background:var(--accent);border-color:var(--accent);color:#000;';
  } else {
    sel.splice(pos, 1);
    opt.style.borderColor = '';
    opt.style.background = '';
    chk.innerHTML = '';
    chk.style.cssText = '';
  }
  const wrap = document.getElementById(`submit-wrap-${qid}`);
  if (wrap) wrap.className = sel.length > 0 ? 'submit-wrap visible' : 'submit-wrap';
}

function submitMulti(qid) {
  if (state.answered[qid]) return;
  const q = QUESTIONS.find(q => q.id === qid);
  const sel = [...(state.multiSelections[qid] || [])].sort((a,b)=>a-b);
  const correct = [...q.correct].sort((a,b)=>a-b);
  const isCorrect = JSON.stringify(sel) === JSON.stringify(correct);
  finalizeAnswer(qid, q, sel, isCorrect, 'multi');
}

function selectSingle(qid, idx) {
  if (state.answered[qid]) return;
  const q = QUESTIONS.find(q => q.id === qid);
  const isCorrect = q.correct.includes(idx);
  finalizeAnswer(qid, q, [idx], isCorrect, 'single');
}

function finalizeAnswer(qid, q, selected, isCorrect, type) {
  state.answered[qid] = isCorrect ? 'correct' : 'wrong';
  if (isCorrect) state.scores.correct++; else state.scores.wrong++;
  applyAnswerStyles(qid, q, selected, isCorrect, type);
  updateScoreboard();
  saveState();

  if (state.mode === 'exam') {
    const activeQs = getActiveQuestions();
    if (activeQs.every(q2 => state.answered[q2.id])) stopTimer();
  }
}

function applyAnswerStyles(qid, q, selected, isCorrect, type) {
  const card = document.getElementById(`q-card-${qid}`);
  if (!card) return;
  card.className = 'question-card answered ' + (isCorrect ? 'correct-card' : 'incorrect-card');
  document.getElementById(`status-${qid}`).textContent = isCorrect ? '✅' : '❌';

  if (type === 'match') {
    applyMatchStyles(qid, q, isCorrect);
  } else {
    q.options.forEach((_, i) => {
      const opt = document.getElementById(`opt-${qid}-${i}`);
      if (!opt) return;
      opt.disabled = true;
      opt.style.borderColor = ''; opt.style.background = '';
      if (type === 'multi') {
        const chk = document.getElementById(`chk-${qid}-${i}`);
        if (chk) { chk.innerHTML=''; chk.style.cssText=''; }
      }
      opt.className = q.correct.includes(i) ? 'option show-correct' : 'option';
      if (selected && selected.includes(i)) {
        opt.className = 'option ' + (q.correct.includes(i) ? 'selected-correct' : 'selected-wrong');
      }
    });
    const wrap = document.getElementById(`submit-wrap-${qid}`);
    if (wrap) wrap.style.display = 'none';
  }

  if (state.mode === 'practice') {
    const exp = document.getElementById(`exp-${qid}`);
    if (exp) {
      exp.className = 'explanation show ' + (isCorrect ? 'correct-exp' : 'incorrect-exp');
      exp.innerHTML = `<strong>${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong>${q.explanation}`;
    }
  }
}

function applyMatchStyles(qid, q, isCorrect) {
  const sel = state.matchAnswered[qid] || state.matchSelections[qid] || {};

  // Disable all right buttons
  q.pairs.forEach((_, ri) => {
    const btn = document.getElementById(`match-rbtn-${qid}-${ri}`);
    if (btn) { btn.disabled = true; btn.onclick = null; }
  });

  // Disable all left rows
  q.pairs.forEach((_, li) => {
    const row = document.getElementById(`match-row-${qid}-${li}`);
    if (row) row.onclick = null;
  });

  // Hide submit
  const wrap = document.getElementById(`submit-wrap-${qid}`);
  if (wrap) wrap.style.display = 'none';

  // Show correct/incorrect per row
  q.pairs.forEach((pair, li) => {
    const row = document.getElementById(`match-row-${qid}-${li}`);
    const slot = document.getElementById(`match-slot-${qid}-${li}`);
    if (!row || !slot) return;

    const assignedRight = sel[li];
    const wasCorrect = assignedRight === li;

    row.classList.add(wasCorrect ? 'match-row-correct' : 'match-row-wrong');

    if (wasCorrect) {
      slot.innerHTML = `<span class="match-slot-correct">✓ ${pair.right}</span>`;
    } else {
      const givenText = (assignedRight !== null && assignedRight !== undefined)
        ? q.pairs[assignedRight].right : '(not answered)';
      slot.innerHTML = `
        <span class="match-slot-wrong">✗ ${givenText}</span>
        <span class="match-slot-correct-ans">→ ${pair.right}</span>`;
    }
  });
}

// ─── Restore after reload ─────────────────────────────────────────────────────
function restoreCardState(q) {
  const wasCorrect = state.answered[q.id] === 'correct';
  const card = document.getElementById(`q-card-${q.id}`);
  if (!card) return;
  card.className = 'question-card answered ' + (wasCorrect ? 'correct-card' : 'incorrect-card');
  document.getElementById(`status-${q.id}`).textContent = wasCorrect ? '✅' : '❌';

  if (q.type === 'match') {
    applyMatchStyles(q.id, q, wasCorrect);
  } else {
    q.options.forEach((_, i) => {
      const opt = document.getElementById(`opt-${q.id}-${i}`);
      if (opt) {
        opt.disabled = true;
        if (q.correct.includes(i)) opt.className = 'option show-correct';
      }
    });
    const wrap = document.getElementById(`submit-wrap-${q.id}`);
    if (wrap) wrap.style.display = 'none';
  }

  if (state.mode === 'practice') {
    const exp = document.getElementById(`exp-${q.id}`);
    if (exp) {
      exp.className = 'explanation show ' + (wasCorrect ? 'correct-exp' : 'incorrect-exp');
      exp.innerHTML = `<strong>${wasCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong>${q.explanation}`;
    }
  }
}

// ─── Filters ─────────────────────────────────────────────────────────────────
function setAnswerFilter(type) {
  state.answerFilter = type;
  saveState();
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.className = 'filter-btn' + (btn.dataset.filter === type ? (type === 'wrong' ? ' active-wrong' : ' active') : '');
  });
  applyFilter();
}

function setSectionFilter(section) {
  state.sectionFilter = section;
  saveState();
  document.querySelectorAll('.sf-btn').forEach(btn => {
    btn.className = 'sf-btn' + (btn.dataset.section === section ? ' active' : '');
  });
  applyFilter();
}

function applyFilter() {
  const activeQs = getActiveQuestions();
  QUESTIONS.forEach(q => {
    const card = document.getElementById(`q-card-${q.id}`);
    if (!card) return;
    const inActive = activeQs.some(aq => aq.id === q.id);
    if (!inActive) { card.style.display = 'none'; return; }
    let show = true;
    if (state.sectionFilter !== 'all' && q.section !== state.sectionFilter) show = false;
    if (state.answerFilter === 'unanswered' && state.answered[q.id]) show = false;
    if (state.answerFilter === 'correct' && state.answered[q.id] !== 'correct') show = false;
    if (state.answerFilter === 'wrong' && state.answered[q.id] !== 'wrong') show = false;
    card.style.display = show ? '' : 'none';
  });
  document.querySelectorAll('.section-header').forEach(sh => {
    let next = sh.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains('section-header')) {
      if (next.style.display !== 'none') hasVisible = true;
      next = next.nextElementSibling;
    }
    sh.style.display = hasVisible ? '' : 'none';
  });
}

// ─── Jump to question ─────────────────────────────────────────────────────────
function jumpToQuestion() {
  const input = document.getElementById('jump-input');
  const status = document.getElementById('jump-status');
  const num = parseInt(input.value, 10);
  const activeQs = getActiveQuestions();
  if (isNaN(num) || num < 1 || num > activeQs.length) {
    if (status) status.textContent = `Enter 1–${activeQs.length}`;
    return;
  }
  state.sectionFilter = 'all';
  state.answerFilter = 'all';
  document.querySelectorAll('.sf-btn').forEach(b => b.className = 'sf-btn' + (b.dataset.section === 'all' ? ' active' : ''));
  document.querySelectorAll('.filter-btn').forEach(b => b.className = 'filter-btn' + (b.dataset.filter === 'all' ? ' active' : ''));
  applyFilter();

  const targetQ = activeQs[num - 1];
  const card = document.getElementById(`q-card-${targetQ.id}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.boxShadow = '0 0 0 2px var(--accent)';
    setTimeout(() => { card.style.boxShadow = ''; }, 2000);
  }
  input.value = '';
  if (status) status.textContent = `Jumped to Q${num}`;
  setTimeout(() => { if (status) status.textContent = ''; }, 2000);
}

// ─── Mode switching ───────────────────────────────────────────────────────────
function setMode(mode) {
  if (state.mode === mode) return;
  const answeredCount = Object.keys(state.answered).length;
  if (answeredCount > 0) {
    if (!confirm(`Switching mode will reset your current progress (${answeredCount} answered). Continue?`)) return;
  }
  clearState();
  state.mode = mode;
  if (mode === 'exam') {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    state.examQuestions = shuffled.slice(0, EXAM_Q_COUNT).map(q => q.id);
    state.examStarted = true;
    state.timerSeconds = 0;
  }
  saveState();
  applyModeUI();
  render();
  if (mode === 'exam') {
    startTimer();
    showToast('🎯 Exam Mode: 75 questions, 90 minutes');
  } else {
    showToast('📚 Practice Mode: All questions with explanations');
  }
}

function applyModeUI() {
  const isPractice = state.mode === 'practice';
  const container = document.getElementById('quiz-container');
  if (container) container.className = isPractice ? '' : 'exam-mode';
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const m = btn.dataset.mode;
    btn.className = 'ctrl-btn mode-btn ' + (m === state.mode ? (m === 'exam' ? 'active-exam' : 'active') : '');
  });
  const timerBar = document.getElementById('timer-bar');
  if (timerBar) timerBar.style.display = state.mode === 'exam' ? 'flex' : 'none';
}

// ─── Results ──────────────────────────────────────────────────────────────────
function showResults() {
  stopTimer();
  const activeQs = getActiveQuestions();
  const total = activeQs.length;
  const pct = Math.round(state.scores.correct / total * 100);
  const pass = pct >= 70;

  setText('final-pct', pct + '%');
  setText('r-total', total);
  setText('r-correct', state.scores.correct);
  setText('r-wrong', state.scores.wrong);
  setText('r-pass', pass ? 'PASS ✅' : 'FAIL ❌');
  document.getElementById('r-pass').style.color = pass ? 'var(--correct)' : 'var(--incorrect)';

  const ring = document.getElementById('score-ring');
  ring.className = 'final-score-ring ' + (pass ? 'result-pass' : 'result-fail');

  const msg = pass
    ? `Outstanding! You scored ${state.scores.correct}/${total} (${pct}%) — above the 70% passing threshold. You're ready for the exam!`
    : `You scored ${state.scores.correct}/${total} (${pct}%). The passing threshold is 70%. Use the ❌ filter to review incorrect questions, then retake.`;
  setText('result-msg', msg);

  buildSectionBreakdown(activeQs);

  if (state.mode === 'exam') {
    activeQs.forEach(q => {
      if (state.answered[q.id]) {
        const exp = document.getElementById(`exp-${q.id}`);
        if (exp) {
          const isCorrect = state.answered[q.id] === 'correct';
          exp.className = 'explanation show ' + (isCorrect ? 'correct-exp' : 'incorrect-exp');
          exp.innerHTML = `<strong>${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong>${q.explanation}`;
        }
      }
    });
    const container = document.getElementById('quiz-container');
    if (container) container.className = '';
  }

  document.getElementById('results-screen').style.display = 'block';
  document.getElementById('results-screen').scrollIntoView({ behavior: 'smooth' });
}

function buildSectionBreakdown(activeQs) {
  const sections = {};
  activeQs.forEach(q => {
    if (!sections[q.section]) sections[q.section] = { total: 0, correct: 0 };
    sections[q.section].total++;
    if (state.answered[q.id] === 'correct') sections[q.section].correct++;
  });
  const container = document.getElementById('section-breakdown-rows');
  if (!container) return;
  container.innerHTML = '';
  Object.entries(sections).sort((a,b) => (a[1].correct/a[1].total) - (b[1].correct/b[1].total)).forEach(([name, data]) => {
    const pct = data.total > 0 ? Math.round(data.correct / data.total * 100) : 0;
    const color = pct >= 80 ? 'var(--correct)' : pct >= 60 ? 'var(--warn)' : 'var(--incorrect)';
    const row = document.createElement('div');
    row.className = 'sb-row';
    row.innerHTML = `
      <div class="sb-name">${name}</div>
      <div class="sb-bar-wrap"><div class="sb-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="sb-score" style="color:${color}">${data.correct}/${data.total} (${pct}%)</div>`;
    container.appendChild(row);
  });
}

function restartTest() {
  if (!confirm('Reset all progress and start over?')) return;
  stopTimer();
  clearState();
  document.getElementById('results-screen').style.display = 'none';
  state.sectionFilter = 'all';
  state.answerFilter = 'all';
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('↺ Test reset! Starting fresh.');
}

function shareScore() {
  const activeQs = getActiveQuestions();
  const pct = Math.round(state.scores.correct / activeQs.length * 100);
  const text = `I scored ${state.scores.correct}/${activeQs.length} (${pct}%) on the CIS – Data Foundations (CMDB & CSDM) practice test! ${pct >= 70 ? '✅ Passing score!' : '📚 Keep studying!'}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('📋 Score copied to clipboard!'));
  } else {
    prompt('Copy your score:', text);
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2700);
}

// ─── Build static UI ──────────────────────────────────────────────────────────
function buildStaticUI() {
  const sfContainer = document.getElementById('section-filter-btns');
  if (sfContainer) {
    sfContainer.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'sf-btn active';
    allBtn.dataset.section = 'all';
    allBtn.textContent = `All (${QUESTIONS.length})`;
    allBtn.onclick = () => setSectionFilter('all');
    sfContainer.appendChild(allBtn);
    getUniqueSections().forEach(sec => {
      const btn = document.createElement('button');
      btn.className = 'sf-btn';
      btn.dataset.section = sec;
      btn.textContent = sec;
      btn.onclick = () => setSectionFilter(sec);
      sfContainer.appendChild(btn);
    });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  const hadSaved = loadState();
  applyTheme();
  applyFontScale();
  applyModeUI();
  buildStaticUI();
  if (hadSaved && Object.keys(state.answered).length > 0) {
    showToast(`Welcome back! Restored ${Object.keys(state.answered).length} answered questions.`);
  }
  render();
  const jumpInput = document.getElementById('jump-input');
  if (jumpInput) jumpInput.addEventListener('keydown', e => { if (e.key === 'Enter') jumpToQuestion(); });
}

// ─── Public API ───────────────────────────────────────────────────────────────
window.app = {
  toggleMulti,
  submitMulti,
  selectSingle,
  selectMatchRight,
  clickMatchRow,
  submitMatch,
  setMode,
  setAnswerFilter,
  setSectionFilter,
  setTheme: toggleTheme,
  changeFontScale,
  jumpToQuestion,
  showResults,
  restartTest,
  shareScore,
  scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  scrollToNext: () => {
    const activeQs = getActiveQuestions();
    const nextQ = activeQs.find(q => !state.answered[q.id]);
    if (nextQ) {
      const card = document.getElementById(`q-card-${nextQ.id}`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showToast('✅ All questions answered!');
    }
  },
};

document.addEventListener('DOMContentLoaded', init);
