/*
 * Degree requirements: BComp (Computer Science), cohort AY2026/27,
 * with a Second Major in Management (non-BBA students, cohort 2023 onwards).
 *
 * Sources:
 *   https://www.comp.nus.edu.sg/cug/per-cohort/cs/cs-26-27/
 *   https://www.comp.nus.edu.sg/programmes/ug/focus/
 *   https://bba.nus.edu.sg/second-major-minors-for-non-bba-students/
 *
 * Edit this file if your cohort's rules differ.
 */
window.Degree = (() => {
  'use strict';

  const level = (code) => { const m = /^[A-Z]+(\d)/.exec(code); return m ? +m[1] * 1000 : 0; };
  const prefix = (code) => (/^[A-Z]+/.exec(code) || [''])[0];

  // Industry Experience (counts within CS Breadth & Depth).
  const IE_CODES = ['CP3880', 'IS4010', 'ETP3201L', 'ETP3206L', 'CP3200', 'CP3202', 'CP3107', 'CP3110', 'ETP3205'];
  const isIE = (c) => IE_CODES.includes(c);

  // CS focus areas: Area Primary courses.
  const FOCUS = {
    'Algorithms & Theory': ['CS3230', 'CS3231', 'CS3236', 'CS4231', 'CS4234', 'CS4330', 'CS4430'],
    'Artificial Intelligence': ['CS2109S', 'CS3243', 'CS3244', 'CS3263', 'CS3264', 'CS3268', 'CS4243', 'CS4244', 'CS4246', 'CS4248', 'CS4262', 'CS4263'],
    'Computer Graphics & Games': ['CS3241', 'CS3242', 'CS3247', 'CS4247', 'CS4350'],
    'Computer Security': ['CS2107', 'CS3235', 'CS4230', 'CS4236', 'CS4238', 'CS4239'],
    'Database Systems': ['CS2102', 'CS3223', 'CS4221', 'CS4224', 'CS4225'],
    'Human-Computer Interaction': ['CS2111', 'CS3240', 'CS3249', 'CS4249', 'CS4353'],
    'Multimedia Information Retrieval': ['CS2108', 'CS3245', 'CS4242', 'CS4248', 'CS4347'],
    'Networking & Distributed Systems': ['CS2105', 'CS3103', 'CS4222', 'CS4226', 'CS4231'],
    'Parallel Computing': ['CS3210', 'CS3211', 'CS4223', 'CS4231'],
    'Programming Languages': ['CS2104', 'CS3211', 'CS4212', 'CS4215'],
    'Software Engineering': ['CS2103T', 'CS3213', 'CS3217', 'CS3219', 'CS3227', 'CS3282', 'CS4211', 'CS4218', 'CS4239'],
  };

  // Management subjects grouped into areas. The official area list sits behind
  // bot protection on bba.nus.edu.sg, so this grouping is inferred from subject codes.
  const BIZ_AREAS = {
    ACC: 'Accounting',
    DAO: 'Business Analytics', DBA: 'Business Analytics', DSC: 'Business Analytics', DSN: 'Business Analytics',
    BSE: 'Business Economics',
    FIN: 'Finance',
    BSN: 'Innovation & Entrepreneurship',
    MNO: 'Leadership & Human Capital',
    MKT: 'Marketing',
    DOS: 'Operations & Supply Chain',
    BSP: 'Strategy & Policy',
  };

  const slot = (label, ...codes) => ({ label, codes });
  const one = (code) => slot(null, code);

  const sections = [
    {
      id: 'cc', title: 'Common Curriculum', units: 40,
      groups: [
        { id: 'dl', title: 'Digital Literacy', type: 'slots', slots: [slot('CS1101S (or UTC2851)', 'CS1101S', 'UTC2851')] },
        { id: 'ce', title: 'Critique & Expression', type: 'pool', units: 4, hint: 'ES2660, or a UTW / RVX course', match: (c) => c === 'ES2660' || /^(UTW|RVX)\d/.test(c) },
        { id: 'cnc', title: 'Cultures & Connections', type: 'pool', units: 4, hint: 'Any GEC course', match: (c) => /^GEC\d/.test(c) },
        { id: 'dlit', title: 'Data Literacy', type: 'slots', slots: [slot('One of GEA1000, BT1101, ST1131, DSA1101', 'GEA1000', 'BT1101', 'ST1131', 'DSA1101')] },
        { id: 'ss', title: 'Singapore Studies', type: 'pool', units: 4, hint: 'Any GES / GESS course', match: (c) => /^GESS?\d/.test(c) },
        { id: 'cne', title: 'Communities & Engagement', type: 'pool', units: 4, hint: 'Any GEN course', match: (c) => /^GEN\d/.test(c) },
        { id: 'eth', title: 'Computer Ethics', type: 'slots', slots: [one('IS1108')] },
        {
          id: 'idcd', title: 'Interdisciplinary & Cross-Disciplinary', type: 'pool', units: 12,
          hint: 'ID and CD courses: at least 2 ID, at most 1 CD',
          match: (c) => /^(ID|IDX|IDE|IDS|CD|CDE|CDM)\d/.test(c),
          checks: (list) => {
            const id = list.filter((x) => /^ID/.test(x.code)).length;
            const cd = list.filter((x) => /^CD/.test(x.code)).length;
            return [
              { label: `At least 2 ID courses (${id})`, ok: id >= 2 },
              { label: `At most 1 CD course (${cd})`, ok: cd <= 1 },
            ];
          },
        },
      ],
    },
    {
      id: 'major', title: 'Computer Science Major', units: 80,
      groups: [
        {
          id: 'found', title: 'CS Foundation', type: 'slots',
          slots: ['CS1231S', 'CS2030S', 'CS2040S', 'CS2100', 'CS2101', 'CS2103T', 'CS2106', 'CS2109S', 'CS3230'].map(one),
          note: 'Take CS2101 in the same semester as CS2103T.',
        },
        { id: 'math', title: 'Mathematics & Sciences', type: 'slots', slots: ['MA1521', 'MA1522', 'ST2334'].map(one) },
        {
          id: 'bd', title: 'CS Breadth & Depth', type: 'pool', units: 32,
          hint: 'CS / IFS / CP courses, including 6–12 units of Industry Experience',
          match: (c) => (/^(CS|IFS|CP)\d/.test(c) && level(c) <= 5000) || isIE(c),
          checks: (list, all) => {
            const allCodes = new Set(all.map((x) => x.code));
            let best = null;
            for (const [area, prim] of Object.entries(FOCUS)) {
              const got = prim.filter((c) => allCodes.has(c));
              const has4k = got.some((c) => level(c) >= 4000);
              const score = Math.min(got.length, 3) * 2 + (has4k ? 1 : 0);
              if (!best || score > best.score) best = { area, got, has4k, score };
            }
            const sum = (xs) => xs.reduce((a, x) => a + x.units, 0);
            const ie = sum(list.filter((x) => isIE(x.code)));
            const diss = list.some((x) => x.code === 'CP4101');
            const k4 = sum(list.filter((x) => level(x.code) >= 4000 && !isIE(x.code)));
            const cp = sum(list.filter((x) => /^CP/.test(x.code) && !isIE(x.code) && x.code !== 'CP4101'));
            const focusOk = best.got.length >= 3 && best.has4k;
            return [
              {
                label: focusOk
                  ? `Focus area: ${best.area}`
                  : `Focus area: 3 primaries in one area, 1 at level 4000+ (closest: ${best.area}, ${best.got.length}/3${best.got.length && !best.has4k ? ', none at 4000' : ''})`,
                ok: focusOk,
              },
              { label: `At least 12 units at level 4000+ (${k4})`, ok: k4 >= 12 },
              { label: diss ? 'Industry Experience replaced by CP4101 dissertation' : `Industry Experience 6–12 units (${ie})`, ok: diss || (ie >= 6 && ie <= 12) },
              { label: `At most 12 units of other CP courses (${cp})`, ok: cp <= 12 },
            ];
          },
        },
      ],
    },
    {
      id: 'mgmt', title: 'Second Major in Management', units: 48,
      note: 'Second Major courses take the place of your Unrestricted Electives.',
      groups: [
        {
          id: 'm1', title: 'Level-1000 foundation (any 4)', type: 'slots', choose: 4,
          slots: [
            slot('Organisational Behaviour', 'MNO1706X', 'PL3239'),
            slot('Accounting', 'ACC1701X', 'EC2204'),
            slot('Marketing', 'MKT1705X'),
            slot('Legal Environment', 'BSP1702X', 'RE1703'),
            slot('Managerial Economics', 'BSP1703X', 'BSP1703', 'EC1101E'),
            slot('Decision Analytics', 'DAO1704X'),
          ],
        },
        {
          id: 'm23', title: 'Level-2000 / 3000 courses', type: 'pool', units: 24,
          hint: '6 Business School courses: 2+ at level 2000, 3–4 at level 3000, at most 3 in one area',
          match: (c) => !!BIZ_AREAS[prefix(c)] && (level(c) === 2000 || level(c) === 3000),
          checks: (list) => {
            const l2 = list.filter((x) => level(x.code) === 2000).length;
            const l3 = list.filter((x) => level(x.code) === 3000).length;
            const areas = {};
            list.forEach((x) => { const a = BIZ_AREAS[prefix(x.code)] || 'Other'; areas[a] = (areas[a] || 0) + 1; });
            const over = Object.entries(areas).filter(([, n]) => n > 3).map(([a]) => a);
            return [
              { label: `At least 2 at level 2000 (${l2})`, ok: l2 >= 2 },
              { label: `3–4 at level 3000 (${l3})`, ok: l3 >= 3 && l3 <= 4 },
              { label: over.length ? `At most 3 per area (too many in ${over.join(', ')})` : 'At most 3 courses in any one area', ok: !over.length },
            ];
          },
        },
      ],
    },
  ];

  const TOTAL_UNITS = 160;
  const UE_UNITS = 40;
  const RANK = { completed: 0, active: 1, planned: 2 };

  function allGroups() { return sections.flatMap((s) => s.groups.map((g) => ({ ...g, section: s.id }))); }

  /** Which requirement groups (and focus areas) a course code could count towards. */
  function groupsFor(code) {
    const out = [];
    for (const g of allGroups()) {
      if (g.type === 'slots' ? g.slots.some((s) => s.codes.includes(code)) : g.match(code)) out.push(g.id);
    }
    return out;
  }
  function focusFor(code) { return Object.keys(FOCUS).filter((a) => FOCUS[a].includes(code)); }

  /**
   * Allocate the student's courses to requirements.
   * modules: [{ code, status, credits, req? }], lookup(code) -> catalogue entry or undefined.
   */
  function evaluate(modules, lookup) {
    const byCode = new Map();
    for (const m of modules) {
      const code = String(m.code || '').trim().toUpperCase();
      if (!code) continue;
      const prev = byCode.get(code);
      if (prev && RANK[prev.status] <= RANK[m.status]) continue;
      const info = lookup(code);
      byCode.set(code, { code, status: m.status, units: info ? +info.u || 0 : +m.credits || 0, title: info ? info.t : m.name, req: m.req || '', known: !!info });
    }
    const courses = [...byCode.values()].sort((a, b) => RANK[a.status] - RANK[b.status] || a.code.localeCompare(b.code));
    const used = new Set();
    const groups = allGroups();
    const res = Object.fromEntries(groups.map((g) => [g.id, { group: g, list: [], slots: g.type === 'slots' ? g.slots.map((s) => ({ ...s, course: null })) : null }]));
    const required = (g) => (g.type === 'slots' ? (g.choose || g.slots.length) : null);

    const place = (r, c) => {
      const g = r.group;
      if (g.type === 'slots') {
        const filled = r.slots.filter((s) => s.course).length;
        if (filled >= required(g)) return false;
        const s = r.slots.find((s) => !s.course && s.codes.includes(c.code)) || (c.req === g.id ? r.slots.find((s) => !s.course) : null);
        if (!s) return false;
        s.course = c;
      } else {
        const units = r.list.reduce((a, x) => a + x.units, 0);
        if (units >= g.units) return false;
      }
      r.list.push(c);
      used.add(c.code);
      return true;
    };

    // 1. Manual overrides ("Counts towards" in the module dialog).
    for (const c of courses) {
      if (c.req === 'ue') used.add(c.code);
      else if (c.req && res[c.req]) place(res[c.req], c);
    }
    // 2. Specific course lists first, then the open pools.
    const order = [...groups.filter((g) => g.type === 'slots'), ...groups.filter((g) => g.type === 'pool')];
    for (const g of order) {
      for (const c of courses) {
        if (used.has(c.code)) continue;
        // Open pools only take real NUS course codes; anything else falls through to electives.
        if (g.type === 'slots' ? g.slots.some((s) => s.codes.includes(c.code)) : c.known && g.match(c.code)) place(res[g.id], c);
      }
    }

    const sumBy = (list) => {
      const o = { completed: 0, active: 0, planned: 0 };
      list.forEach((c) => { o[c.status] += c.units; });
      return o;
    };
    const finalise = (r) => {
      const g = r.group;
      const units = sumBy(r.list);
      let progress;
      if (g.type === 'slots') {
        const n = required(g);
        const done = r.slots.filter((s) => s.course && s.course.status === 'completed').length;
        const any = r.slots.filter((s) => s.course).length;
        progress = { done: Math.min(done, n), any: Math.min(any, n), of: n, unit: 'courses' };
      } else {
        progress = { done: Math.min(units.completed, g.units), any: Math.min(units.completed + units.active + units.planned, g.units), of: g.units, unit: 'units' };
      }
      const checksDone = g.checks ? g.checks(r.list.filter((c) => c.status === 'completed'), courses.filter((c) => c.status === 'completed')) : [];
      const checksAll = g.checks ? g.checks(r.list, courses) : [];
      const checks = checksAll.map((ch, i) => ({ label: ch.label, state: checksDone[i].ok ? 'done' : ch.ok ? 'planned' : 'missing' }));
      const complete = progress.done >= progress.of && checks.every((c) => c.state === 'done');
      const onTrack = progress.any >= progress.of && checks.every((c) => c.state !== 'missing');
      return { ...r, units, progress, checks, complete, onTrack };
    };

    const out = sections.map((s) => {
      const gs = s.groups.map((g) => finalise(res[g.id]));
      return { ...s, groups: gs, units: s.units, got: sumBy(gs.flatMap((g) => g.list)) };
    });
    const leftovers = courses.filter((c) => !used.has(c.code) || c.req === 'ue');
    const mgmt = out.find((s) => s.id === 'mgmt').got;
    const ueGot = sumBy(leftovers);
    const total = sumBy(courses);

    return {
      sections: out,
      electives: { list: leftovers, got: ueGot, units: UE_UNITS, withMgmt: { completed: ueGot.completed + mgmt.completed, active: ueGot.active + mgmt.active, planned: ueGot.planned + mgmt.planned } },
      total, totalUnits: TOTAL_UNITS,
      focus: Object.entries(FOCUS).map(([area, prim]) => ({ area, primaries: prim.map((code) => ({ code, course: byCode.get(code) || null })) })),
    };
  }

  return { sections, allGroups, groupsFor, focusFor, evaluate, FOCUS, BIZ_AREAS, level, prefix, TOTAL_UNITS, UE_UNITS };
})();
