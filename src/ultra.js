  /* ================================================================== course app (ultra.edu.kuleuven.cloud/ultra/app) */
  function ultraApp() {
    takeover('Toledo', [PORTAL_ORIGIN]);
    const TAB_LABEL = { vandaag: 'Vandaag', vakken: 'Vakken', rooster: 'Rooster', updates: 'Updates', meer: 'Meer' };
    const TABS = [
      { id: 'vandaag', label: 'Vandaag', icon: 'house', href: PORTAL + '?tm=vandaag' },
      { id: 'vakken', label: 'Vakken', icon: 'book', href: PORTAL + '?tm=vakken' },
      { id: 'rooster', label: 'Rooster', icon: 'calendar', href: PORTAL + '?tm=rooster' },
      { id: 'updates', label: 'Updates', icon: 'bell', href: PORTAL + '?tm=updates' },
      { id: 'meer', label: 'Meer', icon: 'grid', href: PORTAL + '?tm=meer' },
    ];
    buildShell(TABS, '');
    // The app also runs on the course address Blackboard itself uses (/ultra/courses/<id>/outline),
    // which is where Toledo's link service lands after signing in.
    const PATH_PK = W.__TM_PK__ || '';
    if (PATH_PK) {
      ss.del('tm4-classic-ultra');
      let h = location.hash || '';
      const qs = h.includes('?') ? h.slice(h.indexOf('?')) : '';
      const resume = ss.get('tm4-resume') || '';
      ss.del('tm4-resume');
      if (resume.startsWith('#/c/' + PATH_PK)) h = resume + qs;
      if (/^#\/vak\//.test(h)) h = h.replace(/^#\/vak\/[^/?]*/, '#/c/' + PATH_PK);
      if (!/^#\/c\/_\d+_\d+/.test(h)) h = '#/c/' + PATH_PK + qs;
      history.replaceState(history.state && history.state.tm ? history.state : { tm: 1, d: 0 }, '', location.pathname + h);
    }
    guardPath();
    const U = { depth: (history.state && history.state.tm && history.state.d) || 0, views: new Map(), titles: {}, items: {}, cur: null, curKey: '', animBack: false, scroll: {} };
    try { U.scroll = JSON.parse(ss.get('tm4-uscroll') || '{}') || {}; } catch (_) {}
    const fromPortal = /^https:\/\/toledo\.kuleuven\.be\//.test(document.referrer);
    // remember when Blackboard last answered, to tell the portal (see leave())
    let okAt = 0;
    const uget = (p) => api(ULTRA + p).then((v) => { okAt = Date.now(); return v; });

    /* ---------------- routes + context ---------------- */
    function parse() {
      const h = location.hash.replace(/^#/, '');
      const i = h.indexOf('?');
      const path = i >= 0 ? h.slice(0, i) : h;
      const q = new URLSearchParams(i >= 0 ? h.slice(i + 1) : '');
      const s = path.split('/').filter(Boolean);
      const r = { path, q, type: 'none' };
      if (s[0] === 'vak' && s[1]) { r.type = 'resolve'; r.lu = decodeURIComponent(s[1]); r.rest = s.slice(2).join('/'); }
      else if (s[0] === 'c' && /^_\d+_\d+$/.test(s[1] || '')) {
        r.pk = s[1];
        const t = s[2] || '';
        if (t === 'f' && s[3]) { r.type = 'folder'; r.id = s[3]; }
        else if (t === 'd' && s[3]) { r.type = 'doc'; r.id = s[3]; }
        else if (t === 'item' && s[3]) { r.type = 'item'; r.id = s[3]; }
        else { r.type = 'course'; r.tab = t === 'cijfers' ? 'cijfers' : (t === 'aankondigingen' || t === 'a') ? 'aankondigingen' : 'inhoud'; if (t === 'a') r.ann = s[3] || ''; }
      }
      return r;
    }
    const ctxKey = (pk) => 'tm4-ctx:' + pk;
    function getCtx(pk) { try { return JSON.parse(ss.get(ctxKey(pk)) || '{}') || {}; } catch (_) { return {}; } }
    function saveCtx(pk, q) {
      const c = getCtx(pk);
      ['lu', 't', 'k', 'f', 'n'].forEach((k) => { if (q.get(k)) c[k] = q.get(k); });
      if (q.get('lu') && !q.get('n')) delete c.n;
      ss.set(ctxKey(pk), JSON.stringify(c));
      if (c.k) saveMeta(pk, { color: c.k });
      if (c.lu) saveMeta(pk, { lu: c.lu });
    }
    function meta(pk) {
      const m = store.get('m:' + pk) || {};
      const c = getCtx(pk);
      const lu = m.lu || c.lu || '';
      return { pk, lu, name: cleanTitle(m.name || c.t || ''), color: c.k || m.color || '', code: luCode(lu) || codeOf(m.name || '') };
    }
    function saveMeta(pk, patch) { store.set('m:' + pk, Object.assign(store.get('m:' + pk) || {}, patch)); }
    const deepLink = (pk, it) => `${ULTRA}/ultra/redirect?redirectType=nautilus&courseId=${pk}&contentId=${it.id}${/^_\d+_\d+$/.test(it.p || '') ? '&parentId=' + it.p : ''}`;
    const ltiUrl = (pk, id) => `${ULTRA}/webapps/blackboard/execute/blti/launchLink?course_id=${pk}&content_id=${id}&from_ultra=true`;

    /* ---------------- content model ---------------- */
    function fileFromAnchor(a) {
      let info = {};
      try { info = JSON.parse(a.getAttribute('data-bbfile') || '{}') || {}; } catch (_) {}
      const raw = String(a.getAttribute('href') || info.resourceUrl || '').replace(/^@X@[^@]*@X@/i, '/');
      const isFile = a.getAttribute('data-bbtype') === 'attachment' || /\/bbcswebdav\//.test(raw) || !!info.fileName;
      if (!isFile) return null;
      const u = absU(raw);
      if (!u) return null;
      return { u, n: info.displayName || info.fileName || a.textContent.trim() || 'Bestand', mi: info.mimeType || '', s: Number(info.fileSize) || 0 };
    }
    function parseDoc(html) {
      const out = { files: [], x: false, sn: '' };
      if (!html) return out;
      const d = new DOMParser().parseFromString(String(html), 'text/html');
      $$('a', d).forEach((a) => { const f = fileFromAnchor(a); if (f) { if (!out.files.some((x) => x.u === f.u)) out.files.push(f); a.remove(); } });
      const txt = d.body.textContent.replace(/\s+/g, ' ').trim();
      const rich = !!d.body.querySelector('img, iframe, video, table, a[href]');
      out.x = txt.length > 0 || rich;
      // a short note above some files: show the note and open the files straight from the list
      if (out.files.length && !rich && txt.length && txt.length < 200) { out.x = false; out.sn = txt; }
      return out;
    }
    const UDB = /^ultra[\s_-]*document[\s_-]*body$/i;
    const bodyOf = (x) => (x.body && typeof x.body === 'object' ? (x.body.displayText || x.body.rawText || '') : (x.body || ''));
    function normItem(x) {
      const h = typeof x.contentHandler === 'string' ? x.contentHandler : (x.contentHandler && x.contentHandler.id) || '';
      const cd = (x.contentDetail && x.contentDetail[h]) || {};
      const it = { id: x.id, p: x.parentId || '', t: String(x.title || '').trim() || 'Zonder titel', m: Number(x.modifiedDate) || Date.parse(x.modified || x.created || '') || 0 };
      const d = textOf(x.description);
      if (d) it.d = d.slice(0, 200);
      if (/x-bb-(folder|lesson)/.test(h) || cd.isFolder) { it.k = 'folder'; if (/x-bb-document/.test(h)) it.ud = 1; }
      else if (/x-bb-file/.test(h)) {
        it.k = 'file';
        const f = cd.file || {};
        it.f = { u: f.permanentUrl ? absU(f.permanentUrl) : '', n: f.fileName || it.t, mi: f.mimeType || '', s: Number(f.fileSize) || 0 };
      } else if (/x-bb-document/.test(h)) { it.k = 'doc'; const pd = parseDoc(bodyOf(x)); it.files = pd.files; it.x = pd.x; if (pd.sn) it.sn = pd.sn; }
      else if (/externallink/.test(h)) { it.k = 'link'; it.u = cd.url || (x.contentHandler && x.contentHandler.url) || ''; }
      else if (/blti|lti/.test(h)) it.k = 'lti';
      else if (/asmt|assignment|assessment|test|survey|turnitin/.test(h)) it.k = 'task';
      else if (/forum|discussion|journal|blog|wiki|conversation/.test(h)) it.k = 'talk';
      else it.k = 'other';
      // Ultra's newer "Document" pages keep their text in child items called "ultraDocumentBody":
      // that text is shown on the page itself (see folderView), never as a row of its own
      if (it.k === 'doc' && UDB.test(it.t)) { it.ub = 1; if (x.body != null) it.html = sanitize(bodyOf(x), (a) => { const f = fileFromAnchor(a); return f ? frowHtml(f) : ''; }); }
      U.items[it.id] = it;
      return it;
    }
    const kidsMem = new Map();
    function cachedKids(pk, id) {
      const k = `c:${pk}:${id}`;
      if (kidsMem.has(k)) return kidsMem.get(k);
      const c = store.get(k);
      if (c) { c.v.forEach((it) => { U.items[it.id] = it; }); kidsMem.set(k, c); }
      return c;
    }
    function fetchChildren(pk, id) {
      return once('k:' + pk + id, () => uget(`/learn/api/v1/courses/${pk}/contents/${id}/children?limit=200`)
        .catch((e) => { if (e.auth) throw e; return uget(id === 'ROOT' ? `/learn/api/public/v1/courses/${pk}/contents?limit=200` : `/learn/api/public/v1/courses/${pk}/contents/${id}/children?limit=200`); })
        .then((j) => {
          const v = (j.results || []).filter((x) => x.visibility !== 'HIDDEN').map(normItem);
          const rec = { ts: Date.now(), v };
          kidsMem.set(`c:${pk}:${id}`, rec);
          store.set(`c:${pk}:${id}`, rec);
          return v;
        }));
    }
    function fetchItem(pk, id) {
      return once('i:' + pk + id, () => uget(`/learn/api/v1/courses/${pk}/contents/${id}`).then((x) => {
        const it = normItem(x);
        it.html = sanitize(bodyOf(x), (a) => { const f = fileFromAnchor(a); return f ? frowHtml(f) : ''; });
        store.set(`i:${pk}:${id}`, { ts: Date.now(), v: it });
        return it;
      }));
    }
    function fetchAnn(pk) {
      return once('a:' + pk, () => uget(`/learn/api/public/v1/courses/${pk}/announcements?limit=100`).then((j) => {
        const now = Date.now();
        const v = (j.results || []).filter((a) => !a.draft).filter((a) => {
          const d = a.availability && a.availability.duration;
          if (!d || d.type !== 'Restricted') return true;
          const s = d.start ? Date.parse(d.start) : 0, e = d.end ? Date.parse(d.end) : 0;
          return (!s || s <= now) && (!e || e >= now);
        }).map((a) => {
          const d = a.availability && a.availability.duration;
          return { id: a.id, t: a.title || 'Aankondiging', date: Date.parse((d && d.start) || a.created || '') || 0, html: sanitize(a.body || '') };
        }).sort((a, b) => b.date - a.date);
        store.set('a:' + pk, { ts: Date.now(), v });
        return v;
      }));
    }
    function getMe() {
      const c = store.get('me');
      if (c && Date.now() - c.ts < 7 * 864e5) return Promise.resolve(c.v);
      return once('me', () => uget('/learn/api/public/v1/users/me?fields=id,userName').then((v) => { store.set('me', { ts: Date.now(), v }); return v; }));
    }
    const num = (n) => String(Math.round(Number(n) * 100) / 100).replace('.', ',');
    function gradeText(x, c) {
      if (x.exempt) return 'Vrijgesteld';
      const d = x.displayGrade || {};
      const NL = { complete: 'Voltooid', completed: 'Voltooid', incomplete: 'Onvolledig', pass: 'Geslaagd', passed: 'Geslaagd', fail: 'Niet geslaagd', failed: 'Niet geslaagd' };
      if (d.text) return NL[String(d.text).toLowerCase()] || d.text;
      const poss = d.possible || (c.score && c.score.possible);
      if (d.score != null) return d.scaleType === 'Percent' ? Math.round(d.score) + '%' : num(d.score) + (poss ? '/' + num(poss) : '');
      if (x.score != null) return num(x.score) + (poss ? '/' + num(poss) : '');
      return '';
    }
    function fetchGrades(pk) {
      return once('g:' + pk, async () => {
        const me = await getMe();
        const [cols, mine] = await Promise.all([
          uget(`/learn/api/public/v2/courses/${pk}/gradebook/columns?limit=200`),
          uget(`/learn/api/public/v2/courses/${pk}/gradebook/users/${me.id}?limit=200`).catch((e) => { if (e.auth) throw e; return { results: [] }; }),
        ]);
        const g = {};
        (mine.results || []).forEach((x) => { g[x.columnId] = x; });
        const v = (cols.results || []).filter((c) => !(c.availability && c.availability.available === 'No')).map((c) => {
          const x = g[c.id] || {};
          return { id: c.id, t: c.displayName || c.name || 'Beoordeling', due: c.grading && c.grading.due ? Date.parse(c.grading.due) : 0, cid: c.contentId || '', st: x.status || '', g: gradeText(x, c) };
        });
        store.set('g:' + pk, { ts: Date.now(), v });
        return v;
      });
    }

    /* ---------------- rows ---------------- */
    const isNew = (it) => it.m && Date.now() - it.m < 7 * 864e5;
    function frowHtml(f) {
      const [lbl, col] = ftype(f.n, f.mi);
      return `<a class="frow" href="${esc(f.u)}"><span class="fi" style="--c:${col}">${lbl}</span><span class="main"><span class="t">${esc(f.n)}</span><span class="s">${esc([lbl === 'FILE' ? 'Bestand' : lbl, fsize(f.s)].filter(Boolean).join(' · '))}</span></span>${EXT}</a>`;
    }
    // "Langenaeker_2024_attribution.pdf" -> "Langenaeker 2024 attribution" (the type is in the icon)
    const niceName = (n) => String(n || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || n;
    function fileRow(f, o = {}) {
      const [lbl, col] = ftype(f.n, f.mi);
      const sub = o.sub != null ? o.sub : [lbl === 'FILE' ? 'Bestand' : lbl, fsize(f.s)].filter(Boolean).join(' · ');
      return row({ href: f.u || undefined, act: f.u ? '' : 'att', attrs: f.u ? '' : ` data-id="${esc(o.id || '')}"`, iconHtml: `<span class="fi" style="--c:${col}">${lbl}</span>`,
        title: o.title && o.title !== f.n ? o.title : niceName(f.n), sub, external: true, cls: (o.cls || '') + (o.clamp ? ' note' : ''), dot: o.dot });
    }
    // a folder that is really a Document page: its children hold the page's text
    function isDocPage(pk, it) {
      const c = cachedKids(pk, it.id);
      if (c) return c.v.some((k) => k.ub);
      return !!it.ud;
    }
    function folderInfo(pk, it) {
      const c = cachedKids(pk, it.id);
      if (!c) return { sub: it.d || 'Map', fresh: 0 };
      const n = c.v.length;
      const fresh = c.v.filter((k) => k.k !== 'folder' && isNew(k)).length;
      return { sub: n ? `${n} item${n === 1 ? '' : 's'}${fresh ? ` · ${fresh} nieuw` : ''}` : 'Leeg', fresh };
    }
    function itemRow(it, pk, o = {}) {
      const path = o.path;
      const cvs = colorVars(meta(pk).color);
      const lead = (icon) => `<span class="ic soft" style="${cvs}">${ico(icon)}</span>`;
      const solid = (icon, c) => `<span class="ic" style="--c:${c}">${ico(icon)}</span>`;
      const dot = isNew(it);
      switch (it.k) {
        case 'folder': {
          const fi = folderInfo(pk, it);
          if (isDocPage(pk, it)) {
            // a Document page that only holds a file or a few files (no text of its own): open them straight from the list
            const kids = (cachedKids(pk, it.id) || { v: [] }).v;
            const files = kids.flatMap((k) => k.files || []);
            if (kids.length && kids.every((k) => k.ub && !k.x) && files.length && files.length <= 8) {
              const sn = kids.map((k) => k.sn || '').filter(Boolean).join(' ');
              return itemRow({ id: it.id, p: it.p, t: it.t, m: it.m, k: 'doc', x: false, files, sn }, pk, o);
            }
            return row({ href: `#/c/${pk}/f/${it.id}`, attrs: ` data-nav="1" data-title="${esc(it.t)}"`, iconHtml: lead('doc'), title: it.t, sub: path != null ? path : it.d || 'Document', dot: fi.fresh > 0 });
          }
          return row({ href: `#/c/${pk}/f/${it.id}`, attrs: ` data-nav="1" data-title="${esc(it.t)}"`, iconHtml: lead('folder'), title: it.t, sub: path != null ? path : fi.sub, dot: fi.fresh > 0 });
        }
        case 'file':
          return fileRow(it.f, { title: it.t, name: it.f.n, id: it.id, dot, sub: path != null ? path : undefined });
        case 'doc': {
          if (it.ub) {
            // the text of a Document page (e.g. in "Nieuw" or a search): open the page it belongs to
            const par = U.items[it.p];
            const t = par && !par.ub ? par.t : 'Document';
            return row({ href: it.p ? `#/c/${pk}/f/${it.p}` : `#/c/${pk}`, attrs: ` data-nav="1" data-title="${esc(t)}"`, iconHtml: lead('doc'), title: t, sub: path != null ? path : textOf(it.html).slice(0, 120) || 'Document', dot });
          }
          const files = it.files || [];
          if (!it.x && files.length === 1) return fileRow(files[0], { title: it.t, name: files[0].n, dot, sub: path != null ? path : it.sn || undefined, clamp: !!it.sn });
          if (!it.x && files.length > 1 && files.length <= 8) {
            return `<div class="grp-h">${lead('doc')}<span class="main"><span class="t">${esc(it.t)}</span><span class="s clamp2">${esc(path != null ? path : it.sn || files.length + ' bestanden')}</span></span></div>${files.map((f) => fileRow(f, { cls: 'sub', dot })).join('')}`;
          }
          return row({ href: `#/c/${pk}/d/${it.id}`, attrs: ` data-nav="1" data-title="${esc(it.t)}"`, iconHtml: lead('doc'), title: it.t,
            sub: path != null ? path : (it.d || ('Document' + (files.length ? ` · ${files.length} bestand${files.length > 1 ? 'en' : ''}` : ''))), dot });
        }
        case 'lti': return row({ href: ltiUrl(pk, it.id), iconHtml: solid('play', '#8e5bd8'), title: it.t, sub: path != null ? path : 'Weblecture · speelt meteen af', external: true, dot });
        case 'link': return row({ href: it.u || deepLink(pk, it), iconHtml: solid('link', '#0a84ff'), title: it.t, sub: path != null ? path : hostOf(it.u) || 'Link', external: true, dot });
        case 'task': return row({ href: deepLink(pk, it), iconHtml: solid('pencil', '#ff9500'), title: it.t, sub: path != null ? path : 'Opdracht · indienen in Blackboard', external: true, dot });
        case 'talk': return row({ href: deepLink(pk, it), iconHtml: solid('bubble', '#30b955'), title: it.t, sub: path != null ? path : 'Discussie · in Blackboard', external: true, dot });
        default: return row({ href: deepLink(pk, it), iconHtml: solid('globe', '#8e8e93'), title: it.t, sub: path != null ? path : 'Opent in Blackboard', external: true, dot });
      }
    }
    const errorBox = () => `<div class="banner">${ico('warn')}<span class="main">Dit kon niet geladen worden. Controleer je verbinding.</span><button type="button" data-act="retry">Opnieuw</button></div>`;
    const section = () => { const el = document.createElement('section'); el.className = 'view'; return el; };

    /* ---------------- course ---------------- */
    const SEGS = [{ id: 'inhoud', label: 'Inhoud' }, { id: 'aankondigingen', label: 'Aankondigingen' }, { id: 'cijfers', label: 'Cijfers' }];
    const STATUS = { NeedsGrading: 'Ingeleverd · wacht op beoordeling', InProgress: 'Bezig', Graded: 'Beoordeeld' };
    function courseView(r) {
      const pk = r.pk;
      const el = section();
      const st = { tab: r.tab, ann: r.ann || '', q: '', root: null, anns: null, grades: null, idx: null, crawled: false, moreNew: false, at: 0, single: null };
      const head = () => {
        const m = meta(pk);
        const name = m.name || 'Vak';
        const next = getCtx(pk).n;
        return `<div class="lt" style="${colorVars(m.color)}">${m.code ? `<span class="lt-kicker">${esc(m.code)}</span>` : ''}<h1 class="${name.length > 26 ? 'long' : ''}">${esc(name)}</h1>${next ? `<p class="lt-sub lt-next">${ico('clock')}${esc(next)}</p>` : ''}</div>`;
      };
      el.innerHTML = `<div data-k="head">${head()}</div>${segHtml(SEGS, st.tab, 'seg')}
        <div data-p="inhoud"${st.tab !== 'inhoud' ? ' hidden' : ''}><label class="search">${ico('search')}<input type="search" placeholder="Zoek in dit vak" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Zoek in dit vak"><button type="button" class="clr" data-act="clr" hidden aria-label="Wis">✕</button></label><div data-k="res"></div><div data-k="top"></div><div data-k="root">${skGroup(6)}</div></div>
        <div data-p="aankondigingen"${st.tab !== 'aankondigingen' ? ' hidden' : ''}>${skGroup(3)}</div>
        <div data-p="cijfers"${st.tab !== 'cijfers' ? ' hidden' : ''}>${skGroup(4)}</div>`;
      const P = (id) => $(`[data-p="${id}"]`, el);
      const pathLabel = (x) => [x.path.join(' › ') || 'Hoofdmap', x.it.m ? shortWhen(x.it.m) : ''].filter(Boolean).join(' · ');

      function buildIndex() {
        const out = [];
        const walk = (items, path, depth) => items.forEach((it) => {
          out.push({ it, path });
          if (it.k === 'folder' && depth < 7) { const c = cachedKids(pk, it.id); if (c) walk(c.v, path.concat(it.t), depth + 1); }
        });
        walk(st.root || [], [], 0);
        return out;
      }
      function drawRoot() {
        const box = $('[data-k="root"]', el);
        if (!st.root) return;
        if (!st.root.length) { put(box, empty('folder', 'Nog geen inhoud', 'Je docent heeft nog niets gepubliceerd.')); return; }
        // a course that is one big folder: show what's inside right away
        const only = st.root.length === 1 && st.root[0].k === 'folder' ? st.root[0] : null;
        const inner = only && cachedKids(pk, only.id);
        if (only && inner) { put(box, `<div class="gh">${esc(only.t)}</div><div class="group">${inner.v.map((it) => itemRow(it, pk)).join('')}</div>`); return; }
        if (only && !st.single) { st.single = fetchChildren(pk, only.id).then(drawRoot, () => {}); }
        put(box, `<div class="group">${st.root.map((it) => itemRow(it, pk)).join('')}</div>`);
      }
      function drawTop() {
        const box = $('[data-k="top"]', el);
        const now = Date.now();
        let h = '';
        const a = st.anns && st.anns[0];
        if (a && now - a.date < 14 * 864e5) {
          h += `<button type="button" class="teaser" data-act="openann" data-id="${esc(a.id)}" style="${colorVars(meta(pk).color)}"><span class="ic">${ico('megaphone')}</span><span class="main"><span class="t">${esc(a.t)}</span><span class="s clamp2">${esc(relDay(a.date, now))} · ${esc(textOf(a.html).slice(0, 200))}</span></span>${CHEV}</button>`;
        }
        const fresh = (st.idx || []).filter((x) => x.it.k !== 'folder' && isNew(x.it)).sort((p, q) => q.it.m - p.it.m);
        if (fresh.length) {
          const lim = st.moreNew ? 20 : 4;
          h += `<div class="sh"><h2>Nieuw</h2></div><div class="group">${fresh.slice(0, lim).map((x) => itemRow(x.it, pk, { path: pathLabel(x), flat: true })).join('')}${fresh.length > lim ? `<button type="button" class="more-row" data-act="morenew">Toon nog ${fresh.length - lim}</button>` : ''}</div><div class="sh"><h2>Alle inhoud</h2></div>`;
        } else if (h) h += '<div style="height:16px"></div>';
        put(box, h);
      }
      function drawSearch() {
        const res = $('[data-k="res"]', el);
        const q = fold(st.q.trim());
        $('[data-k="top"]', el).hidden = $('[data-k="root"]', el).hidden = !!q;
        if (!q) { put(res, ''); return; }
        const idx = st.idx || (st.root || []).map((it) => ({ it, path: [] }));
        const hits = [];
        idx.forEach((x) => {
          if (fold(x.it.t).includes(q) || (x.it.d && fold(x.it.d).includes(q))) hits.push({ x });
          else if (x.it.files) x.it.files.forEach((f) => { if (fold(f.n).includes(q)) hits.push({ x, f }); });
          else if (x.it.f && fold(x.it.f.n).includes(q)) hits.push({ x });
        });
        if (!hits.length) { put(res, empty('search', 'Niets gevonden', st.crawled ? `Niets in dit vak past bij "${st.q.trim()}".` : 'Nog niet alle mappen zijn doorzocht. Probeer zo opnieuw.')); return; }
        put(res, `<div class="gh">${hits.length} resulta${hits.length === 1 ? 'at' : 'ten'}</div><div class="group">${hits.slice(0, 80).map(({ x, f }) => (f ? fileRow(f, { sub: `${pathLabel(x)} › ${x.it.t}` }) : itemRow(x.it, pk, { path: pathLabel(x), flat: true }))).join('')}</div>`);
      }
      async function crawl() {
        const queue = [];
        const seen = new Set();
        (st.root || []).forEach((it) => { if (it.k === 'folder') queue.push([it, 1]); });
        let n = 0, dirty = 0;
        const work = async () => {
          while (queue.length && n < 90) {
            const [f, depth] = queue.shift();
            if (seen.has(f.id)) continue;
            seen.add(f.id);
            n++;
            const c = cachedKids(pk, f.id);
            let kids = c && Date.now() - c.ts < 15 * 60e3 ? c.v : null;
            if (!kids) { try { kids = await fetchChildren(pk, f.id); dirty++; } catch (e) { if (e.auth) return; kids = c ? c.v : []; } }
            kids.forEach((k) => { if (k.k === 'folder' && depth < 6) queue.push([k, depth + 1]); });
          }
        };
        await Promise.all([work(), work(), work(), work()]);
        st.idx = buildIndex();
        st.crawled = true;
        drawTop();
        drawRoot();
        if (st.q) drawSearch();
      }
      function drawAnn() {
        const box = P('aankondigingen');
        if (!st.anns) return;
        if (!st.anns.length) { put(box, empty('megaphone', 'Geen aankondigingen', 'Aankondigingen van je docent verschijnen hier.')); return; }
        const fresh = (a, i) => i === 0 && !st.ann && Date.now() - a.date < 14 * 864e5;
        put(box, st.anns.map((a, i) => `<article class="ann${a.id === st.ann ? ' open hl' : fresh(a, i) ? ' open' : ''}" data-id="${esc(a.id)}"><div class="ann-top">${esc(relDay(a.date))} · ${hhmm(a.date)}</div><h3>${esc(a.t)}</h3><div class="body rt">${a.html}</div><button type="button" class="more" data-act="annmore">${a.id === st.ann || fresh(a, i) ? 'Minder' : 'Meer'}</button></article>`).join(''));
        measureAnn();
      }
      function measureAnn() {
        if (st.tab !== 'aankondigingen') return;
        requestAnimationFrame(() => {
          $$('.ann', P('aankondigingen')).forEach((n) => { const b = $('.body', n); n.classList.toggle('clamped', !n.classList.contains('open') && b.scrollHeight > b.clientHeight + 6); });
          if (st.ann) { const n = $(`.ann[data-id="${st.ann}"]`, el); if (n) { const y = n.getBoundingClientRect().top + W.scrollY - 60; W.scrollTo(0, Math.max(0, y)); } st.ann = ''; }
        });
      }
      function drawGrades() {
        const box = P('cijfers');
        if (!st.grades) return;
        if (!st.grades.length) { put(box, empty('chart', 'Geen cijfers', 'Er zijn nog geen beoordelingen voor dit vak.')); return; }
        const rowG = (g) => row({ href: g.cid ? deepLink(pk, { id: g.cid }) : undefined, title: g.t,
          sub: g.g ? '' : STATUS[g.st] || (g.due ? `Deadline ${dShort(g.due)} ${hhmm(g.due)}` : 'Nog geen cijfer'),
          end: g.g ? `<b style="color:var(--text);font-size:17px;font-weight:600">${esc(g.g)}</b>` : '<span>—</span>', chevron: false, cls: '' });
        const done = st.grades.filter((g) => g.g), open = st.grades.filter((g) => !g.g);
        let h = '';
        if (done.length) h += `<div class="gh">Beoordeeld</div><div class="group plain">${done.map(rowG).join('')}</div>`;
        if (open.length) h += `<div class="gh">Nog geen cijfer</div><div class="group plain">${open.map(rowG).join('')}</div>`;
        put(box, h + `<p class="fresh"><a href="${ULTRA}/ultra/courses/${pk}/grades">Bekijk details in Blackboard</a></p>`);
      }

      const fail = (where) => (e) => { if (e && e.auth) return relogin(); if (where === 'root' && !st.root) put($('[data-k="root"]', el), errorBox()); };
      function loadRoot() {
        const c = cachedKids(pk, 'ROOT');
        if (c && !st.root) { st.root = c.v; st.idx = buildIndex(); drawRoot(); drawTop(); }
        return fetchChildren(pk, 'ROOT').then((v) => { st.root = v; st.idx = buildIndex(); drawRoot(); drawTop(); setTimeout(crawl, 250); }, fail('root'));
      }
      function loadAnn() {
        const c = store.get('a:' + pk);
        if (c && !st.anns) { st.anns = c.v; drawAnn(); drawTop(); }
        return fetchAnn(pk).then((v) => { st.anns = v; drawAnn(); drawTop(); }, fail('ann'));
      }
      function loadGrades() {
        const c = store.get('g:' + pk);
        if (c && !st.grades) { st.grades = c.v; drawGrades(); }
        if (st.gAt && Date.now() - st.gAt < 120e3) return;
        st.gAt = Date.now();
        fetchGrades(pk).then((v) => { st.grades = v; drawGrades(); }, (e) => { if (e && e.auth) return relogin(); if (!st.grades) put(P('cijfers'), errorBox()); });
      }
      function loadMeta() {
        uget(`/learn/api/public/v3/courses/${pk}?fields=id,name,courseId`).then((c) => {
          saveMeta(pk, { name: c.name, lu: c.courseId });
          put($('[data-k="head"]', el), head());
          if (U.cur === view) { setNav(navFor(view)); watchTitle(el); }
        }).catch(() => {});
      }
      function setTab(t, fromRoute) {
        st.tab = t;
        segSet(el, t);
        $$('[data-p]', el).forEach((p) => { p.hidden = p.dataset.p !== t; });
        if (!fromRoute) history.replaceState(Object.assign({}, history.state), '', `#/c/${pk}${t === 'inhoud' ? '' : '/' + t}`);
        const seg = $('.seg', el);
        const top = seg.getBoundingClientRect().top + W.scrollY - ($('#tm-nav').offsetHeight + 8);
        if (W.scrollY > top) W.scrollTo(0, top);
        if (t === 'aankondigingen') { if (st.anns) drawAnn(); loadAnn(); }
        if (t === 'cijfers') loadGrades();
      }

      const inp = $('input', el), clr = $('.clr', el);
      inp.addEventListener('input', () => { st.q = inp.value; clr.hidden = !inp.value; drawSearch(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });

      const view = {
        el,
        title: () => meta(pk).name || 'Vak',
        right: () => `<button type="button" class="nb" data-act="menu" aria-label="Meer opties">${ico('more')}</button>`,
        route(r2) { if (r2.ann) st.ann = r2.ann; if (r2.tab && r2.tab !== st.tab) setTab(r2.tab, true); else if (r2.ann) drawAnn(); },
        show() {
          if (Date.now() - st.at < 90e3) return;
          st.at = Date.now();
          loadRoot();
          loadAnn();
          if (st.tab === 'cijfers') loadGrades(); else setTimeout(() => { if (!st.grades) loadGrades(); }, 2500);
        },
        refresh() {
          st.at = Date.now(); st.gAt = 0;
          ['ROOT'].concat((st.root || []).filter((it) => it.k === 'folder').map((it) => it.id)).forEach((id) => kidsMem.delete(`c:${pk}:${id}`));
          return Promise.allSettled([loadRoot(), loadAnn(), st.tab === 'cijfers' ? fetchGrades(pk).then((v) => { st.grades = v; drawGrades(); }) : null]);
        },
        act(n, b) {
          if (n === 'seg') { setTab(b.dataset.id); return true; }
          if (n === 'clr') { inp.value = ''; st.q = ''; clr.hidden = true; drawSearch(); inp.focus(); return true; }
          if (n === 'morenew') { st.moreNew = true; drawTop(); return true; }
          if (n === 'openann') { st.ann = b.dataset.id; setTab('aankondigingen'); return true; }
          if (n === 'annmore') { toggleAnn(b.closest('.ann')); return true; }
          return false;
        },
      };
      loadMeta();
      return view;
    }
    function toggleAnn(n) {
      if (!n) return;
      if (!n.classList.contains('clamped') && !n.classList.contains('open')) return;
      const open = !n.classList.contains('open');
      n.classList.toggle('open', open);
      n.classList.toggle('clamped', !open);
      n.classList.remove('hl');
      const b = $('.more', n);
      if (b) b.textContent = open ? 'Minder' : 'Meer';
    }

    /* ---------------- folder ---------------- */
    function folderView(r) {
      const pk = r.pk, id = r.id, el = section();
      const known = U.items[id];
      const st = { items: null, title: U.titles[id] || (known && known.t) || '', desc: (known && known.d) || '', at: Date.now() };
      el.innerHTML = `<div class="lt"><h1 data-k="title"></h1><p class="lt-sub" data-k="sub"></p></div><div data-k="list">${skGroup(5)}</div>`;
      const draw = () => {
        const t = $('[data-k="title"]', el);
        t.textContent = st.title || (known && known.ud ? 'Document' : 'Map');
        t.className = (st.title || '').length > 26 ? 'long' : '';
        if (!st.items) return;
        const n = st.items.length;
        if (st.items.some((it) => it.ub)) {
          // a Document page: show its text right here, with any files or links in between where they belong
          put($('[data-k="sub"]', el), esc(st.desc));
          let h = '', grp = '';
          const flush = () => { if (grp) { h += `<div class="group">${grp}</div>`; grp = ''; } };
          st.items.forEach((it) => {
            if (!it.ub) { grp += itemRow(it, pk); return; }
            if (it.html == null) {
              // not in the list's answer: fetch this part of the page on its own
              if (!it.__f) { it.__f = 1; fetchItem(pk, it.id).then((x) => { it.html = x.html || ''; draw(); }, () => { it.html = ''; draw(); }); }
              flush();
              h += '<div class="doc"><div class="sk" style="height:14px;width:92%"></div><div class="sk" style="height:14px;width:76%;margin-top:11px"></div><div class="sk" style="height:14px;width:84%;margin-top:11px"></div></div>';
              return;
            }
            if (!it.html.trim()) return;
            flush();
            h += `<div class="doc rt">${it.html}</div>`;
          });
          flush();
          put($('[data-k="list"]', el), `<div class="udoc">${h || empty('doc', 'Dit document is leeg', '')}</div>`);
          return;
        }
        put($('[data-k="sub"]', el), esc([st.desc, n ? `${n} item${n === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')));
        put($('[data-k="list"]', el), n ? `<div class="group">${st.items.map((it) => itemRow(it, pk)).join('')}</div>` : empty('folder', 'Deze map is leeg', ''));
      };
      const load = () => {
        const c = cachedKids(pk, id);
        if (c && !st.items) { st.items = c.v; draw(); }
        fetchChildren(pk, id).then((v) => {
          st.items = v;
          draw();
          // Document pages in this folder: look inside, so one that only holds a file opens it in one tap
          const todo = v.filter((it) => it.k === 'folder' && it.ud && !cachedKids(pk, it.id)).slice(0, 12);
          if (todo.length) Promise.allSettled(todo.map((it) => fetchChildren(pk, it.id))).then(draw);
        }, (e) => { if (e.auth) return relogin(); if (!st.items) put($('[data-k="list"]', el), errorBox()); });
      };
      const view = {
        el,
        title: () => st.title || 'Map',
        show() { if (Date.now() - st.at > 120e3) { st.at = Date.now(); load(); } },
        refresh() { st.at = Date.now(); return fetchChildren(pk, id).then((v) => { st.items = v; draw(); }, () => {}); },
      };
      if (!st.title) fetchItem(pk, id).then((it) => { st.title = it.t; st.desc = it.d || ''; draw(); if (U.cur === view) setNav(navFor(view)); }).catch(() => {});
      draw();
      load();
      return view;
    }

    /* ---------------- document ---------------- */
    function docView(r) {
      const pk = r.pk, id = r.id, el = section();
      const known = U.items[id];
      const st = { it: null, title: U.titles[id] || (known && known.t) || '' };
      el.innerHTML = `<div class="lt"><h1 data-k="title" class="${st.title.length > 26 ? 'long' : ''}">${esc(st.title || ' ')}</h1></div><div data-k="body"><div class="doc"><div class="sk" style="height:14px;width:92%"></div><div class="sk" style="height:14px;width:76%;margin-top:11px"></div><div class="sk" style="height:14px;width:84%;margin-top:11px"></div><div class="sk" style="height:44px;margin-top:18px;border-radius:12px"></div></div></div>`;
      const draw = () => {
        if (!st.it) return;
        st.title = st.it.t;
        const t = $('[data-k="title"]', el);
        t.textContent = st.title;
        t.className = st.title.length > 26 ? 'long' : '';
        const html = st.it.html || '';
        put($('[data-k="body"]', el), html.trim() ? `<div class="doc rt">${html}</div>` : empty('doc', 'Dit document is leeg', ''));
      };
      const view = { el, title: () => st.title || 'Document' };
      const c = store.get(`i:${pk}:${id}`);
      if (c) { st.it = c.v; draw(); }
      fetchItem(pk, id).then((it) => { st.it = it; draw(); if (U.cur === view) setNav(navFor(view)); }, (e) => { if (e.auth) relogin(); else if (!st.it) put($('[data-k="body"]', el), errorBox()); });
      return view;
    }

    /* ---------------- deep link from Updates: open the thing itself ---------------- */
    function directTarget(pk, it) {
      if (it.k === 'file') return (it.f && it.f.u) || '';
      if (it.k === 'doc' && !it.x && it.files && it.files.length === 1) return it.files[0].u;
      if (it.k === 'lti') return ltiUrl(pk, it.id);
      if (it.k === 'link') return it.u || '';
      if (it.k === 'task' || it.k === 'talk' || it.k === 'other') return deepLink(pk, it);
      return '';
    }
    function itemView(r) {
      const pk = r.pk, id = r.id, el = section();
      el.innerHTML = '<div class="center"><div class="spin"></div><span>Openen…</span></div>';
      const view = { el, title: () => '' };
      fetchItem(pk, id).then((it) => {
        const target = directTarget(pk, it);
        if (target) { goTo(target, { replace: true }); return; }
        if (it.ub && it.p) { replaceRoute(`#/c/${pk}/f/${it.p}`); return; }
        replaceRoute(it.k === 'folder' ? `#/c/${pk}/f/${id}` : it.k === 'doc' ? `#/c/${pk}/d/${id}` : `#/c/${pk}`);
      }, (e) => {
        if (e && e.auth) return relogin();
        el.innerHTML = `<div class="center">${ico('warn')}<b>Dit item kon niet geopend worden</b><a class="btn" href="${esc(deepLink(pk, { id }))}">Open in Blackboard</a></div>`;
      });
      return view;
    }
    function replaceRoute(hash) {
      const v = U.views.get(U.curKey);
      if (v) { v.el.remove(); U.views.delete(U.curKey); }
      history.replaceState(Object.assign({}, history.state, { tm: 1, d: U.depth }), '', hash);
      render('none');
    }

    /* ---------------- navigation ---------------- */
    function resolveLu(r) {
      const lu = r.lu;
      const finish = (pk) => {
        $('#tm-resolving')?.remove();
        const q = r.q;
        if (!q.get('lu')) q.set('lu', lu);
        history.replaceState({ tm: 1, d: U.depth }, '', `#/c/${pk}${r.rest ? '/' + r.rest : ''}?${q}`);
        render('none');
      };
      const known = store.get('lu:' + lu);
      if (known && known.v) { finish(known.v); return; }
      const box = document.createElement('div');
      box.id = 'tm-resolving';
      box.className = 'center';
      box.innerHTML = `<div class="spin"></div><span>${esc(r.q.get('t') || 'Vak openen')}…</span>`;
      $('#tm-main').appendChild(box);
      setNav({ back: { label: TAB_LABEL[r.q.get('f')] || 'Vakken', act: 'back', href: PORTAL + '?tm=vakken' } });
      uget(`/learn/api/public/v3/courses/courseId:${encodeURIComponent(lu)}?fields=id,name,courseId`).then((c) => {
        store.set('lu:' + lu, { ts: Date.now(), v: c.id });
        saveMeta(c.id, { name: c.name, lu });
        finish(c.id);
      }, () => { if (!TEST) goTo(JOURNEY + encodeURIComponent(lu), { replace: true }); });
    }
    const keyOf = (r) => (r.type === 'course' ? '/c/' + r.pk : r.path);
    function navFor(v) {
      const r = parse();
      const st = history.state || {};
      const f = getCtx(r.pk).f || 'vakken';
      const back = U.depth > 0 ? { label: st.back || 'Terug', act: 'back', href: '#' } : { label: TAB_LABEL[f] || 'Vakken', act: 'back', href: PORTAL + '?tm=' + f };
      return { back, title: v.title(), right: v.right ? v.right() : '' };
    }
    function saveScroll() { if (U.curKey) U.scroll[U.curKey] = W.scrollY; }
    function render(anim) {
      const r = parse();
      if (r.type === 'resolve') { resolveLu(r); return; }
      if (r.type === 'none') {
        if (PATH_PK) { history.replaceState(history.state, '', location.pathname + '#/c/' + PATH_PK); render(anim); return; }
        goTo(PORTAL + '?tm=vakken', { replace: true, dir: 'back' });
        return;
      }
      if ([...r.q.keys()].length) saveCtx(r.pk, r.q);
      if (r.q.get('dl') != null) store.set('dlpks', { ts: Date.now(), v: String(r.q.get('dl')).split('.').filter((x) => /^_\d+_\d+$/.test(x)).slice(0, 10) });
      const key = keyOf(r);
      let v = U.views.get(key);
      if (!v) {
        v = r.type === 'course' ? courseView(r) : r.type === 'folder' ? folderView(r) : r.type === 'doc' ? docView(r) : itemView(r);
        U.views.set(key, v);
        $('#tm-main').appendChild(v.el);
      } else if (v.route) v.route(r);
      U.views.forEach((x) => { if (x !== v) x.el.classList.remove('on', 'push', 'pop'); });
      v.el.classList.remove('push', 'pop');
      v.el.classList.add('on');
      if (anim === 'push' || anim === 'pop') { void v.el.offsetWidth; v.el.classList.add(anim); }
      U.cur = v;
      U.curKey = key;
      setNav(navFor(v));
      setTabOn(getCtx(r.pk).f || 'vakken');
      const y = anim === 'push' ? 0 : U.scroll[key] || 0;
      W.scrollTo(0, y);
      if (y) requestAnimationFrame(() => W.scrollTo(0, y));
      watchTitle(v.el);
      if (v.show) v.show();
      if (U.views.size > 12) for (const [k, x] of U.views) { if (x !== v && U.views.size > 12) { x.el.remove(); U.views.delete(k); } }
    }
    function go(hash) {
      saveScroll();
      const back = U.cur ? U.cur.title() : '';
      U.depth += 1;
      history.pushState({ tm: 1, d: U.depth, back }, '', hash);
      render('push');
    }
    /* Which upcoming deadlines did you already hand in? The portal can't ask Blackboard itself (another site), so the
       course page checks the courses the portal named (?dl=) and tells it on the way back (?done=). */
    const doneMap = () => (store.get('done') || {}).v || {};
    function scanDone() {
      const dl = store.get('dlpks');
      const pks = Array.from(new Set(((dl && Date.now() - dl.ts < 7 * 864e5 && dl.v) || []).concat(PATH_PK ? [PATH_PK] : [])));
      const st = store.get('done') || { ts: 0, v: {} };
      if (!pks.length || Date.now() - st.ts < 10 * 60e3) return;
      st.ts = Date.now();
      store.set('done', st);
      pks.reduce((chain, pk) => chain.then(() => fetchGrades(pk).then((g) => {
        const cur = store.get('done') || { ts: Date.now(), v: {} };
        cur.v[pk] = g.filter((x) => x.cid && (x.g || x.st === 'NeedsGrading' || x.st === 'Graded')).map((x) => x.cid);
        store.set('done', cur);
      }, () => {})), Promise.resolve());
    }
    const doneParam = () => {
      const m = doneMap();
      const s2 = Object.keys(m).slice(0, 12).map((pk) => [pk].concat(m[pk].slice(0, 40)).join('~')).join('!');
      return s2 ? '&done=' + encodeURIComponent(s2) : '';
    };
    function leave(tab) {
      const f = getCtx(parse().pk).f || 'vakken';
      saveScroll();
      setTabOn(tab);
      // the portal already knows this list: just go back (fast, the page is kept); otherwise load it with the news
      const done = doneParam();
      const known = !done || store.get('doneSent') === done;
      if (fromPortal && f === tab && history.length > U.depth + 1 && known) { if (!TEST) leaving('back'); history.go(-(U.depth + 1)); return; }
      if (done) store.set('doneSent', done);
      goTo(PORTAL + '?tm=' + tab + (okAt ? '&ub=' + Math.floor(okAt / 1e3) : '') + done, { dir: 'back' });
    }
    W.addEventListener('popstate', (e) => {
      saveScroll();
      U.depth = (e.state && e.state.d) || 0;
      render(U.animBack ? 'pop' : 'none');
      U.animBack = false;
    });
    W.addEventListener('pagehide', () => { saveScroll(); ss.set('tm4-uscroll', JSON.stringify(U.scroll)); });

    // Signed out of Blackboard: load the course page once without the app, so Blackboard can sign you in its
    // own way; it then lands back on the course and the app takes over again (see the classic layer).
    let relogging = false;
    function relogin() {
      if (relogging) return;
      relogging = true;
      const r = parse();
      const pk = r.pk || PATH_PK;
      ss.set('tm4-resume', location.hash.split('?')[0]);
      const last = Number(ss.get('tm4-relogin')) || 0;
      const target = `${ULTRA}/ultra/courses/${pk}/outline`;
      if (!TEST && pk && Date.now() - last > 60e3) {
        ss.set('tm4-relogin', String(Date.now()));
        ss.set('tm4-noapp', String(Date.now()));
        location.replace(target);
        return;
      }
      const box = document.createElement('div');
      box.className = 'center';
      box.innerHTML = `${ico('lock')}<b>Je bent afgemeld bij Blackboard</b><span>Log opnieuw in om verder te gaan.</span><button type="button" class="btn" id="tm4-relog">Inloggen</button>`;
      $('#tm-main').replaceChildren(box);
      U.views.clear();
      $('#tm4-relog').addEventListener('click', () => { ss.set('tm4-noapp', String(Date.now())); location.replace(target); });
    }

    const ACTS = {
      back: () => { if (U.depth > 0) { U.animBack = true; history.back(); } else leave(getCtx(parse().pk).f || 'vakken'); },
      menu: () => {
        const pk = parse().pk;
        sheet({ title: meta(pk).name || 'Vak', actions: [
          { label: 'Openen in Blackboard', run: () => { ss.set('tm4-classic-ultra', String(Date.now())); goTo(`${ULTRA}/ultra/courses/${pk}/outline?tm=classic`); } },
          { label: 'Vernieuwen', run: () => { try { Object.keys(localStorage).filter((k) => k.startsWith(`${NS}c:${pk}:`) || k === `${NS}a:${pk}` || k === `${NS}g:${pk}` || k.startsWith(`${NS}i:${pk}:`)).forEach((k) => localStorage.removeItem(k)); } catch (_) {} location.reload(); } },
        ] });
      },
      att: async (b) => {
        const pk = parse().pk, id = b.dataset.id;
        const end = $('.end', b);
        if (end) end.innerHTML = '<span class="spin"></span>';
        try {
          const j = await uget(`/learn/api/public/v1/courses/${pk}/contents/${id}/attachments`);
          const a = (j.results || [])[0];
          if (a) { goTo(`${ULTRA}/learn/api/public/v1/courses/${pk}/contents/${id}/attachments/${a.id}/download`); return; }
        } catch (e) { if (e.auth) { relogin(); return; } }
        goTo(deepLink(pk, { id }));
      },
      retry: () => location.reload(),
    };
    W.addEventListener('click', (e) => {
      if (!e.target || !e.target.closest) return;
      const tab = e.target.closest('#tm-tabs a');
      if (tab) { e.preventDefault(); leave(tab.dataset.tab); return; }
      const act = e.target.closest('[data-act]');
      if (act) {
        const n = act.dataset.act;
        if (U.cur && U.cur.act && U.cur.act(n, act, e)) { e.preventDefault(); return; }
        if (ACTS[n]) { e.preventDefault(); ACTS[n](act, e); return; }
      }
      const nv = e.target.closest('a[data-nav]');
      if (nv) {
        e.preventDefault();
        const href = nv.getAttribute('href');
        const id = (/\/(?:f|d)\/(_\d+_\d+)/.exec(href) || [])[1];
        if (id && nv.dataset.title) U.titles[id] = nv.dataset.title;
        go(href);
        return;
      }
      const ann = e.target.closest('.ann');
      if (ann && !e.target.closest('a')) { toggleAnn(ann); return; }
      if (e.target.closest('a[href]')) saveScroll();
    }, true);

    if (!history.state || !history.state.tm) history.replaceState({ tm: 1, d: 0 }, '', location.hash);
    render('none');
    setTimeout(scanDone, 2500);
    pullRefresh(() => (U.cur && U.cur.refresh ? U.cur.refresh() : null));
    keepAlive('ultra', [[ULTRA + '/learn/api/public/v1/users/me?fields=id']], 5 * 60e3);
    const wake = () => { if (document.visibilityState === 'visible' && U.cur && U.cur.show) U.cur.show(); };
    document.addEventListener('visibilitychange', wake);
    W.addEventListener('pageshow', (e) => { if (e.persisted) wake(); });
  }
