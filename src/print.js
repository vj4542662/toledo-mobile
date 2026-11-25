  /* ================================================================== KU Leuven Print (printing from your phone) */
  // print.kuleuven.be is PaperCut MF: server-rendered HTML pages, no JSON API except a little job status call. The app
  // reads those pages in the background (fetch + DOMParser) and rebuilds them: your balance, what waits at the printer,
  // a print screen that walks PaperCut's three-step Web Print wizard for you, history, top-up, transfer and voucher.
  // Sending goes to "KU Leuven Print Anywhere": the job waits until you scan your card at any KU Leuven printer.
  function printApp() {
    const O = location.origin;
    const PG = (n) => O + '/app?service=page/' + n;
    const ORIG = PG('UserSummary') + '&tm=orig';
    takeover('Printen', []);
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
    keepAlive('print', [[PG('UserReleaseJobs'), 'no-cors']]);

    /* ---------- reading PaperCut's pages */
    const parse = (t) => new DOMParser().parseFromString(t, 'text/html');
    async function page(url, opt) {
      let r;
      try { r = await fetch(url, Object.assign({ credentials: 'include', cache: 'no-store' }, opt || {})); }
      catch (_) { throw new AuthError('net'); } // a redirect to the KU Leuven login can't be read from here
      if (new URL(r.url).host !== location.host) throw new AuthError('login');
      const d = parse(await r.text());
      if (!d.querySelector('a[href*="logoutLink"]')) throw new AuthError('login');
      d.querySelectorAll('script, .responsive-label').forEach((n) => n.remove());
      return d;
    }
    const post = (o) => page(O + '/app', { method: 'POST', body: new URLSearchParams(o) });
    const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const cell = (tr, cls) => txt(tr.querySelector('td.' + cls));
    // "1,087" (thousands) and "0,05" (Dutch decimals) both occur
    const num = (s) => {
      let v = String(s == null ? '' : s).replace(/[^\d,.\-]/g, '');
      v = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v) ? v.replace(/,/g, '') : v.replace(',', '.');
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const eur = (v) => (v == null ? '' : (v < 0 ? '− ' : '') + '€ ' + Math.abs(v).toFixed(2).replace('.', ','));
    const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const when = (s) => {
      const m = /([A-Z][a-z]{2}) (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AP]M)?/.exec(String(s || ''));
      if (!m) return 0;
      let h = Number(m[4]) % 12; if (m[7] === 'PM') h += 12; if (!m[7]) h = Number(m[4]);
      return new Date(Number(m[3]), MON[m[1]] || 0, Number(m[2]), h, Number(m[5]), Number(m[6] || 0)).getTime();
    };
    const dutchDay = (x) => { const m = /([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/.exec(x || ''); return m ? `${m[2]} ${MONTHS_S[MON[m[1]] || 0]} ${m[3]}` : x; };
    const whenTxt = (t) => { if (!t) return ''; const n = dayDiff(t, Date.now()); return (n === 0 ? 'vandaag' : n === -1 ? 'gisteren' : dShort(t)) + ' ' + hhmm(t); };
    const pages = (n) => `${n} pagina${n === 1 ? '' : "'s"}`;
    // the KU Leuven Print Anywhere queues: colour x paper x sides
    const PA = 'icts-s-prt6';
    const QUEUES = {
      'bw-A4-2': 'KULeuvenBlack_A4_Double-Sided', 'bw-A4-1': 'KULeuvenBlack_A4_Single-sided', 'bw-A3-1': 'KULeuvenBlack_A3_Single-Sided',
      'col-A4-2': 'KULeuvenColor_A4_Double-Sided', 'col-A4-1': 'KULeuvenColor_A4_Single-sided', 'col-A3-1': 'KULeuvenColor_A3_Single-Sided',
    };
    const prName = (p) => {
      const s = String(p || '').split('\\').pop().trim();
      const m = /^KULeuven(Black|Colou?r)_(A\d)_(Single|Double)/i.exec(s);
      if (m) return `${m[2]}, ${/black/i.test(m[1]) ? 'zwart-wit' : 'kleur'}, ${/double/i.test(m[3]) ? 'dubbelzijdig' : 'enkelzijdig'}`;
      const known = (store.get('print:printers2') || { v: [] }).v.find((x) => x.p === s);
      return known && known.loc ? known.loc : s;
    };
    const isPA = (p) => /KULeuven(Black|Colou?r)_/i.test(String(p || ''));
    const msgOf = (d) => {
      const el = d.querySelector('.errorMessage, .error-message, .infoMessage, .status-messages');
      return txt(el);
    };

    async function loadSummary() {
      const d = await page(PG('UserSummary'));
      const li = (c) => txt(d.querySelector('#enviroTable .' + c));
      return { bal: num(txt(d.querySelector('.stat-bal .val'))), jobs: num(txt(d.querySelector('.stat-jobs .val'))), pages: num(txt(d.querySelector('.stat-pages .val'))), tree: li('trees'), co2: li('co2'), since: dutchDay(li('since-date').replace(/^Since\s*/i, '')) };
    }
    async function loadHeld() {
      const d = await page(PG('UserReleaseJobs'));
      return $$('#jobs-table tr', d).filter((tr) => tr.querySelector('td.dateColumnValue')).map((tr) => {
        const a = tr.querySelector('a[href*="ReleaseStationJobs.cancel"]');
        return { t: when(cell(tr, 'dateColumnValue')), p: cell(tr, 'printerColumnValue'), doc: cell(tr, 'documentColumnValue'), pages: num(cell(tr, 'pagesColumnValue')), cost: num(cell(tr, 'costColumnValue')), cancel: a ? a.getAttribute('href') : '', busy: /cancel+ing/i.test(cell(tr, 'actionColumnValue')) };
      }).filter((j) => !j.busy);
    }
    async function loadLogs() {
      const d = await page(PG('UserPrintLogs'));
      return $$('table.results tr', d).filter((tr) => tr.querySelector('td.usageDateColumnValue')).map((tr) => {
        const pg = tr.querySelector('td.totalPagesColumnValue');
        const col = /Color:\s*(\d+)/i.exec(txt(pg));
        const at = txt(tr.querySelector('td.attributesColumnValue'));
        const st = tr.querySelector('td.statusColumnValue');
        return { t: when(cell(tr, 'usageDateColumnValue')), p: cell(tr, 'printerDisplayNameColumnValue'), pages: num((txt(pg).split(' ')[0])), color: col ? Number(col[1]) : 0, cost: num(cell(tr, 'usageCostColumnValue')), doc: cell(tr, 'documentNameColumnValue'), a3: /A3/.test(at), duplex: /Duplex:\s*Yes/i.test(at), st: txt(st && (st.querySelector('a') || st.querySelector('td + td') || st)), free: /Not Charged/i.test(txt(st)) };
      });
    }
    async function loadTrans() {
      const d = await page(PG('UserTransactions'));
      return $$('table.results tr', d).filter((tr) => tr.querySelector('td.transactionDateColumnValue')).map((tr) => ({
        t: when(cell(tr, 'transactionDateColumnValue')), by: cell(tr, 'transactedByColumnValue'), amt: num(cell(tr, 'amountColumnValue')), after: num(cell(tr, 'balanceColumnValue')), type: cell(tr, 'transTypeColumnValue'), note: cell(tr, 'commentColumnValue'),
      }));
    }
    // Web Print jobs you just sent and that are still being processed (not yet waiting at the printer)
    async function loadFresh() {
      const d = parse(await (await fetch(PG('UserWebPrint'), { credentials: 'include', cache: 'no-store' })).text());
      const rows = $$('img[id^="spinner-"]', d).map((img) => { const tr = img.closest('tr'); return { uid: img.id.slice(8), t: when(txt(tr.querySelector('td.submitTimeColumnValue'))), doc: txt(tr.querySelector('#document-name')) }; });
      const recent = rows.filter((r) => Date.now() - r.t < 30 * 60e3);
      const st = await Promise.all(recent.map((r) => jobStatus(r.uid).then((j) => Object.assign(r, { j }), () => null)));
      return st.filter((r) => r && r.j && r.j.status && r.j.status.code !== 'hold-release' && !(r.j.status.complete && !/error|fail|cancel/i.test(r.j.status.code)));
    }
    const jobStatus = (uid) => fetch(O + '/rpc/web-print/job-status/' + encodeURIComponent(uid) + '.json', { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } }).then((r) => r.json());

    const signIn = () => {
      const last = Number(ss.get('tm4-print-login')) || 0;
      if (Date.now() - last > 60e3) { ss.set('tm4-print-login', String(Date.now())); location.reload(); return true; }
      return false;
    };
    const failed = (e, my) => {
      if (my !== token) return;
      if (e && e.auth) { if (!signIn()) put(sec, empty('lock', 'Niet aangemeld bij KU Leuven Print', 'Meld je aan met je KU Leuven-account.', `<p style="margin-top:14px"><a class="btn" href="${esc(PG('UserSummary'))}">Aanmelden</a></p>`)); }
      else put(sec, empty('warn', 'KU Leuven Print reageert niet', 'Probeer het straks opnieuw.', `<p style="margin-top:14px"><a class="btn" href="${esc(ORIG)}">Open de website</a></p>`));
    };

    /* ---------- router: #/ home, #/nieuw print, #/historiek, #/opladen, #/overmaken, #/kaart */
    {
      const r = /^#\//.test(location.hash) ? location.hash : '#/';
      try { history.replaceState(null, '', PG('UserSummary') + r); } catch (_) {}
    }
    const route = () => {
      const h = location.hash.replace(/^#/, '') || '/';
      const [path, q] = h.split('?');
      return { name: path.split('/').filter(Boolean)[0] || 'home', q: new URLSearchParams(q || '') };
    };
    let depth = 0, token = 0;
    const nav = (hash) => { depth++; location.hash = hash; };
    const back = () => { if (depth > 0) { depth--; history.back(); } else location.replace(PG('UserSummary') + '#/'); };
    const backBtn = { label: 'Printen', href: '#/', act: 'pback' };
    const show = (anim) => {
      const my = ++token;
      const r = route();
      sec.classList.remove('push', 'pop');
      if (anim) { void sec.offsetWidth; sec.classList.add(anim); }
      W.scrollTo(0, 0);
      const v = { nieuw: viewNew, historiek: viewHist, opladen: viewTopup, overmaken: viewTransfer, kaart: viewCard }[r.name] || viewHome;
      v(my, r.q);
    };
    let lastLen = history.length;
    W.addEventListener('hashchange', () => { show(history.length > lastLen ? 'push' : 'pop'); lastLen = history.length; });

    /* ---------- home */
    const PRINTER = ico('printer');
    const pagesFor = (bal) => (bal == null ? '' : `Genoeg voor ${Math.floor(bal / 0.05 + 1e-6)} pagina's zwart-wit of ${Math.floor(bal / 0.15 + 1e-6)} in kleur`);
    function balCard(s, extra) {
      return `<div class="card pr-bal"><span class="pr-bal-l">Je printsaldo</span><b class="pr-bal-v">${s && s.bal != null ? esc(eur(s.bal)) : '<span class="sk" style="display:inline-block;width:110px;height:34px"></span>'}</b><span class="pr-bal-s">${esc(s ? pagesFor(s.bal) : '')}</span>${extra || ''}</div>`;
    }
    function jobCard(j) {
      return `<div class="card pr-job"><span class="pr-doc">${ico('doc')}</span><span class="pr-job-t"><b>${esc(j.doc || 'Document')}</b><span>${esc([j.pages != null ? pages(j.pages) : '', j.cost != null ? eur(j.cost) : '', prName(j.p)].filter(Boolean).join(' · '))}</span></span>${j.cancel ? `<button type="button" class="kr-del" data-act="pcancel" data-h="${esc(j.cancel)}" data-n="${esc(j.doc || '')}" aria-label="Uit de wachtrij halen">${ico('close')}</button>` : ''}</div>`;
    }
    function viewHome(my) {
      document.title = 'Printen';
      setNav({ title: 'Printen', back: { label: 'Meer', href: PORTAL + '?tm=meer', act: 'meer' } });
      const d = { sum: (store.get('print:sum') || {}).v, held: (store.get('print:held') || {}).v, logs: (store.get('print:logs') || {}).v, fresh: [] };
      const draw = () => {
        if (my !== token) return;
        let h = `<div class="lt"><h1>Printen</h1><p class="lt-sub">KU Leuven Print</p></div>`;
        h += balCard(d.sum, `<a class="pr-bal-go" href="#/opladen">${ico('plus')}Opladen</a>`);
        h += `<a class="pr-go" href="#/nieuw"><span class="pr-go-ic">${PRINTER}</span><span class="pr-go-t"><b>Document printen</b><span>PDF of Word van je iPhone naar elke KU Leuven-printer</span></span>${CHEV}</a>`;
        // just sent, still being prepared
        d.fresh.forEach((f) => {
          const err = /error|fail|cancel/i.test(f.j.status.code);
          h += `<div class="card pr-job${err ? ' err' : ' busy'}"><span class="pr-doc">${err ? ico('warn') : '<span class="spin"></span>'}</span><span class="pr-job-t"><b>${esc(f.j.documentName || f.doc)}</b><span>${esc(f.j.status.formatted || f.j.status.text || 'Bezig')}</span></span></div>`;
        });
        const held = d.held || [];
        h += `<div class="sh"><h2>Klaar om af te drukken</h2>${held.length ? `<span class="sh-note">${held.length}</span>` : ''}</div>`;
        if (d.held === undefined) h += skGroup(1);
        else if (!held.length) h += `<div class="card ko-empty">${PRINTER}<span>Niets in de wachtrij. Verstuur een document, dan wacht het hier tot je het afdrukt.</span></div>`;
        else {
          h += held.map(jobCard).join('');
          const tot = held.reduce((a, j) => a + (j.cost || 0), 0);
          if (d.sum && d.sum.bal != null && tot > d.sum.bal + 1e-6) h += `<p class="ko-hint err">${ico('warn')}<span>Samen kost dit ${esc(eur(tot))}, meer dan je saldo. <a href="#/opladen">Laad eerst op.</a></span></p>`;
          h += `<p class="ko-hint">${ico('info')}<span>Scan je studentenkaart aan eender welke KU Leuven-printer en kies je document. Je betaalt pas als het afgedrukt is.</span></p>`;
        }
        const logs = (d.logs || []).slice(0, 4);
        h += `<div class="sh"><h2>Recent</h2>${d.logs && d.logs.length ? '<a href="#/historiek">Alles</a>' : ''}</div>`;
        if (d.logs === undefined) h += skGroup(3);
        else if (!logs.length) h += `<div class="card ko-empty">${ico('clock')}<span>Je hebt nog niets afgedrukt.</span></div>`;
        else h += `<div class="group">${logs.map(logRow).join('')}</div>`;
        h += `<div class="gh">Meer</div><div class="group">`
          + row({ href: '#/historiek?t=saldo', iconHtml: `<span class="ic" style="--c:#34aadc">${ico('chart')}</span>`, title: 'Saldo en betalingen', sub: 'Wat je opgeladen en uitgegeven hebt' })
          + row({ href: '#/overmaken', iconHtml: `<span class="ic" style="--c:#5856d6">${ico('swap')}</span>`, title: 'Saldo doorgeven', sub: 'Aan een andere student' })
          + row({ href: '#/kaart', iconHtml: `<span class="ic" style="--c:#ff9500">${ico('idcard')}</span>`, title: 'Waardebon inwisselen', sub: 'Een code van een printkaart' })
          + row({ href: ORIG, iconHtml: `<span class="ic" style="--c:#8e8e93">${ico('globe')}</span>`, title: 'Originele website', external: true })
          + `</div>`;
        if (d.sum && d.sum.pages) h += `<p class="foot">${esc(nl(d.sum.pages, 0))} pagina's afgedrukt${d.sum.since ? ' sinds ' + esc(d.sum.since) : ''}${d.sum.tree ? ' · ' + esc(d.sum.tree.replace(/of a tree/i, 'van een boom').replace(/(\d)\.(\d)/, '$1,$2')) : ''}</p>`;
        put(sec, h);
        watchTitle(sec);
      };
      draw();
      const keep = (k, v) => store.set('print:' + k, { ts: Date.now(), v });
      loadSummary().then((v) => { d.sum = v; keep('sum', v); draw(); }, (e) => { if (!d.sum) failed(e, my); });
      loadHeld().then((v) => { d.held = v; keep('held', v); draw(); }, () => { if (d.held === undefined) { d.held = []; draw(); } });
      loadLogs().then((v) => { d.logs = v.slice(0, 30); keep('logs', d.logs); draw(); }, () => { if (d.logs === undefined) { d.logs = []; draw(); } });
      // jobs that are still being prepared: follow them until they wait at the printer
      const poll = (n) => loadFresh().then((f) => {
        if (my !== token) return;
        const was = d.fresh.length;
        d.fresh = f; draw();
        if (f.some((x) => !x.j.status.complete && !/error|fail/i.test(x.j.status.code)) && n < 40) setTimeout(() => poll(n + 1), 2500);
        else if (was) loadHeld().then((v) => { d.held = v; keep('held', v); draw(); }, () => {});
      }, () => {});
      poll(0);
    }
    function logRow(l) {
      const bad = l.st && !/^printed$/i.test(l.st);
      const st = /cancel/i.test(l.st) ? 'Geannuleerd' : /printed/i.test(l.st) ? '' : l.st;
      const sub = [whenTxt(l.t), l.pages != null ? pages(l.pages) + (l.color ? `, ${l.color} in kleur` : '') : '', l.free ? 'niet aangerekend' : eur(l.cost)].filter(Boolean).join(' · ');
      return row({ iconHtml: `<span class="ic" style="--c:${bad ? '#8e8e93' : '#1f6f8b'}">${ico('doc')}</span>`, title: l.doc || 'Document', sub, end: st ? `<span class="pr-st">${esc(st)}</span>` : '', cls: bad ? 'muted' : '' });
    }

    /* ---------- print a document */
    let FILES = [];
    const OPT = Object.assign({ col: 'bw', size: 'A4', sides: '2', copies: 1, printer: null }, store.get('print:opt') || {});
    const saveOpt = () => store.set('print:opt', { col: OPT.col, size: OPT.size, sides: OPT.sides, printer: OPT.printer });
    const ACCEPT = '.pdf,.doc,.docx,.docm,.dot,.dotx,.dotm,.rtf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf';
    // how many pages has a PDF? Good enough for a price estimate; PaperCut counts exactly after sending
    async function countPages(f) {
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return null;
      if (f.size > 40e6) return null;
      try {
        const s = new TextDecoder('latin1').decode(await f.arrayBuffer());
        let max = 0; const re = /\/Count\s+(\d+)/g; let m;
        while ((m = re.exec(s))) max = Math.max(max, Number(m[1]));
        const typ = (s.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
        return max || typ || null;
      } catch (_) { return null; }
    }
    function estimate() {
      if (!FILES.length || FILES.some((f) => f.pages == null)) return null;
      const sheets = FILES.reduce((a, f) => a + f.pages, 0) * OPT.copies;
      if (OPT.printer || OPT.size === 'A3') return { pages: sheets, cost: null };
      return { pages: sheets, cost: sheets * (OPT.col === 'col' ? 0.15 : 0.05) };
    }
    function viewNew(my) {
      document.title = 'Document printen';
      setNav({ title: 'Document printen', back: backBtn });
      const sum = (store.get('print:sum') || {}).v;
      const draw = () => {
        if (my !== token) return;
        if (OPT.size === 'A3') OPT.sides = '1';
        let h = `<div class="lt"><h1>Document printen</h1></div>`;
        if (!FILES.length) h += `<label class="pr-pick"><input type="file" multiple accept="${ACCEPT}" data-k="file">${ico('doc')}<b>Kies een bestand</b><span>PDF of Word, tot 55 MB. PDF geeft het mooiste resultaat.</span></label>`;
        else {
          h += `<div class="group">${FILES.map((f, i) => row({ iconHtml: `<span class="ic" style="--c:${/\.pdf$/i.test(f.file.name) ? '#e5484d' : '#0a84ff'}">${ico('doc')}</span>`, title: f.file.name, sub: [fsize(f.file.size), f.pages ? pages(f.pages) : f.pages === null ? '' : 'pagina\'s tellen…'].filter(Boolean).join(' · '), end: `<button type="button" class="pr-x" data-act="prm" data-i="${i}" aria-label="Weghalen">${ico('close')}</button>`, chevron: false })).join('')}</div>`;
          h += `<p class="fresh" style="margin-top:10px"><label class="pr-more"><input type="file" multiple accept="${ACCEPT}" data-k="file">+ Nog een bestand</label></p>`;
        }
        if (OPT.printer) {
          h += `<div class="gh">Printer</div><div class="group">${row({ act: 'pprinter', iconHtml: `<span class="ic">${PRINTER}</span>`, title: OPT.printer.loc || OPT.printer.p, sub: OPT.printer.p, end: '<span class="pr-st">Wijzig</span>' })}</div><p class="gf"><button type="button" data-act="pnoprinter">Terug naar Print Anywhere (elke printer)</button></p>`;
        } else {
          h += `<div class="gh">Kleur</div>${segHtml([{ id: 'bw', label: 'Zwart-wit' }, { id: 'col', label: 'Kleur' }], OPT.col, 'pcol')}`;
          h += `<div class="gh">Papier</div>${segHtml([{ id: 'A4', label: 'A4' }, { id: 'A3', label: 'A3' }], OPT.size, 'psize')}`;
          h += `<div class="gh">Zijden</div>${OPT.size === 'A3' ? `<p class="gf" style="margin-top:0">A3 drukt altijd enkelzijdig af.</p>` : segHtml([{ id: '2', label: 'Dubbelzijdig' }, { id: '1', label: 'Enkelzijdig' }], OPT.sides, 'psides')}`;
        }
        h += `<div class="gh">Aantal</div><div class="group plain"><div class="row pr-copies"><span class="main"><span class="t">Exemplaren</span></span><span class="pr-step"><button type="button" data-act="pcopy" data-d="-1" aria-label="Minder"${OPT.copies <= 1 ? ' disabled' : ''}>−</button><b>${OPT.copies}</b><button type="button" data-act="pcopy" data-d="1" aria-label="Meer">+</button></span></div></div>`;
        const est = estimate();
        let line = '';
        if (est) line = `${pages(est.pages)}${est.cost != null ? ` · ongeveer ${eur(est.cost)}` : ''}`;
        const low = est && est.cost != null && sum && sum.bal != null && est.cost > sum.bal + 1e-6;
        h += `<div class="pr-send">${line ? `<p class="pr-est">${esc(line)}${sum && sum.bal != null ? `<span>Je saldo: ${esc(eur(sum.bal))}</span>` : ''}</p>` : ''}${low ? `<p class="ko-hint err">${ico('warn')}<span>Je saldo is te laag voor dit document. <a href="#/opladen">Laad eerst op</a>, of verstuur het nu en laad op voor je afdrukt.</span></p>` : ''}
          <button type="button" class="btn pr-go-btn" data-act="psend"${FILES.length ? '' : ' disabled'}>${PRINTER}Versturen</button>
          <p class="kb-legal">${OPT.printer ? 'Je document gaat naar deze printer.' : 'Je document wacht tot je je studentenkaart scant aan eender welke KU Leuven-printer. Je betaalt pas bij het afdrukken (zwart-wit 5 cent per pagina, kleur 15 cent).'}</p>
          ${OPT.printer ? '' : `<p class="gf" style="margin:8px 0 0"><button type="button" data-act="pprinter">Een bepaalde printer kiezen</button></p>`}</div>`;
        put(sec, h);
        watchTitle(sec);
      };
      NEW.draw = draw;
      draw();
    }
    const NEW = { draw: () => {} };
    sec.addEventListener('change', (e) => {
      const inp = e.target.closest && e.target.closest('input[data-k="file"]');
      if (!inp || !inp.files || !inp.files.length) return;
      const add = Array.from(inp.files).filter((f) => f.size <= 55e6);
      if (add.length < inp.files.length) toast('Een bestand is groter dan 55 MB');
      add.forEach((file) => {
        const f = { file, pages: undefined };
        FILES.push(f);
        countPages(file).then((n) => { f.pages = n; NEW.draw(); });
      });
      inp.value = '';
      NEW.draw();
    });

    // PaperCut's Web Print wizard, step by step, the way its own pages post it
    function upload(url, files, onProgress) {
      return new Promise((resolve, reject) => {
        const fd = new FormData();
        files.forEach((f) => fd.append('file', f, f.name));
        const x = new XMLHttpRequest();
        x.open('POST', url);
        x.withCredentials = true;
        x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
        x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error('Uploaden lukte niet (' + x.status + ')')));
        x.onerror = () => reject(new Error('Geen verbinding'));
        x.send(fd);
      });
    }
    async function sendJob(onStep) {
      const pr = OPT.printer ? { s: OPT.printer.s, p: OPT.printer.p } : { s: PA, p: QUEUES[`${OPT.col}-${OPT.size}-${OPT.size === 'A3' ? '1' : OPT.sides}`] };
      onStep('Printer kiezen…');
      await page(O + '/app?service=action/1/UserWebPrint/0/$ActionLink');
      let d = await post({ service: 'direct/1/UserWebPrintSelectPrinter/$Form', sp: 'S0', Form0: '$Hidden,$Hidden$0,$TextField,$Submit,$RadioGroup,$Submit$0,$Submit$1', $Hidden: pr.s, $Hidden$0: pr.p });
      if (!d.querySelector('#copies-input')) throw new Error(msgOf(d) || 'Deze printer kon niet gekozen worden');
      // step 2 answers with the upload page; its upload address sits in a script, so read the raw page
      const r2 = await fetch(O + '/app', { method: 'POST', credentials: 'include', body: new URLSearchParams({ service: 'direct/1/UserWebPrintOptionsAndAccountSelection/$Form', sp: 'S0', Form0: 'copies,$Submit,$Submit$0', copies: String(OPT.copies), $Submit: '3. Upload Documents »' }) });
      const raw = await r2.text();
      const up = (/uploadFormSubmitURL\s*=\s*'([^']+)'/.exec(raw) || [])[1];
      if (!up) throw new Error(msgOf(parse(raw)) || 'Uploaden kon niet starten');
      await upload(O + up, FILES.map((f) => f.file), (p) => onStep(`Uploaden… ${Math.round(p * 100)}%`));
      onStep('Verwerken…');
      const r = await fetch(O + '/app', { method: 'POST', credentials: 'include', body: new URLSearchParams({ service: 'direct/1/UserWebPrintUpload/$Form$0', sp: 'S1', Form1: '' }) });
      const done = parse(await r.text());
      const names = FILES.map((f) => f.file.name);
      const uids = $$('img[id^="spinner-"]', done).map((img) => ({ uid: img.id.slice(8), doc: txt(img.closest('tr').querySelector('#document-name')) })).filter((x) => names.includes(x.doc) || !names.length);
      const want = uids.slice(0, names.length);
      if (!want.length) { const m = msgOf(done); if (m && !/success/i.test(m)) throw new Error(m); }
      // follow PaperCut until the documents wait at the printer (or a minute has passed)
      const res = [];
      for (const w of want) {
        let j = null;
        for (let i = 0; i < 30; i++) {
          try { j = await jobStatus(w.uid); } catch (_) {}
          if (j && j.status && (j.status.code === 'hold-release' || j.status.complete)) break;
          await new Promise((ok) => setTimeout(ok, 2000));
        }
        res.push(j || { documentName: w.doc });
      }
      return res;
    }
    let sending = false;
    async function doSend(b) {
      if (sending || !FILES.length) return;
      sending = true;
      b.disabled = true;
      const set = (t) => { b.innerHTML = `<span class="spin"></span>${esc(t)}`; };
      try {
        const res = await sendJob(set);
        const bad = res.filter((j) => j.status && /error|fail|cancel/i.test(j.status.code));
        const pg = res.reduce((a, j) => a + (Number(j.pages) || 0), 0);
        const cost = res.reduce((a, j) => a + (num(j.cost) || 0), 0);
        FILES = [];
        store.del('print:held');
        const { layer, close } = openLayer(`<div class="sg upd-c">
          <span class="upd-ok${bad.length ? ' warn' : ''}">${ico(bad.length ? 'warn' : 'check')}</span>
          <h2>${bad.length ? 'Er liep iets mis' : OPT.printer ? 'Verstuurd naar de printer' : 'Klaar om af te drukken'}</h2>
          ${pg ? `<p class="upd-v">${esc(pages(pg))}${cost ? ` · ${esc(eur(cost))}` : ''}</p>` : '<p class="upd-v"></p>'}
          ${bad.length ? `<div class="kci-msg">${bad.map((j) => `<p><b>${esc(j.documentName || '')}</b>: ${esc(j.status.formatted || j.status.text || '')}</p>`).join('')}</div>` : OPT.printer ? '' : `<div class="kci-msg"><p>Ga naar eender welke KU Leuven-printer, scan je studentenkaart en kies je document. Je document blijft een tijdje bewaard.</p></div>`}
          <button type="button" class="btn upd-go">Klaar</button></div>`, 'upd-layer', 'Verstuurd');
        layer.querySelector('.upd-go').addEventListener('click', () => { close(); depth = Math.max(0, depth - 1); location.replace(PG('UserSummary') + '#/'); });
      } catch (err) {
        if (err && err.auth) { toast('Je bent afgemeld. Even opnieuw aanmelden…'); setTimeout(() => signIn(), 900); }
        else sheet({ title: 'Versturen lukte niet', msg: (err && err.message) || 'Probeer het opnieuw.', actions: [{ label: 'Opnieuw proberen', run: () => doSend(b) }] });
        b.disabled = false; b.innerHTML = `${PRINTER}Versturen`;
      } finally { sending = false; }
    }
    // other printers (PaperCut's list, two pages of 25): rarely needed, so behind a link
    async function loadPrinters() {
      const c = store.get('print:printers2');
      if (c && Date.now() - c.ts < 7 * 864e5 && c.v.length) return c.v;
      const out = [];
      const grab = (d) => $$('table.results tr', d).forEach((tr) => {
        const lab = tr.querySelector('label'), loc = tr.querySelector('.locationColumnValue');
        if (!lab) return;
        const full = txt(lab).replace(/\s*\(virtual\)\s*$/i, '');
        const [s, p] = full.split('\\');
        if (p && !out.some((x) => x.s === s && x.p === p)) out.push({ s, p, loc: txt(loc) });
      });
      // PaperCut remembers the last table page you looked at: ask for each page by number
      await page(O + '/app?service=action/1/UserWebPrint/0/$ActionLink');
      for (let n = 1; n < 10; n++) {
        const before = out.length;
        grab(await page(O + '/app?service=direct/1/UserWebPrintSelectPrinter/table.tablePages.linkPage&sp=AUserWebPrintSelectPrinter%2Ftable.tableView&sp=' + n));
        if (out.length === before) break;
      }
      out.sort((a, b) => (a.loc || a.p).localeCompare(b.loc || b.p));
      store.set('print:printers2', { ts: Date.now(), v: out });
      return out;
    }
    function printerSheet() {
      const layer = document.createElement('div');
      layer.setAttribute('data-tm4', '');
      layer.innerHTML = '<div class="scrim"></div><div class="kb" role="dialog" aria-modal="true"><div class="kb-grab"></div><div class="kb-in"><div class="kw-h"><b>Kies een printer</b></div><input type="search" class="pr-q" placeholder="Zoek op gebouw of lokaal" autocomplete="off"><div class="pr-list"><div class="spin" style="margin:20px auto"></div></div></div></div>';
      document.body.appendChild(layer);
      const scrim = layer.querySelector('.scrim'), kb = layer.querySelector('.kb'), list = layer.querySelector('.pr-list'), q = layer.querySelector('.pr-q');
      const close = () => { scrim.classList.remove('on'); kb.classList.remove('on'); setTimeout(() => layer.remove(), 320); };
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); kb.classList.add('on'); }));
      scrim.addEventListener('click', close);
      let all = [];
      const draw = () => {
        const f = fold(q.value);
        const hit = all.filter((x) => !isPA(x.p) && (!f || fold(x.loc + ' ' + x.p).includes(f)));
        put(list, hit.length ? `<div class="group">${hit.map((x, i) => row({ act: 'pick', attrs: ` data-i="${all.indexOf(x)}"`, title: x.loc || x.p, sub: x.p, chevron: false })).join('')}</div>` : '<p class="fresh">Geen printer gevonden.</p>');
      };
      loadPrinters().then((v) => { all = v; draw(); }, () => put(list, '<p class="fresh">De printers konden niet geladen worden.</p>'));
      q.addEventListener('input', draw);
      kb.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act="pick"]');
        if (!b) return;
        OPT.printer = all[Number(b.dataset.i)];
        saveOpt(); close(); NEW.draw();
      });
    }

    /* ---------- history */
    function viewHist(my, q) {
      const tab = q.get('t') === 'saldo' ? 'saldo' : 'print';
      document.title = 'Geschiedenis';
      setNav({ title: 'Geschiedenis', back: backBtn });
      const d = { logs: (store.get('print:logs') || {}).v, trans: (store.get('print:trans') || {}).v };
      const draw = () => {
        if (my !== token) return;
        let h = `<div class="lt"><h1>Geschiedenis</h1></div>${segHtml([{ id: 'print', label: 'Afdrukken' }, { id: 'saldo', label: 'Saldo' }], tab, 'phist')}`;
        if (tab === 'print') {
          if (d.logs === undefined) h += skGroup(6);
          else if (!d.logs.length) h += empty('doc', 'Nog niets afgedrukt', '');
          else h += groupByDay(d.logs, logRow);
        } else {
          if (d.trans === undefined) h += skGroup(6);
          else if (!d.trans.length) h += empty('chart', 'Nog geen betalingen', '');
          else h += groupByDay(d.trans, transRow);
        }
        put(sec, h);
        watchTitle(sec);
      };
      draw();
      if (tab === 'print') loadLogs().then((v) => { d.logs = v; store.set('print:logs', { ts: Date.now(), v: v.slice(0, 30) }); draw(); }, (e) => { if (!d.logs) failed(e, my); });
      else loadTrans().then((v) => { d.trans = v; store.set('print:trans', { ts: Date.now(), v: v.slice(0, 30) }); draw(); }, (e) => { if (!d.trans) failed(e, my); });
    }
    function groupByDay(items, fn) {
      let h = '', cur = '', buf = '';
      const flush = () => { if (buf) h += `<div class="group">${buf}</div>`; buf = ''; };
      items.forEach((it) => {
        const k = it.t ? ymd(it.t) : '';
        if (k !== cur) { flush(); cur = k; const n = it.t ? dayDiff(it.t, Date.now()) : 0; h += `<div class="gh">${esc(!it.t ? '' : n === 0 ? 'Vandaag' : n === -1 ? 'Gisteren' : cap(dLong(it.t)))}</div>`; }
        buf += fn(it);
      });
      flush();
      return h;
    }
    function transRow(t) {
      const up = (t.amt || 0) > 0;
      const kind = /print|printer usage/i.test(t.type + t.by) ? 'Afgedrukt' : /top.?up/i.test(t.note) ? 'Opgeladen' : /transfer/i.test(t.type + t.note) ? (up ? 'Ontvangen' : 'Doorgegeven') : /card|voucher/i.test(t.type) ? 'Waardebon' : up ? 'Bijgeschreven' : t.type || 'Aanpassing';
      return row({ iconHtml: `<span class="ic" style="--c:${up ? '#2fb36b' : '#8e8e93'}">${ico(up ? 'plus' : 'doc')}</span>`, title: kind, sub: `${hhmm(t.t)}${t.after != null ? ' · saldo daarna ' + eur(t.after) : ''}`, end: `<span class="pr-amt${up ? ' up' : ''}">${esc((up ? '+ ' : '') + eur(t.amt))}</span>`, chevron: false });
    }

    /* ---------- top up: KU Leuven's own payment page does the paying */
    const AMOUNTS = [2, 5, 10, 25];
    function viewTopup(my) {
      document.title = 'Opladen';
      setNav({ title: 'Opladen', back: backBtn });
      let amt = Number(ss.get('tm4-print-amt')) || 5;
      const sum = (store.get('print:sum') || {}).v;
      const draw = () => {
        if (my !== token) return;
        put(sec, `<div class="lt"><h1>Opladen</h1></div>${balCard(sum)}
          <div class="gh">Bedrag</div><div class="pr-amts">${AMOUNTS.map((a) => `<button type="button" class="pr-amt-b${a === amt ? ' on' : ''}" data-act="pamt" data-v="${a}"><b>€ ${a}</b><span>${a * 20} pagina's</span></button>`).join('')}</div>
          <div class="pr-send"><button type="button" class="btn pr-go-btn" data-act="ppay">Betaal € ${amt}</button>
          <p class="kb-legal">Je betaalt op de betaalpagina van KU Leuven met Bancontact, Visa, Mastercard of Maestro. Zwart-wit kost 5 cent per pagina, kleur 15 cent. Het saldo werkt op alle KU Leuven-campussen.</p></div>`);
        watchTitle(sec);
      };
      TOP_UP.set = (v) => { amt = v; ss.set('tm4-print-amt', String(v)); draw(); };
      TOP_UP.go = () => { goTo(O + '/topup/nl?tm=pay&amount=' + amt); };
      draw();
    }
    const TOP_UP = { set() {}, go() {} };

    /* ---------- transfer credit / redeem a voucher: PaperCut's own forms, posted from here */
    function formView(my, o) {
      document.title = o.title;
      setNav({ title: o.title, back: backBtn });
      const sum = (store.get('print:sum') || {}).v;
      put(sec, `<div class="lt"><h1>${esc(o.title)}</h1></div>${o.bal ? balCard(sum) : ''}<form class="pr-form" data-k="${o.k}" novalidate>${o.fields.map((f) => `<label class="pr-f"><span>${esc(f.label)}</span><input name="${f.name}" ${f.attrs || ''} placeholder="${esc(f.ph || '')}"></label>`).join('')}
        <p class="ko-hint err" data-k="err" hidden></p><button type="submit" class="btn pr-go-btn">${esc(o.button)}</button><p class="kb-legal">${esc(o.note)}</p></form>`);
      watchTitle(sec);
    }
    const viewTransfer = (my) => formView(my, { k: 'transfer', title: 'Saldo doorgeven', bal: true, button: 'Doorgeven', note: 'Het bedrag gaat meteen van jouw saldo naar dat van de andere persoon. Dit kan je niet ongedaan maken.', fields: [
      { name: 'amount', label: 'Bedrag in euro', attrs: 'inputmode="decimal" autocomplete="off"', ph: '2,00' },
      { name: 'to', label: 'Aan (r-nummer of u-nummer)', attrs: 'autocapitalize="none" autocomplete="off" spellcheck="false"', ph: 'r0123456' },
      { name: 'note', label: 'Bericht (mag leeg)', attrs: 'autocomplete="off"', ph: 'Voor de cursus' },
    ] });
    const viewCard = (my) => formView(my, { k: 'card', title: 'Waardebon inwisselen', button: 'Inwisselen', note: 'Typ de code van je printkaart of waardebon. Het bedrag komt meteen bij je saldo.', fields: [
      { name: 'code', label: 'Code', attrs: 'autocapitalize="characters" autocomplete="off" spellcheck="false"', ph: '' },
    ] });
    async function submitForm(form) {
      const k = form.dataset.k;
      const v = Object.fromEntries(new FormData(form));
      const err = form.querySelector('[data-k="err"]');
      const fail = (m) => { err.hidden = false; err.innerHTML = `${ico('warn')}<span>${esc(m)}</span>`; };
      err.hidden = true;
      const btn = form.querySelector('button[type="submit"]');
      const label = btn.textContent;
      const run = async () => {
        btn.disabled = true; btn.innerHTML = `<span class="spin"></span>${esc(label)}…`;
        try {
          const name = k === 'transfer' ? 'UserTransfer' : 'UserTopUpCards';
          const d = await page(PG(name));
          const f = d.querySelector('#main form');
          if (!f) throw new Error('Dit formulier is nu niet beschikbaar');
          const body = new URLSearchParams();
          $$('input[type="hidden"]', f).forEach((i) => body.append(i.name, i.value));
          if (k === 'transfer') { body.set('inputAmount', v.amount); body.set('inputToUsername', v.to); body.set('inputComment', v.note || ''); body.set('$Submit', 'Transfer'); }
          else { body.set('$TextField', v.code); body.set('$Submit', 'Redeem Card'); }
          const res = await page(O + '/app', { method: 'POST', body });
          const m = msgOf(res);
          const bad = res.querySelector('.errorMessage, .error-message') || (m && !/success|credited|transferred|gelukt|geslaagd/i.test(m));
          if (bad) throw new Error(m || 'Dat lukte niet');
          store.del('print:sum');
          toast(k === 'transfer' ? 'Saldo doorgegeven' : 'Waardebon ingewisseld');
          location.replace(PG('UserSummary') + '#/');
        } catch (e) {
          if (e && e.auth) { signIn(); return; }
          fail((e && e.message) || 'Dat lukte niet');
          btn.disabled = false; btn.textContent = label;
        }
      };
      if (k === 'transfer') {
        const a = num(v.amount), to = String(v.to || '').trim();
        if (!a || a <= 0) return fail('Vul een bedrag in.');
        if (!/^[a-z]\d{7}$/i.test(to)) return fail('Vul een r-nummer of u-nummer in, bijvoorbeeld r0123456.');
        v.amount = a.toFixed(2); v.to = to.toLowerCase();
        sheet({ title: `${eur(a)} doorgeven aan ${v.to}?`, msg: 'Dit kan je niet ongedaan maken.', actions: [{ label: 'Doorgeven', run }] });
      } else {
        if (!String(v.code || '').trim()) return fail('Vul de code in.');
        v.code = String(v.code).trim();
        run();
      }
    }
    sec.addEventListener('submit', (e) => { const f = e.target.closest('form.pr-form'); if (f) { e.preventDefault(); submitForm(f); } });

    /* ---------- taps */
    W.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('#tm-tabs a');
      if (t) { e.preventDefault(); goTo(t.getAttribute('href'), { dir: 'back' }); return; }
      const a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (a) { e.preventDefault(); nav(a.getAttribute('href')); return; }
      const b = e.target.closest && e.target.closest('[data-act]');
      if (!b || b.closest('.kb')) return;
      const act = b.dataset.act;
      if (act === 'pback') { e.preventDefault(); back(); }
      else if (act === 'meer') { e.preventDefault(); goTo(PORTAL + '?tm=meer', { dir: 'back' }); }
      else if (act === 'pcol' || act === 'psize' || act === 'psides') { e.preventDefault(); OPT[{ pcol: 'col', psize: 'size', psides: 'sides' }[act]] = b.dataset.id; saveOpt(); NEW.draw(); }
      else if (act === 'pcopy') { e.preventDefault(); OPT.copies = Math.max(1, Math.min(99, OPT.copies + Number(b.dataset.d))); NEW.draw(); }
      else if (act === 'prm') { e.preventDefault(); FILES.splice(Number(b.dataset.i), 1); NEW.draw(); }
      else if (act === 'pprinter') { e.preventDefault(); printerSheet(); }
      else if (act === 'pnoprinter') { e.preventDefault(); OPT.printer = null; saveOpt(); NEW.draw(); }
      else if (act === 'psend') { e.preventDefault(); doSend(b); }
      else if (act === 'phist') { e.preventDefault(); location.replace(PG('UserSummary') + '#/historiek' + (b.dataset.id === 'saldo' ? '?t=saldo' : '')); }
      else if (act === 'pamt') { e.preventDefault(); TOP_UP.set(Number(b.dataset.v)); }
      else if (act === 'ppay') { e.preventDefault(); TOP_UP.go(); }
      else if (act === 'pcancel') {
        e.preventDefault();
        const href = b.dataset.h;
        sheet({ title: 'Uit de wachtrij halen?', msg: b.dataset.n, actions: [{ label: 'Uit de wachtrij halen', red: true, run: () => {
          page(O + href).then(() => { toast('Uit de wachtrij gehaald'); store.del('print:held'); show(); }, (err) => toast((err && err.message) || 'Dat lukte niet'));
        } }] });
      }
    });
    pullRefresh(() => { ['sum', 'held', 'logs', 'trans'].forEach((k) => store.del('print:' + k)); show(); return new Promise((r) => setTimeout(r, 900)); });
    show();
  }

  // print.kuleuven.be/topup: KU Leuven's payment page. From the app (?tm=pay&amount=5) it picks the amount and goes
  // straight on to paying; anywhere else on a phone it gets a button back to the app.
  function topupPage() {
    const amt = params.get('amount');
    const ready = (fn) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());
    if (params.get('tm') === 'pay' && /^(2|5|10|25)$/.test(amt || '')) {
      const last = Number(ss.get('tm4-topup')) || 0;
      if (Date.now() - last > 90e3) {
        ready(() => setTimeout(() => {
          const r = document.querySelector('input[name="amount"][value="' + amt + '"]');
          const f = r && r.form;
          if (!f) return;
          ss.set('tm4-topup', String(Date.now()));
          r.checked = true;
          const st = document.createElement('style');
          st.textContent = 'body>*{visibility:hidden}body::after{content:"Naar betalen…";position:fixed;inset:0;display:grid;place-items:center;font:600 17px -apple-system,system-ui,sans-serif;color:#66777e;background:#eef3f5}';
          document.head.appendChild(st);
          const btn = f.querySelector('button[type="submit"], input[type="submit"]');
          if (btn) btn.click(); else f.submit();
        }, 250));
        return;
      }
    }
    ready(() => {
      if (!document.body) return;
      const a = document.createElement('a');
      a.href = location.origin + '/app?service=page/UserSummary#/';
      a.textContent = '‹ Terug naar Printen';
      a.setAttribute('style', 'position:fixed;z-index:99999;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));padding:10px 16px;border-radius:20px;background:#1f6f8b;color:#fff;font:600 15px -apple-system,system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.2)');
      document.body.appendChild(a);
    });
  }

