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
      if (!r.ok) { const e = new Error((typeof j === 'string' && j) || (j && (j.message || j.title || j.error)) || txt.slice(0, 200) || 'HTTP ' + r.status); e.status = r.status; throw e; }
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
    const recent = () => store.get('kurt:recent') || [];
    const remember = (id) => store.set('kurt:recent', [id].concat(recent().filter((x) => x !== id)).slice(0, 3));
    const favs = () => store.get('kurt:fav') || [];

    /* ---------- router: #/ home, #/l/<location>, #/z/<zone>?d=&t= */
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
    const back = () => { if (depth > 0) { depth--; history.back(); } else { const r = route(); location.replace(K + '/' + (r.name === 'z' && zoneLoc[r.id] ? '#/l/' + zoneLoc[r.id] : '#/')); } };
    const zoneLoc = store.get('kurt:zl') || {};
    let token = 0, keepY = 0;
    const show = (anim) => {
      const my = ++token;
      const r = route();
      closeBook();
      sec.classList.remove('push', 'pop');
      if (anim) { void sec.offsetWidth; sec.classList.add(anim); }
      W.scrollTo(0, keepY); keepY = 0;
      if (r.name === 'l') viewLoc(r.id, my);
      else if (r.name === 'z') viewZone(r.id, r.q, my);
      else viewHome(my);
    };
    let lastLen = history.length, quiet = false;
    W.addEventListener('hashchange', () => { show(quiet ? '' : history.length > lastLen ? 'push' : 'pop'); quiet = false; lastLen = history.length; });

    /* ---------- home */
    async function locData() {
      const tiles = await get('/tiles');
      const ids = tiles.flatMap((t) => t.locations.map((l) => l.id));
      const extra = {};
      await Promise.all(ids.map(async (id) => {
        const [l, o] = await Promise.all([get('/locations/' + id).catch(() => null), get('/occupancies/' + id).catch(() => null)]);
        extra[id] = { l: l && { unit: l.unit, address: l.address, openingHoursToday: l.openingHoursToday, closedToday: l.closedToday, zones: (l.zones || []).length }, o: o && { capacity: o.capacity, occupancy: o.occupancy, closed: o.closed } };
      }));
      return { tiles, extra };
    }
    function locRow(loc, x) {
      const l = (x && x.l) || {};
      const o = x && x.o;
      const closed = l.closedToday || /closed/i.test(l.openingHoursToday || '');
      const sub = [openTxt(l), !closed && occTxt(o)].filter(Boolean).join(' · ');
      const th = loc.thumbnailUrl ? `<span class="ko-th" style="background-image:url('${esc(K + '/' + loc.thumbnailUrl)}')"></span>` : `<span class="ic soft">${ico('seat')}</span>`;
      return row({ href: '#/l/' + loc.id, iconHtml: th, title: loc.unit, subHtml: `${esc(sub || l.address || '')}${closed ? '' : occBar(o)}`, cls: 'ko-row' + (closed ? ' off' : '') });
    }
    function viewHome(my) {
      document.title = 'Studieplek';
      setNav({ title: 'Studieplek', back: { label: 'Meer', href: PORTAL + '?tm=meer', act: 'meer' } });
      const draw = (d) => {
        if (my !== token) return;
        const { tiles, extra } = d.loc || { tiles: null, extra: {} };
        const name = (ME && ME.firstName) || '';
        let h = `<div class="lt"><h1>Studieplek</h1><p class="lt-sub">KURT${name ? ' · hoi ' + esc(name) : ''}</p></div>`;
        // bookings
        const res = (d.res || []).slice().sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime));
        if (d.res === undefined) h += `<div class="sh"><h2>Jouw reservaties</h2></div>${skGroup(1)}`;
        else if (res.length) {
          h += `<div class="sh"><h2>Jouw reservaties</h2></div>`;
          h += res.map((r) => {
            const now = Date.now(), s = fromYmd(r.startDate, r.startTime), e = r.endTime === '00:00' ? fromYmd(r.endDate, '24:00') : fromYmd(r.endDate, r.endTime);
            const live = now >= s - 15 * 60e3 && now < e;
            // a booking only names its seat ("Agora - Silent Study Seat 111"): find its library by that prefix
            const pre = fold(String(r.resourceName || '').split(' - ')[0]);
            const locs = d.loc ? d.loc.tiles.flatMap((t) => t.locations) : [];
            const hit = r.locationId ? locs.find((l) => l.id === r.locationId) : pre && locs.find((l) => fold(l.unit).startsWith(pre) || fold(l.unit).includes(pre));
            const lid = hit ? hit.id : r.locationId;
            const unit = hit ? hit.unit : '';
            return `<div class="card kr${live ? ' live' : ''}"><div class="kr-top"><span class="kr-seat">${esc(seatNo(r.resourceName))}</span><span class="kr-main"><b>${esc(nm(r.resourceName))}</b><span>${esc(unit || (r.resourceName || '').split(' - ')[0])}</span></span></div>
              <div class="kr-when">${ico('clock')}<span><b>${esc(dayLbl(r.startDate))}</b> ${esc(r.startTime)}–${esc(r.endTime === '00:00' ? '24:00' : r.endTime)}${live ? ' · <em>nu</em>' : ` · ${esc(until(s))}`}</span></div>
              <div class="kr-acts">${live ? `<a class="pri" href="${esc(ORIG('/check-in/' + r.resourceId))}">Inchecken</a>` : ''}${lid ? `<a href="#/l/${esc(lid)}">Locatie</a>` : ''}<button type="button" class="red" data-act="cancel" data-id="${esc(r.id)}" data-n="${esc(nm(r.resourceName))}">Annuleer</button></div></div>`;
          }).join('');
          h += `<p class="ko-hint">${ico('info')}Check in met de QR-code op je plek. 3 keer niet komen opdagen in 14 dagen = een week geen reservaties.</p>`;
        }
        if (!tiles) { h += `<div class="sh"><h2>Bibliotheken</h2></div>${skGroup(6)}`; put(sec, h); watchTitle(sec); return; }
        const all = tiles.flatMap((t) => t.locations);
        const mine = favs().concat(recent().filter((id) => !favs().includes(id))).map((id) => all.find((l) => l.id === id)).filter(Boolean).slice(0, 4);
        if (mine.length) h += `<div class="sh"><h2>Jouw plekken</h2></div><div class="group">${mine.map((l) => locRow(l, extra[l.id])).join('')}</div>`;
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
      get('/reservations').then((r) => { d.res = Array.isArray(r) ? r : []; store.set('kurt:res', { ts: Date.now(), v: d.res }); draw(d); }, () => { if (d.res === undefined) { d.res = []; draw(d); } });
      if (!cached || Date.now() - cached.ts > 3 * 60e3) {
        once('kurt:locs', locData).then((v) => { store.set('kurt:locs', { ts: Date.now(), v }); d.loc = v; draw(d); }, (e) => {
          if (my === token && !d.loc && !(e && e.auth)) put(sec, empty('warn', 'KURT reageert niet', 'Probeer het straks opnieuw.', `<p style="margin-top:14px"><a class="btn" href="${esc(ORIG('/'))}">Open KURT</a></p>`));
        });
      }
    }

    /* ---------- a library: its rooms, with free seats at the chosen hour */
    const mainType = (ids) => [302, 303, 1, 5, 6, 55, 131].find((t) => (ids || []).includes(t)) || (ids && ids[0]) || 302;
    function pickTime(par, q) {
      const ds = (par && par.startDates) || [];
      let d = ds.find((x) => x.value === q.get('d')) || ds[0];
      if (!d) return { ds, d: null, t: null };
      const t = d.startTimes.find((x) => x.value === q.get('t')) || d.startTimes[0];
      return { ds, d, t };
    }
    const timeBar = (sel, base) => !sel.d ? '' : `<div class="kt"><div class="chips kt-d">${sel.ds.map((x) => `<a class="chip${x.value === sel.d.value ? ' on' : ''}" href="${esc(base)}?d=${esc(x.value)}">${esc(dayLbl(x.value))}</a>`).join('')}</div>
      <div class="chips kt-t">${sel.d.startTimes.map((x) => `<a class="chip${x.value === sel.t.value ? ' on' : ''}" href="${esc(base)}?d=${esc(sel.d.value)}&t=${esc(x.value)}">${esc(x.display)}</a>`).join('')}</div></div>`;
    async function viewLoc(id, my) {
      remember(Number(id));
      setNav({ back: { label: 'Studieplek', act: 'kback', href: '#/' }, title: '' });
      const q = route().q;
      const c = store.get('kurt:loc:' + id);
      const draw = (L, par, avail) => {
        if (my !== token) return;
        const l = L.l, o = L.o;
        const fav = favs().includes(Number(id));
        document.title = l.unit;
        setNav({ back: { label: 'Studieplek', act: 'kback', href: '#/' }, title: l.unit, right: `<button type="button" class="nb" data-act="fav" data-id="${esc(id)}" aria-label="${fav ? 'Uit je plekken' : 'Bij je plekken'}">${fav ? '★' : '☆'}</button>` });
        const sel = pickTime(par, q);
        const zones = l.zones || [];
        zones.forEach((z) => { zoneLoc[z.id] = Number(id); });
        store.set('kurt:zl', zoneLoc);
        let h = l.fullImageUrl ? `<div class="ko-hero" style="background-image:url('${esc(K + '/' + l.fullImageUrl)}')"></div>` : '';
        h += `<div class="lt"><h1${l.unit.length > 22 ? ' class="long"' : ''}>${esc(l.unit)}</h1><p class="lt-sub">${esc([openTxt(l), l.address].filter(Boolean).join(' · '))}</p></div>`;
        if (o && o.capacity && !o.closed) h += `<div class="ko-occ"><span><b>${Math.max(0, o.capacity - o.occupancy)}</b> van ${o.capacity} plaatsen vrij nu</span>${occBar(o)}</div>`;
        if (zones.length) {
          h += `<div class="sh"><h2>Kies je plek</h2>${sel.t ? `<span class="sh-note">vanaf ${esc(sel.t.display)}</span>` : ''}</div>`;
          h += timeBar(sel, '#/l/' + id);
          h += `<div class="kz-list">${zones.map((z) => {
            const a = avail && avail[z.id];
            const free = a ? a.availabilities.filter((s) => s.availableHours > 0) : null;
            const best = free && free.length ? Math.max(...free.map((s) => s.availableHours)) : 0;
            const fp = a && a.floorPlan && a.floorPlan.floorPlanUrl;
            const qs = sel.t ? `?d=${sel.d.value}&t=${sel.t.value}` : '';
            return `<a class="kz${free && !free.length ? ' none' : ''}" href="#/z/${z.id}${qs}"><span class="kz-fp"${fp ? ` style="background-image:url('${esc(fp)}')"` : ''}></span><span class="kz-t"><b>${esc(z.name.trim())}</b><span>${free == null ? 'Laden…' : free.length ? `<em>${free.length} vrij</em> · max. ${best} u` : 'Niets vrij op dit uur'}</span></span><span class="kz-go">${ico('pin')}Kaart</span></a>`;
          }).join('')}</div>`;
        } else h += `<div class="card ko-none">${ico('info')}<span>Deze locatie heeft geen plattegrond in KURT. Reserveer hier via KURT zelf.</span></div>`;
        const acts = [];
        if (l.navigationUrl) {
          const ll = /query=([-\d.]+)%2C([-\d.]+)/.exec(l.navigationUrl);
          acts.push(`<a class="pri" href="${esc(l.navigationUrl)}">Google Maps</a>`);
          if (ll) acts.push(`<a href="https://maps.apple.com/?ll=${ll[1]},${ll[2]}&q=${encodeURIComponent(l.unit)}">Apple Kaarten</a>`);
        }
        if (acts.length) h += `<div class="sh"><h2>Route</h2></div><div class="card rp-loc"><div class="rp-addr">${ico('pin')}<span><b>${esc(l.address || '')}</b></span></div><div class="rp-acts">${acts.join('')}</div></div>`;
        const types = (L.types || []).filter((t) => !zones.length || ![302, 303].includes(t.id));
        if (types.length) h += `<div class="gh">Ook te reserveren</div><div class="group">${types.map((t) => row({ href: ORIG('/locations/' + id), icon: 'seat', soft: true, title: NL_TYPES[t.id] || t.name, sub: 'In KURT zelf', external: true })).join('')}</div>`;
        if (L.news && L.news.length) h += `<details class="rp-more"><summary>Berichten van ${esc(l.unit)}</summary>${L.news.map((n) => `<p class="rp-list">${esc(textOf(n.title || ''))}${n.title ? ': ' : ''}${esc(textOf(n.content || n.text || ''))}</p>`).join('')}</details>`;
        put(sec, h);
        watchTitle(sec);
      };
      if (c) draw(c, null, null);
      else put(sec, `<div class="ko-hero sk"></div><div class="lt"><h1>&nbsp;</h1></div>${skGroup(3)}`);
      try {
        const [l, o, types, news] = await Promise.all([get('/locations/' + id), get('/occupancies/' + id).catch(() => null), get('/resourcetypes?locationId=' + id).catch(() => []), get('/news?locationId=' + id).catch(() => null)]);
        const L = { l, o, types, news: Array.isArray(news) ? news : news ? [news] : [] };
        store.set('kurt:loc:' + id, L);
        const zones = l.zones || [];
        let par = null;
        if (zones.length) par = await get(`/parameters?locationId=${id}&resourceTypeId=${mainType(zones[0].resourceTypeIds)}`).catch(() => null);
        draw(L, par, null);
        const sel = pickTime(par, q);
        if (!sel.t) return;
        const avail = {};
        await Promise.all(zones.map((z) => get(`/zoneavailabilities?locationId=${id}&zoneId=${z.id}&startDate=${sel.d.value}&startTime=${sel.t.value}`).then((a) => { avail[z.id] = a; }, () => { avail[z.id] = { availabilities: [] }; })));
        draw(L, par, avail);
      } catch (e) {
        if (my === token && !c && !(e && e.auth)) put(sec, empty('warn', 'Locatie kon niet geladen worden', '', `<p style="margin-top:14px"><a class="btn" href="${esc(ORIG('/locations/' + id))}">Open in KURT</a></p>`));
      }
    }

    /* ---------- a room: the floor plan */
    let Z = null; // current map state
    async function viewZone(id, q, my) {
      const lid = zoneLoc[id];
      setNav({ back: { label: 'Terug', act: 'kback', href: lid ? '#/l/' + lid : '#/' }, title: '', always: true });
      put(sec, `<div class="kmap-wrap"><div class="kt-slot"></div><div class="kmap sk"></div></div>${skGroup(2)}`);
      let zone;
      try { zone = await get('/zones/' + id); } catch (e) { if (my === token) put(sec, empty('warn', 'Plattegrond kon niet geladen worden', '', `<p style="margin-top:14px"><a class="btn" href="${esc(ORIG('/zone/' + id))}">Open in KURT</a></p>`)); return; }
      zoneLoc[id] = zone.locationId; store.set('kurt:zl', zoneLoc);
      const par = await get(`/parameters?locationId=${zone.locationId}&resourceTypeId=${mainType(zone.resourceTypeIds)}`).catch(() => null);
      const sel = pickTime(par, q);
      if (my !== token) return;
      if (!sel.t) { put(sec, empty('clock', 'Geen tijden beschikbaar', 'Deze ruimte is de komende dagen niet te reserveren.')); return; }
      let a;
      try { a = await get(`/zoneavailabilities?locationId=${zone.locationId}&zoneId=${id}&startDate=${sel.d.value}&startTime=${sel.t.value}`); } catch (e) { if (my === token) put(sec, empty('warn', 'Plattegrond kon niet geladen worden', '')); return; }
      if (my !== token) return;
      const unit = (a.location && a.location.unit) || '';
      document.title = ((a.zone && a.zone.name) || zone.name || '').trim() || 'Plattegrond';
      setNav({ back: { label: 'Terug', act: 'kback', href: '#/l/' + zone.locationId }, title: (a.zone && a.zone.name) || zone.name, always: true });
      const seats = a.availabilities || [];
      const free = seats.filter((s) => s.availableHours > 0).sort((x, y) => y.availableHours - x.availableHours || String(x.resourceName).localeCompare(String(y.resourceName), 'nl', { numeric: true }));
      const fp = a.floorPlan || {};
      const W0 = fp.floorPlanWidth || 1000, H0 = fp.floorPlanHeight || 1000;
      let h = `<div class="kmap-wrap">${timeBar(sel, '#/z/' + id)}
        <div class="kmap" id="kmap"><div class="kp" style="width:${W0}px;height:${H0}px">${fp.floorPlanUrl ? `<img src="${esc(fp.floorPlanUrl)}" alt="Plattegrond ${esc(zone.name)}" draggable="false">` : ''}
        ${seats.map((s) => `<i class="ks${s.availableHours > 0 ? ' free' : ''}" data-r="${s.resourceId}" style="left:${s.positionX}px;top:${s.positionY}px">${s.availableHours > 0 ? s.availableHours : ''}</i>`).join('')}</div>
        <div class="kmap-tools"><button type="button" data-act="zin" aria-label="Inzoomen">+</button><button type="button" data-act="zout" aria-label="Uitzoomen">−</button><button type="button" data-act="zfit" aria-label="Hele plattegrond">⤢</button></div>
        <div class="kmap-leg"><span><i class="ks free">n</i> vrij, n uur</span><span><i class="ks"></i> bezet</span></div></div></div>`;
      h += `<div class="sh"><h2>${free.length ? `${free.length} plaatsen vrij` : 'Niets vrij'}</h2><span class="sh-note">${esc(dayLbl(sel.d.value))} vanaf ${esc(sel.t.display)}</span></div>`;
      if (free.length) h += `<div class="kfree">${free.map((s, i) => `<button type="button" class="kf" data-act="seat" data-r="${s.resourceId}"${i >= 24 ? ' hidden' : ''}><b>${esc(seatNo(s.resourceName))}</b><span>${s.availableHours} u</span></button>`).join('')}${free.length > 24 ? `<button type="button" class="kf more" data-act="allfree">Alle ${free.length}</button>` : ''}</div>`;
      else h += `<p class="ko-hint">${ico('info')}Kies een ander uur of een andere ruimte.</p>`;
      h += `<p class="fresh">${esc(unit)} · <a href="${esc(ORIG('/zone/' + id))}">Open in KURT</a></p>`;
      put(sec, h);
      Z = { id, zone, sel, seats, unit, W0, H0 };
      initMap();
      const kt = sec.querySelector('.kt-t .chip.on');
      if (kt) kt.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    function initMap() {
      const box = $('#kmap');
      if (!box) return;
      const kp = box.querySelector('.kp');
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
      W.addEventListener('resize', () => { if ($('#kmap') === box) reset(false); });
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
          if (best && bd < 26) { lastTap = 0; if (best.availableHours > 0) pickSeat(best.resourceId); else toast(`${seatNo(best.resourceName)} is bezet om ${Z.sel.t.display}`); }
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
      Z.focus && Z.focus(rid);
      const st = Z.seats.find((q) => q.resourceId === rid);
      closeBook();
      const layer = document.createElement('div');
      layer.setAttribute('data-tm4', '');
      layer.innerHTML = `<div class="scrim"></div><div class="kb" role="dialog" aria-modal="true"><div class="kb-grab"></div><div class="kb-in"><div class="kb-h"><span class="kr-seat">${esc(seatNo(st.resourceName))}</span><span class="kr-main"><b>${esc(nm(st.resourceName))}</b><span>${esc(Z.unit)} · ${esc((Z.zone.name || '').trim())}</span></span></div><div class="kb-body">${skRows(2)}</div></div></div>`;
      document.body.appendChild(layer);
      bookLayer = layer;
      const scrim = layer.querySelector('.scrim'), kb = layer.querySelector('.kb');
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); kb.classList.add('on'); }));
      scrim.addEventListener('click', closeBook);
      const body = kb.querySelector('.kb-body');
      const { d, t } = Z.sel;
      const step = 60;
      let ra, res;
      try {
        const e1 = toMin(t.value) + 60;
        const ed = e1 >= 1440 ? ymd(addDays(fromYmd(d.value), 1)) : d.value;
        [ra, res] = await Promise.all([
          get(`/resourceavailabilities?resourceId=${rid}&startDate=${d.value}&startTime=${t.value}&endDate=${ed}&endTime=${e1 >= 1440 ? '00:00' : hm(e1)}&participantCount=1&exactMatch=false`),
          get(`/resources/${rid}?withDetails=true`),
          meP.catch(() => ME),
        ]);
      } catch (e) { if (bookLayer === layer) put(body, `<p class="ko-hint">${ico('warn')}Deze plaats kon niet geladen worden.</p>`); return; }
      if (bookLayer !== layer) return;
      const av = (ra && ra.availabilities || []).find((q) => q.id === rid) || (ra && ra.availabilities || [])[0];
      if (!av) { put(body, `<p class="ko-hint">${ico('warn')}Deze plaats is niet meer vrij om ${esc(t.display)}.</p>`); return; }
      const res0 = 1440 / (av.slotAllocation.length || 24);
      const slot = Math.round(res0) || step;
      const si = Math.round(toMin(t.value) / slot);
      const maxMin = av.maxDurationMinutes || 960;
      const ends = [];
      for (let i = si; i < av.slotAllocation.length && av.slotAllocation[i] === 'A' && (i - si + 1) * slot <= maxMin; i++) ends.push((i + 1) * slot);
      if (!ends.length) { put(body, `<p class="ko-hint">${ico('warn')}Deze plaats is niet meer vrij om ${esc(t.display)}.</p>`); return; }
      let end = ends[Math.min(ends.length, 4) - 1]; // up to 4 hours by default
      const tags = (av.tags || []).map((g) => NL_TAGS[g.id] || g.name).filter(Boolean);
      const draw = () => {
        const s0 = toMin(t.value);
        put(body, `${tags.length ? `<p class="kb-tags">${tags.map((g) => `<span>${esc(g)}</span>`).join('')}</p>` : ''}
          <div class="kb-l">${esc(dayLbl(d.value))} van <b>${esc(t.display)}</b> tot</div>
          <div class="chips kb-ends">${ends.map((m) => `<button type="button" class="chip${m === end ? ' on' : ''}" data-act="end" data-m="${m}">${hm(m)}<small>${dur(m - s0)}</small></button>`).join('')}</div>
          <button type="button" class="btn kb-go" data-act="book">Reserveer ${esc(seatNo(st.resourceName))} · ${esc(t.display)}–${hm(end)}</button>
          <p class="kb-legal">Je gaat akkoord met het <a href="${esc((res && (res.conditionsOfUseNlUrl || res.conditionsOfUseEnUrl) || '').trim())}">reglement</a>. Vergeet niet in te checken met de QR-code op je plek.</p>`);
        const on = body.querySelector('.kb-ends .chip.on');
        if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      };
      draw();
      kb.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'end') { end = Number(b.dataset.m); draw(); return; }
        if (b.dataset.act === 'done') { closeBook(); nav('#/'); return; }
        if (b.dataset.act !== 'book' || b.disabled) return;
        b.disabled = true; b.innerHTML = '<span class="spin"></span> Reserveren…';
        const me = ME || {};
        const endDate = end >= 1440 ? ymd(addDays(fromYmd(d.value), 1)) : d.value;
        const endTime = end >= 1440 ? '00:00' : hm(end);
        const parts = me.uid ? [{ uid: me.uid, email: me.email }] : [];
        const payload = {
          id: res.id, resourceName: res.name,
          subject: [302, 303].includes(res.resourceTypeId) ? res.name : res.name,
          purpose: '', resourceId: av.id,
          startDate: d.value, startTime: t.value, endDate, endTime,
          participants: parts,
          summary: [`Resource **${av.name}**`, `at **${av.unit}**`, `for **${parts.map((p) => p.email.replace('@', '&commat;')).join(', ')}**`, `from **${enDate(d.value)} ${t.value}** until **${enDate(endDate)} ${endTime}**`],
          withCheckIn: false,
        };
        if (res.additionalFields) payload.additionalFields = res.additionalFields;
        try {
          await send('POST', '/reservations/', payload);
          store.del('kurt:res');
          put(body, `<div class="kb-ok">${ico('check')}<b>Gereserveerd</b><span>${esc(nm(st.resourceName))} · ${esc(dayLbl(d.value))} ${esc(t.display)}–${hm(end)}</span><span>Check in met de QR-code op je plek, binnen het eerste halfuur.</span></div><button type="button" class="btn kb-go" data-act="done">Klaar</button>`);
        } catch (err) {
          b.disabled = false; draw();
          body.insertAdjacentHTML('afterbegin', `<p class="ko-hint err">${ico('warn')}${esc(err.message || 'Reserveren lukte niet')}</p>`);
        }
      });
    }

    /* ---------- taps */
    W.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('#tm-tabs a');
      if (t) { e.preventDefault(); goTo(t.getAttribute('href'), { dir: 'back' }); return; }
      const a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (a) {
        e.preventDefault();
        const href = a.getAttribute('href');
        // switching the hour or day: replace, so Terug still goes to the previous screen
        if (a.closest('.kt')) { quiet = true; keepY = W.scrollY; location.replace(K + '/' + href); return; }
        nav(href);
        return;
      }
      const b = e.target.closest && e.target.closest('[data-act]');
      if (!b || b.closest('.kb')) return;
      const act = b.dataset.act;
      if (act === 'kback') { e.preventDefault(); back(); }
      else if (act === 'meer') { e.preventDefault(); goTo(PORTAL + '?tm=meer', { dir: 'back' }); }
      else if (act === 'allfree') { e.preventDefault(); $$('.kfree .kf[hidden]').forEach((n) => { n.hidden = false; }); b.hidden = true; }
      else if (act === 'seat') { e.preventDefault(); pickSeat(Number(b.dataset.r)); }
      else if (act === 'zin' || act === 'zout') { e.preventDefault(); if (Z && Z.zoom) Z.zoom(act === 'zin' ? 1.6 : 1 / 1.6); }
      else if (act === 'zfit') { e.preventDefault(); if (Z && Z.reset) Z.reset(true); }
      else if (act === 'fav') {
        e.preventDefault();
        const id = Number(b.dataset.id); const f = favs();
        store.set('kurt:fav', f.includes(id) ? f.filter((x) => x !== id) : [id].concat(f).slice(0, 6));
        b.textContent = f.includes(id) ? '☆' : '★';
        toast(f.includes(id) ? 'Uit je plekken' : 'Bij je plekken op Studieplek');
      } else if (act === 'cancel') {
        e.preventDefault();
        const id = b.dataset.id;
        sheet({ title: 'Reservatie verwijderen?', msg: b.dataset.n, actions: [{ label: 'Reservatie verwijderen', red: true, run: () => {
          send('DELETE', '/reservations/' + encodeURIComponent(id) + '/').then(() => { toast('Geannuleerd'); store.del('kurt:res'); show(); }, (err) => toast(err.message || 'Annuleren lukte niet'));
        } }] });
      }
    });
    pullRefresh(() => { store.del('kurt:locs'); store.del('kurt:res'); show(); return new Promise((r) => setTimeout(r, 900)); });
    show();
  }

