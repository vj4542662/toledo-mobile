  /* ================================================================== Attesten (KU Loket "Selfservice attesten", zr_0202)
     KU Loket never hands out the PDF itself: asking for an attest makes it mail the PDF straight to your student
     mailbox. So the app lists what you can ask for, and one tap ("Mail naar mij") does what KU Loket's form does:
     a MERGE of that AttestationRequestSet entry (with the English flag). Opened from Meer as LOKET?tm=attest. */
  const ATT_SRV = `${LOKET_ORIGIN}/sap/opu/odata/sap/ZC_ST_ATTESTEN_SRV`;
  // the order and a plain-language line for the ones we know; anything new KU Loket adds still shows up at the end
  const ATT_KNOWN = {
    'Insch_bewijs': ['Inschrijvingsbewijs', 'Voor je kotbaas, de gemeente of je werk'],
    'Insch_bewijs_stp': ['Inschrijvingsbewijs met studiepunten', 'Met je studiepunten, zodra je ISP is goedgekeurd'],
    'NMBS': ['Attest voor NMBS', 'Voor een schoolabonnement of Campus Pass'],
    'Betalingsbewijs': ['Betalingsbewijs', 'Bewijs dat je studiegeld betaald is'],
    'Attest Vlaams Opleidingsverlof': ['Vlaams opleidingsverlof', 'Voor je werkgever, als je werkt en studeert'],
    'Studiecurriculum': ['Studiecurriculum', 'Je inschrijvingen aan KU Leuven op een rij'],
    'Transcript': ['Transcript', 'Al je examenresultaten'],
    'Creditbewijs': ['Creditbewijs', 'De vakken waarvoor je geslaagd bent'],
    'Diplomagetuigschrift': ['Diplomagetuigschrift', 'Bewijs dat je je diploma behaald hebt'],
  };
  const ATT_ORDER = Object.keys(ATT_KNOWN);

  function attestPage() {
    takeover('Attesten', []);
    const meer = PORTAL + '?tm=meer';
    buildShell([
      { id: 'vandaag', label: 'Vandaag', icon: 'house', href: PORTAL + '?tm=vandaag' },
      { id: 'vakken', label: 'Vakken', icon: 'book', href: PORTAL + '?tm=vakken' },
      { id: 'rooster', label: 'Rooster', icon: 'calendar', href: PORTAL + '?tm=rooster' },
      { id: 'updates', label: 'Updates', icon: 'bell', href: PORTAL + '?tm=updates' },
      { id: 'meer', label: 'Meer', icon: 'grid', href: meer },
    ], 'meer');
    setNav({ back: { label: 'Meer', act: 'back', href: meer }, title: 'Attesten' });
    if (params.get('ma')) store.set('mailApp', params.get('ma') === 'web' ? 'web' : 'app');
    const orig = `${LOKET}?tm=orig#zr_0202-display`;
    const main = $('#tm-main');
    const sec = document.createElement('section');
    sec.className = 'view on';
    sec.setAttribute('data-tm4', '');
    main.appendChild(sec);
    watchTitle(sec);

    const yrTxt = (y) => (/^\d{4}$/.test(y) && y !== '0000' ? `${y}–${Number(y) + 1}` : '');
    const progTxt = (p) => String(p || '').trim().replace(/\s*\((Leuven|Brussel|Gent|Kortrijk|Antwerpen|Brugge|Geel|Diepenbeek|Aalst|Sint-Katelijne-Waver)\)$/, '');
    const plain = (html) => { const d = document.createElement('div'); d.innerHTML = sanitize(html); return d.textContent.replace(/^\s*ℹ️?\s*/, '').replace(/\s+/g, ' ').trim(); };
    const sentKey = (o) => `att:sent:${o.kind}|${o.prog}|${o.yr}`;
    const dayTxt = (ts) => { const d = new Date(ts), t = new Date(); const diff = Math.round((new Date(t.toDateString()) - new Date(d.toDateString())) / 864e5); return diff === 0 ? 'vandaag' : diff === 1 ? 'gisteren' : `${d.getDate()}/${d.getMonth() + 1}`; };

    // every entry KU Loket offers -> one row per kind of attest, its years/programmes as choices inside
    function groupsOf(list) {
      const seen = new Set();
      const kinds = {};
      list.forEach((x) => {
        const o = { id: String(x.attestRequestId), type: String(x.attestationType || ''), kind: String(x.attestationKind || '').trim(), desc: String(x.attestationDescription || '').trim(),
          info: String(x.attestationLongText || ''), yr: String(x.academicYear || ''), prog: String(x.programme || ''), progT: progTxt(x.programmeDescription), en: !!x.translationVisible, raw: x };
        const k = `${o.kind}|${o.yr}|${o.prog}`;
        if (!o.kind || seen.has(k)) return; // KU Loket sometimes lists the same transcript twice
        seen.add(k);
        (kinds[o.kind] = kinds[o.kind] || []).push(o);
      });
      const out = Object.keys(kinds).map((kind) => {
        const opts = kinds[kind].sort((a, b) => b.yr.localeCompare(a.yr) || b.prog.localeCompare(a.prog));
        const known = ATT_KNOWN[kind];
        const title = known ? known[0] : opts[0].desc || kind;
        // KU Loket's text often starts by repeating the name ("Inschrijvingsbewijs. Dit kan je ...")
        const info = plain((opts.find((o) => o.info) || {}).info).replace(new RegExp('^(' + [opts[0].desc, title].filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\.\\s*', 'i'), '');
        return { kind, type: opts[0].type, title, hint: known ? known[1] : '', info: info ? info[0].toUpperCase() + info.slice(1) : '', opts };
      });
      const pos = (g) => { const i = ATT_ORDER.indexOf(g.kind); return i < 0 ? 99 : i; };
      out.sort((a, b) => pos(a) - pos(b) || a.title.localeCompare(b.title));
      return out;
    }

    let GROUPS = [];
    function draw(list) {
      GROUPS = groupsOf(list);
      let h = `<div class="lt"><h1>Attesten</h1><p class="lt-sub">KU Loket mailt het attest meteen als pdf naar je studentenmail.</p></div>`;
      if (!GROUPS.length) { put(sec, h + empty('cert', 'Geen attesten', 'KU Loket biedt je nu geen attesten aan.', `<p style="margin-top:14px"><a class="btn" href="${esc(orig)}">Open in KU Loket</a></p>`)); return; }
      const section = (name, gs) => (gs.length ? `<div class="gh">${esc(name)}</div><div class="group">${gs.map((g) => {
        const last = g.opts.map((o) => store.get(sentKey(o))).filter(Boolean).sort((a, b) => b - a)[0];
        const sub = last ? `Gemaild ${dayTxt(last)}` : g.hint || (g.opts.length === 1 ? [yrTxt(g.opts[0].yr), g.opts[0].progT].filter(Boolean).join(' · ') : '');
        return row({ act: 'att', attrs: ` data-k="${esc(g.kind)}"`, iconHtml: `<span class="ic" style="--c:#8e5bd6">${ico('cert')}</span>`, title: g.title, sub });
      }).join('')}</div>` : '');
      h += section('Inschrijving', GROUPS.filter((g) => g.type !== '2'));
      h += section('Resultaten en diploma’s', GROUPS.filter((g) => g.type === '2'));
      h += `<p class="fresh">Komt er geen mail? Kijk ook bij ongewenste e-mail.<br><a href="${esc(orig)}">Open in KU Loket</a></p>`;
      put(sec, h);
    }

    // the sheet for one attest: pick the year/programme (newest first, already chosen) and the language, then send
    function open(g) {
      let pick = 0, en = false, all = g.opts.length <= 3;
      const opt = () => g.opts[pick];
      const optLabel = (o) => [yrTxt(o.yr), o.progT].filter(Boolean).join(' · ') || 'Algemeen';
      const body = () => {
        let h = `<div class="at-hd"><span class="ic" style="--c:#8e5bd6">${ico('cert')}</span><b>${esc(g.title)}</b>${g.info ? `<p>${esc(g.info)}</p>` : ''}</div>`;
        if (g.opts.length > 1) h += `<div class="at-l">${/\d/.test(g.opts.map((o) => yrTxt(o.yr)).join('')) ? 'Academiejaar' : 'Opleiding'}</div><div class="at-opts">${g.opts.slice(0, all ? 99 : 2).map((o, i) => `<button type="button" class="at-o${i === pick ? ' on' : ''}" data-o="${i}"><span><b>${esc(yrTxt(o.yr) || o.progT || 'Algemeen')}</b>${yrTxt(o.yr) && o.progT ? `<small>${esc(o.progT)}</small>` : ''}</span>${i === pick ? ico('check') : ''}</button>`).join('')}${all ? '' : `<button type="button" class="at-o at-more" data-all="1"><span>Oudere jaren (${g.opts.length - 2})</span>${ico('more')}</button>`}</div>`;
        else h += `<p class="at-one">${esc(optLabel(opt()))}</p>`;
        if (opt().en) h += `<div class="at-l">Taal</div><div class="at-seg"><button type="button" data-en="0"${en ? '' : ' class="on"'}>Nederlands</button><button type="button" data-en="1"${en ? ' class="on"' : ''}>Engels</button></div>`;
        h += `<button type="button" class="btn at-go">${ico('mail')}Mail naar mij</button><p class="at-note">Je krijgt het als pdf in je studentenmail.</p>`;
        return h;
      };
      const { sh, close } = openLayer(`<div class="sg at-sh"></div><div class="sg"><button type="button" class="sa bold" data-x="1">Annuleer</button></div>`, '', g.title);
      const box = sh.querySelector('.at-sh');
      put(box, body());
      let busy = false;
      sh.addEventListener('click', (e) => {
        const t = e.target.closest('button');
        if (!t || busy) return;
        if (t.dataset.x) { close(); return; }
        if (t.dataset.all) { all = true; put(box, body()); return; }
        if (t.dataset.o) { pick = Number(t.dataset.o) || 0; if (!opt().en) en = false; put(box, body()); return; }
        if (t.dataset.en) { en = t.dataset.en === '1'; put(box, body()); return; }
        if (t.dataset.mail) { close(); mailOpen(); return; }
        if (t.classList.contains('at-go')) {
          busy = true;
          t.disabled = true;
          t.innerHTML = '<span class="spin"></span>Versturen…';
          send(opt(), en).then(() => {
            busy = false;
            store.set(sentKey(opt()), Date.now());
            put(box, `<div class="at-ok">${ico('check')}<b>Verstuurd</b><p>${esc(g.title)}${optLabel(opt()) !== 'Algemeen' ? ' (' + esc(optLabel(opt())) + ')' : ''} komt binnen enkele minuten in je studentenmail.</p><button type="button" class="btn" data-mail="1">${ico('mail')}Open mail</button></div>`);
            sh.querySelector('[data-x]').textContent = 'Klaar';
            draw(LIST);
          }, (err) => {
            busy = false;
            put(box, body());
            const p = document.createElement('p');
            p.className = 'at-err';
            p.textContent = err && err.auth ? 'Je bent afgemeld bij KU Loket. Sluit dit en tik op "Aanmelden".' : `Versturen lukte niet${err && err.msg ? ': ' + err.msg : ''}. Probeer het opnieuw.`;
            box.insertBefore(p, box.querySelector('.at-go'));
            if (err && err.auth) signedOut();
          });
        }
      });
    }

    // what KU Loket's own form does on "Verzenden": update that entry (fresh CSRF token first)
    async function send(o, en) {
      const tk = await fetch(`${ATT_SRV}/?sap-client=200`, { method: 'HEAD', credentials: 'include', headers: { 'X-CSRF-Token': 'Fetch' } });
      const token = tk.headers.get('x-csrf-token');
      if (!token || /required/i.test(token)) { const e = new Error('csrf'); e.auth = tk.status === 401 || /html/.test(tk.headers.get('content-type') || ''); throw e; }
      const body = Object.assign({}, o.raw, { translation: !!en });
      delete body.__metadata;
      const r = await fetch(`${ATT_SRV}/AttestationRequestSet('${encodeURIComponent(o.id)}')?sap-client=200`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-HTTP-Method': 'MERGE', 'X-CSRF-Token': token, 'Content-Type': 'application/json', Accept: 'application/json', 'sap-language': 'NL' },
        body: JSON.stringify(body),
      });
      if (r.ok) return;
      let msg = '';
      try { const j = await r.json(); msg = ((j.error || {}).message || {}).value || ''; } catch (_) {}
      const e = new Error(msg || 'HTTP ' + r.status);
      e.msg = msg.slice(0, 140);
      e.auth = r.status === 401;
      throw e;
    }

    // the mail app the person picked in Toledo Mobile (passed along from Meer, this is another site)
    function mailOpen() {
      if (store.get('mailApp') === 'web') { goTo(MAIL); return; }
      location.href = 'ms-outlook://emails';
    }

    function signedOut() {
      put(sec, `<div class="lt"><h1>Attesten</h1></div>${empty('lock', 'Aanmelden bij KU Loket', 'Je KU Loket-sessie is verlopen.', `<p style="margin-top:14px"><button type="button" class="btn" data-act="attlogin">Aanmelden</button></p><p class="fresh"><a href="${esc(orig)}">Open in KU Loket</a></p>`)}`);
    }

    let LIST = [];
    const KEY = 'att:list';
    const cached = store.get(KEY);
    if (cached && cached.v) { LIST = cached.v; draw(LIST); } else put(sec, `<div class="lt"><h1>Attesten</h1><p class="lt-sub">KU Loket mailt het attest meteen als pdf naar je studentenmail.</p></div><div class="gh">Inschrijving</div>${skGroup(4)}`);
    api(`${ATT_SRV}/AttestationRequestSet?$format=json&sap-client=200&sap-language=NL`).then((j) => {
      LIST = ((j && j.d && j.d.results) || []).map((x) => { const y = Object.assign({}, x); return y; });
      store.set(KEY, { ts: Date.now(), v: LIST });
      ss.del('tm4-att-pass');
      draw(LIST);
    }, (e) => {
      if (e && e.auth) { signedOut(); return; }
      if (cached && cached.v) return;
      put(sec, `<div class="lt"><h1>Attesten</h1></div>${empty('warn', 'Attesten konden niet geladen worden', 'KU Loket reageert nu niet. Probeer het zo opnieuw.', `<p style="margin-top:14px"><button type="button" class="btn" data-act="attlogin">Opnieuw</button></p><p class="fresh"><a href="${esc(orig)}">Open in KU Loket</a></p>`)}`);
    });

    W.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('[data-act="back"]');
      if (b) { e.preventDefault(); goTo(meer, { dir: 'back' }); return; }
      const t = e.target.closest && e.target.closest('#tm-tabs a');
      if (t) { e.preventDefault(); goTo(t.getAttribute('href'), { dir: 'back' }); return; }
      const a = e.target.closest && e.target.closest('[data-act="att"]');
      if (a) { const g = GROUPS.find((x) => x.kind === a.dataset.k); if (g) open(g); return; }
      if (e.target.closest && e.target.closest('[data-act="attlogin"]')) {
        // let KU Loket's own page sign you in once, then come back here (see attestPass in main.js)
        ss.set('tm4-att-pass', JSON.stringify({ ts: Date.now(), n: 0 }));
        location.replace(`${LOKET}?tm=attest`);
      }
    }, true);
  }

  /* signing in again: KU Loket's own page does the sign-in (it must not be taken over meanwhile); once a normal
     KU Loket page loads, go back to the Attesten screen */
  function attestPass() {
    let p = {};
    try { p = JSON.parse(ss.get('tm4-att-pass') || '{}'); } catch (_) {}
    const dark = isDark();
    const st = document.createElement('style');
    st.textContent = `html{background:${dark ? '#000' : '#f2f2f7'}!important}html::after{content:"Aanmelden bij KU Loket\\2026";position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:${dark ? '#000' : '#f2f2f7'};color:${dark ? '#98989f' : '#6d6d72'};font:600 17px -apple-system,system-ui,sans-serif}`;
    (document.head || document.documentElement).appendChild(st);
    whenParsed(() => {
      if (signInStep()) return; // on its way to the KU Leuven login; the page after it comes back here
      ss.set('tm4-att-pass', JSON.stringify({ ts: p.ts || Date.now(), n: (p.n || 0) + 1, done: 1 }));
      location.replace(`${LOKET}?tm=attest`);
    });
  }
