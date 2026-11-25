  /* ================================================================== Alma (KU Leuven student restaurants) */
  // www.alma.be is public (no login). Each restaurant page is server-rendered HTML with the menu of one day
  // (?date=YYYY-MM-DD), three prices per dish, labels (vegetarian, vegan, meat, climate score), photos and the
  // opening hours of the coming 7 days. The app reads those pages in the background (same site, fetch + DOMParser)
  // and shows "your" Alma: the ones you starred, the first one opens straight away.
  const ALMAS = [
    { s: 'alma-1', n: 'Alma 1', c: 'Centrum Leuven' },
    { s: 'alma-2', n: 'Alma 2', c: 'Centrum Leuven' },
    { s: 'groep-t', n: 'Groep T', c: 'Centrum Leuven' },
    { s: 't-academisch-kwartier', n: "'t Academische kwartier", c: 'Centrum Leuven' },
    { s: 'alma-3', n: 'Alma 3', c: 'Campus Arenberg' },
    { s: 'de-moete', n: 'De Moete', c: 'Campus Arenberg' },
    { s: 'esat2', n: 'ESAT2', c: 'Campus Arenberg' },
    { s: 'alma-quadrivium', n: 'Alma Quadrivium', c: 'Campus Arenberg' },
    { s: 'alma-gasthuisberg', n: 'Alma Gasthuisberg', c: 'Campus Gasthuisberg' },
    { s: 'kulak-restaurant', n: 'KULAK Restaurant', c: 'Campus Kortrijk' },
    { s: 'kulak-campus-hal-a-broodje-app', n: 'KULAK Hal A Broodjesbar', c: 'Campus Kortrijk' },
  ];
  // "free of ..." filters; Alma filters on its own server (?allergie[]=id), nuts are one switch for all tree nuts
  const ALLERGENS = [
    { k: 'gluten', n: 'Gluten', ids: [206360] },
    { k: 'melk', n: 'Melk', ids: [1136] },
    { k: 'eieren', n: 'Eieren', ids: [1131] },
    { k: 'noten', n: 'Noten', ids: [1137, 1138, 1139, 1140, 1141, 1142, 1143, 1144] },
    { k: 'aardnoten', n: 'Aardnoten', ids: [1130] },
    { k: 'soja', n: 'Soja', ids: [1145] },
    { k: 'sesam', n: 'Sesam', ids: [767] },
    { k: 'selderij', n: 'Selderij', ids: [766] },
    { k: 'mosterd', n: 'Mosterd', ids: [765] },
    { k: 'vis', n: 'Vis', ids: [3431] },
    { k: 'schaaldieren', n: 'Schaaldieren', ids: [764] },
    { k: 'weekdieren', n: 'Weekdieren', ids: [1148] },
    { k: 'lupine', n: 'Lupine', ids: [1135] },
    { k: 'sulfiet', n: 'Sulfiet', ids: [1146] },
  ];
  const PRICE_GROUPS = [
    { k: 'kul', n: 'Studenten en personeel KU Leuven' },
    { k: 'notKul', n: 'Andere studenten' },
    { k: 'other', n: 'Andere klanten' },
  ];
  const ALMA_FOLDED = ['Ontbijt', 'Dessert', 'Drank', 'Diversen'];

  function almaApp() {
    const O = location.origin;
    const pageUrl = (slug) => O + '/nl/restaurants' + (slug ? '/' + slug : '');
    // came in on one restaurant's own page (a link from elsewhere): that one is open first
    const direct = (/^\/(?:nl|en)\/restaurants\/([a-z0-9-]+)/.exec(PATH) || [])[1] || '';
    takeover('Alma', []);
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

    /* ---------- settings (kept on this site: alma.be has its own storage) */
    const favs = () => (store.get('alma:fav') || []).filter((s) => ALMAS.some((a) => a.s === s));
    const setFavs = (v) => store.set('alma:fav', v);
    const FLT = Object.assign({ veg: false, vegan: false, alg: [], sort: false }, store.get('alma:flt') || {});
    const saveFlt = () => store.set('alma:flt', FLT);
    const priceGroup = () => { const p = store.get('alma:prijs'); return PRICE_GROUPS.some((g) => g.k === p) ? p : 'kul'; };
    const almaOf = (s) => ALMAS.find((a) => a.s === s) || { s, n: s, c: '' };
    // which Alma and day you're looking at during this visit
    const today = () => ymd(Date.now());
    let CUR = direct && ALMAS.some((a) => a.s === direct) ? direct : (ss.get('tm4-alma-cur') || '');
    let DAY = ss.get('tm4-alma-day') || '';
    if (!DAY || DAY < today()) DAY = today();
    const setCur = (s) => { CUR = s; ss.set('tm4-alma-cur', s); };
    const setDay = (d) => { DAY = d; ss.set('tm4-alma-day', d); };

    /* ---------- reading Alma's pages */
    const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const algIds = () => ALLERGENS.filter((a) => FLT.alg.includes(a.k)).flatMap((a) => a.ids);
    const priceOf = (el) => { const m = /(\d+)\s*[.,]\s*(\d{2})/.exec(txt(el).replace('€', '')); return m ? Number(m[1]) + Number(m[2]) / 100 : null; };
    function parse(html, date) {
      const d = new DOMParser().parseFromString(html, 'text/html');
      d.querySelectorAll('script, style, svg').forEach((n) => n.remove());
      const cats = [];
      let cat = null, sub = '';
      d.querySelectorAll('div[id][class~="text-custom-title"], .py-4 > .text-lg, .js-menu').forEach((el) => {
        if (el.matches('.js-menu')) {
          if (!cat) return;
          const prices = {};
          el.querySelectorAll('.js-price[data-type]').forEach((p) => { prices[p.dataset.type] = priceOf(p); });
          const img = el.querySelector('picture img[srcset]');
          let photo = '', big = '';
          if (img) {
            const set = img.getAttribute('srcset').split(',').map((x) => x.trim().split(/\s+/)).filter((x) => x[0]);
            const small = set.find((x) => /^375w$/.test(x[1])) || set[set.length - 1];
            photo = (small && small[0]) || '';
            big = (set[0] && set[0][0]) || photo;
          }
          const labels = $$('.absolute img[alt]', el).map((i) => i.getAttribute('alt').trim()).filter(Boolean);
          cat.items.push({ id: el.id, n: txt(el.querySelector('h4')), p: prices, sub, photo, big, labels });
        } else if (el.matches('.text-lg')) sub = txt(el);
        else { cat = { n: txt(el).replace(/\s*\(\d+\)\s*$/, ''), items: [] }; cats.push(cat); sub = ''; }
      });
      // opening hours of the coming days: "Warme maaltijden" and "Snacks & sandwiches"
      const hours = {};
      const hh = $$('h4', d).find((h) => /Openingsdagen/i.test(h.textContent));
      const box = hh && hh.nextElementSibling;
      if (box) {
        $$('.grow', box).forEach((g) => {
          const kind = /warm/i.test(txt(g.querySelector('strong'))) ? 'warm' : 'snack';
          $$('dl > div', g).forEach((r) => {
            const m = /(\d{1,2})\/(\d{1,2})/.exec(txt(r.querySelector('dt')));
            if (!m) return;
            const now = new Date();
            let y = now.getFullYear();
            if (Number(m[2]) < now.getMonth() + 1 - 6) y++; // late December looking at January
            const key = `${y}-${pad(m[2])}-${pad(m[1])}`;
            const ranges = [];
            const re = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/g;
            const s = txt(r.querySelector('dd'));
            let x;
            while ((x = re.exec(s))) ranges.push([pad(x[1]) + ':' + x[2], pad(x[3]) + ':' + x[4]]);
            (hours[key] = hours[key] || {})[kind] = ranges;
          });
        });
      }
      const box2 = (d.querySelector('div.relative > .not-italic') || {}).parentNode;
      const rl = (box2 && box2.querySelector('a[href*="google.com/maps"]')) || d.querySelector('a[href*="google.com/maps"]');
      const route = rl ? rl.getAttribute('href').replace(/\s+/g, '') : '';
      const addr = box2 ? $$('.not-italic > div', box2).map(txt).filter(Boolean).join(', ') : '';
      return { date, cats, hours, route, addr };
    }
    // in-memory + session cache: switching Alma's or days is instant once loaded
    const MEM = {};
    const keyOf = (slug, date, ids) => `${slug}|${date}|${ids.join('.')}`;
    function load(slug, date) {
      const ids = algIds();
      const k = keyOf(slug, date, ids);
      if (MEM[k] && Date.now() - MEM[k].ts < 15 * 60e3) return MEM[k].p;
      const kept = store.get('alma:m:' + k);
      if (kept && Date.now() - kept.ts < 15 * 60e3) { MEM[k] = { ts: kept.ts, p: Promise.resolve(kept.v) }; return MEM[k].p; }
      const q = new URLSearchParams({ date });
      ids.forEach((i) => q.append('allergie[]', String(i)));
      const p = fetch(pageUrl(slug) + '?' + q.toString(), { credentials: 'omit' })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then((t) => {
          const v = parse(t, date);
          store.set('alma:m:' + k, { ts: Date.now(), v });
          if (Object.keys(v.hours).length) store.set('alma:h:' + slug, { ts: Date.now(), v: v.hours });
          if (v.route) store.set('alma:r:' + slug, { route: v.route, addr: v.addr });
          return v;
        });
      MEM[k] = { ts: Date.now(), p };
      p.catch(() => { delete MEM[k]; });
      return p;
    }
    // what we saw before (also on an earlier visit): shown at once while the fresh menu loads
    const peek = (slug, date) => { const kept = store.get('alma:m:' + keyOf(slug, date, algIds())); return kept ? kept.v : null; };
    // menus of past days are of no use any more
    const dropMenus = (all) => {
      try {
        Object.keys(localStorage).filter((x) => x.startsWith('tm4:alma:m:')).forEach((x) => {
          if (all || (x.split('|')[1] || '') < ymd(Date.now())) localStorage.removeItem(x);
        });
      } catch (_) {}
    };
    dropMenus(false);

    /* ---------- opening hours */
    const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const span = (r) => r.map((x) => `${x[0]}–${x[1]}`).join(' en ');
    const hoursOf = (slug) => (store.get('alma:h:' + slug) || {}).v || {};
    function statusLine(slug, date) {
      const h = hoursOf(slug)[date];
      if (!h) return null;
      const warm = h.warm || [], snack = h.snack || [];
      if (!warm.length && !snack.length) return { cls: 'cl', t: date === today() ? 'Vandaag gesloten' : 'Gesloten' };
      const all = [warm.length ? `Warm eten ${span(warm)}` : '', snack.length ? `Broodjes en snacks ${span(snack)}` : ''].filter(Boolean).join(' · ');
      if (date !== today()) return { cls: '', t: all };
      const now = new Date().getHours() * 60 + new Date().getMinutes();
      const inR = (r) => r.find((x) => now >= toMin(x[0]) && now < toMin(x[1]));
      const next = (r) => r.find((x) => now < toMin(x[0]));
      const w = inR(warm), s = inR(snack);
      let head;
      if (w) head = { cls: 'open', t: `Open · warm eten tot ${w[1]}` };
      else if (s) {
        const nw = next(warm);
        head = { cls: 'open', t: `Open · broodjes en snacks tot ${s[1]}${nw ? `, warm vanaf ${nw[0]}` : ''}` };
      } else {
        const nw = next(warm) || next(snack);
        head = nw ? { cls: 'soon', t: `Nu dicht · open om ${nw[0]}` } : { cls: 'cl', t: 'Nu dicht' };
      }
      return { cls: head.cls, t: head.t, all };
    }
    // the days you can pick: today and the coming days the restaurant is open (from its hours table)
    function days(slug) {
      const h = hoursOf(slug);
      const t = today();
      let list = Object.keys(h).sort().filter((d) => d >= t && (d === t || (h[d].warm || []).length || (h[d].snack || []).length));
      if (!list.length) list = [t];
      if (list[0] !== t) list.unshift(t);
      return list.slice(0, 7);
    }
    const DS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
    const dayChip = (d) => { const x = new Date(fromYmd(d)); return `<button type="button" class="al-day${d === DAY ? ' on' : ''}" data-act="aday" data-d="${d}"><span>${d === today() ? 'vandaag' : DS[x.getDay()]}</span><b>${x.getDate()}</b></button>`; };

    /* ---------- dishes */
    const isVegan = (it) => it.labels.some((l) => /^vegan/i.test(l));
    const isVeg = (it) => isVegan(it) || it.labels.some((l) => /^vegetarisch/i.test(l));
    const hasDiet = (it) => it.labels.some((l) => /vegan|vegetarisch|vis|vlees|varken|rund|gevogelte|kip|lam/i.test(l));
    const ECO = { 'heel laag': 'A', laag: 'B', gemiddeld: 'C', hoog: 'D', 'heel hoog': 'E' };
    const ecoOf = (it) => { const l = it.labels.find((x) => ECO[x.toLowerCase()]); return l ? ECO[l.toLowerCase()] : ''; };
    const MEAT = /^(varken|rund|gevogelte|vis|mix vlees en vis|vlees overige|varken en rund|niet-vegetarisch|lam|kip)/i;
    const eur = (v) => (v == null ? '' : '€' + v.toFixed(2).replace('.', ','));
    function tags(it) {
      let h = '';
      if (isVegan(it)) h += '<i class="al-tg vgn">vegan</i>';
      else if (isVeg(it)) h += '<i class="al-tg veg">veggie</i>';
      else { const m = it.labels.find((l) => /^vis$/i.test(l)); if (m) h += '<i class="al-tg fish">vis</i>'; }
      const e = ecoOf(it);
      if (e) h += `<i class="al-tg eco e${e}" title="Klimaatimpact">eco ${e}</i>`;
      return h;
    }
    const passes = (it) => {
      if (!FLT.veg && !FLT.vegan) return true;
      if (!hasDiet(it)) return true; // drinks, pastries, sweets: no labels, nothing to filter on
      return FLT.vegan ? isVegan(it) : isVeg(it);
    };
    function dishRow(it, cat, i) {
      const pg = priceGroup();
      const ph = it.photo ? `<img class="al-ph" src="${esc(it.photo)}" alt="" loading="lazy" decoding="async">` : `<span class="al-ph none">${ico('food')}</span>`;
      return `<button type="button" class="al-dish" data-act="adish" data-c="${esc(cat)}" data-i="${i}">${ph}<span class="al-dt"><b>${esc(it.n)}</b><span class="al-tgs">${tags(it)}</span></span><span class="al-pr">${esc(eur(it.p[pg]))}</span></button>`;
    }

    /* ---------- router: #/ your Alma, #/kies all Alma's (stars, price group) */
    {
      const r = /^#\/[a-z]*/.test(location.hash) ? location.hash.replace(/[?&]th=(light|dark|auto)\b/, '') : '#/';
      try { history.replaceState(null, '', pageUrl('') + (r === '#/?' ? '#/' : r)); } catch (_) {}
    }
    const route = () => (location.hash.replace(/^#\/?/, '').split(/[?/]/)[0] || 'home');
    let depth = 0, token = 0;
    let SETUP = false; // the very first time: star as many Alma's as you like, then Klaar
    const nav = (hash) => { depth++; location.hash = hash; };
    const back = () => { if (depth > 0) { depth--; history.back(); } else location.replace(pageUrl('') + '#/'); };
    // redraw the screen you're on without moving it (fold open, filters): only a new screen starts at the top
    const redraw = () => { ++token; if (route() === 'kies' || SETUP) viewPick(token); else viewMenu(token, true); };
    const show = (anim) => {
      const my = ++token;
      sec.classList.remove('push', 'pop');
      if (anim) { void sec.offsetWidth; sec.classList.add(anim); }
      W.scrollTo(0, 0);
      if (!favs().length && !CUR) SETUP = true;
      if (route() === 'kies' || SETUP) viewPick(my);
      else viewMenu(my);
    };
    let lastLen = history.length;
    W.addEventListener('hashchange', () => { show(history.length > lastLen ? 'push' : 'pop'); lastLen = history.length; });

    /* ---------- your Alma: chips, day, hours, filters, menu */
    let LAST = null; // the menu on screen (for the dish sheet)
    const OPEN = (() => { try { return JSON.parse(ss.get('tm4-alma-open') || '{}'); } catch (_) { return {}; } })();
    function viewMenu(my, keep) {
      const fs = favs();
      if (!CUR) setCur(fs[0]);
      const a = almaOf(CUR);
      document.title = a.n;
      setNav({ title: a.n, back: { label: 'Meer', href: PORTAL + '?tm=meer', act: 'ameer' } });
      const ds = days(CUR);
      if (!ds.includes(DAY)) setDay(ds[0]);
      const draw = (m, err) => {
        if (my !== token) return;
        sec.classList.remove('al-busy');
        LAST = m;
        const loc = store.get('alma:r:' + CUR) || {};
        let h = `<div class="lt"><h1>${esc(a.n)}</h1><p class="lt-sub">${esc(loc.addr || a.c)}${loc.route ? ` · <a class="al-route" href="${esc(loc.route)}" target="_blank" rel="noopener">Route</a>` : ''}</p></div>`;
        // your starred Alma's (and the one you're looking at, if it isn't one of them)
        const chips = fs.includes(CUR) ? fs : [CUR].concat(fs);
        h += `<div class="chips al-chips">${chips.map((s) => `<button type="button" class="chip${s === CUR ? ' on' : ''}" data-act="acur" data-s="${esc(s)}">${esc(almaOf(s).n)}</button>`).join('')}<a class="chip al-all" href="#/kies">${ico('plus')}Alle Alma's</a></div>`;
        h += `<div class="al-days">${days(CUR).map(dayChip).join('')}</div>`;
        const st = statusLine(CUR, DAY);
        if (st) h += `<div class="card al-st"><b class="${st.cls}">${st.cls === 'open' || st.cls === 'soon' ? '<i class="al-dot"></i>' : ''}${esc(st.t)}</b>${st.all && st.all !== st.t ? `<span>${esc(st.all)}</span>` : ''}</div>`;
        // filters
        const nAlg = FLT.alg.length;
        h += `<div class="chips al-flt">`
          + `<button type="button" class="chip${FLT.veg ? ' on' : ''}" data-act="aflt" data-k="veg">${FLT.veg ? ico('check') : ''}Veggie</button>`
          + `<button type="button" class="chip${FLT.vegan ? ' on' : ''}" data-act="aflt" data-k="vegan">${FLT.vegan ? ico('check') : ''}Vegan</button>`
          + `<button type="button" class="chip${FLT.alg.includes('gluten') ? ' on' : ''}" data-act="agluten">${FLT.alg.includes('gluten') ? ico('check') : ''}Zonder gluten</button>`
          + `<button type="button" class="chip${nAlg && !(nAlg === 1 && FLT.alg[0] === 'gluten') ? ' on' : ''}" data-act="aalg">Allergenen${nAlg ? ` (${nAlg})` : ''}</button>`
          + `<button type="button" class="chip${FLT.sort ? ' on' : ''}" data-act="aflt" data-k="sort">${FLT.sort ? ico('check') : ''}Goedkoopst eerst</button>`
          + `</div>`;
        if (!m) {
          h += err ? `<div class="card ko-empty">${ico('warn')}<span>Het menu kon niet geladen worden. Trek omlaag om opnieuw te proberen.</span></div>` : skGroup(5);
        } else {
          const warm = m.cats.filter((c) => /warm|soep/i.test(c.n)).some((c) => c.items.some((it) => !/optioneel/i.test(it.sub)));
          if (DAY > today() && !warm) h += `<p class="ko-hint">${ico('info')}<span>Het menu van deze dag staat nog niet online. Dit vind je er elke dag.</span></p>`;
          const sum = { shown: 0 };
          // what you eat first: warm, soup and sandwiches on top; breakfast, dessert and drinks folded at the bottom
          const RANK = ['warm buffet', 'soep', 'broodjes', 'salades', 'diverse snacks'];
          const rank = (n) => { const i = RANK.indexOf(n.toLowerCase()); return i < 0 ? (ALMA_FOLDED.includes(n) ? 50 + ALMA_FOLDED.indexOf(n) : 20) : i; };
          m.cats.map((c, ci) => [c, ci]).sort((x, y) => rank(x[0].n) - rank(y[0].n) || x[1] - y[1]).forEach(([c, ci]) => {
            let items = c.items.map((it, i) => ({ it, i })).filter((x) => passes(x.it));
            if (!items.length) return;
            const folded = ALMA_FOLDED.includes(c.n) && !OPEN[c.n];
            const fold = ALMA_FOLDED.includes(c.n);
            h += `<div class="sh al-sh">${fold ? `<button type="button" class="al-fold" data-act="afold" data-c="${esc(c.n)}"><h2>${esc(c.n)}</h2><span class="sh-note">${items.length}</span><span class="al-chev${folded ? '' : ' up'}">${CHEV}</span></button>` : `<h2>${esc(c.n)}</h2>`}</div>`;
            sum.shown += items.length;
            if (folded) return;
            // within each little group (Maaltijd I, Maaltijd II…) keep Alma's order, or cheapest first
            const groups = [];
            items.forEach((x) => { const g = groups.find((y) => y.n === x.it.sub); if (g) g.l.push(x); else groups.push({ n: x.it.sub, l: [x] }); });
            const pg = priceGroup();
            if (FLT.sort) groups.forEach((g) => g.l.sort((p, q) => (p.it.p[pg] ?? 99) - (q.it.p[pg] ?? 99)));
            h += `<div class="group al-g">${groups.map((g) => (g.n && groups.length > 1 && !/^(snacks|broodje)$/i.test(g.n) ? `<div class="al-sub">${esc(g.n)}</div>` : '') + g.l.map((x) => dishRow(x.it, String(ci), x.i)).join('')).join('')}</div>`;
          });
          if (!sum.shown) h += `<div class="card ko-empty">${ico('food')}<span>${FLT.veg || FLT.vegan || FLT.alg.length ? 'Niets op het menu dat bij je filters past.' : 'Geen menu voor deze dag.'}</span></div>`;
        }
        const pg = PRICE_GROUPS.find((g) => g.k === priceGroup());
        h += `<p class="foot al-foot">Prijzen voor ${esc(pg.n.toLowerCase().replace('ku leuven', 'KU Leuven'))} · <a href="#/kies">Wijzig</a><br><a href="${esc(pageUrl(CUR))}?tm=orig" target="_blank" rel="noopener">Bekijk op alma.be</a></p>`;
        put(sec, h);
        watchTitle(sec);
        const on = sec.querySelector('.al-chips .on');
        if (on && on.scrollIntoView && on.offsetLeft > sec.clientWidth - 120) on.parentNode.scrollLeft = on.offsetLeft - 16;
      };
      const cached = peek(CUR, DAY);
      if (cached || !keep) draw(cached);
      else {
        // a redraw keeps the old menu on screen (dimmed) until the new one is there; the chips move at once
        sec.classList.add('al-busy');
        $$('.al-day', sec).forEach((x) => x.classList.toggle('on', x.dataset.d === DAY));
        $$('.al-chips .chip[data-s]', sec).forEach((x) => x.classList.toggle('on', x.dataset.s === CUR));
      }
      load(CUR, DAY).then((m) => {
        // the first answer brings the opening hours: maybe today isn't a day to show any more
        if (my !== token) return;
        draw(m);
        prefetch();
      }, () => { if (!cached) draw(null, true); });
    }
    // the other starred Alma's today, and this Alma's next days: tapping a chip is instant
    function prefetch() {
      // first every day of this Alma, then your other Alma's: tapping a day or a chip is instant
      days(CUR).forEach((d) => load(CUR, d).catch(() => {}));
      favs().filter((s) => s !== CUR).forEach((s) => load(s, DAY).catch(() => {}));
      setTimeout(() => favs().filter((s) => s !== CUR).forEach((s) => days(s).forEach((d) => load(s, d).catch(() => {}))), 2500);
    }

    /* ---------- all Alma's: pick and star yours */
    function viewPick(my) {
      const fs = favs();
      const first = SETUP;
      document.title = "Alma's";
      setNav({ title: "Alma's", back: first ? { label: 'Meer', href: PORTAL + '?tm=meer', act: 'ameer' } : { label: almaOf(CUR || fs[0]).n, href: '#/', act: 'aback' } });
      if (my !== token) return;
      let h = `<div class="lt"><h1>${first ? "Welke Alma's zijn de jouwe?" : "Alle Alma's"}</h1><p class="lt-sub">${first ? 'Zet een ster bij elke Alma waar je eet en tik op Klaar. Ze staan dan bovenaan om snel te wisselen, en de eerste opent meteen.' : 'De Alma met een ster bovenaan opent meteen.'}</p></div>`;
      const starBtn = (s) => `<button type="button" class="al-star${fs.includes(s) ? ' on' : ''}" data-act="astar" data-s="${esc(s)}" aria-label="${fs.includes(s) ? 'Ster weghalen' : 'Ster geven'}">${ico('star')}</button>`;
      const rowOf = (a, extra) => `<div class="row al-row"><button type="button" class="al-open" data-act="aopen" data-s="${esc(a.s)}"><span class="main"><span class="t">${esc(a.n)}</span>${extra ? `<span class="s">${extra}</span>` : ''}</span></button>${starBtn(a.s)}</div>`;
      if (fs.length && !first) {
        h += `<div class="gh">Jouw Alma's</div><div class="group">${fs.map((s, i) => rowOf(almaOf(s), i === 0 ? 'Opent meteen' : `<button type="button" class="al-up" data-act="aup" data-s="${esc(s)}">Bovenaan zetten</button>`)).join('')}</div>`;
      }
      const camps = [...new Set(ALMAS.map((a) => a.c))];
      camps.forEach((c) => {
        const list = ALMAS.filter((a) => a.c === c && (first || !fs.includes(a.s)));
        if (list.length) h += `<div class="gh">${esc(c)}</div><div class="group">${list.map((a) => rowOf(a, '')).join('')}</div>`;
      });
      if (first) h += `<div class="al-done"><button type="button" class="btn" data-act="adone"${fs.length ? '' : ' disabled'}>${fs.length ? `Klaar (${fs.length})` : 'Kies minstens één Alma'}</button></div>`;
      const pg = priceGroup();
      h += `<div class="gh">Toon prijzen voor</div><div class="group">${PRICE_GROUPS.map((g) => `<button type="button" class="row" data-act="aprijs" data-k="${g.k}"><span class="main"><span class="t">${esc(g.n)}</span></span>${g.k === pg ? `<span class="end al-check">${ico('check')}</span>` : ''}</button>`).join('')}</div>`;
      h += `<div class="group" style="margin-top:24px">${row({ href: pageUrl('') + '?tm=orig', iconHtml: `<span class="ic" style="--c:#d9534f">${ico('globe')}</span>`, title: 'Website van Alma', external: true })}</div>`;
      put(sec, `<div class="al-pick">${h}</div>`);
      watchTitle(sec);
    }

    /* ---------- sheets */
    function dishSheet(it) {
      const pg = priceGroup();
      const diet = it.labels.filter((l) => /vegan|vegetarisch/i.test(l) || MEAT.test(l)).map((l) => l.replace(/\s*\(niet-vegan\)/i, ''));
      const e = ecoOf(it);
      const ECO_T = { A: 'heel laag', B: 'laag', C: 'gemiddeld', D: 'hoog', E: 'heel hoog' };
      const { sh, close } = openLayer(`<div class="al-sheet">${it.photo ? `<img class="al-big" src="${esc(it.big || it.photo)}" alt="">` : ''}<div class="al-sheet-in"><b class="al-sheet-t">${esc(it.n)}</b>${it.sub && !/optioneel/i.test(it.sub) ? `<span class="al-sheet-s">${esc(it.sub)}</span>` : ''}
        <div class="al-tags2">${diet.map((l) => `<span>${esc(l)}</span>`).join('')}${e ? `<span class="eco e${e}">Klimaatimpact ${e} · ${ECO_T[e]}</span>` : ''}</div>
        <div class="al-prices">${PRICE_GROUPS.map((g) => `<div class="${g.k === pg ? 'on' : ''}"><span>${esc(g.n)}</span><b>${esc(eur(it.p[g.k]))}</b></div>`).join('')}</div>
        <a class="btn al-orig" href="${esc(pageUrl(CUR))}?tm=orig&date=${DAY}" target="_blank" rel="noopener">Allergenen op alma.be</a></div></div>`, '', it.n);
      return close;
    }
    function allergenSheet() {
      const pick = new Set(FLT.alg);
      const { sh, close } = openLayer(`<div class="al-sheet"><div class="al-sheet-in"><b class="al-sheet-t">Allergenen</b><span class="al-sheet-s">Toon alleen gerechten zonder</span><div class="al-algs"></div><button type="button" class="btn al-algs-go" data-x="go">Toon</button><button type="button" class="al-algs-clear" data-x="clear">Alles wissen</button></div></div>`, '', 'Allergenen');
      const box = sh.querySelector('.al-algs');
      const draw = () => put(box, ALLERGENS.map((a) => `<button type="button" class="chip${pick.has(a.k) ? ' on' : ''}" data-k="${a.k}">${pick.has(a.k) ? ico('check') : ''}${esc(a.n)}</button>`).join(''));
      draw();
      sh.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.k) { if (pick.has(b.dataset.k)) pick.delete(b.dataset.k); else pick.add(b.dataset.k); draw(); return; }
        if (b.dataset.x === 'clear') { pick.clear(); draw(); return; }
        if (b.dataset.x === 'go') { FLT.alg = ALLERGENS.filter((a) => pick.has(a.k)).map((a) => a.k); saveFlt(); close(); redraw(); }
      });
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
      if (!/^a/.test(act)) return;
      e.preventDefault();
      if (act === 'ameer') goTo(PORTAL + '?tm=meer', { dir: 'back' });
      else if (act === 'aback') back();
      else if (act === 'acur') { setCur(b.dataset.s); redraw(); }
      else if (act === 'aday') { setDay(b.dataset.d); redraw(); }
      else if (act === 'aflt') {
        const k = b.dataset.k;
        FLT[k] = !FLT[k];
        if (k === 'vegan' && FLT.vegan) FLT.veg = false;
        if (k === 'veg' && FLT.veg) FLT.vegan = false;
        saveFlt(); redraw();
      } else if (act === 'agluten') {
        FLT.alg = FLT.alg.includes('gluten') ? FLT.alg.filter((x) => x !== 'gluten') : FLT.alg.concat('gluten');
        saveFlt(); redraw();
      } else if (act === 'aalg') allergenSheet();
      else if (act === 'afold') { const c = b.dataset.c; OPEN[c] = !OPEN[c]; ss.set('tm4-alma-open', JSON.stringify(OPEN)); redraw(); }
      else if (act === 'adish') { const c = LAST && LAST.cats[Number(b.dataset.c)]; const it = c && c.items[Number(b.dataset.i)]; if (it) dishSheet(it); }
      else if (act === 'astar') {
        const s = b.dataset.s, fs = favs();
        setFavs(fs.includes(s) ? fs.filter((x) => x !== s) : fs.concat(s));
        viewPick(token); // redraw in place: no jump to the top, the list stays where it is
      } else if (act === 'adone') { SETUP = false; setCur(favs()[0]); show('push'); }
      else if (act === 'aup') { const s = b.dataset.s; setFavs([s].concat(favs().filter((x) => x !== s))); show(); }
      else if (act === 'aopen' && SETUP) { const s = b.dataset.s, fs = favs(); setFavs(fs.includes(s) ? fs.filter((x) => x !== s) : fs.concat(s)); viewPick(token); }
      else if (act === 'aopen') {
        setCur(b.dataset.s);
        if (route() !== 'kies') show();
        else if (depth > 0) back();
        else location.replace(pageUrl('') + '#/');
      } else if (act === 'aprijs') { store.set('alma:prijs', b.dataset.k); if (route() === 'kies' || SETUP) viewPick(token); else show(); }
    });
    pullRefresh(() => { Object.keys(MEM).forEach((k) => delete MEM[k]); dropMenus(true); show(); return new Promise((r) => setTimeout(r, 700)); });
    // back after a while (lunch tomorrow): today has moved on, and the status line with it
    let away = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') away = Date.now();
      else if (away && Date.now() - away > 5 * 60e3) { if (DAY < today()) setDay(today()); show(); }
    });
    W.addEventListener('pageshow', (e) => { if (e.persisted) show(); });
    show();
  }
