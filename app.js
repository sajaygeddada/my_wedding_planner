/* ============================
   WEDDING PLANNER — APP.JS v2
   Storage: Supabase (cloud sync)
   Fallback: localStorage
   ============================ */

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
// 🔧 REPLACE THESE TWO VALUES with your own from supabase.com → Project Settings → API
const SUPABASE_URL = 'https://bbnkcngltcypamdqzcyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibmtjbmdsdGN5cGFtZHF6Y3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjEyMjQsImV4cCI6MjA5MDg5NzIyNH0.oJepIft4tYrZCdr00Sp4B_YVgr_T9cWuvmfajaCNn4s';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── IN-MEMORY STATE ─────────────────────────────────────────────────────────
const state = {
  settings: { bride: '', groom: '', date: '', venue: '', budget: 0 },
  tasks: [],
  guests: [],
  expenses: [],
  notes: [],
};

let selectedNoteColor = 'cream';

// ─── SYNC INDICATOR (ring icon glow) ─────────────────────────────────────────
function setSyncStatus(status, tooltip) {
  const wrap = document.getElementById('ringIconWrap');
  if (!wrap) return;
  wrap.className = 'ring-icon-wrap ' + status;
  wrap.title = tooltip;
}

// ─── LOAD ALL DATA ────────────────────────────────────────────────────────────
async function loadAll() {
  setSyncStatus('connecting', '⏳ Syncing with cloud...');
  try {
    const [tasks, guests, expenses, notes, settings] = await Promise.all([
      db.from('tasks').select('*').order('created_at', { ascending: true }),
      db.from('guests').select('*').order('created_at', { ascending: true }),
      db.from('expenses').select('*').order('created_at', { ascending: false }),
      db.from('notes').select('*').order('created_at', { ascending: true }),
      db.from('settings').select('*').eq('id', 1).maybeSingle(),
    ]);

    state.tasks = tasks.data || [];
    state.guests = guests.data || [];
    state.expenses = expenses.data || [];
    state.notes = notes.data || [];
    if (settings.data) Object.assign(state.settings, settings.data);

    setSyncStatus('synced', '☁ Synced — your data is live across all devices');
    renderAll();
  } catch (e) {
    setSyncStatus('error', '⚠ Could not connect. Check SUPABASE_URL and SUPABASE_ANON_KEY in app.js');
    console.error('Supabase load error:', e);
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('weddingPlanner_v1');
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(state, saved);
      setSyncStatus('warning', '⚠ Offline mode — data is local only. Fix Supabase keys to sync across devices.');
    } else {
      setSyncStatus('warning', '⚠ Not connected to cloud. Set Supabase keys in app.js to enable sync.');
    }
  } catch (e) {}
  renderAll();
}

function saveLocal() {
  localStorage.setItem('weddingPlanner_v1', JSON.stringify(state));
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function formatINR(n) {
  if (!n || isNaN(n)) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000);
}

