  /* ================================================================== KURT (study places) */
  // kurt3.ghum.kuleuven.be is KU Leuven's study place booking app (Angular, JSON API under /api/, same origin, signed in
  // through the KU Leuven login). The app rebuilds it: your bookings and the libraries with live occupancy first, a
  // library shows its rooms with how many seats are free at the chosen hour, and a room opens straight on its floor
  // plan: tap a green seat, pick until when, book. Things the app doesn't cover (group rooms, laptops, check-in)
  // open KURT's own pages (?tm=orig).
  function kurtApp() {
    const K = location.origin;
    const ORIG = (p) => K + (p || '/') + ((p || '/').includes('?') ? '&' : '?') + 'tm=orig';
    takeover('Studieplek', []);
    buildShell([
      { id: 'vandaag', label: 'Vandaag', icon: 'house', href: PORTAL + '?tm=vandaag' },
      { id: 'vakken', label: 'Vakken', icon: 'book', href: PORTAL + '?tm=vakken' },
      { id: 'rooster', label: 'Rooster', icon: 'calendar', href: PORTAL + '?tm=rooster' },
      { id: 'updates', label: 'Updates', icon: 'bell', href: PORTAL + '?tm=updates' },
      { id: 'meer', label: 'Meer', icon: 'grid', href: PORTAL + '?tm=meer' },
    ], 'meer');
    const main = $('#tm-main');
    const sec = document.createElement('section');
    sec.className = 'view on';
    sec.setAttribute('data-tm4', '');
    main.appendChild(sec);
    keepAlive('kurt', [[K + '/api/information']]);

    /* ---------- data */
    const get = (p) => api(K + '/api' + p, { cache: 'no-store' });
    const send = async (method, p, body) => {
      const r = await fetch(K + '/api' + p, { method, credentials: 'include', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const txt = await r.text();
      let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (_) {}
      if (!r.ok) { const e = new Error((typeof j === 'string' && j) || (j && (j.detail || j.message || j.title || j.error)) || txt.slice(0, 200) || 'HTTP ' + r.status); e.status = r.status; throw e; }
      return j;
    };
    let ME = store.get('kurt:me');
    const meP = get('/information').then((m) => { ME = m; store.set('kurt:me', m); return m; });
    // not signed in: KURT's own /login sends you through the KU Leuven login and back here
    const signIn = () => {
      const last = Number(ss.get('tm4-kurt-login')) || 0;
      if (Date.now() - last > 60e3) { ss.set('tm4-kurt-login', String(Date.now())); location.replace(K + '/login?returnUrl=' + encodeURIComponent(location.href)); return true; }
      return false;
    };
    meP.catch((e) => {
      if ((e && e.auth) || (e instanceof TypeError)) {
        if (!signIn()) put(sec, empty('lock', 'Niet aangemeld bij KURT', 'Meld je aan met je KU Leuven-account.', `<p style="margin-top:14px"><a class="btn" href="${esc(K + '/login?returnUrl=' + encodeURIComponent(location.href))}">Aanmelden</a></p>`));
      }
    });

    const nm = (s) => String(s || '').replace(/^.*? - /, '').replace(/\bSilent Study Seat\b/i, 'Plaats').replace(/\bStudy Seat\b/i, 'Plaats').trim() || s;
    const seatNo = (s) => (/(\d+[A-Za-z]?)\s*$/.exec(String(s || '')) || [])[1] || nm(s);
    const NL_TYPES = { 302: 'Studieplek', 303: 'Collectieplek', 1: 'Groepswerkruimte', 307: 'Videocallplek', 55: 'Mediaruimte', 12: 'Laptop', 11: 'Audiokit', 22: 'Pentablet', 48: 'Podcastset', 13: 'Projectorkit', 14: 'Videokit', 15: 'Webconferentiekit', 101: 'Databank-pc', 52: 'Bibliotheekspel', 56: 'Studio', 21: 'Camerakit' };
    const NL_TAGS = { 'power socket nearby': 'Stopcontact', silence: 'Stilte', 'adjustable desk': 'Verstelbaar bureau', 'desk lamp': 'Bureaulamp', window: 'Aan het raam', screen: 'Scherm' };
    const NL_CITY = { Leuven: 'Leuven', Antwerp: 'Antwerpen', Bruges: 'Brugge', Brussels: 'Brussel', Kortrijk: 'Kortrijk', 'Learning Lab': 'Learning Lab' };
    const hours = (s) => { const m = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? `${m[1]}:${m[2]}–${m[3]}:${m[4]}` : ''; };
    const shortUnit = (u) => String(u || '').replace(/ Learning Centre$/, '').replace(/^Vleminckxveld /, '').replace(/ Library$/, '').replace(/^Institute of Philosophy$/, 'Filosofie').replace(/^Law and Criminology$/, 'Rechten').replace(/^Economics and Business$/, 'Economie').replace(/^Social Sciences$/, 'Sociale Wet.').replace(/^Antwerp$/, 'Antwerpen').replace(/^2Bergen Bruges$/, 'Brugge');
    const openTxt = (l) => (l.closedToday || /closed/i.test(l.openingHoursToday || '') ? 'Vandaag gesloten' : hours(l.openingHoursToday) ? 'Open ' + hours(l.openingHoursToday) : '');
    const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
    const hm = (min) => pad(Math.floor(min / 60)) + ':' + pad(min % 60);
    const dur = (min) => (min % 60 ? `${Math.floor(min / 60)} u ${min % 60}` : `${min / 60} u`);
    const dayLbl = (v) => { const t = fromYmd(v); const n = dayDiff(t, Date.now()); return n === 0 ? 'Vandaag' : n === 1 ? 'Morgen' : cap(dShort(t)); };
    const enDate = (v) => new Date(fromYmd(v)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '');
    const occBar = (o) => {
      if (!o || !o.capacity) return '';
      const p = Math.min(100, Math.round((o.occupancy / o.capacity) * 100));
      return `<span class="ko-bar${p >= 90 ? ' full' : p >= 70 ? ' busy' : ''}"><i style="width:${p}%"></i></span>`;
    };
    const occTxt = (o) => (o && o.capacity ? (o.closed ? 'gesloten' : `${Math.max(0, o.capacity - o.occupancy)} van ${o.capacity} vrij`) : '');
    const favs = () => store.get('kurt:fav') || [];
    const seatFavs = () => store.get('kurt:seats') || [];
    const isSeatFav = (rid) => seatFavs().some((f) => f.rid === rid);
    const GROUP = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.2" r="3.2"/><path d="M3.2 19.6c.5-3.4 2.9-5.4 5.8-5.4s5.3 2 5.8 5.4"/><circle cx="16.8" cy="9.2" r="2.5"/><path d="M15.6 14.4c2.6-.5 4.7 1.2 5.2 4.4"/></svg>';
    const TRASH = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.8h15M9.5 6.8V4.6h5v2.2M6.6 6.8l.9 12.4a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12.4M10.2 10.6v6.4M13.8 10.6v6.4"/></svg>';
    const STAR = (on) => `<svg class="i kstar${on ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/></svg>`;
    // known rooms (from the libraries you opened): id -> { l: library, n: name, t: resource types }, so a floor plan opens without asking KURT first
    const ZONES = store.get('kurt:zones') || {};
    const keepZones = (lid, zones) => { (zones || []).forEach((z) => { ZONES[z.id] = { l: Number(lid), n: (z.name || '').trim(), t: z.resourceTypeIds || [] }; }); store.set('kurt:zones', ZONES); };
    // answers KURT gave a moment ago are reused while you move between screens and when the page is opened again
    // (library -> floor plan opens at once). Kept in memory and in sessionStorage; cleared after booking or cancelling.
    const MEM = new Map();
    const MK = 'tm4-km:';
    const memo = (key, maxAge, fn) => {
      const c = MEM.get(key);
      if (c && Date.now() - c.ts < maxAge) return c.p;
      try {
        const sv = JSON.parse(sessionStorage.getItem(MK + key) || 'null');
        if (sv && Date.now() - sv.ts < maxAge) { const pv = Promise.resolve(sv.v); MEM.set(key, { ts: sv.ts, p: pv }); return pv; }
      } catch (_) {}
      const ts = Date.now();
      const pr = fn().then((v) => { try { sessionStorage.setItem(MK + key, JSON.stringify({ ts, v })); } catch (_) {} return v; });
      MEM.set(key, { ts, p: pr });
      pr.catch(() => MEM.delete(key));
      return pr;
    };
    const memoClear = () => {
      MEM.clear();
      try { Object.keys(sessionStorage).filter((k) => k.startsWith(MK)).forEach((k) => sessionStorage.removeItem(k)); } catch (_) {}
    };
    const parFor = (lid, types) => memo(`par:${lid}:${mainType(types)}`, 10 * 60e3, () => get(`/parameters?locationId=${lid}&resourceTypeId=${mainType(types)}`));
    const zoneAvail = (lid, zid, d, t) => memo(`za:${zid}:${d}:${t}`, 90e3, () => get(`/zoneavailabilities?locationId=${lid}&zoneId=${zid}&startDate=${d}&startTime=${t}`));
    // when do you want to come? One choice for the whole app (this visit); "Nu" = the first hour you can still book
    const WHEN = {
      get() { try { const w = JSON.parse(ss.get('tm4-kurt-when') || 'null'); return w && w.d >= ymd(Date.now()) ? w : null; } catch (_) { return null; } },
      set(w) { if (w) ss.set('tm4-kurt-when', JSON.stringify(w)); else ss.del('tm4-kurt-when'); },
    };

    /* ---------- router: #/ home, #/l/<location>, #/z/<zone>[?seat=<resource>], #/g/<location>[?d=<day>] group rooms */
    // KURT's own addresses (/locations/10, /zone/1) become the app's
    {
      const m = /^\/(locations|zone)\/(\d+)/.exec(location.pathname);
      const r = m ? `#/${m[1] === 'zone' ? 'z' : 'l'}/${m[2]}` : (/^#\//.test(location.hash) ? location.hash : '#/');
      try { history.replaceState(null, '', K + '/' + r); } catch (_) {}
    }
    const route = () => {
      const h = location.hash.replace(/^#/, '') || '/';
      const [path, q] = h.split('?');
      const p = path.split('/').filter(Boolean);
      return { name: p[0] || 'home', id: p[1] || '', q: new URLSearchParams(q || '') };
    };
    let depth = 0;
    const nav = (hash) => { depth++; location.hash = hash; };
    const back = () => { if (depth > 0) { depth--; history.back(); } else { const r = route(); location.replace(K + '/' + (r.name === 'z' && zoneLoc[r.id] ? '#/l/' + zoneLoc[r.id] : r.name === 'g' ? '#/l/' + r.id : '#/')); } };
    const zoneLoc = store.get('kurt:zl') || {};
    let token = 0, keepY = 0;
    const show = (anim) => {
      const my = ++token;
      const r = route();
      closeBook();
      document.body.classList.toggle('kfull', r.name === 'z');
      sec.classList.remove('push', 'pop');
      if (anim) { void sec.offsetWidth; sec.classList.add(anim); }
      W.scrollTo(0, keepY); keepY = 0;
      if (r.name === 'l') viewLoc(r.id, my);
      else if (r.name === 'z') viewZone(r.id, r.q, my);
      else if (r.name === 'g') viewGroup(r.id, r.q, my);
      else viewHome(my);
    };
    let lastLen = history.length, quiet = false;
    W.addEventListener('hashchange', () => { show(quiet ? '' : history.length > lastLen ? 'push' : 'pop'); quiet = false; lastLen = history.length; });

    /* ---------- home */
    // the libraries and their opening hours change once a day: fetched once a day; occupancy every time
    async function locData() {
      const today = ymd(Date.now());
      const old = store.get('kurt:locinfo');
      let tiles, info;
      if (old && old.day === today && old.tiles && old.v === 2) ({ tiles, info } = old);
      else {
        tiles = await get('/tiles');
        info = {};
        await Promise.all(tiles.flatMap((t) => t.locations).map((loc) => Promise.all([get('/locations/' + loc.id), get('/resourcetypes?locationId=' + loc.id).catch(() => [])]).then(([l, ty]) => {
          info[loc.id] = { unit: l.unit, address: l.address, openingHoursToday: l.openingHoursToday, closedToday: l.closedToday, zones: (l.zones || []).length, types: (ty || []).map((x) => x.id) };
          keepZones(loc.id, l.zones);
        }, () => {})));
        store.set('kurt:locinfo', { day: today, tiles, info, v: 2 });
      }
      const extra = {};
      await Promise.all(tiles.flatMap((t) => t.locations).map((loc) => get('/occupancies/' + loc.id).then((o) => o, () => null).then((o) => {
        extra[loc.id] = { l: info[loc.id], o: o && { capacity: o.capacity, occupancy: o.occupancy, closed: o.closed } };
      })));
      return { tiles, extra };
    }
    /* ---------- check in / check out (KURT's own /check-in page does the same: POST /validations/) */
    // a booking says "Booked" until you check in; remember our own check-ins too, KURT may be slow to show them
    const ciMap = () => { const m = store.get('kurt:ci') || {}; Object.keys(m).forEach((k) => { if (Date.now() - m[k] > 20 * 3600e3) delete m[k]; }); return m; };
    const isIn = (r) => !/checked[ -]?out|uitgecheckt/i.test(r.status || '') && (/checked[ -]?in|ingecheckt/i.test(r.status || '') || !!ciMap()[r.id]);
    const setIn = (id, on) => { const m = ciMap(); if (on) m[id] = Date.now(); else delete m[id]; store.set('kurt:ci', m); };
    // KURT's messages are a little markdown: keep bold and line breaks, drop links to its own pages
    const md = (t) => esc(String(t || '')).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    function ciDone(ok, title, sub, msgs) {
      const { layer, close } = openLayer(`<div class="sg upd-c">
        <span class="upd-ok${ok ? '' : ' warn'}">${ico(ok ? 'check' : 'warn')}</span>
        <h2>${esc(title)}</h2>
        ${sub ? `<p class="upd-v">${esc(sub)}</p>` : ''}
        ${msgs && msgs.length ? `<div class="kci-msg">${msgs.map((m) => `<p>${md(m)}</p>`).join('')}</div>` : ''}
        <button type="button" class="btn upd-go">Klaar</button></div>`, 'upd-layer', title);
      layer.querySelector('.upd-go').addEventListener('click', close);
    }
    async function validate(b, action) {
      const { r: rid, id, n } = b.dataset;
      const label = b.textContent;
      b.disabled = true; b.innerHTML = `<span class="spin"></span> ${action === 10 ? 'Inchecken' : 'Uitchecken'}…`;
      let res;
      try { res = await send('POST', '/validations/', { resourceId: Number(rid), action }); }
      catch (err) { b.disabled = false; b.textContent = label; ciDone(false, action === 10 ? 'Inchecken lukte niet' : 'Uitchecken lukte niet', n, [err.message || 'Probeer het straks opnieuw.']); return; }
      const st = res && res.status, msgs = (res && res.messages) || [];
      if (st === 10 || st === 13) setIn(id, true);
      if (st === 14) setIn(id, false);
      store.del('kurt:res'); memoClear(); show();
      if (st === 10) ciDone(true, 'Ingecheckt', n, msgs);
      else if (st === 13) ciDone(true, 'Je bent al ingecheckt', n, msgs);
      else if (st === 14) ciDone(true, 'Uitgecheckt', n, msgs);
      else if (st === 11) ciDone(false, 'Geen reservatie op deze plaats', n, msgs);
      else ciDone(false, action === 10 ? 'Inchecken lukte niet' : 'Uitchecken lukte niet', n, msgs);
    }

    function locRow(loc, x) {
      const l = (x && x.l) || {};
      const o = x && x.o;
      const closed = l.closedToday || /closed/i.test(l.openingHoursToday || '');
      const sub = [openTxt(l), !closed && occTxt(o)].filter(Boolean).join(' · ');
      const th = loc.thumbnailUrl ? `<span class="ko-th" style="background-image:url('${esc(K + '/' + loc.thumbnailUrl)}')"></span>` : `<span class="ic soft">${ico('seat')}</span>`;
      return row({ href: '#/l/' + loc.id, iconHtml: th, title: loc.unit, subHtml: `${esc(sub || l.address || '')}${closed ? '' : occBar(o)}`, cls: 'ko-row' + (closed ? ' off' : '') });
    }
    function warm(lid) {
      const L = store.get('kurt:loc:' + lid);
      const zp = L && L.l && L.l.zones ? Promise.resolve(L.l.zones)
        : memo('loc:' + lid, 10 * 60e3, () => get('/locations/' + lid)).then((l) => { keepZones(lid, l.zones); return l.zones || []; });
      return zp.then((zones) => {
        if (!zones.length) return null;
        return parFor(lid, zones[0].resourceTypeIds).then((par) => {
          const sel = pickTime(par);
          if (sel.t) zones.forEach((z) => zoneAvail(lid, z.id, sel.d.value, sel.t.value).catch(() => {}));
        });
      }).catch(() => {});
    }
    // start loading the moment a finger touches a library or room, not when the tap ends
    document.addEventListener('pointerdown', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#/"]');
      const m = a && /^#\/(l|z)\/(\d+)/.exec(a.getAttribute('href'));
      if (!m) return;
      const lid = m[1] === 'l' ? m[2] : ZONES[m[2]] && ZONES[m[2]].l;
      if (lid) warm(lid);
    }, { passive: true });
    function viewHome(my) {
      document.title = 'Studieplek';
      setNav({ title: 'Studieplek', back: { label: 'Meer', href: PORTAL + '?tm=meer', act: 'meer' } });
      const draw = (d) => {
        if (my !== token) return;
        const { tiles, extra } = d.loc || { tiles: null, extra: {} };
        const name = (ME && ME.firstName) || '';
        let h = `<div class="lt"><h1>Studieplek</h1><p class="lt-sub">KURT${name ? ' · hoi ' + esc(name) : ''}</p></div>`;
        // bookings: always first
        const res = (d.res || []).slice().sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime));
        h += `<div class="sh"><h2>Mijn reservaties</h2>${res.length ? `<span class="sh-note">${res.length}</span>` : ''}</div>`;
        if (d.res === undefined) h += skGroup(1);
        else if (!res.length) h += `<div class="card ko-empty">${ico('seat')}<span>Je hebt geen reservaties. Kies hieronder een favoriet of een bibliotheek.</span></div>`;
        else {
          h += res.map((r) => {
            const now = Date.now(), s = fromYmd(r.startDate, r.startTime), e = r.endTime === '00:00' ? fromYmd(r.endDate, '24:00') : fromYmd(r.endDate, r.endTime);
            const live = now >= s - 15 * 60e3 && now < e;
            // a booking only names its seat ("Agora - Silent Study Seat 111"): find its library by that prefix
            const pre = fold(String(r.resourceName || '').split(' - ')[0]);
            const locs = d.loc ? d.loc.tiles.flatMap((t) => t.locations) : [];
            const w1 = pre.split(' ')[0];
            const hit = r.locationId ? locs.find((l) => l.id === r.locationId) : pre && (locs.find((l) => fold(l.unit).startsWith(pre) || fold(l.unit).includes(pre)) || (w1.length > 3 && locs.find((l) => fold(l.unit).startsWith(w1))));
            const isRoom = !/\d\s*$/.test(String(r.resourceName || ''));
            const lid = hit ? hit.id : r.locationId;
            const unit = hit ? hit.unit : '';
            const cin = live && isIn(r);
            const dn = esc(nm(r.resourceName) + ' · ' + dayLbl(r.startDate) + ' ' + r.startTime + '–' + (r.endTime === '00:00' ? '24:00' : r.endTime));
            return `<div class="card kr${live ? ' live' : ''}"><div class="kr-top">${isRoom ? `<span class="kr-seat kr-room">${GROUP}</span>` : `<span class="kr-seat">${esc(seatNo(r.resourceName))}</span>`}<span class="kr-main"><b>${esc(isRoom ? 'Groepsruimte ' + nm(r.resourceName) : nm(r.resourceName))}</b><span>${esc(unit || (r.resourceName || '').split(' - ')[0])}</span></span><button type="button" class="kr-del" data-act="cancel" data-id="${esc(r.id)}" data-n="${esc(nm(r.resourceName) + ' · ' + dayLbl(r.startDate) + ' ' + r.startTime)}" aria-label="Reservatie verwijderen">${TRASH}</button></div>
              <div class="kr-when">${ico('clock')}<span><b>${esc(dayLbl(r.startDate))}</b> ${esc(r.startTime)}–${esc(r.endTime === '00:00' ? '24:00' : r.endTime)}${cin ? ' · <em>ingecheckt</em>' : live ? ' · <em>nu</em>' : ` · ${esc(until(s))}`}</span></div>
              <div class="kr-acts">${live ? `<button type="button" class="${cin ? 'red' : 'pri'}" data-act="${cin ? 'checkout' : 'checkin'}" data-r="${esc(r.resourceId)}" data-id="${esc(r.id)}" data-n="${dn}">${cin ? 'Uitchecken' : 'Inchecken'}</button>` : ''}${lid ? `<a href="#/l/${esc(lid)}">Naar de locatie</a>` : ''}</div></div>`;
          }).join('');
          h += `<p class="ko-hint">${ico('info')}Check in met de knop Inchecken of met de QR-code op je plek, binnen het eerste halfuur. 3 keer niet komen opdagen in 14 dagen = een week geen reservaties.</p>`;
        }
        if (!tiles) { h += `<div class="sh"><h2>Bibliotheken</h2></div>${skGroup(6)}`; put(sec, h); watchTitle(sec); return; }
        const all = tiles.flatMap((t) => t.locations);
        const fl = favs().map((id) => all.find((l) => l.id === id)).filter(Boolean);
        const fs = seatFavs();
        // group rooms: right under your bookings, one tap per library (the last one you used first)
        const gl = all.filter((l) => extra[l.id] && extra[l.id].l && (extra[l.id].l.types || []).includes(1));
        if (gl.length) {
          const last = store.get('kurt:glast'), fv = favs();
          gl.sort((a, b) => (b.id === last) - (a.id === last) || fv.includes(b.id) - fv.includes(a.id));
          h += `<div class="sh"><h2>Groepswerkruimte</h2></div><div class="card kg-home"><div class="kg-home-t">${GROUP}<span><b>Reserveer een lokaal voor je groep</b><span>Kies een bibliotheek en zie meteen welke uren vrij zijn</span></span></div><div class="kg-libs">${gl.map((l) => `<a class="chip" href="#/g/${l.id}">${esc(shortUnit(l.unit))}</a>`).join('')}</div></div>`;
        }
        h += `<div class="sh"><h2>Favorieten</h2></div>`;
        if (!fl.length && !fs.length) h += `<div class="card ko-empty">${STAR(false)}<span>Tik op de ster bij een bibliotheek of bij een stoel, dan vind je ze hier terug.</span></div>`;
        if (fl.length) h += `<div class="group">${fl.map((l) => locRow(l, extra[l.id])).join('')}</div>`;
        if (fs.length) h += `<div class="group kfs-g"${fl.length ? ' style="margin-top:12px"' : ''}>${fs.map((f) => row({ href: `#/z/${f.zone}?seat=${f.rid}`, iconHtml: `<span class="kr-seat">${esc(seatNo(f.name))}</span>`, title: nm(f.name), sub: [f.unit, f.zname].filter(Boolean).join(' · '), cls: 'kfs' })).join('')}</div>`;
        h += `<div class="sh"><h2>Bibliotheken</h2></div>`;
        tiles.filter((t) => t.tileGroup === 1).forEach((t) => {
          h += `<div class="gh">${esc(NL_CITY[t.name] || t.name)}</div><div class="group">${t.locations.map((l) => locRow(l, extra[l.id])).join('')}</div>`;
        });
        const other = tiles.filter((t) => t.tileGroup !== 1);
        if (other.length) h += `<details class="rp-more"><summary>Faculteiten en diensten</summary>${other.map((t) => `<div class="gh">${esc(NL_CITY[t.name] || t.name)}</div><div class="group">${t.locations.map((l) => locRow(l, extra[l.id])).join('')}</div>`).join('')}</details>`;
        h += `<p class="fresh"><a href="${esc(ORIG('/'))}">Open de originele KURT</a></p>`;
        put(sec, h);
        watchTitle(sec);
      };
      const d = { res: store.get('kurt:res') ? store.get('kurt:res').v : undefined, loc: null };
      const cached = store.get('kurt:locs');
      if (cached) d.loc = cached.v;
      draw(d);
      // favourite seats: free right now, and until when?
      // your favourites are probably next: get them ready
      setTimeout(() => { if (my === token) [...new Set(favs().concat(seatFavs().map((f) => f.loc)))].slice(0, 4).forEach(warm); }, 700);
      get('/reservations').then((r) => { d.res = Array.isArray(r) ? r : []; store.set('kurt:res', { ts: Date.now(), v: d.res }); draw(d); }, () => { if (d.res === undefined) { d.res = []; draw(d); } });
      if (!cached || Date.now() - cached.ts > 3 * 60e3) {
        once('kurt:locs', locData).then((v) => { store.set('kurt:locs', { ts: Date.now(), v }); d.loc = v; draw(d); }, (e) => {
          if (my === token && !d.loc && !(e && e.auth)) put(sec, empty('warn', 'KURT reageert niet', 'Probeer het straks opnieuw.', `<p style="margin-top:14px"><a class="btn" href="${esc(ORIG('/'))}">Open KURT</a></p>`));
        });
      }
    }

    /* ---------- a library: its rooms, with free seats at the chosen hour */
    const mainType = (ids) => [302, 303, 1, 5, 6, 55, 131].find((t) => (ids || []).includes(t)) || (ids && ids[0]) || 302;
    let PAR = null; // the opening hours of the library on screen, for the time sheet
    function pickTime(par) {
      const ds = (par && par.startDates) || [];
      const w = WHEN.get();
      let d = (w && ds.find((x) => x.value === w.d)) || ds[0];
      if (!d || !d.startTimes.length) return { ds, d: null, t: null, now: true };
      const t = (w && d.value === w.d && (d.startTimes.find((x) => x.value === w.t) || d.startTimes.find((x) => x.value > w.t))) || d.startTimes[0];
      return { ds, d, t, now: !w || (d === ds[0] && t === d.startTimes[0] && d.value === ymd(Date.now())) };
    }
    const whenPill = (sel) => !sel.d ? '' : `<button type="button" class="kw" data-act="when">${ico('clock')}<span class="kw-t"><b>${sel.now ? 'Nu' : esc(dayLbl(sel.d.value))}</b><span>${sel.now ? `${esc(dayLbl(sel.d.value)).toLowerCase()} vanaf ${esc(sel.t.display)}` : `vanaf ${esc(sel.t.display)}`}</span></span><span class="kw-ch">Wijzig</span></button>`;
    function whenSheet(after) {
      const par = PAR;
      if (!par || !par.startDates || !par.startDates.length) return;
      const sel = pickTime(par);
      let day = sel.d.value;
      const layer = document.createElement('div');
      layer.setAttribute('data-tm4', '');
      layer.innerHTML = '<div class="scrim"></div><div class="kb" role="dialog" aria-modal="true"><div class="kb-grab"></div><div class="kb-in"><div class="kw-h"><b>Wanneer wil je komen?</b></div><div class="kw-body"></div></div></div>';
      document.body.appendChild(layer);
      const scrim = layer.querySelector('.scrim'), kb = layer.querySelector('.kb'), body = layer.querySelector('.kw-body');
      const close = () => { scrim.classList.remove('on'); kb.classList.remove('on'); setTimeout(() => layer.remove(), 320); };
      const draw = () => {
        const d = par.startDates.find((x) => x.value === day) || par.startDates[0];
        put(body, `<button type="button" class="btn kw-now${sel.now ? ' on' : ''}" data-w="now">${ico('clock')}Nu, zo snel mogelijk</button>
          <div class="kb-l">Of kies een dag</div>
          <div class="chips kw-days">${par.startDates.map((x) => `<button type="button" class="chip${x.value === day ? ' on' : ''}" data-day="${esc(x.value)}">${esc(dayLbl(x.value))}</button>`).join('')}</div>
          <div class="kb-l">en een beginuur</div>
          <div class="kw-hours">${d.startTimes.map((x) => `<button type="button" class="kw-hr${!sel.now && d.value === sel.d.value && x.value === sel.t.value ? ' on' : ''}" data-t="${esc(x.value)}">${esc(x.display)}</button>`).join('')}</div>`);
      };
      draw();
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); kb.classList.add('on'); }));
      scrim.addEventListener('click', close);
      kb.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.day) { day = b.dataset.day; draw(); return; }
        if (b.dataset.w === 'now') WHEN.set(null);
        else if (b.dataset.t) WHEN.set({ d: day, t: b.dataset.t });
        else return;
        close();
        if (after) after(); else { keepY = W.scrollY; show(''); }
      });
    }
    async function viewLoc(id, my) {
      setNav({ back: { label: 'Studieplek', act: 'kback', href: '#/' }, title: '' });
      const c = store.get('kurt:loc:' + id);
      const draw = (L, par, avail) => {
        if (my !== token) return;
        const l = L.l, o = L.o;
        const fav = favs().includes(Number(id));
        document.title = l.unit;
        setNav({ back: { label: 'Studieplek', act: 'kback', href: '#/' }, title: l.unit, right: `<button type="button" class="nb" data-act="fav" data-id="${esc(id)}" aria-label="${fav ? 'Uit favorieten' : 'Bij favorieten'}">${STAR(fav)}</button>` });
        if (par) PAR = par;
        const sel = pickTime(par);
        const zones = l.zones || [];
        zones.forEach((z) => { zoneLoc[z.id] = Number(id); });
        store.set('kurt:zl', zoneLoc);
        keepZones(id, zones);
        let h = l.fullImageUrl ? `<div class="ko-hero" style="background-image:url('${esc(K + '/' + l.fullImageUrl)}')"></div>` : '';
        const ll = l.navigationUrl && /query=([-\d.]+)%2C([-\d.]+)/.exec(l.navigationUrl);
        const rt = [ll ? `<a href="https://maps.apple.com/?daddr=${ll[1]},${ll[2]}&q=${encodeURIComponent(l.unit)}">Route</a>` : '', l.navigationUrl ? `<a href="${esc(l.navigationUrl)}">${ll ? 'Google Maps' : 'Route'}</a>` : ''].filter(Boolean);
        h += `<div class="lt"><h1${l.unit.length > 22 ? ' class="long"' : ''}>${esc(l.unit)}</h1><p class="lt-sub">${esc([openTxt(l), l.address].filter(Boolean).join(' · '))}</p>${rt.length ? `<p class="kroute">${ico('pin')}${rt.join('<i>·</i>')}</p>` : ''}</div>`;
        if (o && o.capacity && !o.closed) h += `<div class="ko-occ"><span><b>${Math.max(0, o.capacity - o.occupancy)}</b> van ${o.capacity} plaatsen vrij nu</span>${occBar(o)}</div>`;
        if ((L.types || []).some((t) => t.id === 1)) h += `<a class="card kg-cta" href="#/g/${esc(id)}"><span class="kg-ic">${GROUP}</span><span class="kr-main"><b>Groepswerkruimte reserveren</b><span>Zie welke lokalen vrij zijn en reserveer</span></span><svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 6.5 7l-5 5.5"/></svg></a>`;
        if (zones.length) {
          h += `<div class="sh"><h2>Kies je plek</h2></div>`;
          h += par ? whenPill(sel) : '<div class="kw sk"></div>';
          h += `<div class="kz-list">${zones.map((z) => {
            const a = avail && avail[z.id];
            const free = a ? a.availabilities.filter((s) => s.availableHours > 0) : null;
            const best = free && free.length ? Math.max(...free.map((s) => s.availableHours)) : 0;
            const fp = a && a.floorPlan && a.floorPlan.floorPlanUrl;
            const fpc = fp || (store.get('kurt:fp') || {})[z.id];
            return `<a class="kz${free && !free.length ? ' none' : ''}" href="#/z/${z.id}"><span class="kz-fp"${fpc ? ` style="background-image:url('${esc(fpc)}')"` : ''}></span><span class="kz-t"><b>${esc(z.name.trim())}</b><span>${free == null ? '<span class="sk" style="display:inline-block;width:90px"></span>' : free.length ? `<em>${free.length} vrij</em> · max. ${best} u` : 'Niets vrij op dit uur'}</span></span><span class="kz-go">${ico('pin')}Kaart</span></a>`;
          }).join('')}</div>`;
        } else h += `<div class="card ko-none">${ico('info')}<span>Deze locatie heeft geen plattegrond in KURT. Reserveer hier via KURT zelf.</span></div>`;
        const types = (L.types || []).filter((t) => t.id !== 1 && (!zones.length || ![302, 303].includes(t.id)));
        if (types.length) h += `<div class="gh">Ook te reserveren</div><div class="group">${types.map((t) => row({ href: ORIG('/locations/' + id), icon: 'seat', soft: true, title: NL_TYPES[t.id] || t.name, sub: 'In KURT zelf', external: true })).join('')}</div>`;
        if (L.news && L.news.length) h += `<details class="rp-more"><summary>Berichten van ${esc(l.unit)}</summary>${L.news.map((n) => `<p class="rp-list">${esc(textOf(n.title || ''))}${n.title ? ': ' : ''}${esc(textOf(n.content || n.text || ''))}</p>`).join('')}</details>`;
        put(sec, h);
        watchTitle(sec);
      };
      // everything at once: the library, its hours and the free seats per room (rooms known from last time start right away)
      let L = c, par = null, avail = null;
      const redraw = () => { if (L) draw(L, par, avail); };
      if (c) redraw();
      else put(sec, `<div class="ko-hero sk"></div><div class="lt"><h1>&nbsp;</h1></div>${skGroup(3)}`);
      const loadAvail = (zones) => {
        if (!zones.length) return Promise.resolve();
        return parFor(id, zones[0].resourceTypeIds).catch(() => null).then((p) => {
          par = p; if (my !== token) return null;
          redraw();
          const sel = pickTime(par);
          if (!sel.t) return null;
          const got = {};
          return Promise.all(zones.map((z) => zoneAvail(id, z.id, sel.d.value, sel.t.value).then((a) => { got[z.id] = a; }, () => { got[z.id] = { availabilities: [] }; })))
            .then(() => {
              const fpm = store.get('kurt:fp') || {};
              Object.keys(got).forEach((zid) => { const u = got[zid].floorPlan && got[zid].floorPlan.floorPlanUrl; if (u) fpm[zid] = u; });
              store.set('kurt:fp', fpm);
              avail = got; redraw();
            });
        });
      };
      const early = c && (c.l.zones || []).length ? loadAvail(c.l.zones) : null;
      try {
        const [l, o, types, news] = await Promise.all([get('/locations/' + id), get('/occupancies/' + id).catch(() => null), get('/resourcetypes?locationId=' + id).catch(() => []), get('/news?locationId=' + id).catch(() => null)]);
        L = { l, o, types, news: Array.isArray(news) ? news : news ? [news] : [] };
        store.set('kurt:loc:' + id, L);
        redraw();
        const same = c && JSON.stringify((c.l.zones || []).map((z) => z.id)) === JSON.stringify((l.zones || []).map((z) => z.id));
        if (!early || !same) await loadAvail(l.zones || []); else await early;
      } catch (e) {
        if (my === token && !c && !(e && e.auth)) put(sec, empty('warn', 'Locatie kon niet geladen worden', '', `<p style="margin-top:14px"><a class="btn" href="${esc(ORIG('/locations/' + id))}">Open in KURT</a></p>`));
      }
    }

    /* ---------- group work rooms: a day, every room with its free hours, tap an hour to book */
    // one request gives every room of the day with its hours (startTime '' = the whole day)
    const roomsFor = (lid, day) => memo(`gr:${lid}:${day}`, 60e3, async () => {
      let all = [];
      for (let pg = 0; pg < 6; pg++) {
        const a = await get(`/resourcetypeavailabilities?locationId=${lid}&zoneId=-1&resourceTypeId=1&pageNumber=${pg}&startDate=${day}&startTime=&endDate=${day}&endTime=&participantCount=-1&tagIds=&exactMatch=false&onlyFavorites=false&resourceNameInfix=&version=2.0`);
        const v = (a && a.availabilities) || [];
        all = all.concat(v);
        if (v.length < 25) break;
      }
      return all;
    });
    const roomCode = (n) => String(n || '').split(' - ')[0].replace(/^\S+\s+/, '');
    // the hours of a room: free = 'A' and not already over
    const roomSlots = (a, day) => {
      const al = a.slotAllocation || '';
      const slot = Math.round(1440 / (al.length || 24)) || 60;
      const nowMin = day === ymd(Date.now()) ? (Date.now() - fromYmd(day)) / 60e3 : -1;
      const out = [];
      for (let i = 0; i < al.length; i++) {
        if (al[i] === 'C') continue;
        out.push({ i, m: i * slot, free: al[i] === 'A' && (i + 1) * slot > nowMin + 10 });
      }
      return { slot, out };
    };
    const blocks = (sl) => {
      const b = [];
      sl.out.forEach((x) => { if (!x.free) return; const l = b[b.length - 1]; if (l && l.e === x.m) l.e = x.m + sl.slot; else b.push({ s: x.m, e: x.m + sl.slot }); });
      return b;
    };
    let GR = null; // the group room page on screen
    async function viewGroup(lid, q, my) {
      const info = ((store.get('kurt:locinfo') || {}).info || {})[lid] || {};
      const unit = info.unit || (((store.get('kurt:loc:' + lid) || {}).l) || {}).unit || '';
      document.title = 'Groepswerkruimtes';
      setNav({ back: { label: 'Terug', act: 'kback', href: '#/l/' + lid }, title: 'Groepsruimtes', always: true });
      store.set('kurt:glast', Number(lid));
      const head = `<div class="lt"><h1>Groepswerkruimtes</h1><p class="lt-sub">${esc(unit)}</p></div>`;
      put(sec, head + '<div class="kg-days sk" style="height:50px"></div>' + skGroup(4));
      let par;
      try { par = await parFor(lid, [1]); } catch (e) { if (my === token && !(e && e.auth)) put(sec, head + empty('warn', 'Groepsruimtes konden niet geladen worden', '', `<p style="margin-top:14px"><a class="btn" href="${esc(ORIG('/locations/' + lid))}">Open in KURT</a></p>`)); return; }
      if (my !== token) return;
      const days = ((par && par.startDates) || []).map((d) => d.value);
      let day = q.get('d');
      if (!days.includes(day)) day = days[0];
      const dayRow = `<div class="kg-days">${days.map((v) => `<button type="button" class="chip${v === day ? ' on' : ''}" data-act="gday" data-l="${esc(lid)}" data-d="${v}">${esc(dayLbl(v))}<small>${esc(String(new Date(fromYmd(v)).getDate()))}/${new Date(fromYmd(v)).getMonth() + 1}</small></button>`).join('')}</div>`;
      if (!day) { put(sec, head + empty('info', 'Geen dagen om te reserveren', 'KURT geeft voor deze bibliotheek geen dagen voor groepsruimtes.')); return; }
      put(sec, head + dayRow + skGroup(4));
      const onDay = sec.querySelector('.kg-days .on'); if (onDay) onDay.scrollIntoView({ block: 'nearest', inline: 'center' });
      let rooms;
      try { rooms = await roomsFor(lid, day); } catch (e) { if (my === token && !(e && e.auth)) put(sec, head + dayRow + empty('warn', 'Groepsruimtes konden niet geladen worden', '')); return; }
      if (my !== token) return;
      const list = rooms.map((a) => { const sl = roomSlots(a, day); return { a, sl, b: blocks(sl) }; });
      list.sort((x, y) => (y.b.length > 0) - (x.b.length > 0) || String(x.a.name).localeCompare(String(y.a.name)));
      GR = { lid, day, unit, list };
      const nFree = list.filter((x) => x.b.length).length;
      // rooms with the same name ("Tulp 1" three times): name them by their code instead
      const cnt = {};
      list.forEach(({ a }) => { const k = nm(a.name); cnt[k] = (cnt[k] || 0) + 1; });
      const card = ({ a, sl, b }) => {
        const dup = cnt[nm(a.name)] > 1 && roomCode(a.name);
        const title = dup ? roomCode(a.name) : nm(a.name);
        const sub = [dup ? nm(a.name) : roomCode(a.name), `${a.minParticipants}–${a.maxParticipants} pers.`].filter(Boolean).join(' · ');
        const free = sl.out.filter((x) => x.free);
        return `<div class="card kg${b.length ? '' : ' none'}">
          <div class="kg-h"><span class="kg-ic">${GROUP}</span><span class="kr-main"><b>${esc(title)}</b><span>${esc(sub)}</span></span><span class="kg-free">${free.length ? `${free.length} ${free.length === 1 ? 'uur' : 'uren'} vrij` : 'Volzet'}</span></div>
          ${free.length ? `<div class="kg-hours">${free.map((x) => `<button type="button" class="kg-hr" data-act="groom" data-r="${a.id}" data-i="${x.i}">${hm(x.m)}</button>`).join('')}</div>` : ''}
        </div>`;
      };
      const open = list.filter((x) => x.b.length), full = list.filter((x) => !x.b.length);
      let h = head + dayRow;
      h += `<p class="kg-sum">${nFree ? `<b>${nFree}</b> van ${list.length} lokalen hebben nog vrije uren. Tik op het uur waarop je wil beginnen.` : `Alle ${list.length} lokalen zijn volzet ${esc(dayLbl(day).toLowerCase())}. Kies een andere dag.`}</p>`;
      h += open.map(card).join('');
      if (full.length) h += nFree ? `<details class="rp-more kg-full"><summary>${full.length} ${full.length === 1 ? 'lokaal' : 'lokalen'} volzet</summary>${full.map(card).join('')}</details>` : full.map(card).join('');
      h += `<p class="fresh"><a href="${esc(ORIG('/locations/' + lid))}">Open in de originele KURT</a></p>`;
      put(sec, h);
      const on2 = sec.querySelector('.kg-days .on'); if (on2) on2.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    // book a group room: until when, a subject and your group (KURT asks at least minParticipants people, you included)
    async function pickRoom(rid, si) {
      if (!GR) return;
      const it = GR.list.find((x) => String(x.a.id) === String(rid));
      if (!it) return;
      const { a, sl } = it, day = GR.day, slot = sl.slot;
      closeBook();
      const al = a.slotAllocation || '';
      const maxMin = a.maxDurationMinutes || 240;
      const ends = [];
      for (let k = si; k < al.length && al[k] === 'A' && (k - si + 1) * slot <= maxMin; k++) ends.push((k + 1) * slot);
      if (!ends.length) return;
      const me = ME || {};
      const st = {
        end: ends[Math.min(ends.length, 2) - 1],
        subj: store.get('kurt:gsubj') || 'Groepswerk',
        ppl: me.uid ? [{ uid: me.uid, email: me.email, me: true }] : [],
        q: '', busy: false, err: '',
      };
      const start = si * slot;
      const layer = document.createElement('div');
      layer.setAttribute('data-tm4', '');
      layer.innerHTML = `<div class="scrim"></div><div class="kb" role="dialog" aria-modal="true"><div class="kb-grab"></div><div class="kb-in">
        <div class="kb-h"><span class="kr-seat kr-room">${GROUP}</span><span class="kr-main"><b>${esc(nm(a.name))}</b><span>${esc([roomCode(a.name), GR.unit].filter(Boolean).join(' · '))}</span></span></div>
        <div class="kb-when kb-when-s">${ico('clock')}<span><b>${esc(dayLbl(day))}</b> vanaf ${hm(start)}</span></div>
        <div class="kb-body"></div></div></div>`;
      document.body.appendChild(layer);
      bookLayer = layer;
      const scrim = layer.querySelector('.scrim'), kb = layer.querySelector('.kb'), body = kb.querySelector('.kb-body');
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); kb.classList.add('on'); }));
      scrim.addEventListener('click', closeBook);
      let res = null;
      memo('res:' + a.id, 30 * 60e3, () => get(`/resources/${a.id}?withDetails=true`)).then((x) => { res = x; draw(); }, () => {});
      const mates = () => (store.get('kurt:mates') || []).filter((m) => !st.ppl.some((x) => x.uid.toUpperCase() === m.uid.toUpperCase()));
      const draw = () => {
        if (!layer.isConnected) return;
        const n = st.ppl.length, min = a.minParticipants || 1, max = a.maxParticipants || 99;
        const need = Math.max(0, min - n);
        const subjOk = !(res && res.subjectIsRequired) || st.subj.trim().length >= 4;
        const ok = !need && subjOk && st.ppl.length && !st.busy;
        const rules = ((res && (res.conditionsOfUseNlUrl || res.conditionsOfUseEnUrl)) || '').trim();
        body.innerHTML = `<div class="kb-l">Tot wanneer?</div>
          <div class="chips kb-ends">${ends.map((m) => `<button type="button" class="chip${m === st.end ? ' on' : ''}" data-act="end" data-m="${m}">${hm(m)}<small>${dur(m - start)}</small></button>`).join('')}</div>
          <label class="kb-l" for="kg-subj">Onderwerp</label>
          <input id="kg-subj" class="kg-in" type="text" maxlength="100" autocomplete="off" value="${esc(st.subj)}" placeholder="Waarvoor? Bv. Groepswerk statistiek">
          <div class="kb-l kg-pl">Groepsleden <b>${n}</b><span> · ${min === max ? min : `${min} tot ${max}`} personen, jij inbegrepen</span></div>
          <div class="kg-ppl">${st.ppl.map((x) => `<div class="kg-p"><span class="kg-av">${esc((x.me ? (me.firstName || 'Jij') : x.email || x.uid).slice(0, 1).toUpperCase())}</span><span class="kr-main"><b>${esc(x.me ? 'Jij' : String(x.email || '').split('@')[0].replace(/\./g, ' ') || x.uid)}</b><span>${esc(x.uid)}</span></span>${x.me ? '' : `<button type="button" class="kg-x" data-act="gdel" data-u="${esc(x.uid)}" aria-label="Verwijder">${ico('close')}</button>`}</div>`).join('')}</div>
          ${n < max ? `<form class="kg-add"><input id="kg-q" class="kg-in" type="text" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="r-nummer of e-mail" value="${esc(st.q)}"><button type="submit" class="kg-addb"${st.busy ? ' disabled' : ''}>${st.busy ? '<span class="spin"></span>' : 'Voeg toe'}</button></form>` : ''}
          ${st.err ? `<p class="ko-hint err">${ico('warn')}${esc(st.err)}</p>` : ''}
          ${n < max && mates().length ? `<div class="kb-l kg-ml">Eerder in je groep</div><div class="kg-mates">${mates().slice(0, 8).map((m) => `<button type="button" class="chip" data-act="gmate" data-u="${esc(m.uid)}">+ ${esc(String(m.email || '').split('@')[0].replace(/\./g, ' ') || m.uid)}</button>`).join('')}</div>` : ''}
          <button type="button" class="btn kb-go" data-act="gbook"${ok ? '' : ' disabled'}>${need ? `Nog ${need} ${need === 1 ? 'groepslid' : 'groepsleden'} nodig` : !subjOk ? 'Vul een onderwerp in (min. 4 tekens)' : `Reserveer · ${hm(start)}–${hm(st.end)}`}</button>
          <p class="kb-legal">Je gaat akkoord met het ${rules ? `<a href="${esc(rules)}">reglement</a>` : 'reglement'}. Check in met de QR-code in het lokaal, binnen het eerste halfuur.</p>`;
        const on = body.querySelector('.kb-ends .chip.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      };
      const add = async (idf) => {
        idf = String(idf || '').trim();
        if (!idf || st.busy) return;
        if (/^[rusbm]\d{5,}$/i.test(idf)) idf = idf.toUpperCase();
        st.busy = true; st.err = ''; draw();
        try {
          const x = await get('/participants/' + encodeURIComponent(idf));
          if (!x || !x.uid) throw new Error('');
          if (st.ppl.some((y) => y.uid.toUpperCase() === x.uid.toUpperCase())) st.err = 'Die persoon staat al in je groep.';
          else { st.ppl.push({ uid: x.uid, email: x.email }); st.q = ''; }
        } catch (e) { st.err = `Niemand gevonden voor "${idf}". Typ een r-nummer (bv. r0123456) of een KU Leuven-mailadres.`; }
        st.busy = false; draw();
        const q = body.querySelector('#kg-q'); if (q && !st.q && st.ppl.length < (a.maxParticipants || 99) && st.ppl.length < (a.minParticipants || 1)) q.focus();
      };
      body.addEventListener('input', (e) => { if (e.target.id === 'kg-subj') { st.subj = e.target.value; const b = body.querySelector('[data-act="gbook"]'); const need = Math.max(0, (a.minParticipants || 1) - st.ppl.length); const ok = !need && (!(res && res.subjectIsRequired) || st.subj.trim().length >= 4); b.disabled = !ok; b.textContent = need ? `Nog ${need} ${need === 1 ? 'groepslid' : 'groepsleden'} nodig` : ok ? `Reserveer · ${hm(start)}–${hm(st.end)}` : 'Vul een onderwerp in (min. 4 tekens)'; } else if (e.target.id === 'kg-q') st.q = e.target.value; });
      body.addEventListener('submit', (e) => { e.preventDefault(); add(st.q); });
      kb.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'end') { st.end = Number(b.dataset.m); draw(); return; }
        if (act === 'gdel') { st.ppl = st.ppl.filter((x) => x.me || x.uid !== b.dataset.u); draw(); return; }
        if (act === 'gmate') { const m = (store.get('kurt:mates') || []).find((x) => x.uid === b.dataset.u); if (m && st.ppl.length < (a.maxParticipants || 99)) { st.ppl.push({ uid: m.uid, email: m.email }); draw(); } return; }
        if (act === 'done') { closeBook(); nav('#/'); return; }
        if (act !== 'gbook' || b.disabled) return;
        b.disabled = true; b.innerHTML = '<span class="spin"></span> Reserveren…';
        try {
          if (!res) res = await memo('res:' + a.id, 30 * 60e3, () => get(`/resources/${a.id}?withDetails=true`));
          const end = st.end;
          const endDate = end >= 1440 ? ymd(addDays(fromYmd(day), 1)) : day;
          const endTime = end >= 1440 ? '00:00' : hm(end);
          const parts = st.ppl.map(({ uid, email }) => ({ uid, email }));
          const subject = st.subj.trim() || res.name;
          // the same reservation KURT's own page sends
          const payload = {
            id: res.id, resourceName: res.name, subject, purpose: '', resourceId: a.id,
            startDate: day, startTime: hm(start), endDate, endTime, participants: parts,
            summary: [`Resource **${a.name}**`, `at **${a.unit}**`, `for **${parts.map((x) => String(x.email || '').replace('@', '&commat;')).join(', ')}**`, `from **${enDate(day)} ${hm(start)}** until **${enDate(endDate)} ${endTime}**`],
            withCheckIn: false,
          };
          if (res.additionalFields) payload.additionalFields = res.additionalFields;
          await send('POST', '/reservations/', payload);
          store.set('kurt:gsubj', subject);
          const others = parts.filter((x) => !me.uid || x.uid !== me.uid);
          store.set('kurt:mates', others.concat((store.get('kurt:mates') || []).filter((m) => !others.some((o) => o.uid === m.uid))).slice(0, 12));
          store.del('kurt:res'); memoClear();
          kb.querySelector('.kb-when').hidden = true;
          body.innerHTML = `<div class="kb-ok">${ico('check')}<b>Gereserveerd</b><span>${esc(nm(a.name))} · ${esc(dayLbl(day))} ${hm(start)}–${hm(end)}</span><span>${parts.length} personen. Check in met de QR-code in het lokaal, binnen het eerste halfuur.</span></div><button type="button" class="btn kb-go" data-act="done">Klaar</button>`;
        } catch (err) {
          st.err = err.message || 'Reserveren lukte niet'; draw();
        }
      });
      draw();
    }

    /* ---------- a room: the floor plan */
    let Z = null; // current map state
    async function viewZone(id, q, my) {
      const lid = zoneLoc[id];
      setNav({ back: { label: 'Terug', act: 'kback', href: lid ? '#/l/' + lid : '#/' }, title: '', always: true });
      const known = ZONES[id];
      const fp0 = (store.get('kurt:fp') || {})[id];
      put(sec, `<div class="kmap-wrap"><div class="kw sk"></div><div class="kmap sk">${fp0 ? `<img class="kmap-pre" src="${esc(fp0)}" alt="">` : ''}</div></div>${skGroup(2)}`);
      let zone;
      if (known) zone = { id: Number(id), locationId: known.l, name: known.n, resourceTypeIds: known.t };
      else {
        try { zone = await get('/zones/' + id); } catch (e) { if (my === token) put(sec, empty('warn', 'Plattegrond kon niet geladen worden', '', `<p style="margin-top:14px"><a class="btn" href="${esc(ORIG('/zone/' + id))}">Open in KURT</a></p>`)); return; }
        ZONES[id] = { l: zone.locationId, n: (zone.name || '').trim(), t: zone.resourceTypeIds || [] }; store.set('kurt:zones', ZONES);
      }
      zoneLoc[id] = zone.locationId; store.set('kurt:zl', zoneLoc);
      const par = await parFor(zone.locationId, zone.resourceTypeIds).catch(() => null);
      if (par) PAR = par;
      const sel = pickTime(par);
      if (my !== token) return;
      if (!sel.t) { put(sec, empty('clock', 'Geen tijden beschikbaar', 'Deze ruimte is de komende dagen niet te reserveren.')); return; }
      let a;
      try { a = await zoneAvail(zone.locationId, id, sel.d.value, sel.t.value); } catch (e) { if (my === token) put(sec, empty('warn', 'Plattegrond kon niet geladen worden', '')); return; }
      if (my !== token) return;
      const unit = (a.location && a.location.unit) || '';
      document.title = ((a.zone && a.zone.name) || zone.name || '').trim() || 'Plattegrond';
      setNav({ back: { label: 'Terug', act: 'kback', href: '#/l/' + zone.locationId }, title: (a.zone && a.zone.name) || zone.name, always: true });
      const seats = a.availabilities || [];
      const free = seats.filter((s) => s.availableHours > 0).sort((x, y) => y.availableHours - x.availableHours || String(x.resourceName).localeCompare(String(y.resourceName), 'nl', { numeric: true }));
      const fp = a.floorPlan || {};
      const W0 = fp.floorPlanWidth || 1000, H0 = fp.floorPlanHeight || 1000;
      let h = `<div class="kmap-wrap">${whenPill(sel)}
        <div class="kmap" id="kmap"><div class="kp" style="width:${W0}px;height:${H0}px">${fp.floorPlanUrl ? `<img src="${esc(fp.floorPlanUrl)}" alt="Plattegrond ${esc(zone.name)}" draggable="false">` : ''}
        ${seats.map((s) => `<i class="ks${s.availableHours > 0 ? ' free' : ''}${isSeatFav(s.resourceId) ? ' fav' : ''}" data-r="${s.resourceId}" style="left:${s.positionX}px;top:${s.positionY}px">${s.availableHours > 0 ? s.availableHours : ''}</i>`).join('')}</div>
        <div class="kmap-tools"><button type="button" data-act="zin" aria-label="Inzoomen">+</button><button type="button" data-act="zout" aria-label="Uitzoomen">−</button><button type="button" data-act="zfit" aria-label="Hele plattegrond">⤢</button></div>
        <div class="kmap-cnt${free.length ? '' : ' none'}"><b>${free.length || 'Niets'}</b> ${free.length === 1 ? 'plaats' : 'plaatsen'} vrij</div>
        <div class="kmap-leg"><span><i class="ks free">n</i> n uur vrij</span><span><i class="ks"></i> bezet</span></div>
        <button type="button" class="kmap-list" data-act="list">${free.length ? `Lijst (${free.length})` : 'Lijst'}</button></div></div>`;
      put(sec, h);
      // favourite seats first, then the longest free
      free.sort((x, y) => (isSeatFav(y.resourceId) ? 1 : 0) - (isSeatFav(x.resourceId) ? 1 : 0));
      Z = { id, zone, sel, seats, free, unit, W0, H0 };
      initMap();
      // from a favourite: open that seat
      const want = Number(q.get('seat'));
      if (want) {
        const st = seats.find((x) => x.resourceId === want);
        if (st) setTimeout(() => pickSeat(want), 250);
        try { history.replaceState(null, '', K + '/#/z/' + id); } catch (_) {}
      }
    }

    function listSheet() {
      if (!Z) return;
      const { free, sel } = Z;
      const layer = document.createElement('div');
      layer.setAttribute('data-tm4', '');
      layer.innerHTML = `<div class="scrim"></div><div class="kb" role="dialog" aria-modal="true"><div class="kb-grab"></div><div class="kb-in">
        <div class="kw-h"><b>${free.length ? `${free.length} ${free.length === 1 ? 'plaats' : 'plaatsen'} vrij` : 'Niets vrij'}</b><span class="kl-sub">${esc(dayLbl(sel.d.value))} vanaf ${esc(sel.t.display)} · ${esc((Z.zone.name || '').trim())}</span></div>
        ${free.length ? `<div class="kfree">${free.map((x) => `<button type="button" class="kf${isSeatFav(x.resourceId) ? ' fav' : ''}" data-r="${x.resourceId}"><b>${esc(seatNo(x.resourceName))}</b><span>${x.availableHours} u</span></button>`).join('')}</div>` : `<p class="ko-hint">${ico('info')}Kies een ander uur of een andere ruimte.</p>`}
        <button type="button" class="btn ghost kl-when" data-w="1">${ico('clock')}Andere dag of uur</button>
        <p class="fresh"><a href="${esc(ORIG('/zone/' + Z.id))}">Open in KURT</a></p></div></div>`;
      document.body.appendChild(layer);
      const scrim = layer.querySelector('.scrim'), kb = layer.querySelector('.kb');
      const close = () => { scrim.classList.remove('on'); kb.classList.remove('on'); setTimeout(() => layer.remove(), 320); };
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); kb.classList.add('on'); }));
      scrim.addEventListener('click', close);
      kb.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.r) { close(); pickSeat(Number(b.dataset.r)); }
        else if (b.dataset.w) { close(); whenSheet(); }
      });
    }

    function initMap() {
      const box = $('#kmap');
      if (!box) return;
      const kp = box.querySelector('.kp');
      // the map takes the rest of the screen, so the page itself doesn't need to scroll
      const fitH = () => {
        const tabs = $('#tm-tabs');
        const top = box.getBoundingClientRect().top + W.scrollY;
        const vh = Math.min(W.innerHeight, document.documentElement.clientHeight || W.innerHeight);
        box.style.height = Math.max(300, vh - top - (tabs ? tabs.offsetHeight : 0) - 10) + 'px';
      };
      fitH();
      // once the slide-in is over, measure again (and fit the plan to the final size)
      setTimeout(() => { if ($('#kmap') === box) { const h0 = box.style.height; fitH(); if (box.style.height !== h0) reset(false); } }, 420);
      const { W0, H0 } = Z;
      let s = 1, x = 0, y = 0, fit = 1;
      const bw = () => box.clientWidth, bh = () => box.clientHeight;
      const clamp = () => {
        const w = W0 * s, hh = H0 * s;
        x = w <= bw() ? (bw() - w) / 2 : Math.min(0, Math.max(bw() - w, x));
        y = hh <= bh() ? (bh() - hh) / 2 : Math.min(0, Math.max(bh() - hh, y));
      };
      const apply = (anim) => {
        clamp();
        kp.style.transition = anim ? 'transform .28s cubic-bezier(.2,.85,.25,1)' : 'none';
        kp.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`;
        kp.style.setProperty('--k', String(1 / s));
      };
      const MAX = () => Math.max(fit * 4, 1.2);
      const zoomAt = (ns, cx, cy, anim) => {
        ns = Math.max(fit, Math.min(MAX(), ns));
        x = cx - ((cx - x) * ns) / s; y = cy - ((cy - y) * ns) / s; s = ns; apply(anim);
      };
      const reset = (anim) => { fit = Math.min(bw() / W0, bh() / H0); s = fit; x = 0; y = 0; apply(anim); };
      Z.reset = reset;
      Z.focus = (rid) => {
        const st = Z.seats.find((q) => q.resourceId === rid);
        if (!st) return;
        const ns = Math.max(s, Math.min(MAX(), fit * 2.6));
        s = ns; x = bw() / 2 - st.positionX * s; y = bh() * 0.3 - st.positionY * s; apply(true);
        $$('.ks.sel', kp).forEach((n) => n.classList.remove('sel'));
        const n = kp.querySelector(`.ks[data-r="${rid}"]`);
        if (n) n.classList.add('sel');
      };
      Z.zoom = (f) => zoomAt(s * f, bw() / 2, bh() / 2, true);
      reset(false);
      const img = kp.querySelector('img');
      if (img && !img.complete) img.addEventListener('load', () => box.classList.remove('sk'), { once: true }); else box.classList.remove('sk');
      W.addEventListener('resize', () => { if ($('#kmap') === box) { fitH(); reset(false); } });
      // touch: one finger pans, two fingers pinch, a tap picks the nearest seat, a double tap zooms in
      const pts = new Map();
      let start = null, lastTap = 0;
      const mid = () => { const v = [...pts.values()]; return v.length > 1 ? { cx: (v[0].x + v[1].x) / 2, cy: (v[0].y + v[1].y) / 2, d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) } : { cx: v[0].x, cy: v[0].y, d: 0 }; };
      const rel = (e) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      box.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.kmap-tools')) return;
        box.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, rel(e));
        const m = mid();
        start = { s, x, y, m, t: Date.now(), moved: false, multi: pts.size > 1 || (start && start.multi && pts.size > 1) };
      });
      box.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId) || !start) return;
        pts.set(e.pointerId, rel(e));
        const m = mid();
        if (Math.hypot(m.cx - start.m.cx, m.cy - start.m.cy) > 7 || pts.size > 1) start.moved = true;
        if (pts.size > 1 && start.m.d) {
          const ns = Math.max(fit * 0.85, Math.min(MAX(), start.s * (m.d / start.m.d)));
          x = m.cx - ((start.m.cx - start.x) * ns) / start.s; y = m.cy - ((start.m.cy - start.y) * ns) / start.s; s = ns;
        } else { x = start.x + (m.cx - start.m.cx); y = start.y + (m.cy - start.m.cy); }
        apply(false);
      });
      const up = (e) => {
        if (!pts.has(e.pointerId)) return;
        const p = pts.get(e.pointerId);
        pts.delete(e.pointerId);
        if (pts.size) { start = { s, x, y, m: mid(), t: Date.now(), moved: true }; return; }
        if (s < fit) { s = fit; apply(true); }
        if (start && !start.moved && Date.now() - start.t < 450) {
          const now = Date.now();
          const px = (p.x - x) / s, py = (p.y - y) / s;
          let best = null, bd = Infinity;
          Z.seats.forEach((q) => { const d = Math.hypot(q.positionX - px, q.positionY - py) * s; if (d < bd) { bd = d; best = q; } });
          if (best && bd < 26) { lastTap = 0; pickSeat(best.resourceId); }
          else if (now - lastTap < 320) { lastTap = 0; zoomAt(s * 2, p.x, p.y, true); }
          else lastTap = now;
        }
        start = null;
      };
      box.addEventListener('pointerup', up);
      box.addEventListener('pointercancel', up);
      box.addEventListener('wheel', (e) => { e.preventDefault(); const r = rel(e); zoomAt(s * (e.deltaY < 0 ? 1.15 : 0.87), r.x, r.y, false); }, { passive: false });
      box.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
      box.addEventListener('gesturestart', (e) => e.preventDefault());
    }

    /* ---------- booking sheet */
    let bookLayer = null;
    function closeBook() {
      if (!bookLayer) return;
      const l = bookLayer; bookLayer = null;
      l.querySelector('.scrim').classList.remove('on'); l.querySelector('.kb').classList.remove('on');
      setTimeout(() => l.remove(), 320);
      $$('.ks.sel').forEach((n) => n.classList.remove('sel'));
    }
    async function pickSeat(rid) {
      if (!Z) return;
      const st = Z.seats.find((q) => q.resourceId === rid);
      if (!st) return;
      if (Z.focus) Z.focus(rid);
      closeBook();
      const { d, t } = Z.sel;
      const layer = document.createElement('div');
      layer.setAttribute('data-tm4', '');
      layer.innerHTML = `<div class="scrim"></div><div class="kb" role="dialog" aria-modal="true"><div class="kb-grab"></div><div class="kb-in">
        <div class="kb-h"><span class="kr-seat">${esc(seatNo(st.resourceName))}</span><span class="kr-main"><b>${esc(nm(st.resourceName))}</b><span>${esc(Z.unit)} · ${esc((Z.zone.name || '').trim())}</span></span><button type="button" class="kb-fav" data-act="sfav" aria-label="Favoriete stoel">${STAR(isSeatFav(rid))}</button></div>
        <button type="button" class="kb-when" data-act="swhen">${ico('clock')}<span><b>${esc(dayLbl(d.value))}</b> vanaf ${esc(t.display)}</span><em>Wijzig</em></button>
        <div class="kb-body">${skRows(2)}</div></div></div>`;
      document.body.appendChild(layer);
      bookLayer = layer;
      const scrim = layer.querySelector('.scrim'), kb = layer.querySelector('.kb'), body = kb.querySelector('.kb-body');
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); kb.classList.add('on'); }));
      scrim.addEventListener('click', closeBook);
      let book = null; // filled in once KURT says the seat can be booked
      kb.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'sfav') {
          const f = seatFavs(), on = isSeatFav(rid);
          store.set('kurt:seats', on ? f.filter((x) => x.rid !== rid) : [{ rid, name: st.resourceName, zone: Number(Z.id), zname: (Z.zone.name || '').trim(), loc: Z.zone.locationId, unit: Z.unit }].concat(f).slice(0, 8));
          b.innerHTML = STAR(!on);
          const n = document.querySelector(`.ks[data-r="${rid}"]`); if (n) n.classList.toggle('fav', !on);
          toast(on ? 'Uit je favorieten' : 'Favoriete stoel: je vindt hem op Studieplek');
          return;
        }
        if (act === 'swhen') {
          // another day or hour, then straight back to this seat
          const zid = Z.id;
          closeBook();
          whenSheet(() => { quiet = true; location.replace(K + '/#/z/' + zid + '?seat=' + rid); });
          return;
        }
        if (act === 'done') { closeBook(); nav('#/'); return; }
        if (!book) return;
        if (act === 'end') { book.end = Number(b.dataset.m); book.draw(); return; }
        if (act !== 'book' || b.disabled) return;
        b.disabled = true; b.innerHTML = '<span class="spin"></span> Reserveren…';
        const { av, res, end } = book;
        const me = ME || {};
        const endDate = end >= 1440 ? ymd(addDays(fromYmd(d.value), 1)) : d.value;
        const endTime = end >= 1440 ? '00:00' : hm(end);
        const parts = me.uid ? [{ uid: me.uid, email: me.email }] : [];
        // the same reservation KURT's own page sends
        const payload = {
          id: res.id, resourceName: res.name, subject: res.name, purpose: '', resourceId: av.id,
          startDate: d.value, startTime: t.value, endDate, endTime, participants: parts,
          summary: [`Resource **${av.name}**`, `at **${av.unit}**`, `for **${parts.map((x) => x.email.replace('@', '&commat;')).join(', ')}**`, `from **${enDate(d.value)} ${t.value}** until **${enDate(endDate)} ${endTime}**`],
          withCheckIn: false,
        };
        if (res.additionalFields) payload.additionalFields = res.additionalFields;
        try {
          await send('POST', '/reservations/', payload);
          store.del('kurt:res'); memoClear();
          book = null;
          kb.querySelector('.kb-when').hidden = true;
          put(body, `<div class="kb-ok">${ico('check')}<b>Gereserveerd</b><span>${esc(nm(st.resourceName))} · ${esc(dayLbl(d.value))} ${esc(t.display)}–${hm(end)}</span><span>Check in met de QR-code op je plek, binnen het eerste halfuur.</span></div><button type="button" class="btn kb-go" data-act="done">Klaar</button>`);
        } catch (err) {
          book.draw();
          body.insertAdjacentHTML('afterbegin', `<p class="ko-hint err">${ico('warn')}${esc(err.message || 'Reserveren lukte niet')}</p>`);
        }
      });
      const taken = `<p class="ko-hint">${ico('info')}Deze plaats is niet vrij ${esc(dayLbl(d.value).toLowerCase())} om ${esc(t.display)}. Tik hierboven op Wijzig voor een andere dag of een ander uur.</p>`;
      let ra, res;
      try {
        const e1 = toMin(t.value) + 60;
        const ed = e1 >= 1440 ? ymd(addDays(fromYmd(d.value), 1)) : d.value;
        [ra, res] = await Promise.all([
          get(`/resourceavailabilities?resourceId=${rid}&startDate=${d.value}&startTime=${t.value}&endDate=${ed}&endTime=${e1 >= 1440 ? '00:00' : hm(e1)}&participantCount=1&exactMatch=false`),
          memo('res:' + rid, 30 * 60e3, () => get(`/resources/${rid}?withDetails=true`)),
          meP.catch(() => ME),
        ]);
      } catch (e) { if (bookLayer === layer) put(body, `<p class="ko-hint">${ico('warn')}Deze plaats kon niet geladen worden.</p>`); return; }
      if (bookLayer !== layer) return;
      const list = (ra && ra.availabilities) || [];
      const av = list.find((q) => q.id === rid) || list[0];
      if (!av || !av.slotAllocation) { put(body, taken); return; }
      const slot = Math.round(1440 / (av.slotAllocation.length || 24)) || 60;
      const si = Math.round(toMin(t.value) / slot);
      const maxMin = av.maxDurationMinutes || 960;
      const ends = [];
      for (let i = si; i < av.slotAllocation.length && av.slotAllocation[i] === 'A' && (i - si + 1) * slot <= maxMin; i++) ends.push((i + 1) * slot);
      if (!ends.length) { put(body, taken); return; }
      const tags = (av.tags || []).map((g) => NL_TAGS[g.id] || g.name).filter(Boolean);
      const rules = ((res && (res.conditionsOfUseNlUrl || res.conditionsOfUseEnUrl)) || '').trim();
      book = { av, res, end: ends[Math.min(ends.length, 4) - 1] }; // up to 4 hours by default
      book.draw = () => {
        const s0 = toMin(t.value);
        put(body, `${tags.length ? `<p class="kb-tags">${tags.map((g) => `<span>${esc(g)}</span>`).join('')}</p>` : ''}
          <div class="kb-l">Tot wanneer?</div>
          <div class="chips kb-ends">${ends.map((m) => `<button type="button" class="chip${m === book.end ? ' on' : ''}" data-act="end" data-m="${m}">${hm(m)}<small>${dur(m - s0)}</small></button>`).join('')}</div>
          <button type="button" class="btn kb-go" data-act="book">Reserveer ${esc(seatNo(st.resourceName))} · ${esc(t.display)}–${hm(book.end)}</button>
          <p class="kb-legal">Je gaat akkoord met het ${rules ? `<a href="${esc(rules)}">reglement</a>` : 'reglement'}. Vergeet niet in te checken met de QR-code op je plek.</p>`);
        const on = body.querySelector('.kb-ends .chip.on');
        if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      };
      book.draw();
    }

    /* ---------- taps */
    W.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('#tm-tabs a');
      if (t) { e.preventDefault(); goTo(t.getAttribute('href'), { dir: 'back' }); return; }
      const a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (a) {
        e.preventDefault();
        const href = a.getAttribute('href');
        nav(href);
        return;
      }
      const b = e.target.closest && e.target.closest('[data-act]');
      if (!b || b.closest('.kb')) return;
      const act = b.dataset.act;
      if (act === 'kback') { e.preventDefault(); back(); }
      else if (act === 'meer') { e.preventDefault(); goTo(PORTAL + '?tm=meer', { dir: 'back' }); }
      else if (act === 'when') { e.preventDefault(); whenSheet(); }
      else if (act === 'list') { e.preventDefault(); listSheet(); }
      else if (act === 'seat') { e.preventDefault(); pickSeat(Number(b.dataset.r)); }
      else if (act === 'zin' || act === 'zout') { e.preventDefault(); if (Z && Z.zoom) Z.zoom(act === 'zin' ? 1.6 : 1 / 1.6); }
      else if (act === 'zfit') { e.preventDefault(); if (Z && Z.reset) Z.reset(true); }
      else if (act === 'fav') {
        e.preventDefault();
        const id = Number(b.dataset.id); const f = favs();
        store.set('kurt:fav', f.includes(id) ? f.filter((x) => x !== id) : [id].concat(f).slice(0, 6));
        b.innerHTML = STAR(!f.includes(id));
        toast(f.includes(id) ? 'Uit je favorieten' : 'Bij je favorieten op Studieplek');
      } else if (act === 'gday') {
        e.preventDefault();
        quiet = true; location.replace(K + '/#/g/' + b.dataset.l + '?d=' + b.dataset.d);
      } else if (act === 'groom') {
        e.preventDefault();
        if (!b.disabled) pickRoom(b.dataset.r, Number(b.dataset.i));
      } else if (act === 'checkin') {
        e.preventDefault();
        if (!b.disabled) validate(b, 10);
      } else if (act === 'checkout') {
        e.preventDefault();
        sheet({ title: 'Uitchecken?', msg: b.dataset.n + '. Je plaats komt meteen vrij voor iemand anders.', actions: [{ label: 'Uitchecken', red: true, run: () => validate(b, 20) }] });
      } else if (act === 'cancel') {
        e.preventDefault();
        const id = b.dataset.id;
        sheet({ title: 'Reservatie verwijderen?', msg: b.dataset.n, actions: [{ label: 'Reservatie verwijderen', red: true, run: () => {
          send('DELETE', '/reservations/' + encodeURIComponent(id) + '/').then(() => { toast('Reservatie verwijderd'); store.del('kurt:res'); memoClear(); show(); }, (err) => toast(err.message || 'Annuleren lukte niet'));
        } }] });
      }
    });
    pullRefresh(() => { store.del('kurt:locs'); store.del('kurt:res'); memoClear(); show(); return new Promise((r) => setTimeout(r, 900)); });
    show();
  }

