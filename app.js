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
      m('CS1101S', 'Programming Methodology', t1, COLORS[0], 'active'),
      m('CS1231S', 'Discrete Structures', t1, COLORS[1], 'active'),
      m('MA1521', 'Calculus for Computing', t1, COLORS[2], 'active'),
      m('IS1108', 'Digital and AI Ethics', t1, COLORS[3], 'active'),
      m('MNO1706X', 'Organisational Behaviour', t1, COLORS[4], 'active'),
      m('CS2030S', 'Programming Methodology II', t2, COLORS[0]),
      m('CS2040S', 'Data Structures and Algorithms', t2, COLORS[5]),
      m('MA1522', 'Linear Algebra for Computing', t2, COLORS[2]),
      m('ACC1701X', 'Accounting for Decision Makers', t2, COLORS[6]),
      m('GEA1000', 'Quantitative Reasoning with Data', t2, COLORS[7]),
      m('CS2100', 'Computer Organisation', t3, COLORS[8]),
      m('CS2101', 'Effective Communication for Computing Professionals', t3, COLORS[9]),
      m('CS2103T', 'Software Engineering', t3, COLORS[1]),
      m('MKT1705X', 'Principles of Marketing', t3, COLORS[6]),
    ];
    const s = (mod, type, day, start, end, location) => ({ id: uid(), moduleId: mod.id, type, day, start, end, location });
    const [a, b, c, d, e] = mods;
    return {
      terms: [{ id: t1, name: 'Year 1 · Semester 1' }, { id: t2, name: 'Year 1 · Semester 2' }, { id: t3, name: 'Year 2 · Semester 1' }],
      modules: mods,
      sessions: [
        s(a, 'Lecture', 1, '10:00', '12:00', 'LT19'),
        s(a, 'Lab', 3, '14:00', '16:00', 'COM1-B108'),
        s(b, 'Lecture', 0, '14:00', '16:00', 'I3-AUD'),
        s(b, 'Tutorial', 2, '10:00', '11:00', 'COM1-0208'),
        s(c, 'Lecture', 0, '10:00', '12:00', 'LT27'),
        s(c, 'Tutorial', 4, '09:00', '10:00', 'S16-0430'),
        s(d, 'Seminar', 2, '13:00', '15:00', 'COM3-01-21'),
        s(e, 'Seminar', 3, '09:00', '12:00', 'BIZ1-0303'),
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
        req: typeof m.req === 'string' ? m.req : '',
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
    if (settings.addTerm !== '' && !termIds.has(settings.addTerm)) settings.addTerm = terms[0]?.id || '';
    if (!['timetable', 'planner', 'degree', 'courses', 'modules'].includes(settings.view)) settings.view = 'timetable';
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

  // ---------- NUS course catalogue ----------

  let catalog = null;
  let catalogError = false;
  const catalogMap = new Map();
  const lookup = (code) => catalogMap.get(code);
  const RANK = { completed: 0, active: 1, planned: 2 };
  const GROUP_TITLE = Object.fromEntries(Degree.allGroups().map((g) => [g.id, g.title]));
  const SEM_LABEL = { S1: 'Sem 1', S2: 'Sem 2', ST1: 'ST I', ST2: 'ST II' };
  const cf = { q: '', show: 'all', req: '', subject: '', levels: new Set(), sems: new Set(), limit: 40, open: new Set() };

  function loadCatalog() {
    fetch('data/courses.json?v=2')
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => {
        catalog = d;
        for (const c of d.courses) {
          c.lv = Degree.level(c.c);
          c.px = Degree.prefix(c.c);
          c.groups = Degree.groupsFor(c.c);
          c.focus = Degree.focusFor(c.c);
          c.core = c.groups.some((id) => Degree.allGroups().find((g) => g.id === id).type === 'slots');
          c.hay = `${c.c} ${c.t} ${c.d}`.toLowerCase();
          catalogMap.set(c.c, c);
        }
        $('#courseCodes').innerHTML = d.courses.map((c) => `<option value="${c.c}">${esc(c.t)}</option>`).join('');
        renderCourseFilters();
        render();
      })
      .catch(() => { catalogError = true; render(); });
  }

  function myModulesByCode() {
    const map = new Map();
    for (const m of state.modules) {
      const k = m.code.trim().toUpperCase();
      if (!k) continue;
      const p = map.get(k);
      if (!p || RANK[m.status] < RANK[p.status]) map.set(k, m);
    }
    return map;
  }

  function setCourseStatus(code, status) {
    const existing = state.modules.filter((m) => m.code.trim().toUpperCase() === code);
    if (status === 'remove') {
      const ids = new Set(existing.map((m) => m.id));
      const n = state.sessions.filter((s) => ids.has(s.moduleId)).length;
      if (n && !confirm(`Remove ${code} and its ${n} class${n === 1 ? '' : 'es'} from your timetable?`)) return;
      state.modules = state.modules.filter((m) => !ids.has(m.id));
      state.sessions = state.sessions.filter((s) => !ids.has(s.moduleId));
      toast(`${code} removed from your plan`);
    } else if (existing.length) {
      existing.forEach((m) => { m.status = status; });
      toast(`${code}: ${STATUS[status]}`);
    } else {
      const c = lookup(code);
      const term = state.settings.addTerm || null;
      state.modules.push({
        id: uid(), code, name: c ? c.t : code, credits: c ? c.u : 4, term, status, grade: null,
        color: COLORS[state.modules.length % COLORS.length], lecturer: '', notes: '', req: '',
      });
      toast(`${code} added to ${termName(term)} as ${STATUS[status].toLowerCase()}`);
    }
    commit();
  }

  function showCourse(code) {
    Object.assign(cf, { q: code, show: 'all', req: '', subject: '', limit: 40 });
    cf.levels.clear();
    cf.sems.clear();
    cf.open.add(code);
    syncCourseFilters();
    setView('courses');
    renderCourses();
    window.scrollTo(0, 0);
  }

  function browseGroup(req) {
    Object.assign(cf, { q: '', show: 'all', req, subject: '', limit: 40 });
    cf.levels.clear();
    cf.sems.clear();
    syncCourseFilters();
    setView('courses');
    renderCourses();
    window.scrollTo(0, 0);
  }

  // ---------- Degree view ----------

  const ICON = { completed: '✓', active: '◐', planned: '○', missing: '' };
  const ST_LABEL = { completed: 'Taken', active: 'In progress', planned: 'Planned', missing: 'Not on your plan yet' };
  const fmtU = (n) => (Number.isInteger(n) ? n : n.toFixed(1));

  function bar(got, of) {
    const p = (v) => (of ? Math.min(100, (v / of) * 100) : 0);
    const a = p(got.completed), b = Math.min(100 - a, p(got.active)), c = Math.min(100 - a - b, p(got.planned));
    return `<div class="progress"><span class="done" style="width:${a}%"></span><span class="active" style="width:${b}%"></span><span class="planned" style="width:${c}%"></span></div>`;
  }

  function reqRow(code, c, { add = true } = {}) {
    const info = lookup(code);
    const st = c ? c.status : 'missing';
    const title = (c && c.title) || (info && info.t) || '';
    const units = c ? c.units : info ? info.u : '';
    return `<li class="req-row ${st}">
      <span class="st" title="${ST_LABEL[st]}">${ICON[st]}</span>
      <button class="link rc" data-show="${esc(code)}">${esc(code)}</button>
      <span class="rt">${esc(title)}</span>
      ${!c && add ? `<button class="mini" data-add="${esc(code)}" title="Add to your plan as planned">+ Plan</button>` : ''}
      <span class="ru">${units === '' ? '' : `${units}u`}</span>
    </li>`;
  }

  function groupCard(r) {
    const g = r.group;
    let rows = '';
    if (g.type === 'slots') {
      const filled = r.slots.filter((s) => s.course).length;
      for (const s of r.slots) {
        if (s.course) rows += reqRow(s.course.code, s.course);
        else if (g.choose && filled >= g.choose) continue;
        else if (s.codes.length === 1) rows += reqRow(s.codes[0], null);
        else {
          rows += `<li class="req-row missing"><span class="st"></span><span class="rt">${s.label ? `${esc(s.label)}: ` : ''}${s.codes.map((c) => `<button class="link" data-show="${c}">${c}</button>`).join(' / ')}</span></li>`;
        }
      }
    } else {
      rows = r.list.map((c) => reqRow(c.code, c)).join('');
      const left = g.units - (r.units.completed + r.units.active + r.units.planned);
      if (left > 0) rows += `<li class="req-row missing"><span class="st"></span><span class="rt muted">${fmtU(left)} more units · ${esc(g.hint || '')}</span></li>`;
    }
    const checks = r.checks.length
      ? `<ul class="req-checks">${r.checks.map((ch) => `<li class="${ch.state}"><span class="st">${ch.state === 'done' ? '✓' : ch.state === 'planned' ? '○' : '✕'}</span>${esc(ch.label)}</li>`).join('')}</ul>`
      : '';
    const pill = r.complete ? '<span class="chip completed">Complete</span>' : r.onTrack ? '<span class="chip active">On track</span>' : '<span class="chip">To do</span>';
    const p = r.progress;
    const got = g.type === 'slots'
      ? { completed: p.done, active: 0, planned: p.any - p.done }
      : r.units;
    let focus = '';
    if (g.id === 'bd') {
      const ev = lastEval;
      focus = `<details class="focus"${focusOpen ? ' open' : ''}><summary>Focus areas (pick one: 3 primaries, at least one at level 4000)</summary>
        <div class="focus-grid">${ev.focus.map((f) => `
          <div class="focus-area"><div class="fa-head"><span>${esc(f.area)}</span><span class="muted small">${f.primaries.filter((x) => x.course).length}/3</span></div>
          <div class="fa-codes">${f.primaries.map((x) => `<button class="fa-code ${x.course ? x.course.status : ''}" data-show="${x.code}" title="${esc((lookup(x.code) || {}).t || '')}">${x.code}</button>`).join('')}</div>
          <button class="link small" data-browse="focus:${esc(f.area)}">Browse →</button></div>`).join('')}
        </div></details>`;
    }
    return `<div class="req-card${r.complete ? ' is-complete' : ''}">
      <div class="req-head"><h3>${esc(g.title)}</h3>${pill}</div>
      <div class="req-sub muted small">${fmtU(p.done)} / ${fmtU(p.of)} ${p.unit === 'courses' && p.of === 1 ? 'course' : p.unit} done${p.any > p.done ? ` · ${fmtU(p.any - p.done)} planned` : ''}</div>
      ${bar(got, p.of)}
      ${g.note ? `<p class="small muted note">${esc(g.note)}</p>` : ''}
      <ul class="req-list">${rows}</ul>
      ${checks}
      ${focus}
      <button class="link small browse" data-browse="${g.id}">Browse eligible courses →</button>
    </div>`;
  }

  let lastEval = null;
  let focusOpen = false;

  function renderDegree() {
    const ev = Degree.evaluate(state.modules, lookup);
    lastEval = ev;
    const t = ev.total;
    const E = ev.electives;
    const sectionsHTML = ev.sections.map((s) => `
      <section class="dsec">
        <div class="dsec-head">
          <h2>${esc(s.title)}</h2>
          <span class="muted">${fmtU(s.got.completed)} / ${s.units} units taken${s.got.active + s.got.planned ? ` · ${fmtU(s.got.active + s.got.planned)} in progress or planned` : ''}</span>
        </div>
        ${s.note ? `<p class="muted small note">${esc(s.note)}</p>` : ''}
        <div class="req-grid">${s.groups.map(groupCard).join('')}</div>
      </section>`).join('');

    const ue = `
      <section class="dsec">
        <div class="dsec-head"><h2>Unrestricted Electives</h2><span class="muted">${fmtU(E.withMgmt.completed)} / ${E.units} units taken</span></div>
        <div class="req-grid"><div class="req-card wide">
          ${bar(E.withMgmt, E.units)}
          <p class="small muted note">Your Second Major in Management (${fmtU(ev.sections.find((s) => s.id === 'mgmt').units)} units) fills this space. The Second Major is 8 units larger than the elective space, so check with SoC how many units can be double-counted with your CS major. Courses that don't fit any requirement above also count here.</p>
          <ul class="req-list">${E.list.length ? E.list.map((c) => reqRow(c.code, c)).join('') : '<li class="req-row missing"><span class="st"></span><span class="rt muted">No extra courses yet</span></li>'}</ul>
        </div></div>
      </section>`;

    $('#degree').innerHTML = `
      <div class="degree-head">
        <div>
          <h1>BComp (Computer Science) <span class="muted">+ Second Major in Management</span></h1>
          <p class="muted small">Requirements for the AY2026/27 cohort${catalog ? ` · course data from NUSMods, ${esc(catalog.ay)}` : ''}. Mark courses as taken or planned in the <button class="link" data-view-link="courses">Courses</button> tab.</p>
        </div>
        <div class="degree-total">
          <div class="big">${fmtU(t.completed)}<small> / ${ev.totalUnits} units</small></div>
          <div class="muted small">${fmtU(t.active)} in progress · ${fmtU(t.planned)} planned</div>
        </div>
        ${bar(t, ev.totalUnits)}
        <div class="legend-row small muted"><span><i class="lg done"></i>Taken</span><span><i class="lg active"></i>In progress</span><span><i class="lg planned"></i>Planned</span></div>
      </div>
      ${sectionsHTML}
      ${ue}
      <p class="disclaimer small muted">This tracker is a guide, not an official audit. Rules come from the
        <a href="https://www.comp.nus.edu.sg/cug/per-cohort/cs/cs-26-27/" target="_blank" rel="noopener">SoC CS cohort 2026/27 page</a>,
        <a href="https://www.comp.nus.edu.sg/programmes/ug/focus/" target="_blank" rel="noopener">CS focus areas</a> and the
        <a href="https://bba.nus.edu.sg/second-major-minors-for-non-bba-students/" target="_blank" rel="noopener">NUS BBA second major page</a>.
        The management "areas" are grouped by subject code because the official area list couldn't be retrieved.
        Always check your degree audit on EduRec and confirm with your faculty.</p>`;
  }

  // ---------- Courses view ----------

  function renderCourseFilters() {
    const groups = Degree.sections.map((s) => `<optgroup label="${esc(s.title)}">${s.groups.map((g) => `<option value="${g.id}">${esc(g.title)}</option>`).join('')}</optgroup>`).join('');
    const focus = `<optgroup label="CS focus areas">${Object.keys(Degree.FOCUS).map((a) => `<option value="focus:${esc(a)}">${esc(a)}</option>`).join('')}</optgroup>`;
    $('#cReq').innerHTML = `<option value="">Any requirement</option>${groups}${focus}`;
    const counts = {};
    (catalog ? catalog.courses : []).forEach((c) => { counts[c.px] = (counts[c.px] || 0) + 1; });
    $('#cSubject').innerHTML = '<option value="">All subjects</option>' + Object.keys(counts).sort().map((p) => `<option value="${p}">${p} (${counts[p]})</option>`).join('');
    syncCourseFilters();
  }

  function syncCourseFilters() {
    $('#cSearch').value = cf.q;
    $('#cReq').value = cf.req;
    $('#cSubject').value = cf.subject;
    $$('#cShow button').forEach((b) => b.classList.toggle('on', b.dataset.v === cf.show));
    $$('#cLevel input').forEach((i) => { i.checked = cf.levels.has(+i.value); });
    $$('#cSem input').forEach((i) => { i.checked = cf.sems.has(i.value); });
  }

  function renderCourses() {
    const sel = $('#cTerm');
    sel.innerHTML = state.terms.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('') + '<option value="">Unassigned</option>';
    sel.value = state.settings.addTerm || '';

    const out = $('#cResults');
    if (!catalog) {
      out.innerHTML = `<div class="empty">${catalogError
        ? 'Couldn’t load the NUS course data. If you opened <code>index.html</code> straight from your computer, serve the folder with a local web server instead (see the README).'
        : 'Loading NUS courses…'}</div>`;
      $('#cCount').textContent = '';
      $('#cMore').hidden = true;
      return;
    }

    const mine = myModulesByCode();
    const ev = lastEval || Degree.evaluate(state.modules, lookup);
    const needed = new Set();
    ev.sections.forEach((s) => s.groups.forEach((r) => {
      if (r.slots && !(r.group.choose && r.slots.filter((x) => x.course).length >= r.group.choose)) {
        r.slots.filter((x) => !x.course).forEach((x) => x.codes.forEach((c) => needed.add(c)));
      }
    }));

    const words = cf.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const q = cf.q.trim().toUpperCase();
    let list = catalog.courses.filter((c) => {
      if (words.length && !words.every((w) => c.hay.includes(w))) return false;
      if (cf.subject && c.px !== cf.subject) return false;
      if (cf.levels.size && !cf.levels.has(Math.min(c.lv, 5000))) return false;
      if (cf.sems.size && !c.s.some((s) => cf.sems.has(s))) return false;
      if (cf.req) {
        if (cf.req.startsWith('focus:')) { if (!c.focus.includes(cf.req.slice(6))) return false; }
        else if (!c.groups.includes(cf.req)) return false;
      }
      const m = mine.get(c.c);
      if (cf.show === 'degree') return c.core || c.focus.length > 0;
      if (cf.show === 'todo') return needed.has(c.c) && !m;
      if (cf.show === 'mine') return !!m;
      if (cf.show === 'completed') return m && m.status === 'completed';
      return true;
    });
    if (q) {
      const rank = (c) => (c.c === q ? 0 : c.c.startsWith(q) ? 1 : c.t.toUpperCase().includes(q) ? 2 : 3);
      list = list.sort((a, b) => rank(a) - rank(b) || a.c.localeCompare(b.c));
    }

    $('#cCount').textContent = `${list.length.toLocaleString()} course${list.length === 1 ? '' : 's'} · NUSMods ${catalog.ay}`;
    const shown = list.slice(0, cf.limit);
    out.innerHTML = shown.length ? shown.map((c) => courseCard(c, mine.get(c.c))).join('') : '<div class="empty">No courses match these filters.</div>';
    const more = $('#cMore');
    more.hidden = list.length <= cf.limit;
    more.textContent = `Show more (${(list.length - cf.limit).toLocaleString()} left)`;
  }

  function courseCard(c, m) {
    const open = cf.open.has(c.c);
    const tags = [
      ...c.groups.map((id) => `<button class="tag" data-browse="${id}">${esc(GROUP_TITLE[id])}</button>`),
      ...c.focus.map((a) => `<button class="tag focus" data-browse="focus:${esc(a)}">Focus: ${esc(a)}</button>`),
    ].join('');
    const w = c.w && c.w.length === 5 && c.w.some((x) => x > 0) ? c.w : null;
    const details = open ? `<dl class="cdetails">
      ${c.pr ? `<dt>Prerequisite</dt><dd>${esc(c.pr)}</dd>` : ''}
      ${c.pc ? `<dt>Preclusion</dt><dd>${esc(c.pc)}</dd>` : ''}
      ${c.co ? `<dt>Corequisite</dt><dd>${esc(c.co)}</dd>` : ''}
      ${w ? `<dt>Workload</dt><dd>${w.reduce((a, b) => a + b, 0)} hrs/week: ${w[0]} lecture · ${w[1]} tutorial · ${w[2]} lab · ${w[3]} project · ${w[4]} prep</dd>` : ''}
      <dt>Grading</dt><dd>${esc(c.g || '—')}${c.su ? ' · S/U option available' : ''}</dd>
      <dt>Faculty</dt><dd>${esc(c.f)}${c.dp ? ` · ${esc(c.dp)}` : ''}</dd>
    </dl>
    <a class="small" href="https://nusmods.com/courses/${encodeURIComponent(c.c)}" target="_blank" rel="noopener">View on NUSMods ↗</a>` : '';
    const btn = (st, label) => `<button class="${m && m.status === st ? 'on ' + st : ''}" data-set="${st}">${label}</button>`;
    return `<article class="course${open ? ' open' : ''}${m ? ' mine ' + m.status : ''}" data-code="${c.c}">
      <div class="course-top">
        <div class="ctitle">
          <h3><span class="ccode">${c.c}</span> ${esc(c.t)}</h3>
          <div class="cmeta">${esc(c.dp || c.f)} · ${c.u} units${c.s.length ? ' · ' + c.s.map((s) => `<span class="sem">${SEM_LABEL[s]}</span>`).join('') : ' · <span class="muted">Not offered this year</span>'}</div>
        </div>
        ${m ? `<span class="chip ${m.status}">${STATUS[m.status]}${m.term ? ` · ${esc(termName(m.term))}` : ''}</span>` : ''}
      </div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      <p class="cdesc">${esc(c.d) || '<span class="muted">No description.</span>'}</p>
      ${details}
      <div class="cactions">
        ${btn('completed', '✓ Taken')}${btn('active', 'In progress')}${btn('planned', 'Planned')}
        ${m ? '<button class="ghost danger-text" data-set="remove">Remove</button>' : ''}
        <span class="spacer"></span>
        <button class="ghost" data-toggle>${open ? 'Less' : 'More info'}</button>
      </div>
    </article>`;
  }

  function render() {
    renderTermSelect();
    renderTimetable();
    renderSummary();
    renderBoard();
    renderTable();
    renderDegree();
    renderCourses();
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
    moduleForm.req.innerHTML = '<option value="">Automatic</option>'
      + Degree.sections.map((s) => `<optgroup label="${esc(s.title)}">${s.groups.map((g) => `<option value="${g.id}">${esc(g.title)}</option>`).join('')}</optgroup>`).join('')
      + '<option value="ue">Unrestricted Electives</option>';
    moduleForm.req.value = m.req || '';
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
      req: f.req.value,
    };
    if (editingModule) Object.assign(editingModule, data);
    else state.modules.push({ id: uid(), ...data });
    moduleDialog.close();
    toast(editingModule ? 'Module updated' : 'Module added');
    commit();
  });

  moduleForm.code.addEventListener('change', () => {
    const c = catalogMap.get(moduleForm.code.value.trim().toUpperCase());
    if (!c) return;
    moduleForm.code.value = c.c;
    if (!moduleForm.name.value.trim()) moduleForm.name.value = c.t;
    moduleForm.credits.value = c.u;
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

  $$('.tab').forEach((b) => b.addEventListener('click', () => { setView(b.dataset.view); window.scrollTo(0, 0); }));

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

  // Degree + course search
  $('#degree').addEventListener('click', (e) => {
    const t = e.target.closest('[data-show],[data-add],[data-browse],[data-view-link]');
    if (!t) return;
    if (t.dataset.add) setCourseStatus(t.dataset.add, 'planned');
    else if (t.dataset.show) showCourse(t.dataset.show);
    else if (t.dataset.browse) browseGroup(t.dataset.browse);
    else setView(t.dataset.viewLink);
  });

  $('#degree').addEventListener('toggle', (e) => { if (e.target.matches('details.focus')) focusOpen = e.target.open; }, true);

  let searchTimer;
  $('#cSearch').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { cf.q = e.target.value; cf.limit = 40; renderCourses(); }, 120);
  });
  $('#cShow').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    cf.show = b.dataset.v;
    cf.limit = 40;
    syncCourseFilters();
    renderCourses();
  });
  $('#cReq').addEventListener('change', (e) => { cf.req = e.target.value; cf.limit = 40; renderCourses(); });
  $('#cSubject').addEventListener('change', (e) => { cf.subject = e.target.value; cf.limit = 40; renderCourses(); });
  $('#cLevel').addEventListener('change', (e) => { const v = +e.target.value; e.target.checked ? cf.levels.add(v) : cf.levels.delete(v); cf.limit = 40; renderCourses(); });
  $('#cSem').addEventListener('change', (e) => { const v = e.target.value; e.target.checked ? cf.sems.add(v) : cf.sems.delete(v); cf.limit = 40; renderCourses(); });
  $('#cReset').addEventListener('click', () => {
    Object.assign(cf, { q: '', show: 'all', req: '', subject: '', limit: 40 });
    cf.levels.clear();
    cf.sems.clear();
    syncCourseFilters();
    renderCourses();
  });
  $('#cFilterToggle').addEventListener('click', (e) => {
    const open = $('#courseFilters').classList.toggle('expanded');
    e.currentTarget.setAttribute('aria-expanded', open);
    e.currentTarget.textContent = open ? 'Fewer filters ▴' : 'More filters ▾';
  });
  $('#cMore').addEventListener('click', () => { cf.limit += 60; renderCourses(); });
  $('#cTerm').addEventListener('change', (e) => { state.settings.addTerm = e.target.value; save(); });
  $('#cResults').addEventListener('click', (e) => {
    const card = e.target.closest('.course');
    if (!card) return;
    const code = card.dataset.code;
    const t = e.target.closest('[data-set],[data-toggle],[data-browse]');
    if (!t) return;
    if (t.dataset.browse) return browseGroup(t.dataset.browse);
    if ('toggle' in t.dataset) {
      cf.open.has(code) ? cf.open.delete(code) : cf.open.add(code);
      return renderCourses();
    }
    const m = myModulesByCode().get(code);
    // Clicking the active status again removes the course from the plan.
    setCourseStatus(code, m && m.status === t.dataset.set ? 'remove' : t.dataset.set);
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
  renderCourseFilters();
  render();
  loadCatalog();
  setInterval(renderTimetable, 60 * 1000);
})();