function isOverdue(dateStr) {
  const d = daysUntil(dateStr);
  return d !== null && d < 0;
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function clearForm(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── RENDER ALL ───────────────────────────────────────────────────────────────
function renderAll() {
  renderHeader();
  renderStats();
  renderDashboard();
  renderTasks();
  renderGuests();
  renderBudget();
  renderNotes();
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ─── MODAL CLOSE ──────────────────────────────────────────────────────────────
document.querySelectorAll('.modal-close, .btn-secondary[data-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.getAttribute('data-modal') || btn.closest('.modal-overlay').id));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

// ─── HEADER / SETTINGS ────────────────────────────────────────────────────────
function renderHeader() {
  const { bride, groom, date, venue } = state.settings;
  const names = bride && groom ? `${bride} & ${groom}` : bride || groom || 'Your Wedding';
  document.querySelector('.header-title h1').textContent = names;
  let subtitle = 'Set your wedding date →';
  if (venue && date) subtitle = `${formatDate(date)} · ${venue}`;
  else if (date) subtitle = formatDate(date);
  else if (venue) subtitle = venue;
  document.getElementById('weddingDateDisplay').textContent = subtitle;

  const cd = document.getElementById('countdownDisplay');
  if (date) {
    const diff = daysUntil(date);
    if (diff > 0) cd.textContent = `${diff} days to go ✦`;
    else if (diff === 0) cd.textContent = `It's Today! 🎉`;
    else cd.textContent = `${Math.abs(diff)} days ago`;
  } else cd.textContent = '';
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  const s = state.settings;
  document.getElementById('settingBride').value = s.bride || '';
  document.getElementById('settingGroom').value = s.groom || '';
  document.getElementById('settingDate').value = s.date || '';
  document.getElementById('settingVenue').value = s.venue || '';
  openModal('settingsModal');
});

document.getElementById('saveSettings').addEventListener('click', async () => {
  const updated = {
    bride: document.getElementById('settingBride').value.trim(),
    groom: document.getElementById('settingGroom').value.trim(),
    date: document.getElementById('settingDate').value,
    venue: document.getElementById('settingVenue').value.trim(),
  };
  Object.assign(state.settings, updated);
  try { await db.from('settings').upsert({ id: 1, ...state.settings }); } catch (e) {}
  saveLocal();
  renderHeader();
  renderDashboard();
  closeModal('settingsModal');
});

// ─── STATS ────────────────────────────────────────────────────────────────────
function renderStats() {
  const done = state.tasks.filter(t => t.done).length;
  document.getElementById('statTasksDone').textContent = `${done}/${state.tasks.length}`;

  const headCount = state.guests.length;
  const plusCount = state.guests.reduce((s, g) => s + (parseInt(g.plus) || 0), 0);
  const totalWithPlus = headCount + plusCount;
  document.getElementById('statGuests').textContent = totalWithPlus;
  const sub = document.getElementById('statGuestsSub');
  if (plusCount > 0) {
    sub.textContent = `${headCount} people + ${plusCount} +1s`;
  } else {
    sub.textContent = '';
  }

  document.getElementById('statRSVP').textContent = state.guests.filter(g => g.rsvp === 'confirmed').length;
  document.getElementById('statInvited').textContent = state.guests.filter(g => g.invited === 'yes').length;
  const spent = state.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  document.getElementById('statBudget').textContent = formatINR(spent);
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
  renderUrgentAlerts();
  renderDueSoon();
  renderRsvpPending();
  renderNotInvited();
  renderBudgetAlert();
  renderTopAlertBanner();
}

function renderUrgentAlerts() {
  const list = document.getElementById('urgentAlertsList');
  const overdue = state.tasks.filter(t => !t.done && isOverdue(t.due_date));
  const highPriority = state.tasks.filter(t => !t.done && t.priority === 'high');
  const seen = new Set();
  const items = [];
  overdue.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); items.push({ ...t, urgentType: 'overdue' }); } });
  highPriority.forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); items.push({ ...t, urgentType: 'high' }); } });

  if (!items.length) {
    list.innerHTML = `<div class="dash-all-good">✓ No urgent items right now — you're ahead of the game!</div>`;
    return;
  }

  list.innerHTML = `<div class="dash-list">${items.map(t => `
    <div class="dash-item urgent">
      <div class="dash-item-body">
        <div class="dash-item-name">${escHtml(t.name)}</div>
        <div class="dash-item-meta">
          ${t.urgentType === 'overdue' ? `⚠ Overdue since ${formatDate(t.due_date)} · ` : ''}
          🔴 High Priority · ${t.category}
          ${t.notes ? ` · ${escHtml(t.notes).slice(0,50)}` : ''}
        </div>
      </div>
      <button class="btn-primary" style="font-size:12px;padding:5px 12px;white-space:nowrap" onclick="quickDoneTask('${t.id}')">Mark Done</button>
    </div>`).join('')}
  </div>`;
}

