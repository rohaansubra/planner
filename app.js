(() => {
  'use strict';

  const STORE_KEY = 'tt-module-planner.v1';
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const COLORS = ['#4f6bed', '#e8613c', '#2ba574', '#b04fd1', '#d9a520', '#1e9bb8', '#d64578', '#6b7a8f', '#7a5cff', '#3d9a3d'];
  const STATUS = { planned: 'Planned', active: 'In progress', completed: 'Completed' };
  const HOUR_H = 56;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmtTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const TIME_RE = /^\d{2}:\d{2}$/;

  // ---------- State ----------

  function sampleData() {
    const t1 = uid(), t2 = uid(), t3 = uid();
    const m = (code, name, term, color, status = 'planned', credits = 15, grade = null) =>
      ({ id: uid(), code, name, term, color, status, credits, grade, lecturer: '', notes: '' });
    const mods = [
      m('CS101', 'Introduction to Programming', t1, COLORS[0], 'active'),
      m('MA102', 'Discrete Mathematics', t1, COLORS[1], 'active'),
      m('CS103', 'Computer Systems', t1, COLORS[2], 'active'),
      m('EC104', 'Principles of Economics', t1, COLORS[3], 'active'),
      m('CS111', 'Data Structures & Algorithms', t2, COLORS[0]),
      m('MA112', 'Linear Algebra', t2, COLORS[1]),
      m('CS113', 'Databases', t2, COLORS[5]),
      m('CS201', 'Software Engineering', t3, COLORS[6], 'planned', 30),
    ];
    const s = (mod, type, day, start, end, location) => ({ id: uid(), moduleId: mod.id, type, day, start, end, location });
    const [a, b, c, d] = mods;
    return {
      terms: [{ id: t1, name: 'Year 1 · Semester 1' }, { id: t2, name: 'Year 1 · Semester 2' }, { id: t3, name: 'Year 2 · Semester 1' }],
      modules: mods,
      sessions: [
        s(a, 'Lecture', 0, '09:00', '11:00', 'Hall A'),
        s(a, 'Lab', 2, '14:00', '16:00', 'Lab 3'),
        s(b, 'Lecture', 1, '10:00', '12:00', 'Room 1.04'),
        s(b, 'Tutorial', 3, '13:00', '14:00', 'Room 2.11'),
        s(c, 'Lecture', 0, '13:00', '15:00', 'Hall B'),
        s(c, 'Lab', 4, '10:00', '12:00', 'Lab 1'),
        s(d, 'Seminar', 2, '10:00', '11:30', 'Room 3.02'),
        s(d, 'Lecture', 3, '15:00', '17:00', 'Hall A'),
      ],
      settings: { ttTerm: t1 },
    };
  }

  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    const terms = (Array.isArray(d.terms) ? d.terms : [])
      .filter((t) => t && t.id)
      .map((t) => ({ id: String(t.id), name: String(t.name || 'Term') }));
    const termIds = new Set(terms.map((t) => t.id));
    const modules = (Array.isArray(d.modules) ? d.modules : [])
      .filter((m) => m && m.id)
      .map((m) => ({
        id: String(m.id),
        code: String(m.code || ''),
        name: String(m.name || ''),
        credits: Number.isFinite(+m.credits) ? +m.credits : 0,
        term: termIds.has(m.term) ? m.term : null,
        status: STATUS[m.status] ? m.status : 'planned',
        grade: m.grade === null || m.grade === '' || m.grade === undefined || !Number.isFinite(+m.grade) ? null : +m.grade,
        color: /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : COLORS[0],
        lecturer: String(m.lecturer || ''),
        notes: String(m.notes || ''),
      }));
    const modIds = new Set(modules.map((m) => m.id));
    const sessions = (Array.isArray(d.sessions) ? d.sessions : [])
      .filter((s) => s && s.id && modIds.has(s.moduleId) && TIME_RE.test(s.start) && TIME_RE.test(s.end) && toMin(s.end) > toMin(s.start))
      .map((s) => ({
        id: String(s.id),
        moduleId: s.moduleId,
        type: String(s.type || 'Lecture'),
        day: Math.min(6, Math.max(0, parseInt(s.day, 10) || 0)),
        start: s.start,
        end: s.end,
        location: String(s.location || ''),
      }));
    const settings = { showWeekend: false, ttTerm: 'all', creditTarget: 360, theme: 'auto', view: 'timetable', ...(d.settings || {}) };
    if (settings.ttTerm !== 'all' && !termIds.has(settings.ttTerm)) settings.ttTerm = terms[0]?.id || 'all';
    return { terms, modules, sessions, settings };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch { /* fall through */ }
    return normalize(sampleData());
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch { toast('Could not save — browser storage is unavailable'); }
  }

  let state = load();

  const getModule = (id) => state.modules.find((m) => m.id === id);
  const termName = (id) => state.terms.find((t) => t.id === id)?.name || 'Unassigned';
  const termOrder = (id) => { const i = state.terms.findIndex((t) => t.id === id); return i < 0 ? 1e9 : i; };
  const sortModules = (list) => [...list].sort((a, b) => termOrder(a.term) - termOrder(b.term) || a.code.localeCompare(b.code));

  function commit() { save(); render(); }

  // ---------- Toast ----------

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- Theme & views ----------

  function applyTheme() {
    const t = state.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  function setView(view) {
    state.settings.view = view;
    $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
    save();
  }

  // ---------- Timetable ----------

  function layoutDay(list) {
    const items = list
      .map((s) => ({ s, a: toMin(s.start), b: toMin(s.end), lane: 0, lanes: 1, clash: false }))
      .sort((x, y) => x.a - y.a || x.b - y.b);
    let cluster = [], clusterEnd = -1, clashes = 0;
    const flush = () => {
      const lanes = [];
      for (const it of cluster) {
        let i = lanes.findIndex((end) => end <= it.a);
        if (i < 0) { i = lanes.length; lanes.push(0); }
        lanes[i] = it.b;
        it.lane = i;
      }
      for (let i = 0; i < cluster.length; i++) {
        cluster[i].lanes = lanes.length;
        for (let j = i + 1; j < cluster.length; j++) {
          if (cluster[i].a < cluster[j].b && cluster[j].a < cluster[i].b) {
            cluster[i].clash = cluster[j].clash = true;
            clashes++;
          }
        }
      }
      cluster = [];
    };
    for (const it of items) {
      if (cluster.length && it.a >= clusterEnd) flush();
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.b);
    }
    if (cluster.length) flush();
    return { items, clashes };
  }

  function visibleModules() {
    const t = state.settings.ttTerm;
    return state.modules.filter((m) => t === 'all' || m.term === t);
  }

  function renderTimetable() {
    const el = $('#timetable');
    const numDays = state.settings.showWeekend ? 7 : 5;
    const mods = visibleModules();
    const modIds = new Set(mods.map((m) => m.id));
    const sessions = state.sessions.filter((s) => modIds.has(s.moduleId) && s.day < numDays);

    let startMin = 8 * 60, endMin = 18 * 60;
    for (const s of sessions) {
      startMin = Math.min(startMin, Math.floor(toMin(s.start) / 60) * 60);
      endMin = Math.max(endMin, Math.ceil(toMin(s.end) / 60) * 60);
    }
    const hours = (endMin - startMin) / 60;
    el.style.setProperty('--days', numDays);
    el.style.setProperty('--hours', hours);
    el.style.setProperty('--hour-h', `${HOUR_H}px`);
    el.dataset.start = startMin;

    const now = new Date();
    const today = (now.getDay() + 6) % 7;
    const nowMin = now.getHours() * 60 + now.getMinutes();

    let head = '<div class="tt-head"><div></div>';
    for (let d = 0; d < numDays; d++) head += `<div class="tt-day-h${d === today ? ' today' : ''}">${DAYS[d]}</div>`;
    head += '</div>';

    let gutter = '<div class="tt-gutter">';
    for (let h = 0; h < hours; h++) gutter += `<div class="tt-time" style="top:${h * HOUR_H}px">${fmtTime(startMin + h * 60)}</div>`;
    gutter += '</div>';

    let totalClashes = 0;
    let cols = '';
    for (let d = 0; d < numDays; d++) {
      const { items, clashes } = layoutDay(sessions.filter((s) => s.day === d));
      totalClashes += clashes;
      let inner = '';
      for (const it of items) {
        const mod = getModule(it.s.moduleId);
        const top = ((it.a - startMin) / 60) * HOUR_H;
        const height = Math.max(22, ((it.b - it.a) / 60) * HOUR_H - 2);
        const w = 100 / it.lanes;
        const title = `${mod.code} ${mod.name}\n${it.s.type} · ${it.s.start}–${it.s.end}${it.s.location ? `\n${it.s.location}` : ''}${it.clash ? '\n⚠ Clashes with another class' : ''}`;
        inner += `<div class="tt-event${it.clash ? ' clash' : ''}" data-id="${it.s.id}" role="button" tabindex="0" title="${esc(title)}"
          style="--c:${mod.color};top:${top + 1}px;height:${height}px;left:calc(${it.lane * w}% + 3px);width:calc(${w}% - 6px)">
          <div class="t1">${esc(mod.code)} · ${esc(it.s.type)}</div>
          ${height > 34 ? `<div class="t2">${it.s.start}–${it.s.end}</div>` : ''}
          ${height > 50 && it.s.location ? `<div class="t3">${esc(it.s.location)}</div>` : ''}
        </div>`;
      }
      if (d === today && nowMin >= startMin && nowMin <= endMin) {
        inner += `<div class="tt-now" style="top:${((nowMin - startMin) / 60) * HOUR_H}px"></div>`;
      }
      cols += `<div class="tt-col${d === today ? ' today' : ''}" data-day="${d}">${inner}</div>`;
    }

    el.innerHTML = head + `<div class="tt-body">${gutter}${cols}</div>`;

    const badge = $('#clashBadge');
    badge.hidden = totalClashes === 0;
    badge.textContent = `⚠ ${totalClashes} clash${totalClashes === 1 ? '' : 'es'}`;

    const withClasses = mods.filter((m) => state.sessions.some((s) => s.moduleId === m.id));
    $('#ttLegend').innerHTML = withClasses.length
      ? sortModules(withClasses).map((m) => `<button class="legend-item" data-module="${m.id}" style="--c:${m.color}"><span class="dot"></span>${esc(m.code)} <span class="muted">${esc(m.name)}</span></button>`).join('')
      : `<span class="muted small">${mods.length ? 'No classes scheduled yet — click the grid to add one.' : 'No modules in this term yet. Add some in the Module plan tab.'}</span>`;
  }

  function renderTermSelect() {
    const sel = $('#ttTerm');
    sel.innerHTML = state.terms.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('') + '<option value="all">All terms</option>';
    sel.value = state.settings.ttTerm;
    $('#showWeekend').checked = state.settings.showWeekend;
  }

  // ---------- Planner ----------

  function renderSummary() {
    const sum = (st) => state.modules.filter((m) => m.status === st).reduce((a, m) => a + m.credits, 0);
    const done = sum('completed'), active = sum('active'), planned = sum('planned');
    const target = state.settings.creditTarget || 0;
    const graded = state.modules.filter((m) => m.status === 'completed' && m.grade !== null && m.credits > 0);
    const gCredits = graded.reduce((a, m) => a + m.credits, 0);
    const avg = gCredits ? graded.reduce((a, m) => a + m.grade * m.credits, 0) / gCredits : null;
    const pct = (v) => (target ? Math.min(100, (v / target) * 100) : 0);
    const fmt = (n) => (Number.isInteger(n) ? n : n.toFixed(1));

    $('#summary').innerHTML = `
      <div class="stat"><div class="label">Completed</div><div class="value">${fmt(done)} <small>credits</small></div></div>
      <div class="stat"><div class="label">In progress</div><div class="value">${fmt(active)} <small>credits</small></div></div>
      <div class="stat"><div class="label">Planned</div><div class="value">${fmt(planned)} <small>credits</small></div></div>
      <div class="stat"><div class="label">Degree target</div><div class="value"><input type="number" min="0" step="5" id="creditTarget" value="${target}" aria-label="Credit target"></div></div>
      <div class="stat"><div class="label">Weighted average</div><div class="value">${avg === null ? '—' : `${avg.toFixed(1)}<small>%</small>`}</div></div>
      <div class="progress" title="${fmt(done + active + planned)} of ${target} credits accounted for">
        <span class="done" style="width:${pct(done)}%"></span>
        <span class="active" style="width:${Math.max(0, Math.min(100 - pct(done), pct(active)))}%"></span>
        <span class="planned" style="width:${Math.max(0, Math.min(100 - pct(done) - pct(active), pct(planned)))}%"></span>
      </div>`;
  }

  function cardHTML(m) {
    const n = state.sessions.filter((s) => s.moduleId === m.id).length;
    return `<div class="card" draggable="true" data-module="${m.id}" style="--c:${m.color}" tabindex="0">
      <div class="row"><span class="code">${esc(m.code)}</span><span class="cr">${m.credits} cr</span></div>
      <div class="nm">${esc(m.name)}</div>
      <div class="row"><span class="chip ${m.status}">${STATUS[m.status]}${m.grade !== null ? ` · ${m.grade}%` : ''}</span><span class="cr">${n ? `${n} class${n === 1 ? '' : 'es'}` : ''}</span></div>
    </div>`;
  }

  function renderBoard() {
    const cols = [...state.terms.map((t) => ({ id: t.id, name: t.name })), { id: '', name: 'Unassigned' }];
    $('#board').innerHTML = cols.map((col, i) => {
      const mods = sortModules(state.modules.filter((m) => (m.term || '') === col.id));
      if (!col.id && !mods.length && state.terms.length) return '';
      const credits = mods.reduce((a, m) => a + m.credits, 0);
      const controls = col.id ? `
        <button class="ghost" data-act="left" title="Move left" ${i === 0 ? 'disabled' : ''}>‹</button>
        <button class="ghost" data-act="right" title="Move right" ${i === state.terms.length - 1 ? 'disabled' : ''}>›</button>
        <button class="ghost" data-act="rename" title="Rename">✎</button>
        <button class="ghost" data-act="delete" title="Delete term">✕</button>` : '';
      return `<div class="term" data-term="${col.id}">
        <div class="term-head"><h3 title="${esc(col.name)}">${esc(col.name)}</h3><span class="credits">${credits} cr</span>${controls}</div>
        <div class="cards">${mods.map(cardHTML).join('') || '<div class="drop-hint">Drop modules here</div>'}</div>
      </div>`;
    }).join('');
  }

  // ---------- Module table ----------

  function renderTable() {
    const q = $('#moduleSearch').value.trim().toLowerCase();
    const rows = sortModules(state.modules).filter((m) => !q || `${m.code} ${m.name} ${m.lecturer} ${termName(m.term)}`.toLowerCase().includes(q));
    $('#moduleRows').innerHTML = rows.length ? rows.map((m) => `
      <tr data-module="${m.id}" tabindex="0">
        <td><span class="code-cell" style="--c:${m.color}"><span class="dot"></span>${esc(m.code)}</span></td>
        <td class="name">${esc(m.name)}${m.lecturer ? `<div class="muted small">${esc(m.lecturer)}</div>` : ''}</td>
        <td>${esc(termName(m.term))}</td>
        <td class="num">${m.credits}</td>
        <td><span class="chip ${m.status}">${STATUS[m.status]}</span></td>
        <td class="num">${m.grade === null ? '—' : `${m.grade}%`}</td>
        <td class="num">${state.sessions.filter((s) => s.moduleId === m.id).length}</td>
      </tr>`).join('')
      : `<tr><td colspan="7" class="muted" style="text-align:center;padding:30px">${q ? 'No matching modules.' : 'No modules yet.'}</td></tr>`;
  }

  function render() {
    renderTermSelect();
    renderTimetable();
    renderSummary();
    renderBoard();
    renderTable();
  }

  // ---------- Module dialog ----------

  const moduleDialog = $('#moduleDialog');
  const moduleForm = $('#moduleForm');
  let editingModule = null;
  let pickedColor = COLORS[0];

  function renderSwatches() {
    $('#swatches').innerHTML = COLORS.map((c) => `<button type="button" class="swatch" data-color="${c}" style="--c:${c}" aria-label="Colour ${c}" aria-pressed="${c === pickedColor}"></button>`).join('');
  }

  function openModule(id, preset = {}) {
    editingModule = id ? getModule(id) : null;
    const m = editingModule || {
      code: '', name: '', credits: 15, status: 'planned', grade: null, lecturer: '', notes: '',
      term: preset.term ?? (state.settings.ttTerm !== 'all' ? state.settings.ttTerm : state.terms[0]?.id ?? null),
      color: COLORS[state.modules.length % COLORS.length],
    };
    $('#moduleDialogTitle').textContent = editingModule ? 'Edit module' : 'Add module';
    moduleForm.term.innerHTML = state.terms.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('') + '<option value="">Unassigned</option>';
    moduleForm.code.value = m.code;
    moduleForm.name.value = m.name;
    moduleForm.credits.value = m.credits;
    moduleForm.term.value = m.term || '';
    moduleForm.status.value = m.status;
    moduleForm.grade.value = m.grade ?? '';
    moduleForm.lecturer.value = m.lecturer;
    moduleForm.notes.value = m.notes;
    pickedColor = m.color;
    renderSwatches();
    $('#deleteModuleBtn').hidden = !editingModule;
    moduleDialog.showModal();
  }

  moduleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = moduleForm;
    const data = {
      code: f.code.value.trim(),
      name: f.name.value.trim(),
      credits: Math.max(0, parseFloat(f.credits.value) || 0),
      term: f.term.value || null,
      status: f.status.value,
      grade: f.grade.value === '' ? null : Math.min(100, Math.max(0, parseFloat(f.grade.value))),
      lecturer: f.lecturer.value.trim(),
      notes: f.notes.value.trim(),
      color: pickedColor,
    };
    if (editingModule) Object.assign(editingModule, data);
    else state.modules.push({ id: uid(), ...data });
    moduleDialog.close();
    toast(editingModule ? 'Module updated' : 'Module added');
    commit();
  });

  $('#swatches').addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    pickedColor = b.dataset.color;
    renderSwatches();
  });

  $('#deleteModuleBtn').addEventListener('click', () => {
    if (!editingModule) return;
    const n = state.sessions.filter((s) => s.moduleId === editingModule.id).length;
    if (!confirm(`Delete ${editingModule.code || 'this module'}${n ? ` and its ${n} class${n === 1 ? '' : 'es'}` : ''}?`)) return;
    state.modules = state.modules.filter((m) => m !== editingModule);
    state.sessions = state.sessions.filter((s) => s.moduleId !== editingModule.id);
    moduleDialog.close();
    toast('Module deleted');
    commit();
  });

  // ---------- Session dialog ----------

  const sessionDialog = $('#sessionDialog');
  const sessionForm = $('#sessionForm');
  let editingSession = null;

  function openSession(id, preset = {}) {
    const mods = sortModules(visibleModules().length ? visibleModules() : state.modules);
    if (!state.modules.length) {
      toast('Add a module first');
      openModule(null);
      return;
    }
    editingSession = id ? state.sessions.find((s) => s.id === id) : null;
    const s = editingSession || { moduleId: preset.moduleId || mods[0].id, type: 'Lecture', day: preset.day ?? 0, start: preset.start || '09:00', end: preset.end || '10:00', location: '' };
    const options = editingSession && !mods.some((m) => m.id === s.moduleId) ? [...mods, getModule(s.moduleId)] : mods;
    sessionForm.moduleId.innerHTML = options.map((m) => `<option value="${m.id}">${esc(m.code)} — ${esc(m.name)}</option>`).join('');
    sessionForm.moduleId.value = s.moduleId;
    sessionForm.type.value = s.type;
    sessionForm.day.value = s.day;
    sessionForm.start.value = s.start;
    sessionForm.end.value = s.end;
    sessionForm.location.value = s.location;
    $('#sessionDialogTitle').textContent = editingSession ? 'Edit class' : 'Add class';
    $('#deleteSessionBtn').hidden = !editingSession;
    $('#sessionError').hidden = true;
    sessionDialog.showModal();
  }

  sessionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = sessionForm;
    const data = {
      moduleId: f.moduleId.value,
      type: f.type.value,
      day: parseInt(f.day.value, 10),
      start: f.start.value.slice(0, 5),
      end: f.end.value.slice(0, 5),
      location: f.location.value.trim(),
    };
    if (!TIME_RE.test(data.start) || !TIME_RE.test(data.end) || toMin(data.end) <= toMin(data.start)) {
      const err = $('#sessionError');
      err.textContent = 'End time must be after start time.';
      err.hidden = false;
      return;
    }
    if (editingSession) Object.assign(editingSession, data);
    else state.sessions.push({ id: uid(), ...data });
    if (data.day > 4 && !state.settings.showWeekend) state.settings.showWeekend = true;
    sessionDialog.close();
    toast(editingSession ? 'Class updated' : 'Class added');
    commit();
  });

  $('#deleteSessionBtn').addEventListener('click', () => {
    if (!editingSession) return;
    state.sessions = state.sessions.filter((s) => s !== editingSession);
    sessionDialog.close();
    toast('Class deleted');
    commit();
  });

  $$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  // ---------- Events ----------

  $$('.tab').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  $('#themeBtn').addEventListener('click', () => {
    const dark = state.settings.theme === 'dark' || (state.settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    state.settings.theme = dark ? 'light' : 'dark';
    applyTheme();
    save();
  });

  $('#ttTerm').addEventListener('change', (e) => { state.settings.ttTerm = e.target.value; commit(); });
  $('#showWeekend').addEventListener('change', (e) => { state.settings.showWeekend = e.target.checked; commit(); });
  $('#addSessionBtn').addEventListener('click', () => openSession(null));
  $('#printBtn').addEventListener('click', () => window.print());

  $('#timetable').addEventListener('click', (e) => {
    const ev = e.target.closest('.tt-event');
    if (ev) return openSession(ev.dataset.id);
    const col = e.target.closest('.tt-col');
    if (!col) return;
    const y = e.clientY - col.getBoundingClientRect().top;
    const startMin = +$('#timetable').dataset.start;
    const min = Math.min(23 * 60, startMin + Math.floor((y / HOUR_H) * 2) * 30);
    openSession(null, { day: +col.dataset.day, start: fmtTime(min), end: fmtTime(Math.min(min + 60, 23 * 60 + 59)) });
  });
  $('#timetable').addEventListener('keydown', (e) => {
    const ev = e.target.closest('.tt-event');
    if (ev && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSession(ev.dataset.id); }
  });
  $('#ttLegend').addEventListener('click', (e) => {
    const b = e.target.closest('[data-module]');
    if (b) openModule(b.dataset.module);
  });

  $('#addModuleBtn').addEventListener('click', () => openModule(null));
  $('#addModuleBtn2').addEventListener('click', () => openModule(null));
  $('#addTermBtn').addEventListener('click', () => {
    const name = prompt('Term name', `Term ${state.terms.length + 1}`);
    if (!name?.trim()) return;
    state.terms.push({ id: uid(), name: name.trim() });
    commit();
  });

  $('#summary').addEventListener('change', (e) => {
    if (e.target.id !== 'creditTarget') return;
    state.settings.creditTarget = Math.max(0, parseFloat(e.target.value) || 0);
    commit();
  });

  const board = $('#board');
  board.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const termId = act.closest('.term').dataset.term;
      const i = state.terms.findIndex((t) => t.id === termId);
      const term = state.terms[i];
      if (act.dataset.act === 'rename') {
        const name = prompt('Rename term', term.name);
        if (name?.trim()) term.name = name.trim();
      } else if (act.dataset.act === 'delete') {
        const n = state.modules.filter((m) => m.term === termId).length;
        if (!confirm(`Delete "${term.name}"?${n ? ` Its ${n} module${n === 1 ? '' : 's'} will move to Unassigned.` : ''}`)) return;
        state.terms.splice(i, 1);
        state.modules.forEach((m) => { if (m.term === termId) m.term = null; });
        if (state.settings.ttTerm === termId) state.settings.ttTerm = state.terms[0]?.id || 'all';
      } else {
        const j = act.dataset.act === 'left' ? i - 1 : i + 1;
        if (j < 0 || j >= state.terms.length) return;
        [state.terms[i], state.terms[j]] = [state.terms[j], state.terms[i]];
      }
      return commit();
    }
    const card = e.target.closest('.card');
    if (card) openModule(card.dataset.module);
  });
  board.addEventListener('keydown', (e) => {
    const card = e.target.closest('.card');
    if (card && e.key === 'Enter') openModule(card.dataset.module);
  });

  // Drag & drop between terms
  let dragId = null;
  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    dragId = card.dataset.module;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    requestAnimationFrame(() => card.classList.add('dragging'));
  });
  board.addEventListener('dragend', () => {
    dragId = null;
    $$('.card.dragging, .term.drag-over').forEach((el) => el.classList.remove('dragging', 'drag-over'));
  });
  board.addEventListener('dragover', (e) => {
    const col = e.target.closest('.term');
    if (!col || !dragId) return;
    e.preventDefault();
    $$('.term.drag-over').forEach((el) => el !== col && el.classList.remove('drag-over'));
    col.classList.add('drag-over');
  });
  board.addEventListener('dragleave', (e) => {
    const col = e.target.closest('.term');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('drag-over');
  });
  board.addEventListener('drop', (e) => {
    const col = e.target.closest('.term');
    if (!col || !dragId) return;
    e.preventDefault();
    const m = getModule(dragId);
    if (m) {
      m.term = col.dataset.term || null;
      toast(`${m.code} → ${termName(m.term)}`);
    }
    commit();
  });

  $('#moduleSearch').addEventListener('input', renderTable);
  $('#moduleRows').addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-module]');
    if (row) openModule(row.dataset.module);
  });
  $('#moduleRows').addEventListener('keydown', (e) => {
    const row = e.target.closest('tr[data-module]');
    if (row && e.key === 'Enter') openModule(row.dataset.module);
  });

  // ---------- Import / export ----------

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = normalize(JSON.parse(await file.text()));
      if (!confirm(`Replace your current data with ${data.modules.length} modules and ${data.sessions.length} classes from "${file.name}"?`)) return;
      state = data;
      applyTheme();
      setView(state.settings.view);
      commit();
      toast('Data imported');
    } catch {
      alert('That file could not be read. Make sure it is a backup exported from this planner.');
    }
  });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Delete all terms, modules and classes? Export a backup first if you might want them back.')) return;
    state = normalize({ terms: [{ id: uid(), name: 'Semester 1' }], settings: { theme: state.settings.theme, view: state.settings.view } });
    commit();
    toast('All data cleared');
  });

  // ---------- Boot ----------

  applyTheme();
  setView(state.settings.view);
  render();
  setInterval(renderTimetable, 60 * 1000);
})();
