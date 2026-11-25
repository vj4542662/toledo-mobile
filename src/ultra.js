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
      // Blackboard's own app may already have rewritten the address (#/cijfers -> #%2Fcijfers) before we run
      if (/^#%2F/i.test(h)) h = h.replace(/%2F/gi, '/').replace(/%3F/i, '?');
      const qs = h.includes('?') ? h.slice(h.indexOf('?')) : '';
      const resume = ss.get('tm4-resume') || '';
      ss.del('tm4-resume');
      if (!/^#\/(cijfers|agenda|zoek|groepen)/.test(h) && (resume.startsWith('#/c/' + PATH_PK) || /^#\/(cijfers|zoek|groepen)/.test(resume))) h = /^#\/(cijfers|zoek|groepen)/.test(resume) ? resume : resume + qs;
      if (/^#\/vak\//.test(h)) h = h.replace(/^#\/vak\/[^/?]*/, '#/c/' + PATH_PK);
      if (!/^#\/c\/_\d+_\d+/.test(h) && !/^#\/(cijfers|agenda|zoek|groepen)/.test(h)) h = '#/c/' + PATH_PK + qs;
      history.replaceState(history.state && history.state.tm ? history.state : { tm: 1, d: 0 }, '', location.pathname + h);
    }
    // Meer > Toledo-agenda opens /ultra/calendar?tm=agenda: the query survives Blackboard's sign-in (the hash does not)
    // Meer > Groepswerken opens /ultra/calendar?tm=groepen&cs=...: the query survives signing in and Toledo's link service, a hash doesn't
    if (W.__TM_ROUTE__ === 'groepen' && /^#%2Fgroepen/i.test(location.hash)) history.replaceState({ tm: 1, d: 0 }, '', location.origin + location.pathname + location.search + location.hash.replace(/%2F/gi, '/').replace(/%3F/i, '?'));
    if (W.__TM_ROUTE__ === 'groepen' && !/^#(\/|%2F)groepen/i.test(location.hash)) { const q = new URLSearchParams(location.search); q.delete('tm'); history.replaceState({ tm: 1, d: 0 }, '', location.origin + location.pathname + '?tm=groepen#/groepen?' + q); }
    if (W.__TM_ROUTE__ === 'agenda' && !/^#(\/|%2F)agenda/i.test(location.hash)) history.replaceState({ tm: 1, d: 0 }, '', location.origin + location.pathname + location.search + '#/agenda');
    // the screen this page was opened for (Groepswerken, Toledo-agenda): if Blackboard's own app wipes the address later, go back to it
    const ROUTE_HASH = W.__TM_ROUTE__ && /^#\/(groepen|agenda)/.test(location.hash) ? location.hash : '';
    guardPath();
    const U = { depth: (history.state && history.state.tm && history.state.d) || 0, views: new Map(), titles: {}, items: {}, cur: null, curKey: '', animBack: false, scroll: {} };
    try { U.scroll = JSON.parse(ss.get('tm4-uscroll') || '{}') || {}; } catch (_) {}
    const fromPortal = /^https:\/\/toledo\.kuleuven\.be\//.test(document.referrer);
    // remember when Blackboard last answered, to tell the portal (see leave())
    let okAt = 0;
    const uget = (p) => api(ULTRA + p).then((v) => { okAt = Date.now(); return v; });

    /* ---------------- routes + context ---------------- */
    function parse() {
      // Blackboard's own app can rewrite the address at any moment (#/groepen?x -> #%2Fgroepen%3Fx): read both
      let h = location.hash.replace(/^#/, '');
      if (/^%2F/i.test(h)) h = h.replace(/%2F/gi, '/').replace(/%3F/i, '?');
      const i = h.indexOf('?');
      const path = i >= 0 ? h.slice(0, i) : h;
      const q = new URLSearchParams(i >= 0 ? h.slice(i + 1) : '');
      const s = path.split('/').filter(Boolean);
      const r = { path, q, type: 'none' };
      if (s[0] === 'cijfers') r.type = 'grades';
      else if (s[0] === 'agenda') r.type = 'agenda';
      else if (s[0] === 'zoek') r.type = 'search';
      else if (s[0] === 'groepen') r.type = 'groups';
      else if (s[0] === 'vak' && s[1]) { r.type = 'resolve'; r.lu = decodeURIComponent(s[1]); r.rest = s.slice(2).join('/'); }
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
    const tabOf = (r) => (r.type === 'grades' || r.type === 'agenda' || r.type === 'groups' ? 'meer' : r.type === 'search' ? 'vakken' : getCtx(r.pk).f || 'vakken');
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
      const c = store.get('me2');
      if (c && Date.now() - c.ts < 7 * 864e5) return Promise.resolve(c.v);
      return once('me', () => uget('/learn/api/public/v1/users/me?fields=id,userName,studentId').then((v) => { store.set('me2', { ts: Date.now(), v }); return v; }));
    }
    // your student number (r0123456): the portal only knows your login id, so it is handed over on the way back
    function rnParam() {
      const c = store.get('me2');
      const d = c && c.v && /^\d{7,8}$/.test(c.v.studentId || '') ? String(c.v.studentId).slice(-7) : '';
      return d && store.get('rnSent') !== d ? '&rn=r' + d : '';
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
        // Blackboard's gradebook says "NeedsGrading" as soon as a draft (or a group member's draft) exists; only the
        // attempt itself tells whether it was really handed in. Check the recent ones without a grade.
        const SUBMITTED = /^(NeedsGrading|Completed|InProgressNeedsGrading)$/;
        const check = v.filter((x) => !x.g && x.st === 'NeedsGrading' && (!x.due || x.due > Date.now() - 30 * 864e5)).slice(0, 12);
        await Promise.all(check.map((x) => uget(`/learn/api/public/v2/courses/${pk}/gradebook/columns/${x.id}/attempts?userId=${me.id}&fields=id,status`).then((j) => {
          const at = j.results || [];
          if (at.length && !at.some((a) => SUBMITTED.test(a.status || ''))) x.st = 'InProgress';
        }, (e) => { if (e && e.auth) throw e; })));
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
    const STATUS = { NeedsGrading: 'Ingeleverd · wacht op beoordeling', InProgress: 'Concept, nog niet ingeleverd', Graded: 'Beoordeeld' };
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
        // two at a time: in the background, so what you tap yourself (a folder, a file) still goes first
        await Promise.all([work(), work()]);
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
        return fetchChildren(pk, 'ROOT').then((v) => { st.root = v; st.idx = buildIndex(); drawRoot(); drawTop(); if (!st.crawling) { st.crawling = true; setTimeout(() => crawl().finally(() => { st.crawling = false; }), 1200); } }, fail('root'));
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


    /* ---------------- all grades of this semester's courses (Meer > Cijfers) ---------------- */
    // The portal names the courses (?cs=pk~color~title!...): Blackboard's own grades page lists every course you ever had.
    function gradesView(r) {
      const el = section();
      let list = courseList(r.q.get('cs'), 'tm4-gcs');
      const st = { g: {}, err: {}, open: {} };
      el.innerHTML = '<div class="lt"><h1>Cijfers</h1><p class="lt-sub">Je vakken van dit semester</p></div><div data-k="body"></div>';
      const num = (g) => { const m = /^(-?\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/.exec(g || ''); return m ? parseFloat(m[1].replace(',', '.')) / parseFloat(m[2].replace(',', '.')) : null; };
      function draw() {
        if (!list.length) { put($('[data-k="body"]', el), empty('chart', 'Geen vakken', 'Open Cijfers via Meer in de app.')); return; }
        let h = '';
        list.forEach((c) => {
          const name = c.t || (c.pk && meta(c.pk).name) || 'Vak';
          if (!c.pk) { h += `<div class="gh gc" style="${colorVars(c.k)}"><i></i>${esc(name)}</div>` + skGroup(1); return; }
          const g = st.g[c.pk];
          const head = `<a class="gh gc" data-nav="1" href="#/c/${c.pk}/cijfers?t=${encodeURIComponent(name)}&k=${encodeURIComponent(c.k || '')}&f=meer" style="${colorVars(c.k)}"><i></i>${esc(name)}${CHEV}</a>`;
          if (!g) { h += head + (st.err[c.pk] ? `<div class="group plain">${row({ title: 'Kon niet geladen worden', sub: 'Trek omlaag om opnieuw te proberen', chevron: false })}</div>` : skGroup(1)); return; }
          const done = g.filter((x) => x.g);
          const wait = g.filter((x) => !x.g && x.st === 'NeedsGrading');
          const open = g.filter((x) => !x.g && x.st !== 'NeedsGrading' && x.due && x.due > Date.now());
          if (!done.length && !open.length && !wait.length) { h += head + `<div class="group plain">${row({ title: 'Nog geen cijfers', cls: 'muted', chevron: false })}</div>`; return; }
          const rowG = (x) => {
            const p = num(x.g);
            const tone = p == null ? '' : p >= 0.5 ? 'var(--green)' : 'var(--red)';
            return row({ href: x.cid ? deepLink(c.pk, { id: x.cid }) : undefined, title: x.t,
              sub: x.g ? '' : STATUS[x.st] || (x.due ? `Deadline ${dShort(x.due)} ${hhmm(x.due)}` : 'Nog geen cijfer'),
              end: x.g ? `<b style="color:${tone || 'var(--text)'};font-size:17px;font-weight:600">${esc(x.g)}</b>` : '<span>—</span>', chevron: false });
          };
          const showWait = st.open[c.pk] || (!done.length && wait.length <= 2);
          const waitRow = wait.length && !showWait ? row({ act: 'gwait', attrs: ` data-pk="${c.pk}"`, icon: 'clock', soft: true, title: `${wait.length} ingeleverd`, sub: 'Wacht op een cijfer', end: '<span class="cap">Toon</span>', chevron: false }) : '';
          h += head + `<div class="group plain">${done.map(rowG).join('')}${showWait ? wait.map(rowG).join('') : waitRow}${open.map(rowG).join('')}</div>`;
        });
        put($('[data-k="body"]', el), h + `<p class="fresh"><a href="${ULTRA}/ultra/grades">Alle vakken in Blackboard</a></p>`);
      }
      // courses the portal only knew by name (ULTRA-...): ask Blackboard for their id once
      const resolve = resolveCourse;
      async function load() {
        list.forEach((c) => { if (!c.pk && c.lu) { const k = store.get('lu:' + c.lu); if (k && k.v) c.pk = k.v; } });
        list.forEach((c) => { const x = c.pk && store.get('g:' + c.pk); if (x && !st.g[c.pk]) st.g[c.pk] = x.v; });
        draw();
        try {
          await Promise.all(list.map(resolve));
          const seen = new Set();
          list = list.filter((c) => c.pk && !seen.has(c.pk) && seen.add(c.pk));
          ss.set('tm4-gcs', JSON.stringify(list));
          draw();
          for (let i = 0; i < list.length; i += 3) {
            await Promise.all(list.slice(i, i + 3).map((d) => fetchGrades(d.pk).then((v) => { st.g[d.pk] = v; delete st.err[d.pk]; }, (e) => { if (e && e.auth) throw e; st.err[d.pk] = 1; })));
            draw();
          }
        } catch (e) { if (e && e.auth) relogin(); }
      }
      let at = 0;
      const view = { el, title: () => 'Cijfers', act(n, b) { if (n !== 'gwait') return false; st.open[b.dataset.pk] = 1; draw(); return true; }, show() { if (Date.now() - at > 120e3) { at = Date.now(); load(); } }, refresh: () => { at = Date.now(); return load(); } };
      return view;
    }

    /* ---------------- Vakken > zoeken in al je vakken ---------------- */
    // Toledo only searches inside one course. The portal hands over your courses (?cs=, like Cijfers); we walk their
    // folders here (the same cached lists a course page uses) and search titles, descriptions and file names at once.
    function courseList(raw, key) {
      let list = [];
      if (raw) {
        list = raw.split('!').map((x) => { const [id, k, ...t] = x.split('~'); return /^_\d+_\d+$/.test(id) ? { pk: id, k, t: t.join('~') } : /^ULTRA-[\w.-]+$/.test(id) ? { lu: id, k, t: t.join('~') } : null; }).filter(Boolean).slice(0, 24);
        ss.set(key, JSON.stringify(list));
      } else { try { list = JSON.parse(ss.get(key) || '[]') || []; } catch (_) {} }
      return list;
    }
    function resolveCourse(c) {
      if (c.pk) return Promise.resolve();
      const known = store.get('lu:' + c.lu);
      if (known && known.v) { c.pk = known.v; return Promise.resolve(); }
      return uget(`/learn/api/public/v3/courses/courseId:${encodeURIComponent(c.lu)}?fields=id,name`).then((x) => { store.set('lu:' + c.lu, { ts: Date.now(), v: x.id }); saveMeta(x.id, { name: x.name, lu: c.lu }); c.pk = x.id; }, (e) => { if (e && e.auth) throw e; c.gone = 1; });
    }
    function searchView(r) {
      const el = section();
      let list = courseList(r.q.get('cs'), 'tm4-zcs');
      const st = { q: r.q.get('q') || ss.get('tm4-zq') || '', done: {}, err: {}, more: {}, running: false, at: 0, t: 0 };
      el.innerHTML = `<div class="lt"><h1>Zoeken</h1><p class="lt-sub">In de inhoud van al je vakken</p></div><label class="search">${ico('search')}<input type="search" placeholder="Zoek in al je vakken" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Zoek in al je vakken"><button type="button" class="clr" data-act="clr" hidden aria-label="Wis">✕</button></label><div data-k="state"></div><div data-k="res"></div>`;
      const inp = $('input', el), clr = $('.clr', el);
      inp.value = st.q; clr.hidden = !st.q;
      list.forEach((c) => { if (c.pk && c.k) saveMeta(c.pk, { color: c.k }); });
      // every item of one course from the cached folder lists, with the folders it sits in
      function indexOf(pk) {
        const out = [];
        const walk = (items, path, depth) => items.forEach((it) => {
          if (it.ub) return;
          out.push({ it, path });
          if (it.k === 'folder' && depth < 7) { const c = cachedKids(pk, it.id); if (c) walk(c.v, path.concat(it.t), depth + 1); }
        });
        const root = cachedKids(pk, 'ROOT');
        if (root) walk(root.v, [], 0);
        return out;
      }
      const pathLabel = (x) => [x.path.join(' › ') || 'Hoofdmap', x.it.m ? shortWhen(x.it.m) : ''].filter(Boolean).join(' · ');
      function draw() {
        const res = $('[data-k="res"]', el), state = $('[data-k="state"]', el);
        const words = fold(st.q.trim()).split(/\s+/).filter(Boolean);
        const ready = list.filter((c) => c.pk && st.done[c.pk]).length;
        const total = list.filter((c) => !c.gone).length;
        put(state, st.running && ready < total ? `<p class="fresh"><span class="spin" style="width:12px;height:12px;border-width:2px;vertical-align:-1px;margin-right:6px"></span>${ready} van ${total} vakken doorzocht…</p>` : '');
        if (!list.length) { put(res, empty('book', 'Geen vakken', 'Open Zoeken via Vakken in de app.')); return; }
        if (!words.length) { put(res, empty('search', 'Zoek in al je vakken', 'Typ een woord uit de naam van een bestand, map of opdracht. Je zoekt in alle vakken van dit semester tegelijk.')); return; }
        // every word must be somewhere (also in the folders above), at least one in the item itself
        const has = (own, path) => { const o = fold(own), pa = fold(path || ''); return words.some((w) => o.includes(w)) && words.every((w) => o.includes(w) || pa.includes(w)); };
        let h = '', n = 0;
        list.forEach((c) => {
          if (!c.pk) return;
          const hits = [];
          indexOf(c.pk).forEach((x) => {
            const path = x.path.join(' ');
            if (has(x.it.t + ' ' + (x.it.d || '') + ' ' + (x.it.f ? x.it.f.n : ''), path)) hits.push({ x });
            else if (x.it.files) x.it.files.forEach((f) => { if (has(f.n, path + ' ' + x.it.t)) hits.push({ x, f }); });
          });
          if (!hits.length) return;
          n += hits.length;
          const name = c.t || meta(c.pk).name || 'Vak';
          const lim = st.more[c.pk] ? 60 : 5;
          h += `<a class="gh gc" data-nav="1" href="#/c/${c.pk}?t=${encodeURIComponent(name)}&k=${encodeURIComponent(c.k || '')}&f=vakken" style="${colorVars(c.k)}"><i></i>${esc(name)}${CHEV}</a>`;
          h += `<div class="group">${hits.slice(0, lim).map(({ x, f }) => (f ? fileRow(f, { sub: `${pathLabel(x)} › ${x.it.t}` }) : itemRow(x.it, c.pk, { path: pathLabel(x), flat: true }))).join('')}${hits.length > lim ? `<button type="button" class="more-row" data-act="zmore" data-pk="${c.pk}">Toon alle ${hits.length}</button>` : ''}</div>`;
        });
        if (!h) h = empty('search', 'Niets gevonden', st.running ? 'Nog niet alle vakken zijn doorzocht. Even geduld…' : `Niets in je vakken past bij "${st.q.trim()}".`);
        else h = `<div class="gh">${n} resulta${n === 1 ? 'at' : 'ten'}</div>` + h;
        put(res, h);
      }
      const later = () => { if (!st.t) st.t = setTimeout(() => { st.t = 0; draw(); }, 350); };
      // walk one course's folders: what was read in the last half hour comes from the phone, the rest from Blackboard
      async function crawlCourse(pk, force) {
        const queue = [['ROOT', 0]];
        const seen = new Set();
        let n = 0;
        while (queue.length && n < 120) {
          const [id, depth] = queue.shift();
          if (seen.has(id)) continue;
          seen.add(id);
          n++;
          const c = cachedKids(pk, id);
          let kids = !force && c && Date.now() - c.ts < 30 * 60e3 ? c.v : null;
          if (!kids) { try { kids = await fetchChildren(pk, id); later(); } catch (e) { if (e.auth) throw e; kids = c ? c.v : []; } }
          kids.forEach((k) => { if (k.k === 'folder' && depth < 6) queue.push([k.id, depth + 1]); });
        }
        st.done[pk] = 1;
        later();
      }
      async function load(force) {
        if (st.running) return;
        st.running = true;
        list.forEach((c) => { if (!c.pk && c.lu) { const k = store.get('lu:' + c.lu); if (k && k.v) c.pk = k.v; } });
        if (force) st.done = {};
        draw();
        try {
          await Promise.all(list.map(resolveCourse));
          const seen = new Set();
          list = list.filter((c) => c.pk && !seen.has(c.pk) && seen.add(c.pk));
          ss.set('tm4-zcs', JSON.stringify(list));
          // three courses at a time
          const q = list.slice();
          const work = async () => { while (q.length) { const c = q.shift(); try { await crawlCourse(c.pk, force); } catch (e) { if (e && e.auth) throw e; st.done[c.pk] = 1; } } };
          await Promise.all([work(), work(), work()]);
        } catch (e) { if (e && e.auth) { st.running = false; relogin(); return; } }
        st.running = false;
        draw();
      }
      inp.addEventListener('input', () => { st.q = inp.value; clr.hidden = !inp.value; ss.set('tm4-zq', st.q); draw(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
      const view = {
        el,
        title: () => 'Zoeken',
        route(r2) { const q = r2.q.get('q'); if (q != null && q !== st.q) { st.q = inp.value = q; clr.hidden = !q; ss.set('tm4-zq', q); draw(); } },
        show() {
          draw();
          if (!st.q) setTimeout(() => { if (U.cur === view) inp.focus(); }, 350);
          if (Date.now() - st.at < 120e3) return;
          st.at = Date.now();
          load(false);
        },
        refresh() { st.at = Date.now(); return load(true); },
        act(n, b) {
          if (n === 'clr') { inp.value = ''; st.q = ''; clr.hidden = true; ss.set('tm4-zq', ''); draw(); inp.focus(); return true; }
          if (n === 'zmore') { st.more[b.dataset.pk] = 1; draw(); return true; }
          return false;
        },
      };
      return view;
    }

    /* ---------------- Meer > Groepswerken: your groups in this semester's courses ---------------- */
    // Blackboard only shows a group inside its own course, and a student can't open the member list through the
    // public API. Ultra's own API can: /learn/api/v1/courses/<pk>/groups?expand=memberships lists every group with
    // its member ids (only the groups you may see), /learn/api/v1/users/<id> gives a member's name and e-mail.
    // The portal names the courses (?cs=, like Cijfers) and your mail choice (?ma=).
    const userOf = (id) => {
      const c = store.get('usr:' + id);
      if (c && Date.now() - c.ts < 14 * 864e5) return Promise.resolve(c.v);
      return once('usr:' + id, () => uget(`/learn/api/v1/users/${id}`).then((u) => { const v = { n: [u.givenName, u.familyName].filter(Boolean).join(' ') || u.userName || 'Onbekend', e: u.emailAddress || '' }; store.set('usr:' + id, { ts: Date.now(), v }); return v; }));
    };
    // all your groups in one short text (name~course~e-mail,e-mail!...), handed to the portal (Meer > Studieplek) and KURT,
    // so a group room booking can offer every group. Only members' KU Leuven addresses, never yours.
    const grpParam = () => { const v = store.get('grpx'); return v && store.get('grpxSent') !== v ? '&gx=' + encodeURIComponent(v) : ''; };
    const shortCourse = (t) => String(t || '').replace(/\s*\[[^\]]*\]\s*$/, '').trim();
    function groupsView(r) {
      const el = section();
      let list = courseList(r.q.get('cs'), 'tm4-grcs');
      if (r.q.get('ma')) store.set('mailApp', r.q.get('ma') === 'web' ? 'web' : 'app');
      const st = { g: {}, err: {}, u: {}, me: '', at: 0 };
      el.innerHTML = '<div class="lt"><h1>Groepswerken</h1><p class="lt-sub">Je groepen in je vakken van dit semester</p></div><div data-k="body"></div>';
      const when = (iso) => { const t = Date.parse(iso); return t ? `${dShort(t)} ${hhmm(t)}` : ''; };
      const people = (g) => g.m.map((id) => ({ id, me: id === st.me, u: st.u[id] }));
      const mails = (g) => people(g).filter((p) => !p.me && p.u && p.u.e).map((p) => p.u.e);
      function card(c, g) {
        const name = c.t || meta(c.pk).name || 'Vak';
        const ppl = people(g).sort((a, b) => (b.me - a.me) || String(a.u ? a.u.n : '').localeCompare(String(b.u ? b.u.n : ''), 'nl'));
        const rows = ppl.map((p) => {
          if (!p.u) return `<div class="sk-row"><span class="sk ic"></span><span class="lines"><span class="sk" style="display:block;width:60%"></span><span class="sk" style="display:block"></span></span></div>`;
          const av = `<span class="gw-av${p.me ? ' me' : ''}">${esc(initials(p.u.n))}</span>`;
          return p.me || !p.u.e ? row({ iconHtml: av, title: p.me ? `${p.u.n} (jij)` : p.u.n, sub: p.u.e, chevron: false })
            : row({ act: 'gwmail1', attrs: ` data-e="${esc(p.u.e)}" data-s="${esc(shortCourse(name) + ' – ' + g.t)}"`, iconHtml: av, title: p.u.n, sub: p.u.e, end: `<span class="gw-m">${ico('mail')}</span>`, chevron: false });
        }).join('');
        const sub = [g.set, g.self ? 'je schreef je zelf in' : 'ingedeeld door je docent'].filter(Boolean).join(' · ');
        const ready = ppl.every((p) => p.u);
        const kurt = `https://kurt3.ghum.kuleuven.be/?tmg=${encodeURIComponent(g.t)}&tmc=${encodeURIComponent(shortCourse(name))}&tmm=${encodeURIComponent(mails(g).join(','))}${store.get('grpx') ? '&tmgs=' + encodeURIComponent(store.get('grpx')) : ''}`;
        const href = `#/c/${c.pk}?t=${encodeURIComponent(name)}&k=${encodeURIComponent(c.k || '')}&f=meer`;
        return `<div class="card gw" style="${colorVars(c.k)}">
          <div class="gw-h"><span class="gw-ic">${ico('people')}</span><span class="main"><span class="gw-t"><b>${esc(g.t)}</b><i></i><a data-nav="1" href="${href}">${esc(shortCourse(name))}</a></span><span>${esc(sub)}</span></span><span class="gw-n">${g.m.length}</span></div>
          ${g.d ? `<p class="gw-d">${esc(g.d)}</p>` : ''}
          <div class="group plain gw-ppl">${rows}</div>
          <div class="gw-acts">
            <button type="button" class="pri" data-act="gwmail" data-pk="${c.pk}" data-g="${g.id}"${ready && mails(g).length ? '' : ' disabled'}>${ico('mail')}Mail de groep</button>
            <a href="${esc(kurt)}"${ready ? '' : ' aria-disabled="true"'}>${ico('desk')}Groepsruimte boeken</a>
          </div></div>`;
      }
      function draw() {
        const body = $('[data-k="body"]', el);
        if (!list.length) { put(body, empty('people', 'Geen vakken', 'Open Groepswerken via Meer in de app.')); return; }
        let h = '', none = [], waiting = 0, nGroups = 0;
        list.forEach((c) => {
          const x = st.g[c.pk];
          const name = c.t || (c.pk && meta(c.pk).name) || 'Vak';
          if (!x) { if (st.err[c.pk]) none.push(name); else waiting++; return; }
          if (!x.mine.length && !x.open.length) { none.push(name); return; }
          x.mine.forEach((g) => { nGroups++; h += card(c, g); });
          x.open.forEach((o) => {
            h += `<div class="group">${row({ href: `${ULTRA}/ultra/courses/${c.pk}/groups/enrollments`, icon: 'plus', soft: true, title: `Kies een groep: ${o.set}`, sub: [shortCourse(name), o.end ? `inschrijven kan tot ${when(o.end)}` : 'inschrijven is open'].join(' · '), external: true })}</div>`;
          });
        });
        if (waiting) h += `<p class="fresh"><span class="spin" style="width:12px;height:12px;border-width:2px;vertical-align:-1px;margin-right:6px"></span>Nog ${waiting} ${waiting === 1 ? 'vak' : 'vakken'} nakijken…</p>${nGroups ? '' : skGroup(3)}`;
        else if (!nGroups && !h) h = empty('people', 'Geen groepen', 'Je zit in geen enkele groep in je vakken van dit semester. Zodra je docent je indeelt of je je inschrijft, verschijnt je groep hier.');
        if (!waiting && none.length && (nGroups || h)) h += `<p class="fresh">Geen groepen in: ${esc(none.map(shortCourse).join(', '))}</p>`;
        put(body, h);
      }
      async function courseGroups(pk) {
        const [gr, sets] = await Promise.all([
          uget(`/learn/api/v1/courses/${pk}/groups?limit=1000&expand=memberships,signUpSheet&membershipAvailable=true`),
          uget(`/learn/api/v1/courses/${pk}/groupsets?limit=1000&expand=signUpSheet`).catch((e) => { if (e && e.auth) throw e; return { results: [] }; }),
        ]);
        const setT = {};
        (sets.results || []).forEach((s) => { setT[s.id] = s; });
        const all = (gr.results || []).filter((g) => g.isAvailable !== false);
        const mine = all.filter((g) => (g.memberships || []).some((m) => m.userId === st.me)).map((g) => ({
          id: g.id, t: g.title || 'Groep', set: g.groupSetId && setT[g.groupSetId] ? setT[g.groupSetId].title : '',
          self: !!(g.isSelfEnrolledAllowed || g.signUpSheet), m: (g.memberships || []).map((m) => m.userId).slice(0, 40),
          d: String((g.description && (g.description.rawText || '')) || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240),
        }));
        // sign-up sheets that are open now and where you have no group yet
        const inSet = new Set(mine.map((g) => all.find((x) => x.id === g.id).groupSetId).filter(Boolean));
        const open = [];
        const seen = new Set();
        all.forEach((g) => {
          const s = g.signUpSheet;
          if (!s || !g.groupSetId || inSet.has(g.groupSetId) || seen.has(g.groupSetId)) return;
          const now = Date.now(), a = Date.parse(s.enrollmentStartDate || '') || 0, b = Date.parse(s.enrollmentEndDate || '') || Infinity;
          if (now < a || now > b || !g.isShowSignUp) return;
          seen.add(g.groupSetId);
          open.push({ set: s.name || (setT[g.groupSetId] || {}).title || 'Groepen', end: s.enrollmentEndDate || '' });
        });
        return { mine, open };
      }
      async function load(force) {
        list.forEach((c) => { if (!c.pk && c.lu) { const k = store.get('lu:' + c.lu); if (k && k.v) c.pk = k.v; } });
        list.forEach((c) => { const x = c.pk && store.get('grp:' + c.pk); if (x && !st.g[c.pk]) st.g[c.pk] = x.v; });
        const fillUsers = () => list.forEach((c) => { const x = st.g[c.pk]; if (x) x.mine.forEach((g) => g.m.forEach((id) => { if (!st.u[id]) { const k = store.get('usr:' + id); if (k) st.u[id] = k.v; } })); });
        try {
          st.me = (await getMe()).id;
          fillUsers();
          draw();
          await Promise.all(list.map(resolveCourse));
          const seen = new Set();
          list = list.filter((c) => c.pk && !seen.has(c.pk) && seen.add(c.pk));
          ss.set('tm4-grcs', JSON.stringify(list));
          draw();
          const q = list.filter((c) => force || !store.get('grp:' + c.pk) || Date.now() - store.get('grp:' + c.pk).ts > 10 * 60e3);
          const work = async () => {
            while (q.length) {
              const c = q.shift();
              try { const v = await courseGroups(c.pk); st.g[c.pk] = v; delete st.err[c.pk]; store.set('grp:' + c.pk, { ts: Date.now(), v }); }
              catch (e) { if (e && e.auth) throw e; if (!st.g[c.pk]) st.err[c.pk] = 1; }
              fillUsers(); draw();
            }
          };
          await Promise.all([work(), work(), work()]);
          // the members' names and addresses (kept two weeks)
          const ids = new Set();
          list.forEach((c) => { const x = st.g[c.pk]; if (x) x.mine.forEach((g) => g.m.forEach((id) => { if (!st.u[id] || force) ids.add(id); })); });
          const uq = [...ids];
          const uwork = async () => { while (uq.length) { const id = uq.shift(); try { st.u[id] = await userOf(id); } catch (e) { if (e && e.auth) throw e; st.u[id] = { n: 'Onbekend', e: '' }; } draw(); } };
          await Promise.all([uwork(), uwork(), uwork()]);
          const snap = [];
          list.forEach((c) => { const x = st.g[c.pk]; if (x) x.mine.forEach((g) => { const m = mails(g); if (m.length) snap.push([g.t, shortCourse(c.t || meta(c.pk).name || ''), m.join(',')].map((y) => String(y).replace(/[~!]/g, ' ')).join('~')); }); });
          store.set('grpx', snap.join('!'));
          draw();
        } catch (e) { if (e && e.auth) relogin(); else draw(); }
      }
      const groupOf = (b) => { const x = st.g[b.dataset.pk]; return x && x.mine.find((g) => g.id === b.dataset.g); };
      const courseName = (pk) => shortCourse((list.find((c) => c.pk === pk) || {}).t || meta(pk).name || '');
      // a new mail to everyone: the Outlook app (if that's your choice in Instellingen) or Outlook on the web
      function compose(to, subject) {
        const q = `to=${encodeURIComponent(to.join(','))}&subject=${encodeURIComponent(subject)}`;
        if (store.get('mailApp') === 'web') { goTo(`https://outlook.office.com/mail/deeplink/compose?${q}`); return; }
        location.href = `ms-outlook://compose?${q}`;
      }
      const view = {
        el,
        title: () => 'Groepswerken',
        show() { draw(); if (Date.now() - st.at > 120e3) { st.at = Date.now(); load(false); } },
        refresh: () => { st.at = Date.now(); return load(true); },
        act(n, b) {
          if (n === 'gwmail') { const g = groupOf(b); if (g && !b.disabled) compose(mails(g), `${courseName(b.dataset.pk)} – ${g.t}`); return true; }
          if (n === 'gwmail1') { compose([b.dataset.e], b.dataset.s); return true; }
          return false;
        },
      };
      return view;
    }

    /* ---------------- Meer > Toledo-agenda: subscribe to Blackboard's own calendar feed ---------------- */
    // Blackboard offers a personal .ics link (Calendar > settings > Share calendar) with deadlines and course events.
    // Subscribing to it in the iPhone's Calendar keeps it up to date by itself. We look the link up and hand it over as
    // webcal://, which makes Safari offer "Subscribe". If no lookup works, the view explains the manual steps.
    async function calFeed() {
      const c = store.get('calfeed');
      if (c && c.v && Date.now() - c.ts < 30 * 864e5) return c.v;
      const tries = ['/webapps/calendar/calendarFeed/url', '/learn/api/v1/calendars/calendarFeed/url', '/learn/api/v1/calendars/feed/url', '/learn/api/v1/calendars/calendarFeed'];
      for (const p of tries) {
        try {
          const r = await fetch(ULTRA + p, { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json, text/plain, */*' } });
          if (r.status === 401) throw new AuthError('401');
          if (!r.ok) continue;
          const m = /https?:\/\/[^\s"'<>\\]+?\.ics\b[^\s"'<>\\]*/.exec(await r.text());
          if (m) { const v = m[0].replace(/\\\//g, '/'); store.set('calfeed', { ts: Date.now(), v }); return v; }
        } catch (e) { if (e && e.auth) throw e; }
      }
      return '';
    }
    function agendaView() {
      const el = section();
      el.innerHTML = '<div class="lt"><h1>Toledo-agenda</h1><p class="lt-sub">Deadlines in de Agenda van je iPhone</p></div><div data-k="body"></div>';
      const st = { url: '', state: 'loading' };
      const steps = `<div class="group plain" style="margin-left:0;margin-right:0">${row({ icon: 'calendar', soft: true, title: '1. Open de agenda in Toledo', sub: 'Tik op het tandwiel (Kalenderinstellingen)', chevron: false })}${row({ icon: 'link', soft: true, title: '2. Kalender delen', sub: 'Tik op de drie puntjes, dan Kalender delen, en kopieer de link', chevron: false })}${row({ icon: 'calendar', soft: true, title: '3. Op je iPhone', sub: 'Instellingen › Agenda › Accounts › Account toevoegen › Andere › Voeg agenda-abonnement toe, en plak de link', chevron: false })}</div>`;
      function draw() {
        let h = '<p class="gf" style="margin:4px 4px 16px">Je deadlines van opdrachten en wat proffen in de vakagenda zetten, komen in de Agenda-app. Je iPhone werkt ze daarna vanzelf bij, ook als er iets verandert. Je lessen staan er niet in.</p>';
        if (st.state === 'loading') h += '<div class="center" style="min-height:30vh"><div class="spin"></div><span>Je agendalink ophalen…</span></div>';
        else if (st.url) {
          const web = st.url.replace(/^https?:\/\//, 'webcal://');
          h += `<a class="btn" style="display:flex;width:100%;height:52px" href="${esc(web)}">${ico('calendar')}Toevoegen aan Agenda</a>`;
          h += `<button type="button" class="btn ghost" style="display:flex;width:100%;margin-top:10px" data-act="calcopy">${ico('link')}Kopieer link</button>`;
          h += '<p class="gf" style="margin:12px 4px 0">Je iPhone vraagt of je je wil abonneren: tik op Abonneer en daarna op Voeg toe. Deze link is persoonlijk, deel hem niet.</p>';
        } else {
          h += '<p class="gf" style="margin:0 4px 12px">De link kon niet automatisch opgehaald worden. Zo doe je het zelf (eenmalig):</p>' + steps;
          h += `<a class="btn" style="display:flex;width:100%;margin-top:14px" href="${ULTRA}/ultra/calendar">${ico('calendar')}Open de agenda in Toledo</a>`;
        }
        put($('[data-k="body"]', el), `<div style="padding:0 16px">${h}</div>`);
      }
      async function load() {
        st.state = 'loading'; draw();
        try { st.url = await calFeed(); } catch (e) { if (e && e.auth) { relogin(); return; } }
        st.state = 'done'; draw();
      }
      let at = 0;
      return { el, title: () => 'Toledo-agenda',
        act(n) {
          if (n !== 'calcopy') return false;
          const done = () => toast('Link gekopieerd');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(st.url).then(done, () => toast('Kopiëren lukte niet'));
          return true;
        },
        show() { if (!at) { at = 1; load(); } },
        refresh: () => { store.del('calfeed'); return load(); } };
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
      const f = tabOf(r);
      const back = U.depth > 0 ? { label: st.back || 'Terug', act: 'back', href: '#' } : { label: TAB_LABEL[f] || 'Vakken', act: 'back', href: PORTAL + '?tm=' + f };
      return { back, title: v.title(), right: v.right ? v.right() : '' };
    }
    function saveScroll() { if (U.curKey) U.scroll[U.curKey] = W.scrollY; }
    function render(anim) {
      const r = parse();
      if (r.type === 'resolve') { resolveLu(r); return; }
      if (r.type === 'none') {
        if (ROUTE_HASH) { history.replaceState(history.state, '', location.origin + location.pathname + location.search + ROUTE_HASH); render(anim); return; }
        if (PATH_PK) { history.replaceState(history.state, '', location.pathname + '#/c/' + PATH_PK); render(anim); return; }
        goTo(PORTAL + '?tm=vakken', { replace: true, dir: 'back' });
        return;
      }
      if (r.pk && [...r.q.keys()].length) saveCtx(r.pk, r.q);
      if (r.q.get('dl') != null) store.set('dlpks', { ts: Date.now(), v: String(r.q.get('dl')).split('.').filter((x) => /^_\d+_\d+$/.test(x)).slice(0, 10) });
      const key = keyOf(r);
      let v = U.views.get(key);
      if (!v) {
        v = r.type === 'grades' ? gradesView(r) : r.type === 'groups' ? groupsView(r) : r.type === 'search' ? searchView(r) : r.type === 'agenda' ? agendaView() : r.type === 'course' ? courseView(r) : r.type === 'folder' ? folderView(r) : r.type === 'doc' ? docView(r) : itemView(r);
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
      setTabOn(tabOf(r));
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
    const doneMap = () => (store.get('done2') || {}).v || {};
    function scanDone() {
      const dl = store.get('dlpks');
      const pks = Array.from(new Set(((dl && Date.now() - dl.ts < 7 * 864e5 && dl.v) || []).concat(PATH_PK ? [PATH_PK] : [])));
      const st = store.get('done2') || { ts: 0, v: {} };
      if (!pks.length || Date.now() - st.ts < 10 * 60e3) return;
      st.ts = Date.now();
      store.set('done2', st);
      pks.reduce((chain, pk) => chain.then(() => fetchGrades(pk).then((g) => {
        const cur = store.get('done2') || { ts: Date.now(), v: {} };
        cur.v[pk] = g.filter((x) => x.cid && (x.g || x.st === 'NeedsGrading' || x.st === 'Graded')).map((x) => x.cid);
        store.set('done2', cur);
      }, () => {})), Promise.resolve());
    }
    const doneParam = () => {
      const m = doneMap();
      const s2 = Object.keys(m).slice(0, 12).map((pk) => [pk].concat(m[pk].slice(0, 40)).join('~')).join('!');
      return s2 ? '&done=' + encodeURIComponent(s2) : '';
    };
    function leave(tab) {
      const f = tabOf(parse());
      saveScroll();
      setTabOn(tab);
      // the portal already knows this list: just go back (fast, the page is kept); otherwise load it with the news
      const done = doneParam();
      const rn = rnParam();
      const gx = grpParam();
      const known = !rn && !gx && (!done || store.get('doneSent') === done);
      const url = PORTAL + '?tm=' + tab + (okAt ? '&ub=' + Math.floor(okAt / 1e3) : '') + done + rn + gx;
      if (fromPortal && f === tab && history.length > U.depth + 1 && known) {
        // Safari's history doesn't always lead back to the app (an entry it dropped, a page in between): when
        // nothing happened after a moment, load the app's tab instead of staying dimmed and loading forever
        if (!TEST) leaving('back');
        let gone = false;
        const g = () => { gone = true; };
        W.addEventListener('pagehide', g, { once: true });
        history.go(-(U.depth + 1));
        setTimeout(() => { W.removeEventListener('pagehide', g); if (!gone && document.visibilityState === 'visible') goTo(url, { dir: 'back' }); }, 2500);
        return;
      }
      if (done) store.set('doneSent', done);
      if (rn) store.set('rnSent', rn.slice(-7));
      if (gx) store.set('grpxSent', store.get('grpx'));
      goTo(url, { dir: 'back' });
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
      ss.set('tm4-resume', r.type === 'grades' || r.type === 'agenda' || r.type === 'search' || r.type === 'groups' ? location.hash : location.hash.split('?')[0]);
      const last = Number(ss.get('tm4-relogin')) || 0;
      const target = r.type === 'agenda' ? `${ULTRA}/ultra/calendar?tm=agenda` : r.type === 'groups' ? `${ULTRA}/ultra/calendar?tm=groepen` : `${ULTRA}/ultra/courses/${pk}/outline`;
      if (!TEST && (pk || r.type === 'agenda' || r.type === 'groups') && Date.now() - last > 60e3) {
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
      back: () => { if (U.depth > 0) { U.animBack = true; history.back(); } else leave(tabOf(parse())); },
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
    setTimeout(() => { scanDone(); getMe().catch(() => {}); }, 2500);
    pullRefresh(() => (U.cur && U.cur.refresh ? U.cur.refresh() : null));
    keepAlive('ultra', [[ULTRA + '/learn/api/public/v1/users/me?fields=id']], 5 * 60e3);
    updateWatch();
    const wake = () => { if (document.visibilityState === 'visible' && U.cur && U.cur.show) U.cur.show(); };
    document.addEventListener('visibilitychange', wake);
    W.addEventListener('pageshow', (e) => { if (e.persisted) wake(); });
  }