function renderDueSoon() {
  const list = document.getElementById('dueSoonList');
  const items = state.tasks.filter(t => {
    if (t.done) return false;
    const d = daysUntil(t.due_date);
    return d !== null && d >= 0 && d <= 7;
  }).sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date));

  if (!items.length) {
    list.innerHTML = `<div class="dash-empty">No tasks due in the next 7 days — nice!</div>`;
    return;
  }
  list.innerHTML = `<div class="dash-list">${items.map(t => {
    const d = daysUntil(t.due_date);
    const label = d === 0 ? 'Today!' : d === 1 ? 'Tomorrow' : `In ${d} days`;
    return `<div class="dash-item ${d <= 1 ? 'warning' : 'info'}">
      <div class="dash-item-body">
        <div class="dash-item-name">${escHtml(t.name)}</div>
        <div class="dash-item-meta">${label} · ${t.category}</div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function renderRsvpPending() {
  const list = document.getElementById('rsvpPendingList');
  const items = state.guests.filter(g => g.invited === 'yes' && g.rsvp === 'pending');
  if (!items.length) {
    list.innerHTML = `<div class="dash-all-good">✓ All invited guests have responded</div>`;
    return;
  }
  list.innerHTML = `<div class="dash-list">
    ${items.slice(0, 5).map(g => `
      <div class="dash-item warning">
        <div class="dash-item-body">
          <div class="dash-item-name">${escHtml(g.name)}</div>
          <div class="dash-item-meta">${g.section === 'family' ? '🏠 Family' : '✦ Friends'} · ${sideLabel(g.side)}</div>
        </div>
      </div>`).join('')}
    ${items.length > 5 ? `<div class="dash-empty">+${items.length - 5} more awaiting response</div>` : ''}
  </div>`;
}

function renderNotInvited() {
  const list = document.getElementById('notInvitedList');
  const items = state.guests.filter(g => g.invited !== 'yes');
  if (!items.length) {
    list.innerHTML = `<div class="dash-all-good">✓ Everyone has been invited!</div>`;
    return;
  }
  list.innerHTML = `<div class="dash-list">
    ${items.slice(0, 5).map(g => `
      <div class="dash-item info">
        <div class="dash-item-body">
          <div class="dash-item-name">${escHtml(g.name)}</div>
          <div class="dash-item-meta">${g.section === 'family' ? '🏠 Family' : '✦ Friends'} · ${sideLabel(g.side)}</div>
        </div>
      </div>`).join('')}
    ${items.length > 5 ? `<div class="dash-empty">+${items.length - 5} more not yet invited</div>` : ''}
  </div>`;
}

function renderBudgetAlert() {
  const panel = document.getElementById('budgetAlertPanel');
  const spent = state.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const budget = Number(state.settings.budget || 0);
  const pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
  const cls = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'safe';
  let warningMsg = '';
  if (!budget) warningMsg = `<div class="budget-alert-label" style="font-style:italic;margin-top:8px">Set your total budget in the Budget tab to track spending</div>`;
  else if (pct >= 90) warningMsg = `<div class="budget-alert-danger">⚠ Budget nearly exhausted! Only ${formatINR(budget - spent)} left.</div>`;
  else if (pct >= 70) warningMsg = `<div class="budget-alert-warning">⚡ 70%+ of budget used — watch your spending!</div>`;

  panel.innerHTML = `
    <div class="budget-alert-label">${formatINR(spent)} spent${budget ? ` of ${formatINR(budget)}` : ''}</div>
    ${budget ? `
    <div class="budget-alert-bar"><div class="budget-alert-fill ${cls}" style="width:${pct}%"></div></div>
    <div class="budget-alert-label">${pct}% used · ${formatINR(budget - spent)} remaining</div>` : ''}
    ${warningMsg}`;
}

function renderTopAlertBanner() {
  const banner = document.getElementById('alertBanner');
  const overdue = state.tasks.filter(t => !t.done && isOverdue(t.due_date));
  const high = state.tasks.filter(t => !t.done && t.priority === 'high');
  const all = [...new Map([...overdue, ...high].map(t => [t.id, t])).values()];

  if (!all.length) { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';
  const preview = all.slice(0, 2).map(t => `<strong>${escHtml(t.name)}</strong>`).join(', ');
  const more = all.length > 2 ? ` and ${all.length - 2} more` : '';
  banner.innerHTML = `
    <span style="font-size:18px">🚨</span>
    <div class="alert-items">${all.length} urgent task${all.length > 1 ? 's' : ''} need attention: ${preview}${more}</div>
    <button class="alert-dismiss" onclick="this.closest('.alert-banner').style.display='none'">Dismiss</button>`;
}

async function quickDoneTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) task.done = true;
  try { await db.from('tasks').update({ done: true }).eq('id', id); } catch (e) {}
  saveLocal();
  renderAll();
}

