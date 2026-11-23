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

  // the course's place among everyone who took the exam (KU Loket's "situering": groups A to E)
  function rankHtml(c) {
    if (!c.rk || !c.rk.length) return '';
    const all = c.rk.reduce((a, k) => a + k[3], 0);
    let above = 0, mine = null;
    for (const k of c.rk) { if (k[5]) { mine = k; break; } above += k[4]; }
    const max = Math.max(...c.rk.map((k) => k[4]), 1);
    const bars = c.rk.map((k) => `<div class="rk${k[5] ? ' me' : ''}"><span class="rk-c">${esc(k[0])}</span><span class="rk-bar"><i style="width:${Math.max(3, (k[4] / max) * 100).toFixed(1)}%"></i></span><span class="rk-v">${esc(nl(k[1]))}–${esc(nl(k[2]))}<small>${esc(nl(k[4]))}%</small></span></div>`).join('');
    const line = mine ? `Je zit in groep <b>${esc(mine[0])}</b>${above + mine[4] <= 50 ? `: bij de beste ${esc(nl(above + mine[4], 0))}%` : ''} van ${all} studenten.` : `${all} studenten legden dit examen af.`;
    return `<div class="rk-box"><p class="rk-line">${line}</p>${bars}</div>`;
  }
  function resultRow(c, key, open, current) {
    const n = scoreOf(c);
    const word = RESULT_WORD[String(c.r || '').toUpperCase()] || '';
    const failed = /niet geslaagd/i.test(c.st);
    const pill = current && !c.r ? '<span class="cap blue">Bezig</span>'
      : n != null ? `<span class="score" style="--sc:${failed ? '#ff3b30' : scoreCol(n)}">${esc(nl(n))}<small>/20</small></span>`
        : `<span class="cap${failed ? ' red' : ''}">${esc(c.r || c.st || '—')}</span>`;
    const sub = [c.code, spTxt(c.sp), c.n > 1 ? `${c.n}e keer` : '', c.tol ? 'tolerantie' : ''].filter(Boolean).join(' · ');
    const canOpen = !current || c.r;
    const det = open ? `<div class="res-d">${[c.d ? `Bekendgemaakt op ${esc(dNice(c.d))}` : '', c.st ? esc(c.st) + (word && word !== c.st ? ` (${esc(word)})` : '') : ''].filter(Boolean).join(' · ')}${rankHtml(c)}</div>` : '';
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
    const graded = s.years.map((y) => ({ y: y.y, a: yearAvg(y), n: y.c.filter((c) => scoreOf(c) != null).length })).filter((x) => x.a != null).reverse();
    if (graded.length) {
      let A = 0, W = 0;
      s.years.forEach((y) => y.c.forEach((c) => { const n = scoreOf(c); if (n != null && c.sp) { A += n * c.sp; W += c.sp; } }));
      const lo = 8, hi = 20;
      const bars = graded.map((g) => `<div class="vb"><span class="vb-v">${esc(nl(g.a, 1))}</span><span class="vb-bar"><i style="height:${Math.max(6, ((g.a - lo) / (hi - lo)) * 100).toFixed(1)}%;background:${scoreCol(g.a)}"></i></span><span class="vb-l">${esc(acyS(g.y))}</span></div>`).join('');
      h += card('Gemiddelde per academiejaar', `<div class="vbars">${bars}</div><p class="card-note">Gewogen naar studiepunten, op 20. Over alles samen: <b>${esc(nl(A / W, 2))}</b>.</p>`);
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
        return row({ href: c.url || undefined, iconHtml: `<span class="ic soft" style="--c:${col}">${c.st === 'ok' ? ico('check') : ico('book')}</span>`, title: c.t, sub, external: !!c.url, cls: c.st === 'ok' ? 'done' : '',
          end: c.st === 'now' ? '<span class="cap blue">Dit jaar</span>' : '<span class="cap green">Verworven</span>' });
      }).join('');
      h += `<div class="group">${rows}${others ? `<div class="row plain-note"><span class="main"><span class="s">Nog ${others} andere keuzemogelijkhe${others === 1 ? 'id' : 'den'} in deze groep</span></span></div>` : ''}</div>`;
    });
    h += `<p style="margin:22px 16px 0;text-align:center"><a class="btn ghost" href="https://www.kuleuven.be/kuloket/zr_0442?sap-language=NL">${ico('pencil')}ISP aanpassen in KU Loket</a></p>`;
    h += `<p class="fresh">${meta || ''}</p>`;
    return h;
  }
