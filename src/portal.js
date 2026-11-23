  /* ================================================================== portal app (toledo.kuleuven.be/portal/) */
  function portalApp() {
    takeover('Toledo', [ULTRA, new URL(JOURNEY).origin, LOKET_ORIGIN]);
    // the course pages say when Blackboard last answered (?ub=): while that session is surely still alive,
    // course links go straight to the course instead of through Toledo's link service (one redirect less)
    { const ub = Number(params.get('ub')) || 0; if (ub > 0 && ub * 1e3 <= Date.now() + 60e3) store.set('p:ultraok', ub * 1e3); }
    const cv = (k) => { const c = store.get(k); return c ? c.v : null; };
    const P = {
      tab: '', seg: 'lessen', filter: 'alles', search: '', showComm: false, showOff: false, feedN: 50,
      weekOff: 0, sel: ymd(Date.now()),
      user: cv('p:user'), enr: cv('p:enr') || [], events: cv('p:events') || [], upcoming: cv('p:upcoming') || [],
      links: cv('p:links') || [], mail: cv('p:mail'), agenda: store.get('p:agenda'),
      lu2pk: store.get('p:lu2pk') || {}, seen: store.get('p:seen') || Date.now() - 2 * 864e5,
      err: {}, ag: '', loadedAt: 0, authFail: false,
      study: store.get('p:study'), stSel: 0, stOpen: {}, done: store.get('p:done') || {},
    };
    // the course pages report which assignments you already handed in (?done=pk~contentId~…!pk~…)
    {
      const dn = params.get('done');
      if (dn != null) {
        String(dn).split('!').forEach((part) => {
          const [pk, ...ids] = part.split('~');
          if (/^_\d+_\d+$/.test(pk)) P.done[pk] = ids.filter((x) => /^_\d+_\d+$/.test(x));
        });
        store.set('p:done', P.done);
      }
    }
    // your student number, handed over by the course pages (?rn=r0123456); Toledo itself only gives the login id
    {
      const rn = String(params.get('rn') || '').toLowerCase();
      if (/^r\d{7}$/.test(rn)) store.set('p:rn', rn);
    }
    const isDone = (e) => {
      const u = e.url || '';
      const pk = (/(?:\/courses\/|courseId=)(_\d+_\d+)/.exec(u) || [])[1];
      const cid = (/contentId=(_\d+_\d+)/.exec(u) || [])[1];
      return !!(pk && cid && P.done[pk] && P.done[pk].includes(cid));
    };
    function saveStudy(v) {
      if (!v || (!v.study && !v.isp)) return;
      const old = (P.study && P.study.v) || {};
      P.study = { ts: Date.now(), v: { study: v.study || old.study || null, isp: v.isp || old.isp || null } };
      store.set('p:study', P.study);
    }

    function saveAgenda(v) {
      const old = (P.agenda && P.agenda.v) || {};
      const merged = { lessons: v.lessons || old.lessons || [], exams: v.exams || old.exams || [], range: v.lessons ? v.range : old.range || v.range };
      P.agenda = { ts: Date.now(), v: merged };
      store.set('p:agenda', P.agenda);
    }
    // agenda handed over by the KU Loket page (see syncPage)
    const syncM = /[#&]tmsync=([^&]*)/.exec(location.hash);
    if (syncM) {
      try { const v = JSON.parse(decodeURIComponent(syncM[1])); if (v && (v.lessons || v.exams)) saveAgenda(v); if (v) saveStudy(v); } catch (_) {}
    }

    const TABS = [
      { id: 'vandaag', label: 'Vandaag', icon: 'house', href: '#vandaag' },
      { id: 'vakken', label: 'Vakken', icon: 'book', href: '#vakken' },
      { id: 'rooster', label: 'Rooster', icon: 'calendar', href: '#rooster' },
      { id: 'updates', label: 'Updates', icon: 'bell', href: '#updates' },
      { id: 'meer', label: 'Meer', icon: 'grid', href: '#meer' },
    ];
    buildShell(TABS, '');

    /* ---------------- derived data ---------------- */
    let enrIdx = null, enrIdxSrc = null;
    const byLu = () => {
      if (enrIdxSrc !== P.enr) {
        enrIdxSrc = P.enr; enrIdx = { lu: {}, code: {} };
        P.enr.forEach((e) => { enrIdx.lu[e.learningUnitId] = e; const c = luCode(e.learningUnitId) || codeOf(e.title); if (c) enrIdx.code[c.toLowerCase()] = e; });
      }
      return enrIdx;
    };
    function learnPk() {
      let ch = false;
      P.events.forEach((e) => {
        const m = /(?:\/courses\/|courseId=)(_\d+_\d+)/.exec(e.url || '');
        if (m && /^ULTRA-/.test(e.sourceId || '') && P.lu2pk[e.sourceId] !== m[1]) { P.lu2pk[e.sourceId] = m[1]; ch = true; }
      });
      if (ch) store.set('p:lu2pk', P.lu2pk);
    }
    function nextLesson(lu, now = Date.now()) {
      if (!lu) return null;
      return lessons().find((l) => l.lu === lu && l.end > now && l.start - now < 8 * 864e5) || null;
    }
    function nextText(l, now = Date.now()) {
      const room = String(l.room || '').split(' · ')[0];
      if (l.start <= now) return `Nu bezig tot ${hhmm(l.end)}${room ? ' · ' + room : ''}`;
      const d = dayDiff(l.start, now);
      const when = d === 0 ? `vandaag ${hhmm(l.start)}` : d === 1 ? `morgen ${hhmm(l.start)}` : `${DAYS[new Date(l.start).getDay()]} ${hhmm(l.start)}`;
      return `${l.exam ? 'Examen' : 'Les'} ${when}${room ? ' · ' + room : ''}`;
    }
    // Course links go through Toledo's own link service (like the official portal does): it signs you in to
    // Blackboard first when that session has expired and lands on the course, where the app takes over.
    // The part after # (route + context) survives those redirects.
    function courseHref(lu, from, extra, pk0) {
      const e = byLu().lu[lu] || {};
      const pk = pk0 || P.lu2pk[lu];
      const q = new URLSearchParams({ lu: lu || '', t: cleanTitle(e.title || ''), k: String(e.color || ''), f: from || P.tab || 'vakken', th: THEME });
      const nl = nextLesson(lu);
      if (nl) q.set('n', nextText(nl));
      const dl = dlPks();
      if (dl) q.set('dl', dl);
      const route = pk ? `#/c/${pk}${extra || ''}` : `#/vak/${encodeURIComponent(lu)}${extra || ''}`;
      const ultraOk = pk && Date.now() - (Number(store.get('p:ultraok')) || 0) < 45 * 60e3;
      if (/^ULTRA-/.test(lu || '') && !ultraOk) return `${JOURNEY}${encodeURIComponent(lu)}${route}?${q}`;
      return pk ? `${ULTRA}/ultra/courses/${pk}/outline${route}?${q}` : '';
    }
    function lessons() {
      const ag = P.agenda && P.agenda.v;
      const idx = byLu();
      const out = [];
      if (ag && ag.lessons && ag.lessons.length) {
        ag.lessons.forEach((l) => {
          const st = fromYmd(l.d, l.s);
          const en = l.e && l.e !== '00:00' ? fromYmd(l.d, l.e) : st + 2 * 3600e3;
          const e = idx.code[String(l.c || '').toLowerCase()];
          const exam = /^(evaluation|evaluatie|examen|exam)\b\s*:?/i.test(l.t || '');
          let title = String(l.t || '').replace(/^(evaluation|evaluatie|examen|exam)\b\s*:?\s*/i, '');
          if (e && (!title || (title.length >= 26 && cleanTitle(e.title).startsWith(title)))) title = cleanTitle(e.title);
          out.push({ start: st, end: en, title: title || 'Les', lu: e && e.learningUnitId, color: e ? e.color : 0, room: l.r, url: l.u, form: exam ? 'Examen' : l.f, who: exam ? '' : l.p, exam });
        });
      } else {
        (P.upcoming || []).forEach((u) => {
          const loc = u.location || {}, src = u.source || {};
          out.push({ start: u.start, end: u.end, title: u.name || 'Les', lu: src.learningUnitId, color: src.color, room: [loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), url: (loc.url || '').replace(/^http:/, 'https:') });
        });
      }
      return out.sort((a, b) => a.start - b.start);
    }
    function exams() {
      const ag = P.agenda && P.agenda.v;
      const idx = byLu();
      return ((ag && ag.exams) || []).map((x) => {
        const e = idx.code[String(x.c || '').toLowerCase()];
        return { start: fromYmd(x.d, x.s || '00:00'), time: x.s && x.s !== '00:00' ? x.s : '', end: x.e && x.e !== '00:00' ? x.e : '', title: String(x.t || '').replace(/^(evaluation|evaluatie)\s*:\s*/i, '') || (e ? cleanTitle(e.title) : 'Examen'), room: x.r, url: x.u, note: x.x, lu: e && e.learningUnitId, color: e ? e.color : 0 };
      }).sort((a, b) => a.start - b.start);
    }
    const deadlines = (now = Date.now()) => P.events.filter((e) => e.subType === 'due' && !e.dismissed && e.date > now - 3600e3).sort((a, b) => a.date - b.date);
    // courses with a deadline coming up: the course pages check there whether you already handed it in
    const dlPks = () => Array.from(new Set(deadlines().filter((e) => e.date - Date.now() < 21 * 864e5).map((e) => (/(?:\/courses\/|courseId=)(_\d+_\d+)/.exec(e.url || '') || [])[1]).filter(Boolean))).slice(0, 10).join('.');
    const feed = () => P.events.filter((e) => e.subType !== 'due' && !e.dismissed).sort((a, b) => b.date - a.date);
    const newFor = (lu, now = Date.now()) => P.events.filter((e) => e.sourceId === lu && !e.read && !e.dismissed && e.subType !== 'due' && e.date > now - 7 * 864e5).length;

    const EV_ICON = { announcement: 'megaphone', content: 'doc', gradebook: 'chart', due: 'pencil', course: 'book', advalvas: 'inbox', other: 'bell' };
    const EV_LABEL = { announcement: 'Aankondiging', content: 'Nieuw materiaal', gradebook: 'Cijfer', due: 'Deadline', course: 'Vak', advalvas: 'Ad Valvas', other: 'Update' };
    function eventHref(e) {
      const u = e.url || '';
      if (!/^https:\/\/ultra\.edu\.kuleuven\.cloud\//.test(u)) return u;
      const pk = (/(?:\/courses\/|courseId=)(_\d+_\d+)/.exec(u) || [])[1];
      if (!pk) return u;
      const ctid = (/contentId=(_\d+_\d+)/.exec(u) || [])[1];
      const ann = (/announcementId=(_\d+_\d+)/.exec(u) || [])[1];
      let r = '';
      if (e.subType === 'announcement' && ann) r = '/a/' + ann;
      else if (e.subType === 'gradebook') r = '/cijfers';
      else if (ctid) r = '/item/' + ctid;
      const lu = /^ULTRA-/.test(e.sourceId || '') ? e.sourceId : '';
      if (!lu) {
        const q = new URLSearchParams({ t: cleanTitle(e.source || ''), k: String(e.color || ''), f: P.tab || 'updates', th: THEME });
        return `${ULTRA}/ultra/courses/${pk}/outline#/c/${pk}${r}?${q}`;
      }
      return courseHref(lu, P.tab || 'updates', r, pk);
    }
    function markRead(list) {
      const todo = list.filter((e) => e && !e.read);
      if (!todo.length) return;
      todo.forEach((e) => { e.read = true; });
      store.set('p:events', { ts: Date.now(), v: P.events });
      for (let i = 0; i < todo.length; i += 150) {
        const body = todo.slice(i, i + 150).map((e) => ({ id: e.id, type: e.type, subType: e.subType, read: true }));
        fetch(PORTAL_ORIGIN + '/portal/api/batch/events', { method: 'PATCH', credentials: 'include', keepalive: true, headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Toledo-Language': 'nl' }, body: JSON.stringify(body) }).catch(() => {});
      }
    }
    const linkMap = () => {
      const m = {};
      (P.links || []).forEach((g) => (g.links || []).forEach((l) => { if (l.url) m[l.label] = l.url; }));
      return m;
    };

    /* ---------------- rows ---------------- */
    function lessonRow(l, now, from) {
      const live = l.start <= now && l.end > now, past = l.end <= now;
      const href = l.lu ? courseHref(l.lu, from || P.tab) : '';
      const meta = [
        l.room ? (l.url ? `<a href="${esc(l.url)}">${ico('pin')}${esc(l.room)}</a>` : `<span>${esc(l.room)}</span>`) : '',
        l.form ? `<span>${esc(l.form)}</span>` : '',
        l.who ? `<span>${esc(l.who)}</span>` : '',
      ].filter(Boolean).join('');
      return `<div class="lesson${live ? ' now' : ''}${past ? ' past' : ''}${l.exam ? ' exam-l' : ''}"${href ? ` data-href="${esc(href)}" role="link"` : ''} style="${colorVars(l.color)}"><div class="tm"><b>${hhmm(l.start)}</b><span>${hhmm(l.end)}</span></div><div class="bar"></div><div class="main"><div class="t">${l.exam ? '<span class="exam-tag">EXAMEN</span>' : ''}${esc(l.title)}${live ? '<span class="now-tag">NU</span>' : ''}</div>${meta ? `<div class="meta">${meta}</div>` : ''}</div>${href ? `<span class="end">${CHEV}</span>` : ''}</div>`;
    }
    function dueLabel(t, now) {
      const m = Math.round((t - now) / 60e3);
      if (m < 0) return 'verlopen';
      if (m < 60) return `nog ${m} min`;
      const d = dayDiff(t, now);
      if (d === 0) return `vandaag ${hhmm(t)}`;
      if (d === 1) return `morgen ${hhmm(t)}`;
      if (d < 7) return `${DAYS_S[new Date(t).getDay()]} ${hhmm(t)}`;
      return `${new Date(t).getDate()} ${MONTHS_S[new Date(t).getMonth()]}`;
    }
    function dueRow(e, now) {
      const hrs = (e.date - now) / 3600e3;
      const done = isDone(e);
      const tone = done ? 'green' : hrs < 48 ? 'red' : hrs < 120 ? 'orange' : '';
      return row({ href: eventHref(e) || undefined, icon: done ? 'check' : 'pencil', style: colorVars(e.color), title: e.title || 'Deadline', clamp: true, cls: done ? 'done' : '',
        sub: cleanTitle(e.source) + (done ? ` · ${dueLabel(e.date, now)}` : ''), end: `<span class="cap ${tone}">${esc(done ? 'Ingeleverd' : dueLabel(e.date, now))}</span>`, attrs: ` data-ev="${esc(e.id)}"`, chevron: false });
    }
    function eventRow(e, now, timeOnly) {
      const src = e.subType === 'advalvas' ? 'Ad Valvas' : cleanTitle(e.source || '');
      return row({ href: eventHref(e) || undefined, icon: EV_ICON[e.subType] || 'bell', style: colorVars(e.color), title: e.title || EV_LABEL[e.subType] || 'Update', clamp: true,
        sub: e.subType === 'advalvas' ? 'Ad Valvas' : `${src} · ${EV_LABEL[e.subType] || 'Update'}`, end: `<span>${esc(timeOnly ? hhmm(e.date) : shortWhen(e.date, now))}</span>`,
        attrs: ` data-ev="${esc(e.id)}"`, chevron: false, dot: !e.read });
    }
    function examRow(x, now) {
      const d = new Date(x.start);
      const days = dayDiff(x.start, now);
      const tone = days < 0 ? '' : days <= 7 ? 'red' : days <= 21 ? 'orange' : 'blue';
      const when = days < 0 ? 'voorbij' : days === 0 ? 'vandaag' : days === 1 ? 'morgen' : `${days} d`;
      const href = x.lu ? courseHref(x.lu, P.tab) : '';
      const room = x.room ? (x.url ? `<a href="${esc(x.url)}">${ico('pin')}${esc(x.room)}</a>` : esc(x.room)) : '';
      const sub = [x.time ? esc(x.time) : '', room].filter(Boolean).join(' · ');
      return `<div class="exam"${href ? ` data-href="${esc(href)}" role="link"` : ''}${days < 0 ? ' style="opacity:.5"' : ''}><div class="dt"><small>${MONTHS_S[d.getMonth()]}</small><b>${d.getDate()}</b><em>${DAYS_S[d.getDay()]}</em></div><div class="main"><div class="t">${esc(x.title)}</div>${sub ? `<div class="s">${sub}</div>` : ''}${x.note ? `<div class="s">${esc(x.note)}</div>` : ''}</div><span class="end"><span class="cap ${tone}">${when}</span></span></div>`;
    }
    function courseRow(e, from) {
      const off = e.available === false;
      const n = off ? 0 : newFor(e.learningUnitId);
      const sem = { SEMESTER1: 'Semester 1', SEMESTER2: 'Semester 2', YEAR: 'Jaarvak' }[e.semester] || '';
      const nl = off ? null : nextLesson(e.learningUnitId);
      const sub = off ? 'Nog niet beschikbaar' : nl ? nextText(nl) : [codeOf(e.title), sem, e.type === 'community' ? 'Gemeenschap' : ''].filter(Boolean).join(' · ');
      return row({ href: off ? undefined : courseHref(e.learningUnitId, from || 'vakken'), act: off ? 'off' : '',
        iconHtml: `<span class="ic txt" style="${colorVars(e.color)}">${esc(initials(e.title))}</span>`, title: cleanTitle(e.title) || e.title, sub,
        end: n ? `<span class="cap blue">${n} nieuw</span>` : '', cls: off ? 'off' : '', chevron: !off });
    }
    function agendaBanner() {
      if (!P.agenda && P.ag !== 'loading' && P.ag) return `<div class="banner">${ico('calendar')}<span class="main">Je volledige rooster komt uit KU Loket en is nog niet geladen.</span><button type="button" data-act="agsync">Laden</button></div>`;
      const stale = !P.agenda || Date.now() - P.agenda.ts > 3 * 864e5;
      if (P.ag === 'failed' && stale) return `<div class="banner">${ico('warn')}<span class="main">${P.agLogin ? 'KU Loket wil dat je even opnieuw aanmeldt om je rooster bij te werken.' : 'Het lessenrooster kon niet bijgewerkt worden.'}</span><button type="button" data-act="agsync">Bijwerken</button></div>`;
      return '';
    }
    function authBanner() {
      return P.authFail ? `<div class="banner">${ico('lock')}<span class="main">Je bent afgemeld bij Toledo.</span><button type="button" data-act="login">Inloggen</button></div>` : '';
    }

    /* ---------------- views ---------------- */
    const V = {};
    const BUILD = {}, FILL = {}, NAVS = {};

    // ---- Vandaag
    BUILD.vandaag = () => '<div class="lt"><h1>Vandaag</h1><p class="lt-sub" data-k="date"></p></div><div data-k="body"></div>';
    NAVS.vandaag = () => ({ title: 'Vandaag' });
    const updateBanner = () => (P.newVer ? `<div class="banner">${ico('refresh')}<span class="main">Nieuwe versie ${esc(P.newVer)} van Toledo Mobile. Tik op Updaten en daarna op Userscripts in de adresbalk.</span><button type="button" data-act="update">Updaten</button></div>` : '');
    // KU Loket published new exam results (in the last two weeks) that you haven't looked at in the app yet
    function resultsBanner(now) {
      const S = P.study && P.study.v && P.study.v.study;
      const s = S && S.find((x) => x.active);
      if (!s || !s.last || store.get('p:resSeen') === s.last || now - fromYmd(s.last) > 14 * 864e5) return '';
      return `<a class="banner" href="#studie">${ico('sparkle')}<span class="main"><b>Nieuwe examenresultaten</b><br>Bekendgemaakt op ${esc(dLong(fromYmd(s.last)))}.</span><span class="act" style="color:var(--accent);font-weight:600">Bekijk</span></a>`;
    }
    function heroHtml(now) {
      const L = lessons();
      const live = L.find((l) => l.start <= now && l.end > now);
      const next = L.find((l) => l.start > now);
      let l = live || next;
      // exam period: the next exam matters more than a lesson weeks away
      const ex = exams().find((x) => x.start + 4 * 3600e3 > now);
      if (ex && !live && (!l || ex.start <= l.start || (dayDiff(ex.start, now) <= 14 && dayDiff(l.start, now) > 2))) {
        const days = dayDiff(ex.start, now);
        const href = ex.lu ? courseHref(ex.lu, 'vandaag') : '#rooster/examens';
        return `<div class="hero" data-href="${esc(href)}" role="link" style="${colorVars(ex.color)}">
          <div class="hero-top"><span class="hero-lbl"><i></i>${days === 0 ? 'Examen vandaag' : 'Volgend examen'}</span><span class="hero-cd">${esc(days === 0 ? (ex.time ? 'om ' + ex.time : 'vandaag') : days === 1 ? 'morgen' : `nog ${days} dagen`)}</span></div>
          <div class="hero-title">${esc(ex.title)}</div>
          <div class="hero-meta"><span>${ico('calendar')}${esc(cap(dLong(ex.start)))}${ex.time ? ' · ' + esc(ex.time) : ''}</span>${ex.room ? `<span>${ico('pin')}${esc(ex.room)}</span>` : ''}</div>
          <div class="hero-acts">${ex.lu ? `<a class="pri" href="${esc(href)}">${ico('book')}Open vak</a>` : ''}${ex.url ? `<a href="${esc(ex.url)}">${ico('pin')}Lokaal</a>` : ''}<a href="#rooster/examens">${ico('cap')}Alle examens</a></div>
        </div>`;
      }
      if (!l) {
        const known = (P.agenda && P.agenda.v) || P.upcoming.length;
        if (!known && (P.ag === 'loading' || !P.loadedAt)) return '<div class="hero calm"><div class="sk" style="height:14px;width:40%"></div><div class="sk" style="height:24px;width:75%;margin-top:12px"></div><div class="sk" style="height:14px;width:55%;margin-top:10px"></div></div>';
        return `<div class="hero calm" data-href="#rooster" role="link"><div class="hero-top"><span class="hero-lbl"><i></i>Lessen</span></div><div class="hero-title">Geen lessen gepland</div><div class="hero-meta"><span>Bekijk je rooster voor de komende weken.</span></div></div>`;
      }
      const isLive = l === live;
      const dd = dayDiff(l.start, now);
      const lbl = isLive ? (l.exam ? 'Examen bezig' : 'Nu bezig') : l.exam ? 'Examen' : 'Volgende les';
      const left = Math.max(1, Math.round((l.end - now) / 60e3));
      const cd = isLive ? (left < 60 ? `nog ${left} min` : `nog ${Math.floor(left / 60)} u ${left % 60 ? (left % 60) + ' min' : ''}`.trim())
        : dd === 0 ? until(l.start, now) : dd === 1 ? 'morgen' : dd < 7 ? DAYS[new Date(l.start).getDay()] : `${new Date(l.start).getDate()} ${MONTHS_S[new Date(l.start).getMonth()]}`;
      const pct = isLive ? Math.min(100, Math.max(2, ((now - l.start) / (l.end - l.start)) * 100)) : 0;
      const href = l.lu ? courseHref(l.lu, 'vandaag') : '#rooster';
      return `<div class="hero" data-href="${esc(href)}" role="link" style="${colorVars(l.color)}">
        <div class="hero-top"><span class="hero-lbl${isLive ? ' live' : ''}"><i></i>${esc(lbl)}</span><span class="hero-cd">${esc(cd)}</span></div>
        <div class="hero-title">${esc(l.title)}</div>
        <div class="hero-meta"><span>${ico('clock')}${hhmm(l.start)} – ${hhmm(l.end)}</span>${l.room ? `<span>${ico('pin')}${esc(l.room)}</span>` : ''}${l.form ? `<span>${esc(l.form)}</span>` : ''}</div>
        ${isLive ? `<div class="hero-prog"><i style="width:${pct.toFixed(1)}%"></i></div>` : ''}
        <div class="hero-acts">${l.lu ? `<a class="pri" href="${esc(href)}">${ico('book')}Open vak</a>` : ''}${l.url ? `<a href="${esc(l.url)}">${ico('pin')}Lokaal</a>` : ''}<a href="#rooster">${ico('calendar')}Rooster</a></div>
      </div>`;
    }
    function favCourses() {
      const sem = new Date().getMonth();
      const cur = sem >= 7 || sem === 0 ? 'SEMESTER1' : 'SEMESTER2';
      let list = P.enr.filter((e) => e.favorite && e.available !== false);
      if (!list.length) list = P.enr.filter((e) => e.type !== 'community' && e.available !== false && (e.semester === cur || e.semester === 'YEAR'));
      return list.sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title), 'nl'));
    }
    FILL.vandaag = (el) => {
      const now = Date.now();
      const d = new Date(now);
      const greet = d.getHours() < 6 ? 'Goedenacht' : d.getHours() < 12 ? 'Goedemorgen' : d.getHours() < 18 ? 'Goedemiddag' : 'Goedenavond';
      put($('[data-k="date"]', el), esc(`${greet}${P.user && P.user.givenName ? ', ' + P.user.givenName : ''} · ${dLong(now)}`));
      let h = updateBanner() + authBanner() + agendaBanner() + resultsBanner(now) + heroHtml(now);
      // rest of today
      const L = lessons();
      const hero = L.find((l) => l.start <= now && l.end > now) || L.find((l) => l.start > now);
      const today = L.filter((l) => l !== hero && dayDiff(l.start, now) === 0 && l.end > now);
      if (today.length) h += `<div class="sh"><h2>Later vandaag</h2></div><div class="group">${today.map((l) => lessonRow(l, now, 'vandaag')).join('')}</div>`;
      // courses
      const favs = favCourses();
      if (favs.length) {
        h += `<div class="sh"><h2>Mijn vakken</h2><a href="#vakken">Alle</a></div><div class="tiles">${favs.map((e) => {
          const n = newFor(e.learningUnitId, now);
          return `<a class="tile" href="${esc(courseHref(e.learningUnitId, 'vandaag'))}" style="${colorVars(e.color)}"><b>${esc(cleanTitle(e.title))}</b><span>${esc(codeOf(e.title) || '')}${n ? `<i class="cap">${n}</i>` : ''}</span></a>`;
        }).join('')}</div>`;
      } else if (!P.enr.length && !P.loadedAt) h += `<div class="sh"><h2>Mijn vakken</h2></div><div class="tiles">${'<div class="tile sk" style="background:var(--fill)"></div>'.repeat(3)}</div>`;
      // deadlines
      const dl = deadlines(now).filter((e) => e.date - now < 14 * 864e5 && !isDone(e));
      if (dl.length) h += `<div class="sh"><h2>Deadlines</h2></div><div class="group">${dl.slice(0, 4).map((e) => dueRow(e, now)).join('')}</div>`;
      // updates
      const f = feed().slice(0, 4);
      if (f.length) h += `<div class="sh"><h2>Nieuw</h2><a href="#updates">Alle</a></div><div class="group">${f.map((e) => eventRow(e, now)).join('')}</div>`;
      // exams
      const ex = exams().filter((x) => dayDiff(x.start, now) >= 0 && dayDiff(x.start, now) <= 75);
      if (ex.length) h += `<div class="sh"><h2>Examens</h2><a href="#rooster/examens">Alle</a></div><div class="group">${ex.slice(0, 2).map((x) => examRow(x, now)).join('')}</div>`;
      put($('[data-k="body"]', el), h);
    };

    // ---- Vakken
    BUILD.vakken = () => `<div class="lt"><h1>Vakken</h1></div><label class="search">${ico('search')}<input type="search" placeholder="Zoek een vak" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Zoek een vak"><button type="button" class="clr" data-act="clr" hidden aria-label="Wis">✕</button></label><div data-k="list"></div>`;
    NAVS.vakken = () => ({ title: 'Vakken' });
    FILL.vakken = (el) => {
      const list = $('[data-k="list"]', el);
      if (!P.enr.length) { put(list, P.loadedAt ? empty('book', 'Geen vakken', 'Je bent nog voor geen enkel vak ingeschreven.') : skGroup(7)); return; }
      const q = fold(P.search.trim());
      const match = (e) => !q || fold(e.title).includes(q) || fold(e.learningUnitId).includes(q);
      const all = P.enr.filter(match);
      const m = new Date().getMonth();
      const cur = m >= 7 || m === 0 ? 'SEMESTER1' : 'SEMESTER2';
      const rank = (e) => (e.semester === cur ? 0 : e.semester === 'YEAR' ? 1 : e.semester === 'UNKNOWN' ? 3 : 2);
      const byT = (a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title), 'nl');
      const fav = all.filter((e) => e.favorite).sort((a, b) => (a.available === false) - (b.available === false) || byT(a, b));
      const crs = all.filter((e) => !e.favorite && e.type !== 'community' && e.available !== false).sort((a, b) => rank(a) - rank(b) || byT(a, b));
      const com = all.filter((e) => !e.favorite && e.type === 'community' && e.available !== false).sort(byT);
      const off = all.filter((e) => !e.favorite && e.available === false).sort(byT);
      let h = '';
      const sec = (title, items, opts = {}) => {
        if (!items.length) return '';
        const lim = opts.limit && !q && !opts.open ? opts.limit : Infinity;
        const shown = items.slice(0, lim);
        const rest = items.length - shown.length;
        return `<div class="gh">${esc(title)}</div><div class="group">${shown.map((e) => courseRow(e)).join('')}${rest > 0 ? `<button type="button" class="more-row" data-act="${opts.act}">Toon alle ${items.length}</button>` : ''}</div>`;
      };
      h += sec('Favorieten', fav);
      h += sec(fav.length ? 'Andere vakken' : 'Vakken', crs);
      h += sec('Gemeenschappen', com, { limit: 3, open: P.showComm, act: 'comm' });
      h += sec('Niet beschikbaar', off, { limit: 2, open: P.showOff, act: 'offall' });
      if (!h) h = empty('search', 'Geen resultaten', `Geen vak gevonden voor "${P.search.trim()}".`);
      put(list, h);
    };

    // ---- Rooster
    BUILD.rooster = () => `<div class="lt"><h1>Rooster</h1></div><div data-k="seg">${segHtml([{ id: 'lessen', label: 'Lessen' }, { id: 'examens', label: 'Examens' }], P.seg, 'rseg')}</div><div data-k="body"></div>`;
    NAVS.rooster = () => ({ title: 'Rooster', right: `<button type="button" class="nb" data-act="agrefresh" aria-label="Vernieuwen">${P.ag === 'loading' ? '<span class="spin" style="width:20px;height:20px;border-width:2px"></span>' : ico('refresh')}</button>` });
    function freshLine(noLink) {
      const a = P.agenda;
      if (P.ag === 'loading') return '<p class="fresh">Rooster bijwerken…</p>';
      if (!a) return '';
      const t = a.ts;
      const when = dayDiff(t, Date.now()) === 0 ? 'vandaag ' + hhmm(t) : dShort(t) + ' ' + hhmm(t);
      return `<p class="fresh">Bijgewerkt ${when} · <button type="button" data-act="agrefresh">Bijwerken</button>${noLink ? '' : '<br><a href="https://www.kuleuven.be/kuloket/zr_0367?sap-language=NL">Open in KU Loket</a>'}</p>`;
    }
    function roosterLessen(now) {
      const L = lessons();
      const ws = addDays(mondayOf(now), P.weekOff * 7);
      const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
      const has = new Set(L.map((l) => ymd(l.start)));
      const todayK = ymd(now);
      const mid = days[3];
      const month = `${cap(MONTHS[new Date(mid).getMonth()])} ${new Date(mid).getFullYear()}`;
      const wkLabel = P.weekOff === 0 ? 'Deze week' : P.weekOff === 1 ? 'Volgende week' : P.weekOff === -1 ? 'Vorige week' : month;
      let h = `<div class="wk-sticky"><div class="wk-head"><b>${esc(wkLabel)}</b><span class="btns">${P.weekOff !== 0 ? '<button type="button" class="today-btn" data-act="wktoday">Vandaag</button>' : ''}<button type="button" data-act="wk" data-d="-1" aria-label="Vorige week"><svg class="i" viewBox="0 0 24 24"><path d="M14.5 5 8 12l6.5 7"/></svg></button><button type="button" data-act="wk" data-d="1" aria-label="Volgende week"><svg class="i" viewBox="0 0 24 24"><path d="M9.5 5 16 12l-6.5 7"/></svg></button></span></div>`;
      h += `<div class="week">${days.map((t) => { const k = ymd(t); const dw = new Date(t).getDay(); return `<button type="button" class="wd${k === todayK ? ' today' : ''}${has.has(k) ? ' has' : ''}${dw === 0 || dw === 6 ? ' we' : ''}" data-act="day" data-d="${k}"><small>${DAYS_S[dw]}</small><b>${new Date(t).getDate()}</b><i></i></button>`; }).join('')}</div></div>`;
      const range = P.agenda && P.agenda.v && P.agenda.v.range;
      let body = '';
      days.forEach((t) => {
        const k = ymd(t);
        const list = L.filter((l) => ymd(l.start) === k);
        if (!list.length && k !== todayK) return;
        const dd = dayDiff(t, now);
        const title = dd === 0 ? `Vandaag · ${dLong(t)}` : dd === 1 ? `Morgen · ${dLong(t)}` : cap(dLong(t));
        body += `<div class="day-title" id="tm-d-${k}">${esc(title)}</div>`;
        if (list.length) body += `<div class="group">${list.map((l) => lessonRow(l, now, 'rooster')).join('')}</div>`;
        else body += '<div class="group plain"><div class="empty small" style="padding:14px 16px">Vandaag geen lessen</div></div>';
      });
      if (!L.length && !P.agenda && P.ag !== 'failed') body = skGroup(4);
      else if (!body || !days.some((t) => has.has(ymd(t)))) {
        const out = range && (ymd(days[6]) < range[0] || ymd(days[0]) > range[1]);
        const nx = L.find((l) => l.start > days[6] + 864e5);
        body += out ? empty('calendar', 'Buiten het geladen bereik', 'Open KU Loket voor lessen zo ver vooruit.', '<p style="margin-top:14px"><a class="btn ghost" href="https://www.kuleuven.be/kuloket/zr_0367?sap-language=NL">Open in KU Loket</a></p>')
          : empty('calendar', 'Geen lessen deze week', '', nx ? `<p style="margin-top:12px"><button type="button" class="btn ghost" data-act="jump" data-d="${ymd(nx.start)}">Volgende les: ${esc(dShort(nx.start))}</button></p>` : '');
      }
      return h + `<div class="day-wrap" data-k="day">${body}</div>`;
    }
    function roosterExamens(now) {
      const X = exams();
      if (!X.length) {
        if (!P.agenda) {
          if (P.ag === 'loading' || !P.ag) return skGroup(3);
          return empty('cap', 'Examenrooster nog niet geladen', P.agLogin ? 'Je examens komen uit KU Loket. Die wil dat je even opnieuw aanmeldt.' : 'Je examens komen uit KU Loket.', '<p style="margin-top:14px"><button type="button" class="btn" data-act="agsync">Examenrooster laden</button></p>');
        }
        return empty('cap', 'Geen examens', 'Er staan (nog) geen examens in je individueel examenrooster.');
      }
      const up = X.filter((x) => dayDiff(x.start, now) >= 0);
      const past = X.filter((x) => dayDiff(x.start, now) < 0);
      let h = '';
      if (up.length) { const first = up[0]; h += `<div class="gh">Volgend examen ${esc(until(first.start, now))}</div><div class="group">${up.map((x) => examRow(x, now)).join('')}</div>`; }
      if (past.length) h += `<div class="gh">Voorbij</div><div class="group">${past.map((x) => examRow(x, now)).join('')}</div>`;
      return h + '<p class="fresh"><a href="https://www.kuleuven.be/kuloket/zr_0363">Open je examenrooster in KU Loket</a></p>';
    }
    FILL.rooster = (el) => {
      segSet(el, P.seg);
      const now = Date.now();
      // the empty Examens page has its own button, so no banner above it
      const banner = P.seg === 'examens' && !P.agenda && !exams().length ? '' : agendaBanner();
      put($('[data-k="body"]', el), banner + (P.seg === 'examens' ? roosterExamens(now) : roosterLessen(now)) + freshLine(P.seg === 'examens'));
    };

    // ---- Updates
    const FILTERS = [['alles', 'Alles'], ['ongelezen', 'Ongelezen'], ['announcement', 'Aankondigingen'], ['content', 'Materiaal'], ['gradebook', 'Cijfers'], ['due', 'Deadlines'], ['advalvas', 'Ad Valvas']];
    BUILD.updates = () => '<div class="lt"><h1>Updates</h1></div><div class="chips" data-k="chips"></div><div data-k="list"></div>';
    NAVS.updates = () => ({ title: 'Updates', right: P.events.some((e) => !e.read && !e.dismissed) ? '<button type="button" class="nb" data-act="allread">Alles gelezen</button>' : '' });
    FILL.updates = (el) => {
      const now = Date.now();
      put($('[data-k="chips"]', el), FILTERS.map(([id, label]) => `<button type="button" class="chip${P.filter === id ? ' on' : ''}" data-act="filter" data-id="${id}">${label}</button>`).join(''));
      const list = $('[data-k="list"]', el);
      if (!P.events.length) { put(list, P.loadedAt ? empty('bell', 'Geen updates', 'Nieuwe aankondigingen, materiaal en cijfers verschijnen hier.') : skGroup(8)); return; }
      let items;
      if (P.filter === 'due') {
        items = deadlines(now);
        put(list, items.length ? `<div class="group">${items.map((e) => dueRow(e, now)).join('')}</div>` : empty('check', 'Geen deadlines', 'Er komen geen deadlines aan.'));
        return;
      }
      items = feed().filter((e) => P.filter === 'alles' || (P.filter === 'ongelezen' ? !e.read : e.subType === P.filter));
      if (!items.length) { put(list, empty(P.filter === 'ongelezen' ? 'checks' : 'bell', P.filter === 'ongelezen' ? 'Alles gelezen' : 'Niets gevonden', P.filter === 'ongelezen' ? 'Je bent helemaal bij.' : 'Geen updates in deze categorie.')); return; }
      const shown = items.slice(0, P.feedN);
      let h = '', curKey = '', buf = '';
      const flush = () => { if (buf) h += `<div class="group">${buf}</div>`; buf = ''; };
      shown.forEach((e) => {
        const k = ymd(e.date);
        if (k !== curKey) { flush(); curKey = k; const dd = dayDiff(e.date, now); h += `<div class="gh">${esc(dd === 0 ? 'Vandaag' : dd === -1 ? 'Gisteren' : cap(dLong(e.date)))}</div>`; }
        buf += eventRow(e, now, true);
      });
      flush();
      if (items.length > shown.length) h += `<p class="fresh"><button type="button" data-act="feedmore">Toon oudere updates (${items.length - shown.length})</button></p>`;
      put(list, h);
    };

    // ---- Meer
    BUILD.meer = () => '<div class="lt"><h1>Meer</h1></div><div data-k="body"></div>';
    NAVS.meer = () => ({ title: 'Meer' });
    FILL.meer = (el) => {
      const L = linkMap();
      const u = P.user || {};
      const name = [u.givenName, u.familyName].filter(Boolean).join(' ');
      const unread = P.mail && typeof P.mail.value === 'number' ? P.mail.value : 0;
      const link = (href, icon, color, title, sub, extra) => row({ href, iconHtml: `<span class="ic" style="--c:${color}">${ico(icon)}</span>`, title, sub, end: extra || '' });
      let h = `<div class="group plain" style="margin-bottom:16px"><div class="prof"><span class="avatar">${esc(initials(name || 'KU L'))}</span><span class="main"><span class="t">${esc(name || 'Student')}</span><span class="s">KU Leuven${store.get('p:rn') || u.userId ? ' · ' + esc(store.get('p:rn') || u.userId) : ''}</span></span></div></div>`;
      const mailApp = store.get('mailApp') !== 'web';
      h += `<div class="group">${row({ act: 'mail', iconHtml: `<span class="ic" style="--c:#0a84ff">${ico('mail')}</span>`, title: 'Mail', sub: mailApp ? 'Opent in de Outlook-app' : 'Outlook in Safari', end: unread ? `<span class="badge">${unread > 99 ? '99+' : unread}</span>` : '' })}${link(L.ADVALVAS || 'https://icts-p-toledo-valvas.cloud.icts.kuleuven.be/student/messages', 'inbox', '#ff9500', 'Ad Valvas', 'Berichten van je faculteit')}${link(L['BB-MESSAGES-ULTRA'] || ULTRA + '/ultra/messages', 'bubble', '#30b955', 'Berichten', 'Blackboard')}</div>`;
      const S0 = P.study && P.study.v && P.study.v.study && P.study.v.study[0];
      const stSub = S0 && S0.pct != null ? `Diplomapercentage ${nl(S0.pct, 2)}%` : 'Resultaten, studiepunten en grafieken';
      const I0 = P.study && P.study.v && P.study.v.isp;
      const ispSub = I0 ? `${I0.courses.filter((c) => c.st === 'now').length} vakken dit jaar · ${nl(I0.courses.filter((c) => c.st === 'now').reduce((a, c) => a + c.sp, 0), 0)} sp` : 'Je vakken en studiepunten';
      h += `<div class="gh">Studie</div><div class="group">${row({ href: '#rooster/examens', iconHtml: `<span class="ic" style="--c:#ff3b30">${ico('cap')}</span>`, title: 'Examenrooster' })}${link(L['BB-GRADES-ULTRA'] || ULTRA + '/ultra/grades', 'chart', '#5856d6', 'Cijfers', 'Alle vakken in Blackboard')}${row({ href: '#studie', iconHtml: `<span class="ic" style="--c:#34aadc">${ico('trend')}</span>`, title: 'Studievoortgang', sub: stSub })}${row({ href: '#isp', iconHtml: `<span class="ic" style="--c:#00a79d">${ico('idcard')}</span>`, title: 'Mijn ISP', sub: ispSub })}${row({ act: 'loket', iconHtml: `<span class="ic" style="--c:#1d4f86">${ico('grid')}</span>`, title: 'KU Loket', sub: 'Studietracker, uurrooster en meer' })}</div>`;
      h += `<div class="gh">Tools</div><div class="group">${link(L['KALTURA-MYMEDIA'] || ULTRA + '/ultra/tools', 'video', '#8e5bd8', 'My Media', 'Kaltura-video\'s')}${link(L.KURT || 'https://bib.kuleuven.be/faciliteiten/reserveren', 'seat', '#ff2d55', 'KURT', 'Studieplek reserveren')}${link(L.LIMO || 'https://limo.libis.be/index.html', 'library', '#a2845e', 'LIMO', 'Bibliotheek zoeken')}${link(L['KUL-ONEDRIVE'] || 'https://onedrive.kuleuven.be', 'cloud', '#0078d4', 'OneDrive')}${link(L['KUL-MS-OFFICE-365'] || 'https://office.com', 'grid', '#d83b01', 'Microsoft 365')}</div>`;
      h += `<div class="gh">Weergave</div>${segHtml([{ id: 'auto', label: 'Automatisch' }, { id: 'light', label: 'Licht' }, { id: 'dark', label: 'Donker' }], THEME, 'theme')}<p class="gf" style="margin-top:-6px">Automatisch volgt de instelling van je iPhone.</p>`;
      h += `<div class="gh">Mail openen in</div>${segHtml([{ id: 'app', label: 'Outlook-app' }, { id: 'web', label: 'Safari' }], mailApp ? 'app' : 'web', 'mailpref')}<p class="gf" style="margin-top:-6px">In de Outlook-app blijf je aangemeld met je KU Leuven-account.</p>`;
      h += `<div class="gh">App</div><div class="group">${row({ act: 'reload', iconHtml: `<span class="ic" style="--c:#8e8e93">${ico('refresh')}</span>`, title: 'Alles vernieuwen', chevron: false })}${row({ act: 'classic', iconHtml: `<span class="ic" style="--c:#8e8e93">${ico('swap')}</span>`, title: 'Klassieke Toledo', sub: 'De gewone website, zonder app-weergave' })}${link(L['HELP-LEUVEN-STUDENT'] || 'https://associatie.kuleuven.be/toledo/nl/help_KULeuven_campus_Leuven_student', 'help', '#8e8e93', 'Hulp bij Toledo')}</div>`;
      if (P.newVer) h += `<div class="group">${row({ act: 'update', iconHtml: `<span class="ic" style="--c:#34c759">${ico('refresh')}</span>`, title: 'Update naar ' + P.newVer, sub: 'Daarna op Userscripts in de adresbalk tikken' })}</div>`;
      h += `<p class="foot">Toledo Mobile ${VERSION}<br>Gebruikt je eigen Toledo-sessie en stuurt niets door.</p>`;
      put($('[data-k="body"]', el), h);
    };

    // ---- Studievoortgang + ISP (from KU Loket, opened from Meer)
    const stMeta = () => {
      if (P.st === 'loading') return 'Bijwerken…';
      const t = P.study && P.study.ts;
      if (!t) return '';
      return `Bijgewerkt ${dayDiff(t, Date.now()) === 0 ? 'vandaag ' + hhmm(t) : dShort(t) + ' ' + hhmm(t)} · <button type="button" data-act="strefresh">Bijwerken</button>`;
    };
    function stEmpty(what) {
      if (P.st === 'loading' || (!P.study && !P.st && bridgeBusy)) return `<div class="st-hero" style="min-height:190px"><div class="sk" style="height:14px;width:35%;opacity:.5"></div><div class="sk" style="height:24px;width:70%;margin-top:12px;opacity:.5"></div></div>${skGroup(5)}`;
      return empty(what === 'isp' ? 'idcard' : 'trend', what === 'isp' ? 'ISP nog niet geladen' : 'Studievoortgang nog niet geladen', 'Deze gegevens komen uit KU Loket.' + (P.stLogin ? ' KU Loket wil dat je even opnieuw aanmeldt.' : ''), '<p style="margin-top:14px"><button type="button" class="btn" data-act="stsync">Laden uit KU Loket</button></p>');
    }
    BUILD.studie = () => '<div class="lt"><h1>Studievoortgang</h1></div><div data-k="body"></div>';
    NAVS.studie = () => ({ back: { label: 'Meer', href: '#meer' }, title: 'Studievoortgang', right: `<button type="button" class="nb" data-act="strefresh" aria-label="Vernieuwen">${P.st === 'loading' ? '<span class="spin" style="width:20px;height:20px;border-width:2px"></span>' : ico('refresh')}</button>` });
    FILL.studie = (el) => {
      const S = P.study && P.study.v && P.study.v.study;
      put($('[data-k="body"]', el), S && S.length ? studyHtml(S, P.stSel, P.stOpen, stMeta()) : stEmpty('studie'));
    };
    BUILD.isp = () => '<div class="lt"><h1>Mijn ISP</h1></div><div data-k="body"></div>';
    NAVS.isp = () => ({ back: { label: 'Meer', href: '#meer' }, title: 'Mijn ISP', right: NAVS.studie().right });
    FILL.isp = (el) => {
      const v = P.study && P.study.v;
      put($('[data-k="body"]', el), v && v.isp ? ispHtml(v.isp, v.study, stMeta()) : stEmpty('isp'));
    };
    const SUBVIEW = { studie: 'meer', isp: 'meer' };

    /* ---------------- view switching ---------------- */
    function view(id) {
      if (!V[id]) {
        const el = document.createElement('section');
        el.className = 'view';
        el.dataset.view = id;
        el.innerHTML = BUILD[id]();
        $('#tm-main').appendChild(el);
        V[id] = { id, el, dirty: true, y: 0 };
        if (id === 'vakken') bindSearch(el);
        if (id === 'rooster') bindSwipe(el);
      }
      return V[id];
    }
    function render(id) { const v = view(id); FILL[id](v.el); v.dirty = false; }
    let rq = 0;
    function dirty(...ids) {
      ids.forEach((i) => { if (V[i]) V[i].dirty = true; });
      if (rq) return;
      rq = requestAnimationFrame(() => {
        rq = 0;
        const v = V[P.tab];
        if (v && v.dirty) { render(P.tab); setNav(NAVS[P.tab]()); }
        badges();
      });
    }
    function show(id, sub) {
      const prev = V[P.tab];
      if (id === P.tab && prev && !sub) { W.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (prev) prev.y = W.scrollY;
      if (id === 'rooster' && sub) P.seg = sub === 'examens' ? 'examens' : 'lessen';
      const first = !P.tab;
      P.tab = id;
      const v = view(id);
      Object.values(V).forEach((x) => x.el.classList.toggle('on', x === v));
      if (!first) { v.el.classList.remove('fade'); void v.el.offsetWidth; v.el.classList.add('fade'); }
      setTabOn(SUBVIEW[id] || id);
      if (SUBVIEW[id]) {
        // nothing to show yet: get it, and if the hidden frame can't, open KU Loket for a moment (at most once per 5 minutes, never right after a sync)
        const auto = !P.study && !syncM && Date.now() - (Number(ss.get('tm4-stauto')) || 0) > 5 * 60e3;
        if (auto) ss.set('tm4-stauto', String(Date.now()));
        refreshAgenda(auto, true);
      }
      render(id);
      if (id === 'studie') { const S = P.study && P.study.v && P.study.v.study; const a = S && S.find((x) => x.active); if (a && a.last) store.set('p:resSeen', a.last); }
      badges();
      setNav(NAVS[id]());
      W.scrollTo(0, v.y || 0);
      watchTitle(v.el);
      const hash = '#' + id + (id === 'rooster' && P.seg === 'examens' ? '/examens' : '');
      if (location.hash !== hash || location.search) history.replaceState(null, '', location.pathname + hash);
      if (id === 'updates') setTimeout(() => { if (P.tab === 'updates') { P.seen = Date.now(); store.set('p:seen', P.seen); badges(); } }, 1200);
    }
    function routeFromUrl(ignoreQuery) {
      // links from the course pages say where to go in ?tm= (the site's own app can rewrite #..., not ?...)
      const q = ignoreQuery ? '' : new URLSearchParams(location.search).get('tm') || '';
      let h = location.hash.replace(/^#\/?/, '').split('&')[0];
      const qmap = { courses: 'vakken', menu: 'meer', agenda: 'rooster', examens: 'rooster/examens', vandaag: 'vandaag', vakken: 'vakken', rooster: 'rooster', updates: 'updates', meer: 'meer', studie: 'studie', isp: 'isp' };
      if (qmap[q] && h.split('/')[0] !== qmap[q].split('/')[0]) h = qmap[q];
      const [a, b] = h.split('/');
      const map = { '': 'vandaag', home: 'vandaag', vandaag: 'vandaag', vakken: 'vakken', courses: 'vakken', rooster: 'rooster', agenda: 'rooster', updates: 'updates', messages: 'updates', meer: 'meer', menu: 'meer', studie: 'studie', isp: 'isp' };
      return { tab: map[a] || 'vandaag', sub: b || '' };
    }
    function badges() {
      const n = P.events.filter((e) => e.subType !== 'due' && !e.dismissed && e.date > P.seen && e.date <= Date.now() + 60e3).length;
      setBadge('updates', P.tab === 'updates' ? 0 : n);
    }

    /* ---------------- interaction ---------------- */
    function bindSearch(el) {
      const inp = $('input', el), clr = $('.clr', el);
      inp.addEventListener('input', () => { P.search = inp.value; clr.hidden = !inp.value; FILL.vakken(el); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
    }
    function bindSwipe(el) {
      let x0 = 0, y0 = 0, t0 = 0, on = false;
      el.addEventListener('touchstart', (e) => { if (P.seg !== 'lessen' || !e.target.closest('.day-wrap, .week')) return; on = true; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (!on) return;
        on = false;
        const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.7 || Date.now() - t0 > 700) return;
        shiftWeek(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    function animWeek(dir) {
      const d = $('[data-k="day"]', V.rooster.el);
      if (!d) return;
      d.classList.remove('slide-l', 'slide-r'); void d.offsetWidth; d.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    }
    function shiftWeek(dir) { P.weekOff += dir; FILL.rooster(V.rooster.el); animWeek(dir); const st = $('.wk-sticky', V.rooster.el); if (st && W.scrollY > st.offsetTop) W.scrollTo(0, Math.max(0, st.offsetTop - 60)); }
    function scrollToDay(k) {
      const sec = document.getElementById('tm-d-' + k);
      const st = $('.wk-sticky', V.rooster.el);
      if (!sec) { toast('Geen lessen op ' + dLong(fromYmd(k))); return; }
      const off = ($('#tm-nav').offsetHeight || 44) + (st ? st.offsetHeight : 0) + 4;
      W.scrollTo({ top: sec.getBoundingClientRect().top + W.scrollY - off, behavior: 'smooth' });
    }
    const ACTS = {
      update: () => { location.href = UPDATE_URL; },
      clr: () => { const el = V.vakken.el, inp = $('input', el); inp.value = ''; P.search = ''; $('.clr', el).hidden = true; FILL.vakken(el); inp.focus(); },
      comm: () => { P.showComm = true; FILL.vakken(V.vakken.el); },
      offall: () => { P.showOff = true; FILL.vakken(V.vakken.el); },
      off: () => toast('Dit vak is nog niet beschikbaar in Toledo.'),
      rseg: (b) => { P.seg = b.dataset.id; history.replaceState(null, '', location.pathname + '#rooster' + (P.seg === 'examens' ? '/examens' : '')); FILL.rooster(V.rooster.el); },
      wk: (b) => shiftWeek(Number(b.dataset.d)),
      wktoday: () => { const dir = P.weekOff > 0 ? -1 : 1; P.weekOff = 0; FILL.rooster(V.rooster.el); animWeek(dir); scrollToDay(ymd(Date.now())); },
      day: (b) => scrollToDay(b.dataset.d),
      jump: (b) => { const k = b.dataset.d; const dir = 1; P.weekOff = Math.round((mondayOf(fromYmd(k)) - mondayOf(Date.now())) / (7 * 864e5)); FILL.rooster(V.rooster.el); animWeek(dir); setTimeout(() => scrollToDay(k), 60); },
      filter: (b) => { P.filter = b.dataset.id; P.feedN = 50; FILL.updates(V.updates.el); W.scrollTo(0, 0); },
      feedmore: () => { P.feedN += 50; FILL.updates(V.updates.el); },
      allread: () => {
        const todo = P.events.filter((e) => !e.read && !e.dismissed);
        sheet({ title: 'Alles als gelezen markeren?', msg: `${todo.length} update${todo.length === 1 ? '' : 's'} worden ook in Toledo als gelezen gemarkeerd.`, actions: [{ label: 'Markeer als gelezen', run: () => { markRead(todo); dirty('updates', 'vandaag', 'vakken'); setNav(NAVS.updates()); toast('Alles gelezen'); } }] });
      },
      agrefresh: () => refreshAgenda(true),
      agsync: () => { goTo(LOKET + '?tm=sync&back=' + encodeURIComponent(P.tab === 'rooster' && P.seg === 'examens' ? 'rooster/examens' : P.tab || 'rooster') + (SUBVIEW[P.tab] || studyStale() ? '&x=study' : '')); },
      stsync: () => ACTS.agsync(),
      strefresh: () => refreshAgenda(true, true),
      stsel: (b) => { P.stSel = Number(b.dataset.id) || 0; FILL.studie(V.studie.el); },
      resopen: (b) => { const k = b.dataset.k; P.stOpen[k] = !P.stOpen[k]; FILL.studie(V.studie.el); },
      // Outlook-app first (iOS lets a tap open another app); no app after a moment: Outlook on the web
      mail: () => {
        if (store.get('mailApp') === 'web') { goTo(MAIL); return; }
        let away = false;
        const seen = () => { if (document.visibilityState === 'hidden') away = true; };
        document.addEventListener('visibilitychange', seen);
        W.addEventListener('pagehide', () => { away = true; }, { once: true });
        location.href = 'ms-outlook://emails';
        setTimeout(() => {
          document.removeEventListener('visibilitychange', seen);
          if (away) return;
          toast('Outlook-app niet gevonden, Outlook op het web openen…');
          setTimeout(() => goTo(MAIL), 900);
        }, 2600);
      },
      mailpref: (b) => { store.set('mailApp', b.dataset.id); FILL.meer(V.meer.el); toast(b.dataset.id === 'web' ? 'Mail opent in Safari' : 'Mail opent in de Outlook-app'); },
      loket: () => sheet({ title: 'KU Loket', actions: [
        { label: 'Studietracker', href: 'https://kuleuven.be/kuloket/zr_0184?sap-language=NL' },
        { label: 'Uurrooster in KU Loket', href: 'https://www.kuleuven.be/kuloket/zr_0367?sap-language=NL' },
        { label: 'Examenrooster in KU Loket', href: 'https://www.kuleuven.be/kuloket/zr_0363' },
        { label: 'ISP aanpassen', href: 'https://www.kuleuven.be/kuloket/zr_0442?sap-language=NL' },
        { label: 'Studievoortgangsdossier', href: 'https://kuleuven.be/kuloket/zr_1017?sap-language=NL' },
      ] }),
      login: () => { ss.set('tm4-login', '1'); location.reload(); },
      theme: (b) => {
        const t = b.dataset.id;
        saveTheme(t);
        applyTheme(t);
        segSet(V.meer.el, t);
        toast(t === 'light' ? 'Lichte modus' : t === 'dark' ? 'Donkere modus' : 'Volgt je iPhone');
      },
      reload: () => { ['p:events', 'p:enr', 'p:upcoming', 'p:mail'].forEach((k) => store.del(k)); toast('Bezig met vernieuwen…'); loadAll(true); refreshAgenda(true); },
      classic: () => sheet({ title: 'Klassieke Toledo openen?', msg: 'Je kan altijd terug naar de app via de knop onderaan.', actions: [{ label: 'Open klassieke Toledo', run: () => { ss.set('tm4-classic', '1'); history.replaceState(null, '', location.pathname + '#/home'); location.reload(); } }] }),
    };

    W.addEventListener('click', (e) => {
      if (!e.target || !e.target.closest) return;
      const tab = e.target.closest('#tm-tabs a');
      if (tab) { e.preventDefault(); show(tab.dataset.tab); return; }
      const act = e.target.closest('[data-act]');
      if (act && ACTS[act.dataset.act]) { e.preventDefault(); ACTS[act.dataset.act](act, e); return; }
      const ev = e.target.closest('[data-ev]');
      if (ev) { const id = ev.dataset.ev; const item = P.events.find((x) => String(x.id) === id); if (item) markRead([item]); }
      const a = e.target.closest('a[href]');
      if (a) {
        const href = a.getAttribute('href');
        if (href.startsWith('#')) { e.preventDefault(); const r = (() => { const [x, y] = href.slice(1).split('/'); return { tab: x, sub: y }; })(); if (V[r.tab] || BUILD[r.tab]) show(r.tab, r.sub); }
        return;
      }
      const card = e.target.closest('[data-href]');
      if (card && !e.target.closest('button')) {
        const href = card.dataset.href;
        if (href.startsWith('#')) { const [x, y] = href.slice(1).split('/'); show(x, y); } else goTo(href);
      }
    }, true);
    const OWN = /^#(vandaag|vakken|rooster|rooster\/examens|updates|meer|studie|isp)$/;
    W.addEventListener('hashchange', () => {
      if (!OWN.test(location.hash)) { history.replaceState(null, '', location.pathname + '#' + P.tab + (P.tab === 'rooster' && P.seg === 'examens' ? '/examens' : '')); return; }
      const r = routeFromUrl(true);
      if (r.tab !== P.tab || r.sub) show(r.tab, r.sub);
    });

    /* ---------------- data ---------------- */
    const H = { 'Toledo-Language': 'nl' };
    const papi = (p) => api(PORTAL_ORIGIN + '/portal/api/' + p, { headers: H });
    function onFail(key) {
      return (e) => {
        P.err[key] = e;
        if (e && e.auth) goLogin();
      };
    }
    let loginTried = false;
    function goLogin() {
      if (loginTried || TEST) { P.authFail = true; dirty(P.tab); return; }
      loginTried = true;
      const last = Number(ss.get('tm4-login-at')) || 0;
      if (Date.now() - last < 90e3) { P.authFail = true; dirty(P.tab); return; }
      ss.set('tm4-login-at', String(Date.now()));
      ss.set('tm4-login', '1');
      location.reload();
    }
    function loadAll(force) {
      const mark = () => { P.loadedAt = Date.now(); };
      const jobs = [
        swr('p:user', () => papi('user'), (v) => { P.user = v; dirty('vandaag', 'meer'); }),
        swr('p:enr', () => papi('enrollments'), (v) => { P.enr = Array.isArray(v) ? v : []; dirty('vandaag', 'vakken', 'rooster'); }).catch(onFail('enr')),
        swr('p:events', () => papi('events'), (v) => { P.events = Array.isArray(v) ? v : []; learnPk(); dirty('vandaag', 'updates', 'vakken'); }).catch(onFail('events')),
        swr('p:upcoming', () => papi('upcoming'), (v) => { P.upcoming = Array.isArray(v) ? v : []; dirty('vandaag', 'rooster'); }).catch(() => {}),
        swr('p:links', () => papi('links'), (v) => { P.links = Array.isArray(v) ? v : []; dirty('meer'); }, { maxAge: force ? 0 : 12 * 3600e3 }).catch(() => {}),
        swr('p:mail', () => papi('emails/unread'), (v) => { P.mail = v; dirty('meer'); }).catch(() => {}),
      ];
      jobs[0].catch(onFail('user'));
      return Promise.allSettled(jobs).then(() => { mark(); dirty('vandaag', 'vakken', 'updates', 'rooster', 'meer'); });
    }

    /* KU Loket lives on another origin of the same site: a hidden frame reads the timetable there
       (the userscript runs inside it, see bridge()) and hands it over with postMessage. */
    // force = you pressed "vernieuwen": if the hidden frame can't do it quickly (or KU Loket first wants you to
    // sign in), the app opens KU Loket itself for a moment and comes straight back with the timetable.
    let bridgeBusy = false, bridgeSt = false, bridgeDone = Promise.resolve();
    const studyStale = () => !P.study || Date.now() - P.study.ts > 6 * 3600e3;
    // force: you asked for it (button), so when the hidden frame can't, KU Loket opens for a moment.
    // study: also read study progress + ISP (opening those pages, or when that copy is older than 6 hours).
    // quiet: pulled to refresh: try the hidden frame, never leave the page.
    function refreshAgenda(force, study, quiet) {
      const a = P.agenda;
      const wantStudy = !!study && (force || studyStale());
      if (!force && !wantStudy && a && Date.now() - a.ts < 30 * 60e3 && !studyStale()) return Promise.resolve();
      // nothing will load study progress now: say so (with the "Laden uit KU Loket" button) instead of loading forever
      const stIdle = () => { if (wantStudy && P.st !== 'loading') { P.st = 'failed'; dirty('studie', 'isp'); if (SUBVIEW[P.tab]) setNav(NAVS[P.tab]()); } };
      if (bridgeBusy) {
        if (force && !quiet) ACTS.agsync();
        else if (wantStudy && !bridgeSt) bridgeDone.then(() => refreshAgenda(false, true, quiet));
        return Promise.resolve();
      }
      if (TEST && !W.__TM_BRIDGE__) { if (force) toast('Vernieuwen werkt op de iPhone'); stIdle(); return Promise.resolve(); }
      const fail = store.get('p:bridgefail') || { n: 0, ts: 0 };
      if (fail.n >= 2 && Date.now() - fail.ts < 12 * 3600e3) { if (force && !quiet) ACTS.agsync(); else stIdle(); return Promise.resolve(); }
      const withSt = wantStudy || studyStale();
      bridgeBusy = true;
      bridgeSt = withSt;
      P.ag = 'loading';
      if (withSt) P.st = 'loading';
      dirty('vandaag', 'rooster', 'studie', 'isp');
      if (SUBVIEW[P.tab]) setNav(NAVS[P.tab]());
      if (P.tab === 'rooster') setNav(NAVS.rooster());
      const f = document.createElement('iframe');
      f.src = LOKET + '?tm=bridge' + (withSt ? '&x=study' : '');
      f.title = 'KU Loket';
      f.setAttribute('aria-hidden', 'true');
      f.setAttribute('data-tm4', '');
      f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-20px;top:-20px;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
      let timer = 0, done = false, settle = () => {};
      const settled = new Promise((r) => { settle = r; });
      bridgeDone = settled;
      const finish = (ok, login, noSt) => {
        if (done) return;
        done = true;
        if (withSt) { P.st = ok && !noSt ? 'ok' : 'failed'; P.stLogin = !ok && !!login; }
        clearTimeout(timer);
        W.removeEventListener('message', onMsg);
        setTimeout(() => f.remove(), 50);
        bridgeBusy = false;
        bridgeSt = false;
        settle();
        P.ag = ok ? 'ok' : 'failed';
        P.agLogin = !ok && !!login;
        if (ok) store.del('p:bridgefail');
        else if (!login) { const fl = store.get('p:bridgefail') || { n: 0 }; store.set('p:bridgefail', { n: fl.n + 1, ts: Date.now() }); }
        dirty('vandaag', 'rooster', 'studie', 'isp', 'meer');
        if (P.tab === 'rooster' || SUBVIEW[P.tab]) setNav(NAVS[P.tab]());
        if ((!ok || (withSt && noSt && SUBVIEW[P.tab])) && force && !quiet) ACTS.agsync();
        else if (ok && force && !quiet) toast(SUBVIEW[P.tab] ? 'Bijgewerkt' : 'Rooster bijgewerkt');
      };
      const onMsg = (e) => {
        if (e.origin !== LOKET_ORIGIN || !e.data || e.data.tm4 !== 'agenda') return;
        if (e.data.ok && e.data.data) { const d = e.data.data; saveAgenda(d); saveStudy(d); finish(true, false, withSt && !d.study && !d.isp); return; }
        if (e.data.pending) {
          // KU Loket wants you to sign in first: that needs the real page
          if (force && !quiet) { finish(false, true); return; }
          // show the "Laden" button right away; the frame may still get through by itself, so give it a little longer
          if (P.ag === 'loading') {
            P.ag = 'failed';
            P.agLogin = true;
            dirty('vandaag', 'rooster');
            if (P.tab === 'rooster') setNav(NAVS.rooster());
          }
          clearTimeout(timer);
          timer = setTimeout(() => finish(false, true), 20000);
          return;
        }
        finish(false);
      };
      W.addEventListener('message', onMsg);
      timer = setTimeout(() => finish(false), (force && !quiet ? 7000 : 10000) + (withSt ? 8000 : 0));
      document.body.appendChild(f);
      return settled;
    }

    /* ---------------- start ---------------- */
    guardPath();
    learnPk();
    const r0 = routeFromUrl();
    show(r0.tab, r0.sub);
    badges();
    loadAll(false);
    setTimeout(() => refreshAgenda(false), 350);
    setTimeout(() => checkUpdate((v) => { P.newVer = v; dirty('vandaag', 'meer'); }), 1500);
    setTimeout(countUser, 4000);
    setInterval(() => { if (document.visibilityState === 'visible' && (P.tab === 'vandaag' || P.tab === 'rooster')) dirty(P.tab); }, 30e3);
    // Toledo itself, and KU Loket (same site, so its cookies go along) for the timetable
    pullRefresh(() => {
      if (SUBVIEW[P.tab]) return refreshAgenda(true, true, true);
      return Promise.all([loadAll(true), refreshAgenda(true, false, true)]);
    });
    keepAlive('portal', [[PORTAL_ORIGIN + '/portal/api/user'], [LOKET_ORIGIN + '/sap/bc/ui2/start_up', 'no-cors']]);
    const wake = () => {
      if (document.visibilityState !== 'visible') return;
      dirty(P.tab);
      if (Date.now() - P.loadedAt > 120e3) loadAll(false);
      refreshAgenda(false);
    };
    document.addEventListener('visibilitychange', wake);
    W.addEventListener('pageshow', (e) => { if (e.persisted) wake(); });
  }