// ─── TASKS ────────────────────────────────────────────────────────────────────
function renderTasks() {
  const catFilter = document.getElementById('taskFilterCat').value;
  const statusFilter = document.getElementById('taskFilterStatus').value;
  let tasks = [...state.tasks];
  if (catFilter) tasks = tasks.filter(t => t.category === catFilter);
  if (statusFilter === 'done') tasks = tasks.filter(t => t.done);
  if (statusFilter === 'pending') tasks = tasks.filter(t => !t.done);

  const done = state.tasks.filter(t => t.done).length;
  const pct = state.tasks.length ? Math.round((done / state.tasks.length) * 100) : 0;
  document.getElementById('taskProgressBar').style.width = pct + '%';
  document.getElementById('taskProgressLabel').textContent = `${done} of ${state.tasks.length} tasks completed`;

  const list = document.getElementById('taskList');
  if (!tasks.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✓</div><p>No tasks here. Add one!</p></div>`;
    return;
  }

  const pOrd = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (pOrd[a.priority] || 1) - (pOrd[b.priority] || 1);
  });

  list.innerHTML = tasks.map(task => {
    const ov = !task.done && isOverdue(task.due_date);
    return `
    <div class="task-item ${task.done ? 'done' : ''}">
      <div class="task-checkbox ${task.done ? 'checked' : ''}" onclick="toggleTask('${task.id}')">${task.done ? '✓' : ''}</div>
      <div class="task-info">
        <div class="task-name">${escHtml(task.name)}</div>
        <div class="task-meta">
          <span class="badge badge-cat">${task.category}</span>
          <span class="badge badge-${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
          ${task.due_date ? `<span class="badge ${ov ? 'badge-overdue' : 'badge-due'}">${ov ? '⚠ Overdue · ' : ''}${formatDate(task.due_date)}</span>` : ''}
        </div>
        ${task.notes ? `<div class="task-notes">${escHtml(task.notes)}</div>` : ''}
      </div>
      <div class="task-actions">
        <button class="btn-icon" onclick="editTask('${task.id}')">✎</button>
        <button class="btn-icon" onclick="deleteTask('${task.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  try { await db.from('tasks').update({ done: task.done }).eq('id', id); } catch (e) {}
  saveLocal();
  renderTasks();
  renderDashboard();
  renderStats();
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try { await db.from('tasks').delete().eq('id', id); } catch (e) {}
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveLocal();
  renderTasks();
  renderDashboard();
  renderStats();
}

let editingTaskId = null;

function editTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  editingTaskId = id;
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('taskName').value = task.name;
  document.getElementById('taskCategory').value = task.category;
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskDueDate').value = task.due_date || '';
  document.getElementById('taskNotes').value = task.notes || '';
  openModal('addTaskModal');
}

document.getElementById('openAddTask').addEventListener('click', () => {
  editingTaskId = null;
  document.getElementById('taskModalTitle').textContent = 'Add Task';
  clearForm('taskName', 'taskDueDate', 'taskNotes');
  document.getElementById('taskCategory').value = 'Other';
  document.getElementById('taskPriority').value = 'medium';
  openModal('addTaskModal');
});

