  /* ================================================================== study progress + ISP pages (portal) */
  // Pure renderers: they take the data read from KU Loket (see studyData / ispData in loket.js) and return HTML.
  const nl = (n, d = 1) => { if (n == null || !Number.isFinite(n)) return ''; const s = n.toFixed(d).replace('.', ','); return d ? s.replace(/,0+$/, '') : s; };
  const spTxt = (n) => `${nl(n, 1)} sp`;
  const acy = (y) => { const n = Number(y); return n ? `${n}–${n + 1}` : String(y || ''); };
  const acyS = (y) => { const n = Number(y); return n ? `${String(n).slice(2)}–${String(n + 1).slice(2)}` : String(y || ''); };
  const scoreOf = (c) => { const n = parseFloat(String(c.r || '').replace(',', '.')); return /^\d+([.,]\d+)?$/.test(String(c.r || '')) && (!c.sc || /20$/.test(c.sc)) ? n : null; };
  const scoreCol = (n) => (n == null ? 'var(--sub)' : n >= 16 ? '#30b955' : n >= 14 ? '#0fa5a5' : n >= 12 ? '#0a84ff' : n >= 10 ? '#ff9500' : '#ff3b30');
  const dNice = (s) => { const t = s ? fromYmd(s) : 0; return t ? `${new Date(t).getDate()} ${MONTHS_S[new Date(t).getMonth()]} ${new Date(t).getFullYear()}` : ''; };
  const RESULT_WORD = { NA: 'Niet afgelegd', NI: 'Niet ingeschreven', VR: 'Vrijstelling', VZ: 'Vrijstelling', GR: 'Geslaagd', ND: 'Niet deelgenomen', GO: 'Gewettigd afwezig', TO: 'Tolerantie' };
  const shortProg = (n) => String(n || '').replace(/\s*\((Leuven|Brussel|Kortrijk|Gent|Antwerpen|Kulak)[^)]*\)\s*$/i, '').trim();

  // ring chart: segments [{v, c}] of a total, with something in the middle
  function ringSvg(segs, total, { size = 112, w = 12, mid = '', track = 'var(--fill)' } = {}) {
    const r = (size - w) / 2, C = 2 * Math.PI * r;
    let off = 0;
    const sum = total || segs.reduce((a, s) => a + s.v, 0) || 1;
    const arcs = segs.filter((s) => s.v > 0).map((s) => {
      const len = Math.max(0, (s.v / sum) * C - (segs.length > 1 ? 2 : 0));
      const a = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.c}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      off += (s.v / sum) * C;
      return a;
    }).join('');
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${w}"/>${arcs}</svg><div class="ring-mid">${mid}</div></div>`;
  }
  // horizontal stacked bar with a legend underneath
  function stackHtml(segs) {
    const sum = segs.reduce((a, s) => a + s.v, 0) || 1;
    return `<div class="stack">${segs.filter((s) => s.v > 0).map((s) => `<i style="flex:${s.v};background:${s.c}"></i>`).join('')}</div>`
      + `<div class="legend">${segs.map((s) => `<span><i style="background:${s.c}"></i>${esc(s.label)} <b>${esc(spTxt(s.v))}</b></span>`).join('')}</div>`
      + (sum ? '' : '');
  }
  const card = (title, body, right) => `<div class="card">${title ? `<div class="card-h"><b>${esc(title)}</b>${right || ''}</div>` : ''}${body}</div>`;

  const ST_COL = (k) => (/^(behaald|verworven)/i.test(k) ? '#30b955' : /^getolereerd/i.test(k) ? '#ff9500' : /^opgenomen/i.test(k) ? 'var(--accent)' : 'var(--fill2)');
  function creditsOf(s) {
    const pick = (list, re) => (list || []).filter(([k]) => re.test(k)).reduce((a, [, v]) => a + v, 0);
    const list = s.now && s.now.length ? s.now : s.prog;
    const earned = pick(list, /^(behaald|verworven|getolereerd)/i);
    const taking = pick(list, /^opgenomen/i);
    const failed = s.active ? pick(s.prog, /^niet (behaald|verworven)/i) : 0;
    const total = s.total || 0;
    return { list, earned, taking, failed, total, rest: total ? Math.max(0, total - earned - taking) : 0 };
  }
  function yearAvg(y) {
    let a = 0, w = 0;
    y.c.forEach((c) => { const n = scoreOf(c); if (n != null && c.sp) { a += n * c.sp; w += c.sp; } });
    return w ? a / w : null;
  }

  // KU Loket's "situering": the students who passed this course (in the last few years) split into groups A (best) to E,
  // with each group's score range, head count and share. Everything here is read from those groups; "better" is an estimate.
  function rankStats(c) {
    const rk = c.rk || [];
    if (!rk.length) return null;
    const all = rk.reduce((a, k) => a + k[3], 0);
    const tot = rk.reduce((a, k) => a + k[4], 0) || 100;
    const pc = (k) => (k[4] / tot) * 100;
    const i = rk.findIndex((k) => k[5]);
    const mine = i >= 0 ? rk[i] : null;
    let above = 0, aboveN = 0;
    for (let j = 0; j < (mine ? i : 0); j++) { above += pc(rk[j]); aboveN += rk[j][3]; }
    let better = null;
    if (mine) {
      const n = scoreOf(c), lo = mine[1], hi = Math.floor(mine[2] + 0.05) + 1;
      const f = n != null && hi > lo ? Math.min(1, Math.max(0, (n - lo + 0.5) / (hi - lo))) : 0.5;
      better = Math.max(0, 100 - above - pc(mine)) + pc(mine) * f;
    }
    let cum = 0, med = null;
    for (const k of rk) { cum += pc(k); if (cum >= 50) { med = k; break; } }
    return { rk, all, pc, mine, top: mine ? above + pc(mine) : null, from: aboveN + 1, to: aboveN + (mine ? mine[3] : 0), better, med };
  }
  const rangeTxt = (k) => `${nl(k[1])}–${nl(k[2])}`;
  const grpCol = (k) => scoreCol(k[1] >= 10 ? k[1] + 0.5 : k[1]);
  function findResult(S, key) {
    const [sid, yy, code] = String(key || '').split(':');
    for (const s of S || []) {
      if (s.id !== sid) continue;
      for (const y of s.years) if (y.y === yy) { const c = y.c.find((x) => x.code === code); if (c) return { s, y, c }; }
    }
    return null;
  }
  // the page you get when you tap a course with a score
  function resultHtml(S, key) {
    const f = findResult(S, key);
    if (!f) return '';
    const { s, y, c } = f;
    const n = scoreOf(c), st = rankStats(c);
    const failed = /niet geslaagd/i.test(c.st) || (n != null && n < 10);
    const col = failed ? '#ff3b30' : scoreCol(n);
    let h = `<div class="lt"><h1${c.t.length > 26 ? ' class="long"' : ''}>${esc(c.t)}</h1></div>`;
    // hero: your score and, if KU Loket has one, your place
    const mid = st && st.better != null ? `<b>${esc(nl(st.better, 0))}<small style="font-size:15px;margin:0">%</small></b><small>scoorde<br>lager</small>` : `<b>${esc(nl(n))}</b><small>op 20</small>`;
    const ringV = st && st.better != null ? st.better : (n || 0) * 5;
    h += `<div class="st-hero res-hero" style="--rc:${col}"><div class="st-top"><span class="hero-lbl"><i style="background:${col}"></i>${st && st.mine ? `Groep ${esc(st.mine[0])}` : failed ? 'Niet geslaagd' : 'Resultaat'}</span><span class="hero-cd">${esc(acy(y.y))}</span></div>
      <div class="st-row">${ringSvg([{ v: ringV, c: col }], 100, { mid, track: 'rgba(255,255,255,.2)' })}
      <div class="st-kpis">${st && st.better != null ? `<div class="kpi"><b>${esc(nl(n))}<small>/20</small></b><span>jouw score</span></div>` : ''}
      ${st && st.mine ? `<div class="kpi"><b>${st.from === st.to ? st.from : `${st.from}–${st.to}`}</b><span>plaats van ${st.all} geslaagden</span></div>` : st ? `<div class="kpi"><b>${st.all}</b><span>studenten slaagden</span></div>` : ''}
      ${!st || st.better == null ? `<div class="kpi"><b>${esc(nl(c.sp, 0))}<small> sp</small></b><span>${failed ? 'nog niet verworven' : 'verworven'}</span></div>` : ''}</div></div></div>`;
    if (st) {
      const asc = st.rk.slice().reverse(); // E (lowest) left, A (best) right
      // where you are on one line, every group as wide as its share of students
      const strip = `<div class="pos${st.better != null ? ' has-me' : ''}"><div class="pos-bar">${asc.map((k) => `<i class="${k[5] ? 'me' : ''}" style="flex:${Math.max(0.5, st.pc(k)).toFixed(2)};--g:${grpCol(k)}"><span>${esc(k[0])}</span></i>`).join('')}</div>
        ${st.better != null ? `<div class="pos-me" style="left:${Math.min(98, Math.max(2, st.better)).toFixed(1)}%"><b style="transform:translateX(-${Math.min(90, Math.max(10, st.better)).toFixed(0)}%)">Jij · ${esc(nl(n))}</b></div>` : ''}
        <div class="pos-ax"><span>lager</span><span>hoger</span></div></div>`;
      const line = st.mine
        ? (st.top <= 50 ? `Je hoort bij de beste <b>${esc(nl(Math.ceil(st.top), 0))}%</b> van wie slaagde.` : `Ongeveer <b>${esc(nl(st.better, 0))}%</b> van wie slaagde, scoorde lager dan jij.`)
        : failed ? 'Je score telt hier niet mee: KU Loket vergelijkt alleen met studenten die slaagden.' : 'KU Loket gaf je voor dit vak geen groep.';
      h += card('Waar sta je', `<p class="pos-line">${line}</p>${strip}`);
      // the groups as a bar chart
      const mx = Math.max(...st.rk.map((k) => k[3]), 1);
      h += card('Verdeling', `<div class="vbars rk-hist">${asc.map((k) => `<div class="vb${k[5] ? ' me' : ''}"><span class="vb-v">${esc(nl(st.pc(k), 0))}%</span><span class="vb-bar"><i style="height:${Math.max(5, (k[3] / mx) * 100).toFixed(1)}%;background:${k[5] ? col : 'var(--ter)'}"></i></span><span class="vb-l"><b>${esc(k[0])}</b>${esc(rangeTxt(k))}</span></div>`).join('')}</div>
        <p class="card-note">${st.all} geslaagde studenten${c.sy > 1 ? ` over de laatste ${c.sy} academiejaren` : ''}, per groep met hun scores op 20.</p>`, st.mine ? `<span>jij: groep ${esc(st.mine[0])}</span>` : '');
    }
    // compared with...
    const cmp = [];
    const dif = (a) => { const d = Math.round((n - a) * 10) / 10; return d === 0 ? '<span class="cmp-d">gelijk</span>' : `<span class="cmp-d ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : '−'}${esc(nl(Math.abs(d)))}</span>`; };
    if (st && st.med) cmp.push(['Middelste geslaagde student', `groep ${st.med[0]} · ${rangeTxt(st.med)}`, n != null ? (n > st.med[2] ? '<span class="cmp-d up">hoger</span>' : n < st.med[1] ? '<span class="cmp-d down">lager</span>' : '<span class="cmp-d">gelijk</span>') : '']);
    const ya = yearAvg(y);
    if (ya != null && n != null) cmp.push([`Je gemiddelde in ${acy(y.y)}`, nl(ya, 1), dif(ya)]);
    let A = 0, W = 0;
    s.years.forEach((yr) => yr.c.forEach((x) => { const v = scoreOf(x); if (v != null && x.sp) { A += v * x.sp; W += x.sp; } }));
    if (W && n != null && s.years.length > 1) cmp.push([`Je gemiddelde in ${/^master/i.test(s.name) ? 'je master' : /^bachelor/i.test(s.name) ? 'je bachelor' : 'deze opleiding'}`, nl(A / W, 1), dif(A / W)]);
    if (cmp.length) h += `<div class="gh">Vergeleken met</div><div class="group">${cmp.map(([a, b, d]) => `<div class="row kv"><span class="main"><span class="t">${esc(a)}</span><span class="s">${esc(b)}</span></span><span class="end">${d}</span></div>`).join('')}</div>`;
    // the facts
    const word = RESULT_WORD[String(c.r || '').toUpperCase()] || '';
    const facts = [['Status', c.st + (word && word !== c.st ? ` (${word})` : '')], ['Bekendgemaakt', dNice(c.d)], ['Studiepunten', spTxt(c.sp)], ['Poging', c.n > 1 ? `${c.n}e keer` : 'Eerste keer'], ['Tolerantie', c.tol ? 'Ja' : ''], ['Code', c.code]].filter((x) => x[1]);
    h += `<div class="gh">Details</div><div class="group">${facts.map(([a, b]) => `<div class="row kv"><span class="main"><span class="t">${esc(a)}</span></span><span class="end"><span class="kv-v">${esc(b)}</span></span></div>`).join('')}</div>`;
    h += `<p class="fresh">${st ? 'Groepen, aantallen en percentages komen uit KU Loket. Wie niet slaagde, telt daarin niet mee. "Lager dan jij" is een schatting binnen je groep.' : 'KU Loket toont voor dit vak geen vergelijking met andere studenten.'}</p>`;
    return h;
  }
  function resultRow(c, key, open, current) {
    const n = scoreOf(c);
    const word = RESULT_WORD[String(c.r || '').toUpperCase()] || '';
    const failed = /niet geslaagd/i.test(c.st);
    const pill = current && !c.r ? '<span class="cap blue">Bezig</span>'
      : n != null ? `<span class="score" style="--sc:${failed ? '#ff3b30' : scoreCol(n)}">${esc(nl(n))}<small>/20</small></span>`
        : `<span class="cap${failed ? ' red' : ''}">${esc(c.r || c.st || '—')}</span>`;
    const sub = [c.code, spTxt(c.sp), c.n > 1 ? `${c.n}e keer` : '', c.tol ? 'tolerantie' : '', c.sit && n != null ? `groep ${c.sit}` : ''].filter(Boolean).join(' · ');
    // a score opens its own page with the statistics; anything else (exemption, not taken...) folds open in place
    if (n != null) return `<div class="res"><a class="row${failed ? ' failed' : ''}" href="#resultaat/${encodeURIComponent(key)}"><span class="main"><span class="t">${esc(c.t)}</span><span class="s">${esc(sub)}</span></span><span class="end">${pill}${CHEV}</span></a></div>`;
    const canOpen = !current || c.r;
    const det = open ? `<div class="res-d">${[c.d ? `Bekendgemaakt op ${esc(dNice(c.d))}` : '', c.st ? esc(c.st) + (word && word !== c.st ? ` (${esc(word)})` : '') : ''].filter(Boolean).join(' · ')}</div>` : '';
    return `<div class="res${open ? ' open' : ''}"${canOpen ? ` data-act="resopen" data-k="${esc(key)}" role="button"` : ''}><div class="row${failed ? ' failed' : ''}"><span class="main"><span class="t">${esc(c.t)}</span><span class="s">${esc(sub)}</span></span><span class="end">${pill}</span></div>${det}</div>`;
  }

  function studyHtml(S, sel, open, meta) {
    if (!S || !S.length) return '';
    const s = S[Math.min(sel, S.length - 1)];
    const cr = creditsOf(s);
    let h = '';
    if (S.length > 1) h += segHtml(S.map((x, i) => ({ id: String(i), label: /^master/i.test(x.name) ? 'Master' : /^bachelor/i.test(x.name) ? 'Bachelor' : shortProg(x.name).split(' ')[0] })), String(sel), 'stsel');
    // hero: credits ring + diploma percentage
    const ringSegs = [{ v: cr.earned, c: '#4cd964' }, { v: cr.taking, c: '#7fc1ff' }];
    const mid = cr.total ? `<b>${esc(nl(cr.earned, 0))}</b><small>van ${esc(nl(cr.total, 0))} sp</small>` : `<b>${esc(nl(cr.earned, 0))}</b><small>sp verworven</small>`;
    h += `<div class="st-hero"><div class="st-top"><span class="hero-lbl"><i></i>${s.done ? 'Diploma behaald' : s.active ? 'Bezig' : 'Vorige opleiding'}</span>${s.done && s.doneYear ? `<span class="hero-cd">${esc(acy(s.doneYear))}</span>` : ''}</div>
      <div class="st-name">${esc(shortProg(s.name))}</div>
      <div class="st-row">${ringSvg(ringSegs, cr.total || cr.earned + cr.taking, { mid, track: 'rgba(255,255,255,.2)' })}
        <div class="st-kpis">${s.pct != null ? `<div class="kpi"><b>${esc(nl(s.pct, 2))}<small>%</small></b><span>Diplomapercentage</span></div>` : ''}
        ${cr.total ? `<div class="kpi"><b>${esc(nl(Math.round(((cr.earned) / cr.total) * 100), 0))}<small>%</small></b><span>van je opleiding verworven</span></div>` : ''}</div></div></div>`;
    // credits
    const LBL = { behaald: 'Verworven', opgenomen: s.active ? 'Dit jaar opgenomen' : 'Opgenomen' };
    const segs = cr.list.filter(([k]) => !/^niet/i.test(k)).map(([k, v]) => ({ v, c: ST_COL(k), label: LBL[k.toLowerCase()] || k }));
    if (cr.rest) segs.push({ v: cr.rest, c: 'var(--fill2)', label: 'Nog te doen' });
    h += card('Studiepunten', stackHtml(segs) + (cr.failed ? `<p class="card-note">${esc(spTxt(cr.failed))} nog niet verworven uit vorige zittijden.</p>` : ''), cr.total ? `<span>${esc(spTxt(cr.total))}</span>` : '');
    // averages per year
    // every academic year you have results for, across all your studies (so the master continues where the bachelor ended)
    const allYears = {};
    S.forEach((x) => x.years.forEach((y) => { (allYears[y.y] = allYears[y.y] || []).push(...y.c); }));
    const graded = Object.keys(allYears).sort().map((k) => ({ y: k, a: yearAvg({ c: allYears[k] }) })).filter((x) => x.a != null).slice(-6);
    if (graded.length) {
      let A = 0, W = 0;
      s.years.forEach((y) => y.c.forEach((c) => { const n = scoreOf(c); if (n != null && c.sp) { A += n * c.sp; W += c.sp; } }));
      const lo = 8, hi = 20;
      const bars = graded.map((g) => `<div class="vb"><span class="vb-v">${esc(nl(g.a, 1))}</span><span class="vb-bar"><i style="height:${Math.max(6, ((g.a - lo) / (hi - lo)) * 100).toFixed(1)}%;background:${scoreCol(g.a)}"></i></span><span class="vb-l">${esc(acyS(g.y))}</span></div>`).join('');
      h += card('Gemiddelde per academiejaar', `<div class="vbars">${bars}</div><p class="card-note">Gewogen naar studiepunten, op 20${S.length > 1 ? ', over al je opleidingen' : ''}. ${esc(shortProg(s.name))}: <b>${esc(nl(A / W, 2))}</b> gemiddeld.</p>`);
      // spread of your own scores
      const B = [['<10', 0, 10, '#ff3b30'], ['10–11', 10, 12, '#ff9500'], ['12–13', 12, 14, '#0a84ff'], ['14–15', 14, 16, '#0fa5a5'], ['16–17', 16, 18, '#30b955'], ['18–20', 18, 21, '#30b955']];
      const cnt = B.map((b) => s.years.reduce((a, y) => a + y.c.filter((c) => { const n = scoreOf(c); return n != null && n >= b[1] && n < b[2]; }).length, 0));
      const mx = Math.max(...cnt, 1);
      h += card('Je scores', `<div class="vbars hist">${B.map((b, i) => `<div class="vb"><span class="vb-v">${cnt[i] || ''}</span><span class="vb-bar"><i style="height:${cnt[i] ? Math.max(8, (cnt[i] / mx) * 100).toFixed(1) : 0}%;background:${b[3]}"></i></span><span class="vb-l">${b[0]}</span></div>`).join('')}</div>`);
    }
    // results per year
    s.years.forEach((y) => {
      const cur = y.c.every((c) => !c.r);
      const avg = yearAvg(y);
      const sp = y.c.reduce((a, c) => a + c.sp, 0);
      h += `<div class="gh">${esc(acy(y.y))}${cur ? ' · dit jaar' : ''}<span>${esc(spTxt(sp))}${avg != null ? ` · gem. ${esc(nl(avg, 1))}` : ''}</span></div>`;
      const list = y.c.slice().sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1) || a.t.localeCompare(b.t));
      h += `<div class="group">${(cur ? y.c : list).map((c) => { const k = `${s.id}:${y.y}:${c.code}`; return resultRow(c, k, !!open[k], cur); }).join('')}</div>`;
    });
    h += `<p class="fresh">${meta || ''}<br><a href="https://www.kuleuven.be/kuloket/zr_1017?sap-language=NL">Open het studievoortgangsdossier in KU Loket</a></p>`;
    return h;
  }

  const PER = { '001': 'jaarvak', '002': '1e semester', '003': '2e semester' };
  const GCOL = ['#0a84ff', '#8e5bd8', '#ff9500', '#30b955', '#d6409f', '#0fa5a5'];
  function ispHtml(I, S, meta) {
    if (!I) return '';
    const byId = {};
    I.groups.forEach((g) => { byId[g.id] = g; });
    const topOf = (id) => { let g = byId[id], guard = 0; while (g && g.l > 1 && byId[g.p] && guard++ < 10) g = byId[g.p]; return g; };
    const tops = I.groups.filter((g) => g.l === 1);
    const ok = I.courses.filter((c) => c.st === 'ok'), now = I.courses.filter((c) => c.st === 'now');
    const sum = (l) => l.reduce((a, c) => a + c.sp, 0);
    const st = (S || []).find((x) => shortProg(x.name) === shortProg(I.name)) || (S || []).find((x) => x.active);
    const total = (st && st.total) || 0;
    const earned = sum(ok), taking = sum(now), rest = total ? Math.max(0, total - earned - taking) : 0;
    let h = `<div class="st-hero isp"><div class="st-top"><span class="hero-lbl"><i></i>ISP ${esc(acy(I.yr))}</span></div><div class="st-name">${esc(shortProg(I.name))}</div>${I.spec ? `<div class="st-spec">${esc(I.spec)}</div>` : ''}
      <div class="st-row">${ringSvg([{ v: earned, c: '#4cd964' }, { v: taking, c: '#7fc1ff' }], total || earned + taking, { mid: `<b>${esc(nl(taking, 0))}</b><small>sp dit jaar</small>`, track: 'rgba(255,255,255,.2)' })}
      <div class="st-kpis"><div class="kpi"><b>${esc(nl(earned, 0))}<small> sp</small></b><span>al verworven</span></div>${total ? `<div class="kpi"><b>${esc(nl(rest, 0))}<small> sp</small></b><span>nog te kiezen</span></div>` : `<div class="kpi"><b>${now.length}</b><span>vakken dit jaar</span></div>`}</div></div></div>`;
    // this year by period
    let [s1, s2, yy] = I.sem;
    if (!s1 && !s2 && !yy) { s1 = sum(now.filter((c) => c.per === '002')); s2 = sum(now.filter((c) => c.per === '003')); yy = sum(now.filter((c) => c.per === '001')); }
    h += card(`Dit jaar · ${acy(I.yr)}`, stackHtml([{ v: s1, c: '#0a84ff', label: '1e semester' }, { v: s2, c: '#8e5bd8', label: '2e semester' }, { v: yy, c: '#ff9500', label: 'Jaarvak' }]), `<span>${esc(spTxt(taking))}</span>`);
    // per part of the programme
    tops.forEach((g, gi) => {
      const mine = I.courses.filter((c) => { const t = topOf(c.g); return t && t.id === g.id; });
      const others = Object.entries(I.other).filter(([id]) => { const t = topOf(id); return t && t.id === g.id; }).reduce((a, [, n]) => a + n, 0);
      if (!mine.length && !others) return;
      const col = GCOL[gi % GCOL.length];
      const o = sum(mine.filter((c) => c.st === 'ok')), n = sum(mine.filter((c) => c.st === 'now'));
      h += `<div class="gh">${esc(g.t)}<span>${[o ? `${spTxt(o)} verworven` : '', n ? `${spTxt(n)} dit jaar` : ''].filter(Boolean).map(esc).join(' · ')}</span></div>`;
      const rows = mine.slice().sort((a, b) => (a.st === 'now' ? 0 : 1) - (b.st === 'now' ? 0 : 1) || (a.per || '').localeCompare(b.per || '') || a.t.localeCompare(b.t)).map((c) => {
        const sg = byId[c.g] && byId[c.g].l > 1 ? byId[c.g].t.replace(/^(Major|Minor|Electives)\s*[:-]\s*/i, '') : '';
        const sub = [c.code, spTxt(c.sp), c.st === 'now' ? PER[c.per] || '' : c.yr ? acy(c.yr) : '', sg && sg.length < 40 ? sg : ''].filter(Boolean).join(' · ');
        return row({ href: c.url || undefined, iconHtml: `<span class="ic soft" style="--c:${col}">${c.st === 'ok' ? ico('check') : ico('book')}</span>`, title: c.t, sub, chevron: false, cls: c.st === 'ok' ? 'done' : '',
          end: c.st === 'now' ? '<span class="cap blue">Dit jaar</span>' : '<span class="cap green">Verworven</span>' });
      }).join('');
      h += `<div class="group">${rows}${others ? `<div class="row plain-note"><span class="main"><span class="s">Nog ${others} andere keuzemogelijkhe${others === 1 ? 'id' : 'den'} in deze groep</span></span></div>` : ''}</div>`;
    });
    h += `<p style="margin:22px 16px 0;text-align:center"><a class="btn ghost" href="https://www.kuleuven.be/kuloket/zr_0442?sap-language=NL">${ico('pencil')}ISP aanpassen in KU Loket</a></p>`;
    h += `<p class="fresh">${meta || ''}</p>`;
    return h;
  }
