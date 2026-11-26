  /* ================================================================== Sport (KU Leuven Sport, usc.kuleuven.cloud) */
  // The site is an Angular app on top of Delcom's API (backbone-web-api…delcom.nl, CORS open for this site).
  // The weekly schedule is public; your sportkaart, subscriptions and bookings need the KU Leuven sign-in,
  // which the site keeps in localStorage (delcom_auth). The app shows three tabs: Sessies (with stars for your
  // own sports), Velden (padel, tennis… free hours) and Mijn (sportkaart and bookings). Booking and paying
  // happen on the site itself: the app jumps straight to the right day there.
  const SPORT_API = 'https://backbone-web-api.production.leuven.delcom.nl';
  const SPORT_APP = 'https://usc.kuleuven.cloud/?tm=app';
  // fields you can rent (tag ids of the site's "Velden"); the names come from the site, these are fallbacks
  const SPORT_FIELDS = [
    { k: 'padel', n: 'Padel', re: /^padel/i },
    { k: 'tennis', n: 'Tennis (outdoor)', re: /^tennis/i },
    { k: 'tafeltennis', n: 'Tafeltennis', re: /^tafeltennis/i },
    { k: 'beachin', n: 'Beachvolleybal (indoor)', re: /^beachvolley.*indoor/i },
    { k: 'beachout', n: 'Beachvolleybal (outdoor)', re: /^beachvolley.*outdoor/i },
    { k: 'basket', n: 'Basketbal (outdoor)', re: /^basketbal/i },
  ];
  // the original site for one visit (booking, paying, signing in): the app stays out of the way for 30 minutes
  const sportUrl = (path) => 'https://usc.kuleuven.cloud' + path;
  const sportOrig = (path) => { ss.set('tm4-classic-sport', String(Date.now())); return sportUrl(path); };

  // on the site's own pages after "Inloggen" from the app: as soon as you're signed in, back to the app
  function sportLoginWatch() {
    const t0 = Number(ss.get('tm4-sport-login')) || 0;
    if (!t0 || Date.now() - t0 > 10 * 60e3) return;
    const iv = setInterval(() => {
      if (Date.now() - t0 > 10 * 60e3) { clearInterval(iv); return; }
      let a = null;
      try { a = JSON.parse(localStorage.getItem('delcom_auth') || 'null'); } catch (_) {}
      if (a && a.isLoggedIn && a.tokenResponse && a.tokenResponse.accessToken && !/^\/pages\/login/.test(location.pathname)) {
        clearInterval(iv);
        ss.del('tm4-sport-login');
        ss.del('tm4-classic-sport');
        location.replace(SPORT_APP + '#/mijn');
      }
    }, 400);
  }

  function sportApp() {
    takeover('Sport', [SPORT_API]);
    buildShell([
      { id: 'vandaag', label: 'Vandaag', icon: 'house', href: PORTAL + '?tm=vandaag' },
      { id: 'vakken', label: 'Vakken', icon: 'book', href: PORTAL + '?tm=vakken' },
      { id: 'rooster', label: 'Agenda', icon: 'calendar', href: PORTAL + '?tm=rooster' },
      { id: 'updates', label: 'Updates', icon: 'bell', href: PORTAL + '?tm=updates' },
      { id: 'meer', label: 'Meer', icon: 'grid', href: PORTAL + '?tm=meer' },
    ], 'meer');
    const main = $('#tm-main');
    const sec = document.createElement('section');
    sec.className = 'view on';
    sec.setAttribute('data-tm4', '');
    main.appendChild(sec);

    /* ---------- sign-in (kept by the site itself) */
    const auth = () => {
      try {
        const a = JSON.parse(localStorage.getItem('delcom_auth') || 'null');
        if (!a || !a.isLoggedIn || !a.tokenResponse || !a.tokenResponse.accessToken) return null;
        const tr = a.tokenResponse;
        const exp = ((tr.issuedAt || 0) + (tr.expiresIn || 0)) * 1000;
        return { tok: tr.accessToken, exp, fresh: !exp || Date.now() < exp - 20e3, m: a.member || {} };
      } catch (_) { return null; }
    };
    const me = () => { const a = auth(); return a && a.m && a.m.id ? a : null; };
    const isStaff = () => { const a = me(); return !!a && /personeel|staff|employee/i.test(String(a.m.group || '')); };
    const login = () => {
      ss.set('tm4-sport-login', String(Date.now()));
      location.href = sportOrig('/pages/login');
    };
    function api(path, { authed } = {}) {
      const a = auth();
      const h = { Accept: 'application/json' };
      if (a && (a.fresh || authed)) h.Authorization = 'Bearer ' + a.tok;
      return fetch(SPORT_API + path, { headers: h, credentials: 'omit' }).then((r) => {
        if (r.status === 401 || r.status === 403) { const e = new Error('auth'); e.auth = true; throw e; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }

    /* ---------- settings */
    const favs = () => store.get('sport:fav') || [];
    const setFavs = (v) => store.set('sport:fav', v);
    const FLT = Object.assign({ mine: true, free: false }, store.get('sport:flt') || {});
    const saveFlt = () => store.set('sport:flt', FLT);
    const today = () => ymd(Date.now());
    let DAY = ss.get('tm4-sport-day') || '';
    if (!DAY || DAY < today()) DAY = today();
    const setDay = (d) => { DAY = d; ss.set('tm4-sport-day', d); };
    const DS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
    const nextDays = (n) => Array.from({ length: n }, (_, i) => ymd(addDays(sod(Date.now()), i)));
    const dayChip = (d) => { const x = new Date(fromYmd(d)); return `<button type="button" class="al-day${d === DAY ? ' on' : ''}" data-act="sday" data-d="${d}"><span>${d === today() ? 'vandaag' : DS[x.getDay()]}</span><b>${x.getDate()}</b></button>`; };
    const local = (t) => `${ymd(t)}T${hhmm(t)}`;

    /* ---------- sessions: the public weekly schedule, 14 days at once */
    const nlOf = (p) => { const t = ((p && p.translations) || []).find((x) => x.language === 'nl'); return (t && t.description) || (p && p.description) || ''; };
    // "Badminton voor personeel (alle niveaus)" -> sport "Badminton", level "alle niveaus", staff only
    function nameParts(full) {
      let s = String(full || '').trim();
      let lvl = '';
      const m = /\s*\(([^()]*)\)\s*$/.exec(s);
      if (m) { lvl = m[1].trim(); s = s.slice(0, m.index).trim(); }
      const staff = /\bvoor personeel\b|\bfor staff\b/i.test(s);
      s = s.replace(/\s*\b(voor personeel|for staff)\b\s*/i, ' ').replace(/\s{2,}/g, ' ').trim();
      return { full: String(full || '').trim(), name: s, lvl, staff };
    }
    function slim(b) {
      const lp = b.linkedProduct || {};
      const np = nameParts(nlOf(lp) || lp.description);
      const mine = (b.participations || []).find((p) => !p.memberId || (me() && p.memberId === me().m.id));
      return {
        id: b.id, s: Date.parse(b.startDate), e: Date.parse(b.endDate),
        n: np.name, lvl: np.lvl, staff: np.staff, full: np.full,
        room: (b.product && b.product.description) || '',
        free: b.availableParticipantCount, max: b.maxParticipants,
        walk: !!(lp.noReservationAllowed || (b.product && b.product.noReservationAllowed)),
        course: !!(b.courseId || b.course || lp.isCourse),
        price: lp.price || 0,
        mine: mine ? (mine.id || true) : null,
      };
    }
    const MEM = {};
    function loadSchedule(force) {
      const key = 'sport:s';
      const kept = store.get(key);
      const signed = !!(auth() && auth().fresh);
      if (!force && MEM.s && Date.now() - MEM.s.ts < 10 * 60e3) return MEM.s.p;
      if (!force && kept && Date.now() - kept.ts < 10 * 60e3 && kept.signed === signed) { MEM.s = { ts: kept.ts, p: Promise.resolve(kept.v) }; return MEM.s.p; }
      const from = local(Date.now() - 2 * 3600e3);
      const to = ymd(addDays(sod(Date.now()), 14));
      const q = `/bookings/schedule-bookings?startDateMin=${encodeURIComponent(from)}&startDateMax=${to}&showCourses=true&showBookingsFull=true`;
      const p = api(q).catch((e) => { if (e.auth) return fetch(SPORT_API + q, { credentials: 'omit' }).then((r) => r.json()); throw e; })
        .then((j) => {
          const v = ((j && j.data) || j || []).map(slim).filter((x) => x.s && x.n).sort((a, b) => a.s - b.s || a.n.localeCompare(b.n));
          store.set(key, { ts: Date.now(), signed, v });
          return v;
        });
      MEM.s = { ts: Date.now(), p };
      p.catch(() => { delete MEM.s; });
      return p;
    }
    const peekSchedule = () => { const k = store.get('sport:s'); return k ? k.v : null; };
    const showStaff = () => isStaff();
    const visible = (x) => (showStaff() || !x.staff) && x.e > Date.now();
    const durTxt = (x) => { const m = Math.round((x.e - x.s) / 60e3); return m >= 120 && m % 60 === 0 ? m / 60 + ' u' : m > 90 && m % 30 === 0 ? (m / 60).toString().replace('.', ',') + ' u' : m + ' min'; };
    function pill(x) {
      if (x.mine) return `<span class="sp-pl in">${ico('check')}Ingeschreven</span>`;
      if (x.walk) return '<span class="sp-pl walk">Vrije inloop</span>';
      if (x.free == null) return '';
      if (x.free <= 0) return '<span class="sp-pl full">Vol</span>';
      return `<span class="sp-pl ${x.free <= 3 ? 'few' : 'ok'}">${x.free} vrij</span>`;
    }
    const sessRow = (x, withDay) => `<button type="button" class="sp-row" data-act="ssess" data-id="${x.id}"><span class="sp-tm"><b>${hhmm(x.s)}</b><small>${withDay ? esc(DS[new Date(x.s).getDay()] + ' ' + new Date(x.s).getDate()) : durTxt(x)}</small></span><span class="sp-mn"><b>${esc(x.n)}${x.course ? '<i class="sp-tag">cursus</i>' : ''}</b><span>${esc([x.lvl && !/^alle niveaus$/i.test(x.lvl) ? x.lvl : '', x.room].filter(Boolean).join(' · '))}</span></span>${pill(x)}</button>`;

    /* ---------- router: #/ sessies, #/velden, #/mijn, #/sporten (stars) */
    {
      const r = /^#\/[a-z]*/.test(location.hash) ? location.hash.replace(/[?&]th=(light|dark|auto)\b/, '').replace(/\?$/, '') : '#/';
      try { history.replaceState(null, '', SPORT_APP + (r || '#/')); } catch (_) {}
    }
    const route = () => (location.hash.replace(/^#\/?/, '').split(/[?/]/)[0] || 'sessies');
    let depth = 0, token = 0;
    const nav = (hash, replace) => { if (replace) { location.replace(SPORT_APP + hash); return; } depth++; location.hash = hash; };
    const back = () => { if (depth > 0) { depth--; history.back(); } else location.replace(SPORT_APP + '#/'); };
    const TABS = [{ id: 'sessies', label: 'Sessies' }, { id: 'velden', label: 'Velden' }, { id: 'mijn', label: 'Mijn' }];
    const head = (tab) => `<div class="lt"><h1>Sport</h1><p class="lt-sub">Sportcampus Arenberg</p></div><div class="sp-seg">${segHtml(TABS, tab, 'stab')}</div>`;
    const redraw = () => { const my = ++token; draw(my, true); };
    const draw = (my, keep) => {
      const r = route();
      if (r === 'sporten') viewPick(my);
      else if (r === 'velden') viewFields(my, keep);
      else if (r === 'mijn') viewMine(my, keep);
      else viewSessions(my, keep);
    };
    const show = (anim) => {
      const my = ++token;
      sec.classList.remove('push', 'pop');
      if (anim) { void sec.offsetWidth; sec.classList.add(anim); }
      W.scrollTo(0, 0);
      draw(my);
    };
    let lastLen = history.length;
    W.addEventListener('hashchange', () => {
      const tabSwitch = ['sessies', 'velden', 'mijn'].includes(route()) && sec.querySelector('.sp-seg');
      if (tabSwitch) { const my = ++token; W.scrollTo(0, 0); draw(my); } else show(history.length > lastLen ? 'push' : 'pop');
      lastLen = history.length;
    });
    const navMeer = () => setNav({ title: 'Sport', back: { label: 'Meer', href: PORTAL + '?tm=meer', act: 'smeer' } });
    const errCard = (t) => `<div class="card ko-empty">${ico('warn')}<span>${esc(t || 'Kon niet laden. Trek omlaag om opnieuw te proberen.')}</span></div>`;

    /* ---------- Sessies */
    let SESS = [];
    function viewSessions(my, keep) {
      document.title = 'Sport';
      navMeer();
      const fs = favs();
      const mineMode = FLT.mine && fs.length > 0;
      const render = (list, err) => {
        if (my !== token) return;
        sec.classList.remove('al-busy');
        if (list) SESS = list;
        let h = head('sessies');
        if (!mineMode) h += `<div class="al-days">${nextDays(14).map(dayChip).join('')}</div>`;
        h += `<div class="chips al-flt sp-flt">`
          + (fs.length ? `<button type="button" class="chip${mineMode ? ' on' : ''}" data-act="smine">${ico('star')}Mijn sporten</button><button type="button" class="chip${mineMode ? '' : ' on'}" data-act="sall">Alles</button>` : '')
          + `<button type="button" class="chip${FLT.free ? ' on' : ''}" data-act="sfree">${FLT.free ? ico('check') : ''}Alleen met plaats</button>`
          + `<a class="chip al-all" href="#/sporten">${ico(fs.length ? 'star' : 'plus')}${fs.length ? 'Sporten kiezen' : 'Kies je sporten'}</a></div>`;
        if (!list) h += err ? errCard() : skGroup(6);
        else {
          const ok = (x) => visible(x) && (!FLT.free || x.walk || x.mine || (x.free || 0) > 0);
          if (mineMode) {
            // your sports over the coming two weeks, per day
            const l = list.filter((x) => ok(x) && fs.includes(x.n));
            const byDay = {};
            l.forEach((x) => { (byDay[ymd(x.s)] = byDay[ymd(x.s)] || []).push(x); });
            const ds = Object.keys(byDay).sort();
            if (!ds.length) h += `<div class="card ko-empty">${ico('sport')}<span>Geen sessies van jouw sporten in de komende twee weken${FLT.free ? ' met nog plaats' : ''}.</span></div>`;
            ds.forEach((d) => {
              const t = fromYmd(d);
              h += `<div class="gh">${esc(cap(relDay(t)))}${dayDiff(t, Date.now()) > 1 ? '' : ' · ' + esc(dShort(t))}</div><div class="group sp-g">${byDay[d].map((x) => sessRow(x)).join('')}</div>`;
            });
          } else {
            const l = list.filter((x) => ok(x) && ymd(x.s) === DAY);
            if (!l.length) h += `<div class="card ko-empty">${ico('sport')}<span>${DAY === today() ? 'Vandaag geen sessies meer' : 'Geen sessies op deze dag'}${FLT.free ? ' met nog plaats' : ''}.</span></div>`;
            else h += `<div class="group sp-g">${l.map((x) => sessRow(x)).join('')}</div>`;
          }
        }
        h += `<p class="foot al-foot">Inschrijven doe je op de site van KU Leuven Sport.<br><a href="${esc(sportUrl('/bookings/activities'))}" data-act="sorig" data-p="/bookings/activities">Open KU Leuven Sport</a></p>`;
        put(sec, h);
        watchTitle(sec);
        const on = sec.querySelector('.al-day.on');
        if (on && on.offsetLeft > sec.clientWidth - 80) on.parentNode.scrollLeft = on.offsetLeft - 16;
      };
      const cached = peekSchedule();
      if (cached || !keep) render(cached);
      else sec.classList.add('al-busy');
      loadSchedule().then((l) => render(l), () => { if (!cached) render(null, true); });
    }
    function sessSheet(x) {
      const starred = favs().includes(x.n);
      const t = new Date(x.s);
      const when = `${cap(dLong(x.s))} · ${hhmm(x.s)}–${hhmm(x.e)} (${durTxt(x)})`;
      const places = x.walk ? 'Vrije inloop: je hoeft niet in te schrijven.' : x.free == null ? '' : x.free <= 0 ? `Volzet (${x.max} plaatsen).` : `Nog ${x.free} van de ${x.max} plaatsen vrij.`;
      const go = `/bookings/activities?selectedDate=${ymd(t)}`;
      const { sh, close } = openLayer(`<div class="al-sheet"><div class="al-sheet-in"><b class="al-sheet-t">${esc(x.n)}</b><span class="al-sheet-s">${esc(when)}</span>
        <div class="al-tags2">${x.lvl ? `<span>${esc(cap(x.lvl))}</span>` : ''}${x.course ? '<span>Cursus (lessenreeks)</span>' : ''}${x.staff ? '<span>Voor personeel</span>' : ''}<span>${esc(x.room)}</span></div>
        ${x.mine ? `<p class="sp-ok">${ico('check')}Je bent ingeschreven.</p>` : places ? `<p class="sp-places">${esc(places)}</p>` : ''}
        ${x.walk ? '' : `<a class="btn" href="${esc(sportUrl(go))}" data-x="go">${x.mine ? 'Bekijk of schrijf uit op de site' : x.free > 0 ? 'Inschrijven op KU Leuven Sport' : 'Bekijk op KU Leuven Sport'}</a>`}
        <button type="button" class="sp-star${starred ? ' on' : ''}" data-x="star">${ico('star')}${starred ? `${esc(x.n)} staat bij je sporten` : `${esc(x.n)} bij mijn sporten zetten`}</button>
        ${x.walk ? '' : `<p class="sp-note">Op de site tik je op ${esc(x.n)} om ${hhmm(x.s)} en dan op Reserveer. Daarvoor heb je een sportkaart nodig.</p>`}</div></div>`, '', x.n);
      sh.addEventListener('click', (e) => {
        const b = e.target.closest('[data-x]');
        if (!b) return;
        if (b.dataset.x === 'star') {
          const fs = favs();
          setFavs(fs.includes(x.n) ? fs.filter((s) => s !== x.n) : fs.concat(x.n));
          close();
          redraw();
        }
      });
    }

    /* ---------- pick your sports */
    function viewPick(my) {
      document.title = 'Mijn sporten';
      setNav({ title: 'Mijn sporten', back: { label: 'Sport', href: '#/', act: 'sback' } });
      const render = (list, err) => {
        if (my !== token) return;
        const fs = favs();
        let h = `<div class="lt"><h1>Mijn sporten</h1><p class="lt-sub">Zet een ster bij wat je doet. Onder Mijn sporten zie je dan alleen die sessies, de komende twee weken.</p></div>`;
        if (!list) h += err ? errCard() : skGroup(8);
        else {
          const names = {};
          list.filter((x) => showStaff() || !x.staff).forEach((x) => { const n = names[x.n] || (names[x.n] = { n: x.n, c: 0, walk: true }); n.c++; if (!x.walk) n.walk = false; });
          fs.forEach((n) => { if (!names[n]) names[n] = { n, c: 0, walk: false }; });
          const all = Object.values(names).sort((a, b) => a.n.localeCompare(b.n, 'nl'));
          const rowOf = (s) => `<div class="row al-row"><button type="button" class="al-open" data-act="sstar" data-s="${esc(s.n)}"><span class="main"><span class="t">${esc(s.n)}</span><span class="s">${s.c ? `${s.c} ${s.c === 1 ? 'sessie' : 'sessies'} in 2 weken${s.walk ? ' · vrije inloop' : ''}` : 'Nu geen sessies'}</span></span></button><button type="button" class="al-star${fs.includes(s.n) ? ' on' : ''}" data-act="sstar" data-s="${esc(s.n)}" aria-label="${fs.includes(s.n) ? 'Ster weghalen' : 'Ster geven'}">${ico('star')}</button></div>`;
          const letters = {};
          all.forEach((s) => { const l = fold(s.n[0] || '#').toUpperCase(); (letters[l] = letters[l] || []).push(s); });
          Object.keys(letters).sort().forEach((l) => { h += `<div class="gh">${esc(l)}</div><div class="group">${letters[l].map(rowOf).join('')}</div>`; });
          h += `<div class="al-done"><button type="button" class="btn" data-act="sdone">${fs.length ? `Klaar (${fs.length})` : 'Klaar'}</button></div>`;
        }
        put(sec, `<div class="al-pick">${h}</div>`);
        watchTitle(sec);
      };
      render(peekSchedule());
      loadSchedule().then((l) => render(l), () => { if (!peekSchedule()) render(null, true); });
    }

    /* ---------- Velden: free hours to rent a field */
    let FIELDS = null; // [{k, n, tag}]
    function fieldTags() {
      if (FIELDS) return Promise.resolve(FIELDS);
      const kept = store.get('sport:ft');
      if (kept && Date.now() - kept.ts < 7 * 864e5) { FIELDS = kept.v; return Promise.resolve(FIELDS); }
      return api('/public/tags?filter=activeState%7C%7C$eq%7C%7C1').then((j) => {
        const tags = (j && j.data) || j || [];
        const v = SPORT_FIELDS.map((f) => { const t = tags.find((x) => f.re.test(x.description_nl || x.description_en || '')); return t ? { k: f.k, n: t.description_nl || f.n, tag: t.id } : null; }).filter(Boolean);
        store.set('sport:ft', { ts: Date.now(), v });
        FIELDS = v;
        return v;
      });
    }
    const FMEM = {};
    function loadField(f, d) {
      const k = f.tag + '|' + d;
      if (FMEM[k] && Date.now() - FMEM[k].ts < 5 * 60e3) return FMEM[k].p;
      const p = api('/tags/query/availableActivityTagsAndProductIds?tagIds=' + f.tag).then((j) => {
        const ids = [...new Set(((j && (j.productIds || j.activityProductIds || (j.data && j.data.productIds))) || (Array.isArray(j) ? j.flatMap((x) => x.productIds || x.activityProductIds || (x.productId ? [x.productId] : [])) : [])))];
        if (!ids.length) return [];
        const s = JSON.stringify({ activityProductIds: { $in: ids }, startDate: { $gte: d + 'T00:00:00' }, endDate: { $lte: d + 'T23:59:59' } });
        return api('/products/bookable-slots?s=' + encodeURIComponent(s)).then((r) => {
          const slots = ((r && r.data) || r || []).map((x) => ({
            s: Date.parse(x.startDate), e: Date.parse(x.endDate),
            price: x.price != null ? x.price : (x.product && x.product.price),
            free: x.isAvailable != null ? !!x.isAvailable : x.available != null ? !!x.available : x.availableCount != null ? x.availableCount > 0 : true,
          })).filter((x) => x.s);
          // the same hour on several fields: one chip, free when any field is free
          const by = {};
          slots.forEach((x) => { const o = by[x.s]; if (!o) by[x.s] = Object.assign({ n: 1 }, x); else { o.n++; o.free = o.free || x.free; if (o.price == null) o.price = x.price; } });
          return Object.values(by).sort((a, b) => a.s - b.s);
        });
      });
      FMEM[k] = { ts: Date.now(), p };
      p.catch(() => { delete FMEM[k]; });
      return p;
    }
    const eur = (v) => (v == null ? '' : '€ ' + (Math.round(v * 100) % 100 ? v.toFixed(2).replace('.', ',') : String(Math.round(v))));
    function viewFields(my, keep) {
      document.title = 'Velden';
      navMeer();
      const RES = {};
      const render = () => {
        if (my !== token) return;
        sec.classList.remove('al-busy');
        let h = head('velden');
        h += `<div class="al-days">${nextDays(14).map(dayChip).join('')}</div>`;
        if (!FIELDS) h += RES.err ? errCard() : skGroup(4);
        else if (!FIELDS.length) h += errCard('Geen velden gevonden.');
        else {
          FIELDS.forEach((f) => {
            const r = RES[f.k];
            const now = Date.now();
            let body;
            if (r === undefined) body = '<div class="sp-slots"><span class="sk" style="width:60%;display:block;height:30px"></span></div>';
            else if (r === null) body = `<p class="sp-none">Kon niet laden. <a href="${esc(sportUrl('/bookings/rent?tags=' + f.tag))}" data-act="sorig" data-p="/bookings/rent?tags=${f.tag}">Bekijk op de site</a></p>`;
            else {
              const l = r.filter((x) => x.e > now);
              body = l.length ? `<div class="sp-slots">${l.map((x) => `<button type="button" class="sp-slot${x.free ? '' : ' x'}" data-act="sslot" data-k="${f.k}" data-t="${x.s}">${hhmm(x.s)}</button>`).join('')}</div>` : `<p class="sp-none">Geen vrije uren gevonden. <a href="${esc(sportUrl('/bookings/rent?tags=' + f.tag))}" data-act="sorig" data-p="/bookings/rent?tags=${f.tag}">Bekijk op de site</a></p>`;
            }
            const one = r && r.find((x) => x.price != null);
            const len = r && r[0] ? Math.round((r[0].e - r[0].s) / 60e3) + ' min' : '';
            h += `<div class="card sp-field"><div class="sp-fh"><b>${esc(f.n)}</b><span>${esc([len, one ? eur(one.price) : ''].filter(Boolean).join(' · '))}</span></div>${body}</div>`;
          });
        }
        h += `<p class="foot al-foot">Een veld huur en betaal je op de site van KU Leuven Sport.</p>`;
        put(sec, h);
        watchTitle(sec);
        const on = sec.querySelector('.al-day.on');
        if (on && on.offsetLeft > sec.clientWidth - 80) on.parentNode.scrollLeft = on.offsetLeft - 16;
      };
      render();
      fieldTags().then((fs) => {
        if (my !== token) return;
        render();
        fs.forEach((f) => loadField(f, DAY).then((v) => { RES[f.k] = v; render(); }, () => { RES[f.k] = null; render(); }));
      }, () => { RES.err = true; render(); });
    }
    function slotSheet(f, t) {
      const go = `/bookings/rent?tags=${f.tag}`;
      sheet({ title: `${f.n} · ${cap(dShort(t))} om ${hhmm(t)}`, msg: 'Je kiest het veld en betaalt op de site van KU Leuven Sport. Kies daar dezelfde dag.', actions: [{ label: 'Huren op KU Leuven Sport', run: () => goTo(sportOrig(go)) }] });
    }

    /* ---------- Mijn: sportkaart, subscriptions, bookings */
    function viewMine(my) {
      document.title = 'Mijn sport';
      navMeer();
      const a = me();
      let h = head('mijn');
      if (!a) {
        h += `<div class="card sp-login">${ico('lock')}<b>Log in om je sportkaart en reservaties te zien</b><span>Met je KU Leuven-account, zoals op de site van KU Leuven Sport.</span><button type="button" class="btn" data-act="slogin">Inloggen</button></div>`;
        h += buyBlock(false);
        put(sec, h);
        watchTitle(sec);
        return;
      }
      const R = { subs: undefined, list: undefined };
      const render = () => {
        if (my !== token) return;
        let x = head('mijn');
        x += `<div class="group plain sp-me"><div class="prof"><span class="avatar">${esc(initials(((a.m.firstName || '') + ' ' + (a.m.lastName || '')).trim() || 'KU L'))}</span><span class="main"><span class="t">${esc(((a.m.firstName || '') + ' ' + (a.m.lastName || '')).trim())}</span><span class="s">${esc([a.m.group, a.m.cardNumber ? 'kaart ' + a.m.cardNumber : ''].filter(Boolean).join(' · '))}</span></span></div></div>`;
        // sportkaart and subscriptions
        if (R.subs === undefined) x += `<div class="gh">Sportkaart en abonnementen</div>${skGroup(1)}`;
        else if (R.subs === 'auth') x += `<div class="card sp-login">${ico('lock')}<b>Je moet opnieuw inloggen</b><button type="button" class="btn" data-act="slogin">Inloggen</button></div>`;
        else if (R.subs === null) x += `<div class="gh">Sportkaart en abonnementen</div>${errCard()}`;
        else if (!R.subs.length) x += `<div class="gh">Sportkaart en abonnementen</div><div class="card sp-card none"><span class="sp-ci">${ico('idcard')}</span><span><b>Geen sportkaart</b><small>Met een sportkaart (€ 37 per jaar) schrijf je je gratis in voor de wekelijkse sessies.</small></span></div>`;
        else x += `<div class="gh">Sportkaart en abonnementen</div>${R.subs.map((s) => `<div class="card sp-card"><span class="sp-ci">${ico('check')}</span><span><b>${esc(s.n)}</b><small>${esc(s.until ? 'Geldig tot ' + dLong(s.until) + (new Date(s.until).getFullYear() !== new Date().getFullYear() ? ' ' + new Date(s.until).getFullYear() : '') : 'Actief')}</small></span></div>`).join('')}`;
        // your sessions in the coming two weeks
        x += `<div class="gh">Ingeschreven</div>`;
        if (R.list === undefined) x += skGroup(2);
        else if (R.list === null) x += errCard();
        else if (!R.list.length) x += `<div class="card ko-empty">${ico('calendar')}<span>Je bent voor geen sessies ingeschreven de komende twee weken.</span></div>`;
        else x += `<div class="group sp-g">${R.list.map((s) => sessRow(s, true)).join('')}</div>`;
        x += `<div class="group" style="margin-top:16px">${row({ act: 'sorig', attrs: ' data-p="/upcoming/bookings"', iconHtml: `<span class="ic" style="--c:#2fb36b">${ico('calendar')}</span>`, title: 'Al mijn reservaties', sub: 'Ook velden, op de site van KU Leuven Sport', external: true })}</div>`;
        x += buyBlock(R.subs && R.subs.length);
        put(sec, x);
        watchTitle(sec);
      };
      render();
      api(`/subscribers?s=${encodeURIComponent(JSON.stringify({ memberId: a.m.id }))}&join=subscription&join=subscription.translations`, { authed: true }).then((j) => {
        const now = Date.now();
        const l = ((j && j.data) || j || []).map((s) => {
          const sub = s.subscription || {};
          const until = Date.parse(s.endDate || s.dateEnd || s.validUntil || s.expirationDate || '') || null;
          const start = Date.parse(s.startDate || s.dateStart || '') || null;
          return { n: nlOf(sub) || sub.description || 'Abonnement', until, start, off: s.isCancelled || s.cancelled || s.status === 'cancelled' };
        }).filter((s) => !s.off && (!s.until || s.until > now) && (!s.start || s.start < now + 400 * 864e5));
        R.subs = l;
        render();
      }, (e) => { R.subs = e.auth ? 'auth' : null; render(); });
      loadSchedule(true).then((l) => { R.list = l.filter((s) => s.mine && s.e > Date.now()); render(); }, () => { R.list = null; render(); });
    }
    function buyBlock(has) {
      return `<div class="gh">${has ? 'Meer kopen' : 'Sportkaart kopen'}</div><div class="group">${row({ act: 'sorig', attrs: ' data-p="/shop/items?type=subscription"', iconHtml: `<span class="ic" style="--c:#2fb36b">${ico('idcard')}</span>`, title: has ? 'Abonnementen en fitness' : 'Sportkaart', sub: has ? 'Fitness & Go, Fitness & More' : 'Studenten € 37 per jaar · fitness kan erbij', external: true })}${row({ act: 'sorig', attrs: ' data-p="/shop/items?type=course"', iconHtml: `<span class="ic" style="--c:#e8893a">${ico('sport')}</span>`, title: 'Cursussen', sub: 'Lessenreeksen met inschrijving', external: true })}</div>`;
    }

    /* ---------- taps */
    W.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('#tm-tabs a');
      if (t) { e.preventDefault(); goTo(t.getAttribute('href'), { dir: 'back' }); return; }
      const a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (a) { e.preventDefault(); nav(a.getAttribute('href')); return; }
      const b = e.target.closest && e.target.closest('[data-act]');
      if (!b || b.closest('.sheet')) return;
      const act = b.dataset.act;
      if (!/^s/.test(act)) return;
      e.preventDefault();
      if (act === 'smeer') goTo(PORTAL + '?tm=meer', { dir: 'back' });
      else if (act === 'sback') back();
      else if (act === 'stab') { const id = b.dataset.id; segSet(sec, id); nav(id === 'sessies' ? '#/' : '#/' + id, true); }
      else if (act === 'sday') { setDay(b.dataset.d); redraw(); }
      else if (act === 'smine') { FLT.mine = true; saveFlt(); redraw(); }
      else if (act === 'sall') { FLT.mine = false; saveFlt(); redraw(); }
      else if (act === 'sfree') { FLT.free = !FLT.free; saveFlt(); redraw(); }
      else if (act === 'ssess') { const x = SESS.find((s) => String(s.id) === b.dataset.id) || (peekSchedule() || []).find((s) => String(s.id) === b.dataset.id); if (x) sessSheet(x); }
      else if (act === 'sstar') {
        const s = b.dataset.s, fs = favs();
        setFavs(fs.includes(s) ? fs.filter((x) => x !== s) : fs.concat(s));
        viewPick(token); // in place: the list stays where it is
      } else if (act === 'sdone') { FLT.mine = favs().length > 0; saveFlt(); if (depth > 0) back(); else nav('#/', true); }
      else if (act === 'sslot') { const f = (FIELDS || []).find((x) => x.k === b.dataset.k); if (f) slotSheet(f, Number(b.dataset.t)); }
      else if (act === 'slogin') login();
      else if (act === 'sorig') goTo(sportOrig(b.dataset.p || '/'));
    });
    // links straight to the site (sheets): mark this visit as "the original site"
    document.addEventListener('click', (e) => {
      const l = e.target.closest && e.target.closest('a[href^="https://usc.kuleuven.cloud/"]');
      if (l) ss.set('tm4-classic-sport', String(Date.now()));
    }, true);
    pullRefresh(() => { Object.keys(MEM).forEach((k) => delete MEM[k]); Object.keys(FMEM).forEach((k) => delete FMEM[k]); store.del('sport:s'); show(); return new Promise((r) => setTimeout(r, 700)); });
    let away = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') away = Date.now();
      else if (away && Date.now() - away > 3 * 60e3) { if (DAY < today()) setDay(today()); delete MEM.s; show(); }
    });
    W.addEventListener('pageshow', (e) => { if (e.persisted) { ss.del('tm4-classic-sport'); delete MEM.s; show(); } });
    show();
  }