document.getElementById('saveTask').addEventListener('click', async () => {
  const name = document.getElementById('taskName').value.trim();
  if (!name) { alert('Task name is required.'); return; }
  const data = {
    name,
    category: document.getElementById('taskCategory').value,
    priority: document.getElementById('taskPriority').value,
    due_date: document.getElementById('taskDueDate').value || null,
    notes: document.getElementById('taskNotes').value.trim(),
    done: false,
  };
  try {
    if (editingTaskId) {
      await db.from('tasks').update(data).eq('id', editingTaskId);
      Object.assign(state.tasks.find(t => t.id === editingTaskId), data);
    } else {
      const res = await db.from('tasks').insert([data]).select().single();
      state.tasks.push(res.data);
    }
  } catch (e) {
    if (editingTaskId) Object.assign(state.tasks.find(t => t.id === editingTaskId), data);
    else state.tasks.push({ id: uid(), ...data });
  }
  saveLocal();
  renderTasks();
  renderDashboard();
  renderStats();
  closeModal('addTaskModal');
});

document.getElementById('taskFilterCat').addEventListener('change', renderTasks);
document.getElementById('taskFilterStatus').addEventListener('change', renderTasks);

// ─── GUESTS ───────────────────────────────────────────────────────────────────

// Active filter state
let activeGroup = '';   // '' | 'family|bride' | 'friends|groom' | etc.
let activeRsvp  = '';   // '' | 'confirmed' | 'pending' | 'maybe' | 'declined'

// Group chip config — defines how to slice the guest list
const GROUP_CONFIGS = [
  { key: '',              label: 'All Guests',       icon: '◈', colorKey: 'all',            match: () => true },
  { key: 'family|bride',  label: "Family — Bride's", icon: '🏠', colorKey: 'family-bride',  match: g => g.section === 'family'  && g.side === 'bride'  },
  { key: 'family|groom',  label: "Family — Groom's", icon: '🏠', colorKey: 'family-groom',  match: g => g.section === 'family'  && g.side === 'groom'  },
  { key: 'family|mutual', label: 'Family — Mutual',  icon: '🏠', colorKey: 'family-mutual', match: g => g.section === 'family'  && g.side === 'mutual' },
  { key: 'family|',       label: 'All Family',       icon: '🏠', colorKey: 'family',        match: g => g.section === 'family'  },
  { key: 'friends|bride', label: "Friends — Bride's",icon: '✦', colorKey: 'friends-bride',  match: g => g.section === 'friends' && g.side === 'bride'  },
  { key: 'friends|groom', label: "Friends — Groom's",icon: '✦', colorKey: 'friends-groom',  match: g => g.section === 'friends' && g.side === 'groom'  },
  { key: 'friends|mutual',label: 'Friends — Mutual', icon: '✦', colorKey: 'friends-mutual', match: g => g.section === 'friends' && g.side === 'mutual' },
  { key: 'friends|',      label: 'All Friends',      icon: '✦', colorKey: 'friends',        match: g => g.section === 'friends' },
];

// When viewing "All Guests", split into these sub-sections automatically
const AUTO_SECTIONS = [
  { key: 'family-bride',   label: "Family — Bride's Side", icon: '🏠', match: g => g.section === 'family'  && g.side === 'bride'  },
  { key: 'family-groom',   label: "Family — Groom's Side", icon: '🏠', match: g => g.section === 'family'  && g.side === 'groom'  },
  { key: 'family-mutual',  label: 'Family — Mutual',       icon: '🏠', match: g => g.section === 'family'  && g.side === 'mutual' },
  { key: 'friends-bride',  label: "Friends — Bride's Side",icon: '✦', match: g => g.section === 'friends' && g.side === 'bride'  },
  { key: 'friends-groom',  label: "Friends — Groom's Side",icon: '✦', match: g => g.section === 'friends' && g.side === 'groom'  },
  { key: 'friends-mutual', label: 'Friends — Mutual',      icon: '✦', match: g => g.section === 'friends' && g.side === 'mutual' },
];

function renderGuests() {
  const search = document.getElementById('guestSearch').value.toLowerCase();

  // Apply search + rsvp filter first
  let filtered = state.guests.filter(g => {
    const matchSearch = !search || g.name.toLowerCase().includes(search) || (g.phone || '').includes(search);
    const matchRsvp   = !activeRsvp || g.rsvp === activeRsvp;
    return matchSearch && matchRsvp;
  });

  // Apply group filter
  const groupCfg = GROUP_CONFIGS.find(c => c.key === activeGroup) || GROUP_CONFIGS[0];
  filtered = filtered.filter(groupCfg.match);

  const container = document.getElementById('guestSectionsContainer');

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◎</div><p>No guests match this filter</p></div>`;
    renderStats();
    return;
  }

  // Decide how to section the results
  let sections;
  if (activeGroup === '') {
    // Auto multi-section view
    sections = AUTO_SECTIONS
      .map(s => ({ ...s, guests: filtered.filter(s.match) }))
      .filter(s => s.guests.length > 0);
  } else {
    // Single group — one section
    sections = [{ key: groupCfg.colorKey, label: groupCfg.label, icon: groupCfg.icon, guests: filtered }];
  }

  container.innerHTML = sections.map(sec => {
    const plus = sec.guests.reduce((sum, g) => sum + (parseInt(g.plus) || 0), 0);
    const countLabel = plus > 0 ? `${sec.guests.length} <span class="guest-count-sub">+${plus} guests</span>` : `${sec.guests.length}`;
    return `
    <div class="guest-section">
      <div class="section-header section-header-${sec.key}">
        <span class="section-icon">${sec.icon}</span>
        <h3>${sec.label}</h3>
        <span class="guest-count">${sec.guests.length}</span>
        ${plus > 0 ? `<span style="font-size:11.5px;color:var(--text-muted)">+${plus} guests</span>` : ''}
      </div>
      <div class="guest-table-wrap">
        <table class="guest-table">
          <thead><tr>
            <th>Name</th><th>Phone</th><th>Invited</th><th>RSVP</th><th>+1</th><th>Notes</th><th></th>
          </tr></thead>
          <tbody>
            ${sec.guests.map(g => `
            <tr>
              <td><strong>${escHtml(g.name)}</strong></td>
              <td>${escHtml(g.phone || '—')}</td>
              <td class="${g.invited === 'yes' ? 'invited-yes' : 'invited-no'}">${g.invited === 'yes' ? '✓ Yes' : 'No'}</td>
              <td><span class="rsvp-badge rsvp-${g.rsvp}">${rsvpLabel(g.rsvp)}</span></td>
              <td>${g.plus > 0 ? '<strong>+' + g.plus + '</strong>' : '—'}</td>
              <td style="color:var(--text-muted);font-size:12.5px">${escHtml(g.note || '')}</td>
              <td style="white-space:nowrap">
                <button class="btn-icon" onclick="editGuest('${g.id}')">✎</button>
                <button class="btn-icon" onclick="deleteGuest('${g.id}')">✕</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('');

  renderStats();
}

// Chip click handlers
document.getElementById('groupChips').addEventListener('click', e => {
  const chip = e.target.closest('.group-chip');
  if (!chip) return;
  activeGroup = chip.dataset.group;
  document.querySelectorAll('.group-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  renderGuests();
});

document.getElementById('rsvpChips').addEventListener('click', e => {
  const chip = e.target.closest('.rsvp-chip');
  if (!chip) return;
  activeRsvp = chip.dataset.rsvp;
  document.querySelectorAll('.rsvp-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  renderGuests();
});


  if (r === 'confirmed') return '✓ Confirmed';
  if (r === 'declined') return '✗ Declined';
  if (r === 'maybe') return '? Maybe';
  return 'Pending';
}

let editingGuestId = null;

function editGuest(id) {
  const g = state.guests.find(g => g.id === id);
  if (!g) return;
  editingGuestId = id;
  document.getElementById('guestModalTitle').textContent = 'Edit Guest';
  document.getElementById('guestName').value = g.name;
  document.getElementById('guestSection').value = g.section;
  document.getElementById('guestPhone').value = g.phone || '';
  document.getElementById('guestSide').value = g.side;
  document.getElementById('guestInvited').value = g.invited;
  document.getElementById('guestRsvp').value = g.rsvp;
  document.getElementById('guestPlus').value = g.plus || 0;
  document.getElementById('guestNote').value = g.note || '';
  openModal('addGuestModal');
}

async function deleteGuest(id) {
  if (!confirm('Remove this guest?')) return;
  try { await db.from('guests').delete().eq('id', id); } catch (e) {}
  state.guests = state.guests.filter(g => g.id !== id);
  saveLocal();
  renderGuests();
  renderDashboard();
}

document.getElementById('openAddGuest').addEventListener('click', () => {
  editingGuestId = null;
  document.getElementById('guestModalTitle').textContent = 'Add Guest';
  clearForm('guestName', 'guestPhone', 'guestNote');
  document.getElementById('guestSection').value = 'family';
  document.getElementById('guestSide').value = 'bride';
  document.getElementById('guestInvited').value = 'no';
  document.getElementById('guestRsvp').value = 'pending';
  document.getElementById('guestPlus').value = 0;
  openModal('addGuestModal');
});

document.getElementById('saveGuest').addEventListener('click', async () => {
  const name = document.getElementById('guestName').value.trim();
  if (!name) { alert('Guest name is required.'); return; }
  const data = {
    name,
    section: document.getElementById('guestSection').value,
    phone: document.getElementById('guestPhone').value.trim(),
    side: document.getElementById('guestSide').value,
    invited: document.getElementById('guestInvited').value,
    rsvp: document.getElementById('guestRsvp').value,
    plus: parseInt(document.getElementById('guestPlus').value) || 0,
    note: document.getElementById('guestNote').value.trim(),
  };
  try {
    if (editingGuestId) {
      await db.from('guests').update(data).eq('id', editingGuestId);
      Object.assign(state.guests.find(g => g.id === editingGuestId), data);
    } else {
      const res = await db.from('guests').insert([data]).select().single();
      state.guests.push(res.data);
    }
  } catch (e) {
    if (editingGuestId) Object.assign(state.guests.find(g => g.id === editingGuestId), data);
    else state.guests.push({ id: uid(), ...data });
  }
  saveLocal();
  renderGuests();
  renderDashboard();
  renderStats();
  closeModal('addGuestModal');
});

document.getElementById('guestSearch').addEventListener('input', renderGuests);

// ─── BUDGET ───────────────────────────────────────────────────────────────────
function renderBudget() {
  const spent = state.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const budget = Number(state.settings.budget || 0);
  const pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
  document.getElementById('totalBudgetInput').value = budget || '';
  document.getElementById('budgetSpent').textContent = formatINR(spent);
  document.getElementById('budgetRemaining').textContent = formatINR(budget - spent);
  document.getElementById('budgetPercent').textContent = pct + '%';
  document.getElementById('budgetBarFill').style.width = pct + '%';

  const list = document.getElementById('expenseList');
  if (!state.expenses.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">₹</div><p>No expenses tracked yet</p></div>`;
    return;
  }
  const sorted = [...state.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  list.innerHTML = sorted.map(e => `
    <div class="expense-item">
      <div class="expense-info">
        <div class="expense-name">${escHtml(e.name)}</div>
        <div class="expense-meta">
          <span class="badge badge-cat">${e.category}</span>
          ${e.date ? ` · ${formatDate(e.date)}` : ''}
          · <span class="expense-status-${e.status}">${e.status.charAt(0).toUpperCase() + e.status.slice(1)}</span>
        </div>
      </div>
      <div class="expense-amount">${formatINR(e.amount)}</div>
      <div style="display:flex;gap:4px">
        <button class="btn-icon" onclick="editExpense('${e.id}')">✎</button>
        <button class="btn-icon" onclick="deleteExpense('${e.id}')">✕</button>
      </div>
    </div>`).join('');
}

document.getElementById('totalBudgetInput').addEventListener('change', async e => {
  state.settings.budget = Number(e.target.value) || 0;
  try { await db.from('settings').upsert({ id: 1, ...state.settings }); } catch (err) {}
  saveLocal();
  renderBudget();
  renderDashboard();
});

let editingExpenseId = null;

document.getElementById('openAddExpense').addEventListener('click', () => {
  editingExpenseId = null;
  document.getElementById('expenseModalTitle').textContent = 'Add Expense';
  clearForm('expenseName', 'expenseAmount', 'expenseDate');
  document.getElementById('expenseCategory').value = 'Catering';
  document.getElementById('expenseStatus').value = 'paid';
  openModal('addExpenseModal');
});

function editExpense(id) {
  const e = state.expenses.find(e => e.id === id);
  if (!e) return;
  editingExpenseId = id;
  document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
  document.getElementById('expenseName').value = e.name;
  document.getElementById('expenseAmount').value = e.amount;
  document.getElementById('expenseCategory').value = e.category;
  document.getElementById('expenseStatus').value = e.status;
  document.getElementById('expenseDate').value = e.date || '';
  openModal('addExpenseModal');
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  try { await db.from('expenses').delete().eq('id', id); } catch (e) {}
  state.expenses = state.expenses.filter(e => e.id !== id);
  saveLocal();
  renderBudget();
  renderDashboard();
  renderStats();
}

document.getElementById('saveExpense').addEventListener('click', async () => {
  const name = document.getElementById('expenseName').value.trim();
  const amount = document.getElementById('expenseAmount').value;
  if (!name || !amount) { alert('Name and amount are required.'); return; }
  const data = {
    name,
    amount: Number(amount),
    category: document.getElementById('expenseCategory').value,
    status: document.getElementById('expenseStatus').value,
    date: document.getElementById('expenseDate').value || null,
  };
  try {
    if (editingExpenseId) {
      await db.from('expenses').update(data).eq('id', editingExpenseId);
      Object.assign(state.expenses.find(e => e.id === editingExpenseId), data);
    } else {
      const res = await db.from('expenses').insert([data]).select().single();
      state.expenses.push(res.data);
    }
  } catch (e) {
    if (editingExpenseId) Object.assign(state.expenses.find(e => e.id === editingExpenseId), data);
    else state.expenses.push({ id: uid(), ...data });
  }
  saveLocal();
  renderBudget();
  renderDashboard();
  renderStats();
  closeModal('addExpenseModal');
});

// ─── NOTES ────────────────────────────────────────────────────────────────────
function renderNotes() {
  const grid = document.getElementById('notesGrid');
  if (!state.notes.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">✎</div><p>No notes yet — jot down ideas, vendor contacts, song requests...</p></div>`;
    return;
  }
  grid.innerHTML = state.notes.map(n => `
    <div class="note-card ${n.color || 'cream'}">
      <button class="note-card-del" onclick="deleteNote('${n.id}')">✕</button>
      <div class="note-card-title">${escHtml(n.title)}</div>
      <div class="note-card-content">${escHtml(n.content || '')}</div>
    </div>`).join('');
}

async function deleteNote(id) {
  try { await db.from('notes').delete().eq('id', id); } catch (e) {}
  state.notes = state.notes.filter(n => n.id !== id);
  saveLocal();
  renderNotes();
}

document.getElementById('openAddNote').addEventListener('click', () => {
  clearForm('noteTitle', 'noteContent');
  selectedNoteColor = 'cream';
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  document.querySelector('.color-dot[data-color="cream"]').classList.add('selected');
  openModal('addNoteModal');
});

document.getElementById('noteColorPicker').addEventListener('click', e => {
  const dot = e.target.closest('.color-dot');
  if (!dot) return;
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  dot.classList.add('selected');
  selectedNoteColor = dot.dataset.color;
});

document.getElementById('saveNote').addEventListener('click', async () => {
  const title = document.getElementById('noteTitle').value.trim();
  if (!title) { alert('Title is required.'); return; }
  const data = {
    title,
    content: document.getElementById('noteContent').value.trim(),
    color: selectedNoteColor,
  };
  try {
    const res = await db.from('notes').insert([data]).select().single();
    state.notes.push(res.data);
  } catch (e) {
    state.notes.push({ id: uid(), ...data });
  }
  saveLocal();
  renderNotes();
  closeModal('addNoteModal');
});

// ─── BOOT ─────────────────────────────────────────────────────────────────────
loadAll();
