  /* ================================================================== KU Loket: timetable + exams */
  async function loketData() {
    const sapDay = (v) => { const m = /\/Date\((-?\d+)/.exec(String(v || '')); if (!m) return ''; const u = new Date(Number(m[1])); return `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}`; };
    const hm = (v) => { const m = /PT(\d+)H(\d+)M/.exec(String(v || '')); return m ? `${pad(m[1])}:${pad(m[2])}` : ''; };
    const res = (v) => (Array.isArray(v) ? v : v && Array.isArray(v.results) ? v.results : []);
    const https = (u) => { const s = String(u || '').trim().replace(/^http:\/\//i, 'https://'); return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ''; };
    const get = (p) => api(LOKET_ORIGIN + p);
    const from = addDays(mondayOf(Date.now()), -7);
    const to = addDays(from, 7 * 20);
    const filter = `(date ge datetime'${ymd(from)}T00:00:00' and date le datetime'${ymd(to)}T00:00:00')`;
    const [ev, ex] = await Promise.allSettled([
      get(`/sap/opu/odata/sap/ZC_EP_SCHEDULE_SRV/Events?sap-client=200&$format=json&$skip=0&$top=3000&$filter=${encodeURIComponent(filter)}&$expand=EventTeacherSet,EventLocationSet`),
      get('/sap/opu/odata/sap/ZC_IER_SRV/EvaluationSet?sap-client=200&$format=json&$expand=toLocation,toStaff'),
    ]);
    if (ev.status === 'rejected' && ex.status === 'rejected') {
      const x = ev.reason, y = ex.reason;
      const detail = `lessen: ${why(x)} · examens: ${why(y)}`;
      const e = (x && x.auth) ? x : (y && y.auth) ? y : new Error('KU Loket');
      e.detail = detail;
      e.http = !!(x && x.status && y && y.status); // KU Loket itself answered with an error
      throw e;
    }
    const lessons = ev.status === 'fulfilled' ? res(ev.value && ev.value.d).map((e) => {
      const loc = res(e.EventLocationSet)[0] || {};
      return {
        d: sapDay(e.date), s: hm(e.start_time), e: hm(e.end_time), t: String(e.ola_description || e.workFormDesc || '').trim(), c: String(e.ects_code || '').trim(),
        f: String(e.workFormDesc || '').trim(), g: String(e.groupinfo_general || '').trim(),
        r: [[loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), loc.roomName].filter(Boolean).join(' · '), u: https(loc.url_location) || (/^\d{6,10}$/.test(String(loc.locationId || loc.location_id || '')) ? `https://www.kuleuven.be/lokalen/${loc.locationId || loc.location_id}.htm` : ''),
        p: res(e.EventTeacherSet).map((x) => x.name || x.fullName || '').filter(Boolean).join(', '),
      };
    }).filter((x) => x.d && x.s).sort((a, b) => (a.d + a.s).localeCompare(b.d + b.s)) : null;
    const exams = ex.status === 'fulfilled' ? res(ex.value && ex.value.d).map((x) => {
      const loc = res(x.toLocation)[0] || {};
      return {
        d: sapDay(x.examDate), s: hm(x.examBegtime), e: hm(x.examEndtime), t: String(x.moduleTitle || '').trim(), c: String(x.moduleCode || '').trim(),
        r: [[loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), loc.roomName].filter(Boolean).join(' · '), u: https(loc.urlLocation) || (/^\d{6,10}$/.test(String(loc.locationId || '')) ? `https://www.kuleuven.be/lokalen/${loc.locationId}.htm` : ''), x: String(x.evaluationText || '').trim(),
      };
    }).filter((x) => x.d).sort((a, b) => (a.d + a.s).localeCompare(b.d + b.s)) : null;
    return { lessons, exams, range: [ymd(from), ymd(to)] }; // null = could not be read this time (keep the old copy)
  }

  /* ================================================================== KU Loket: study progress + ISP (read only) */
  const sapGet = (svc, path) => api(`${LOKET_ORIGIN}/sap/opu/odata/sap/${svc}/${path}${path.includes('?') ? '&' : '?'}$format=json&sap-client=200`);
  const odRes = (v) => { const d = v && v.d; return Array.isArray(d) ? d : d && Array.isArray(d.results) ? d.results : d ? [d] : []; };
  const arrOf = (v) => (Array.isArray(v) ? v : v && Array.isArray(v.results) ? v.results : []);
  const numOf = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const sapDate = (v) => { const m = /^(\d{2})[.-](\d{2})[.-](\d{4})$/.exec(String(v || '').trim()) || /^(\d{4})(\d{2})(\d{2})$/.exec(String(v || '').trim()); if (!m) return ''; return m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`; };
  // "Studievoortgangsdossier" (zr_1017) and "Mijn resultaten" (zr_1018): every study, its credits and every result
  async function studyData() {
    const HOME = 'ZC_ES_SVD_HOME_SRV', AW = 'ZC_ES_SVD_AW_SRV';
    const list = odRes(await sapGet(HOME, 'StudySet?$top=50')).filter((s) => s.studyId);
    list.sort((a, b) => (b.isActive === true) - (a.isActive === true) || String(b.acjaarLaatsteInschrijving).localeCompare(String(a.acjaarLaatsteInschrijving)));
    const out = await Promise.all(list.slice(0, 4).map(async (s) => {
      const id = s.studyId, acj = s.acjaarDiplomaObtained || '0000';
      const hk = `StudySet(studyId='${id}',acjaarDiplomaObtained='${acj}')`;
      const ak = `StudySet(studyId='${id}',acYearZittijd='9999',peridZittijd='999',studyIdZittijd='${id}',acjaarDiplomaObtained='${acj}',multipleStudyRecords=false)`;
      const [kn, prog, akn, aprog, years] = await Promise.allSettled([
        sapGet(HOME, hk + '/toKeyNumbers'), sapGet(HOME, hk + '/toStudyProgress'), sapGet(AW, ak + '/toKeyNumber'), sapGet(AW, ak + '/toStudyProgress'),
        sapGet(AW, ak + '/toAcyearTotal?$expand=toResultTotal/toRanking'),
      ]);
      const ok = (x) => (x.status === 'fulfilled' ? odRes(x.value) : []);
      const pct = ok(kn).find((k) => /diploma/i.test(k.keyName || ''));
      const total = numOf(String((ok(akn)[0] || {}).posStudyPoints || '').replace(/[^\d.,]/g, ''));
      return {
        id, name: String(s.oplName || '').trim(), inst: String(s.instName || '').trim(), active: !!s.isActive,
        done: s.diplomaObtained === 'DiplomaBehaald', doneYear: acj !== '0000' ? acj : '', pct: pct ? numOf(pct.keyValue) : null, total,
        last: sapDate(s.datumLaatsteVrijgave),
        prog: ok(prog).map((p) => [String(p.status || '').trim(), numOf(p.credits) || 0]),
        now: ok(aprog).map((p) => [String(p.status || '').trim(), numOf(p.credits) || 0]),
        years: ok(years).map((y) => ({
          y: String(y.academicYear || ''),
          c: arrOf(y.toResultTotal).map((r) => {
            const rk = arrOf(r.toRanking).map((k) => [String(k.code || ''), numOf(k.lowGrade), numOf(k.highGrade), numOf(k.numberOfStudents) || 0, numOf(k.percentage) || 0, k.myRanking === 'X' ? 1 : 0]);
            return { code: String(r.moduleCode || '').trim(), t: String(r.moduleDescription || '').trim(), sp: numOf(r.studyPoints) || 0, r: String(r.resultTotal || '').trim(),
              sc: String(r.resultTotalScale || '').trim(), st: String(r.awStatus || '').trim(), d: sapDate(r.releaseDate), n: Number(r.numberOfBookings) || 1, sit: String(r.situeringsCode || '').trim(), sy: Number(r.sitAantalJaar) || 0,
              tol: !!r.tolerance, rk: rk.length ? rk : undefined };
          }),
        })).filter((y) => y.c.length).sort((a, b) => b.y.localeCompare(a.y)),
      };
    }));
    return out;
  }
  // "Jouw individueel studieprogramma" (zr_0442): what you obtained and what you take this year, per part of the programme
  async function ispData() {
    const ISP = 'ZC_ISP_ST_OPO_SRV';
    const reg = odRes(await sapGet(ISP, "RegistrationSet?$filter=page%20eq%20%27boekOpo%27")).sort((a, b) => (a.ispPrio || 9) - (b.ispPrio || 9))[0];
    if (!reg) return null;
    const pid = reg.programmeId, yr = reg.academicYear;
    const [tree, spt] = await Promise.allSettled([
      sapGet(ISP, `IndividualStudyProgrammeSet?$filter=${encodeURIComponent(`programmeId eq '${pid}' and academicYear eq '${yr}'`)}`),
      sapGet(ISP, `RegistrationSet(page='boekOpo',programmeId='${pid}',academicYear='${yr}')/toStudyPointTotal`),
    ]);
    const nodes = tree.status === 'fulfilled' ? odRes(tree.value) : [];
    const groups = nodes.filter((n) => n.otype === 'CG').map((n) => ({ id: String(n.nodeId), p: String(n.parentNodeId || ''), t: String(n.title || '').trim(), l: Number(n.hierarchyLevel) || 0 }));
    const other = {};
    const courses = [];
    nodes.filter((n) => n.otype === 'SM').forEach((n) => {
      const b = String(n.bookingStatus || '');
      const g = String(n.parentNodeId || '');
      if (b === 'credit' || /^booked/.test(b)) {
        if (courses.some((c) => c.code === n.ectsCode && c.st === (b === 'credit' ? 'ok' : 'now'))) return;
        courses.push({ g, code: String(n.ectsCode || '').trim(), t: String(n.title || '').trim(), sp: numOf(n.credits) || 0, per: String(n.offerPeriod || ''),
          ph: [Number(n.startPhase) || 0, Number(n.endPhase) || 0], url: n.ectsURL ? 'https://' + String(n.ectsURL).replace(/^https?:\/\//, '') : '', st: b === 'credit' ? 'ok' : 'now', yr: String(n.academicYear || ''), must: n.opoObligated === 'X' });
      } else if (/bookable/.test(b)) other[g] = (other[g] || 0) + 1;
    });
    const t = (spt.status === 'fulfilled' ? odRes(spt.value)[0] : null) || {};
    const sp = nodes.find((n) => n.otype === 'SP');
    return { name: String(reg.programmeDescription || '').trim(), yr, spec: sp ? String(sp.description || '').trim() : '', deadline: sapDate(reg.deadlineDate),
      sem: [numOf(t.firstPeriod) || 0, numOf(t.secondPeriod) || 0, numOf(t.wholeYear) || 0], groups, courses, other };
  }

  /* what went wrong, in a few words: shown small under an error, so a screenshot says what happened */
  function why(e) {
    if (!e) return 'onbekend';
    if (e.detail) return e.detail;
    if (e.auth) return 'aanmelden nodig';
    if (e.status) return 'HTTP ' + e.status;
    if (e.name === 'SyntaxError') return 'onverwacht antwoord';
    return 'geen verbinding (' + String(e.message || e).slice(0, 40) + ')';
  }
  /* When KU Loket's own session has run out, the page we are on is its sign-in step: a form that sends you to
     the KU Leuven login by itself. Meanwhile the timetable requests fail (Safari cancels them, or they are sent to
     the login), so a failed request says nothing until we know which page this is. The sign-in step must never be stopped. */
  const signInStep = () => !!document.querySelector('input[name="SAMLRequest"],input[name="SAMLResponse"],form[action*="idp.kuleuven.be"]');
  const whenParsed = (fn) => {
    if (document.readyState !== 'loading') setTimeout(fn, 250);
    else document.addEventListener('DOMContentLoaded', () => setTimeout(fn, 250), { once: true });
  };

  // the timetable first; study progress and ISP along with it when the app asks (?x=study). Those never make it fail.
  function withStudy(p) {
    if (params.get('x') !== 'study' && !/(^|&)x=study\b/.test(ss.get('tm4-sync-x') || '')) return p;
    return p.then((data) => Promise.allSettled([studyData(), ispData()]).then(([a, b]) => {
      if (a.status === 'fulfilled') data.study = a.value;
      if (b.status === 'fulfilled') data.isp = b.value;
      return data;
    }));
  }

  /* runs inside the hidden KU Loket frame that the app opens. Read first, stop the page only when that worked. */
  function bridge() {
    let sent = false;
    const post = (m) => {
      if (sent) return;
      sent = true;
      try { W.parent.postMessage(Object.assign({ tm4: 'agenda' }, m), PORTAL_ORIGIN); } catch (_) {}
    };
    // leaving for the KU Leuven login (which can't finish inside a hidden frame): the app opens KU Loket itself
    W.addEventListener('pagehide', () => post({ ok: false, pending: 'login' }));
    let tries = 0;
    const attempt = () => {
      tries++;
      withStudy(loketData()).then((data) => { try { W.stop(); } catch (_) {} post({ ok: true, data }); }, (e) => {
        if (e && e.auth) { post({ ok: false, pending: 'login', why: why(e) }); return; }
        whenParsed(() => {
          if (sent) return;
          if (signInStep()) { post({ ok: false, pending: 'login', why: why(e) }); return; }
          if (tries < 2) { setTimeout(attempt, 1000); return; }
          post({ ok: false, error: why(e) });
        });
      });
    };
    attempt();
  }

  /* top-level: "Bijwerken" opens KU Loket itself (signing in if needed), which reads the timetable and goes
     straight back to the app with the data in the address (#...&tmsync=). */
  function syncBack() {
    let back = String(params.get('back') || '').replace(/[^a-z/]/g, '');
    if (!back) { try { back = (JSON.parse(ss.get('tm4-sync') || '{}').back || '').replace(/[^a-z/]/g, ''); } catch (_) {} }
    return back || 'rooster';
  }
  function syncPage() {
    const back = syncBack();
    if (params.get('x') === 'study') ss.set('tm4-sync-x', 'x=study');
    let prev = {};
    try { prev = JSON.parse(ss.get('tm4-sync') || '{}'); } catch (_) {}
    const reloads = prev.ts && Date.now() - prev.ts < 10 * 60e3 ? prev.reloads || 0 : 0;
    ss.set('tm4-sync', JSON.stringify({ back, ts: Date.now(), reloads }));
    // cover whatever KU Loket shows meanwhile, without touching it (its sign-in step has to keep running)
    const dark = isDark();
    const cover = document.createElement('style');
    cover.textContent = `html{background:${dark ? '#000' : '#f2f2f7'}!important}html::after{content:"${/^(studie|isp)/.test(back) ? 'KU Loket openen' : 'Rooster bijwerken'}\\2026";position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:${dark ? '#000' : '#f2f2f7'};color:${dark ? '#98989f' : '#6d6d72'};font:600 17px -apple-system,system-ui,sans-serif}`;
    (document.head || document.documentElement).appendChild(cover);
    let gone = false;
    W.addEventListener('pagehide', () => { gone = true; });
    W.addEventListener('beforeunload', () => { gone = true; });
    // came back here with the back button (e.g. from the KU Leuven login): return to the app instead of waiting
    W.addEventListener('pageshow', (ev) => { if (ev.persisted) { ss.del('tm4-sync'); location.replace(`${PORTAL}?tm=${back.split('/')[0]}`); } });
    const again = () => location.replace(`${LOKET}?tm=sync&back=${encodeURIComponent(back)}`);
    const fail = (title, text, detail) => {
      ss.del('tm4-sync');
      ss.del('tm4-sync-x');
      takeover('Rooster bijwerken', [PORTAL_ORIGIN]);
      document.body.classList.add('no-tabs');
      document.body.innerHTML = `<div class="sync" data-tm4>${ico('warn')}<b style="color:var(--text);font-size:19px">${esc(title)}</b><span>${esc(text)}</span><button type="button" class="btn" id="tm4-retry">Opnieuw proberen</button><a class="btn ghost" href="${PORTAL}?tm=${back.split('/')[0]}">Terug naar Toledo</a>${detail ? `<small>${esc(detail)}</small>` : ''}</div>`;
      document.getElementById('tm4-retry').addEventListener('click', again);
    };
    let tries = 0;
    const attempt = () => {
      tries++;
      withStudy(loketData()).then((data) => {
        ss.del('tm4-sync');
        ss.del('tm4-sync-x');
        try { W.stop(); } catch (_) {}
        location.replace(`${PORTAL}?tm=${back.split('/')[0]}#${back}&tmsync=${encodeURIComponent(JSON.stringify(data))}`);
      }, (e) => {
        if (gone) return; // on its way to the KU Leuven login: the page after it carries on
        whenParsed(() => {
          if (gone) return;
          if (signInStep()) {
            // KU Loket is signing you in from this very page: let it. If nothing happens, say so.
            setTimeout(() => { if (!gone) fail('Aanmelden bij KU Loket lukte niet', 'Open KU Loket één keer gewoon en probeer het daarna opnieuw.', why(e)); }, 30000);
            return;
          }
          if (tries < 3) { setTimeout(attempt, tries === 1 ? 1200 : 3000); return; }
          if (!(e && e.http) && reloads < 1) {
            // a fresh page from KU Loket: if its session ran out, that page signs you in again
            ss.set('tm4-sync', JSON.stringify({ back, ts: Date.now(), reloads: reloads + 1 }));
            again();
            return;
          }
          if (e && e.auth) fail('Aanmelden bij KU Loket lukte niet', 'Open KU Loket één keer gewoon en probeer het daarna opnieuw.', why(e));
          else fail('Het rooster kon niet geladen worden', 'KU Loket reageert nu niet. Probeer het over een paar minuten opnieuw.', why(e));
        });
      });
    };
    attempt();
  }

  /* portal while signing in: the normal Toledo page does the login, then we switch back to the app */
  function loginWatch() {
    const started = Date.now();
    const tick = () => fetch(PORTAL_ORIGIN + '/portal/api/user', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((r) => { if (r.ok) { ss.del('tm4-login'); location.reload(); } else again(); }, again);
    const again = () => { if (Date.now() - started > 30 * 60e3) { ss.del('tm4-login'); return; } setTimeout(tick, 2500); };
    setTimeout(tick, 1500);
  }

  /* classic portal (chosen in Meer): a button to come back */
  function classicPill() {
    const add = () => {
      if (!document.body) { setTimeout(add, 150); return; }
      if (document.getElementById('tm4-pill')) return;
      const b = document.createElement('button');
      b.id = 'tm4-pill';
      b.type = 'button';
      b.textContent = '← Terug naar de app';
      b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));z-index:2147483000;padding:11px 18px;border:0;border-radius:22px;background:#0a6cd6;color:#fff;font:600 15px -apple-system,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)';
      b.addEventListener('click', () => { ss.del('tm4-classic'); history.replaceState(null, '', location.pathname + '#vandaag'); location.reload(); });
      document.body.appendChild(b);
      const st = document.createElement('style');
      st.textContent = '#tm-classic,#tm-on-pill{display:none!important}';
      document.head.appendChild(st);
    };
    add();
  }

  /* Version 4.4 switched KU Leuven's "Remember my device" preference on for you. That sends a notification to the
     Authenticator instead of showing the "Open de app" button, so it is switched off again once (cookie removed).
     After that the box is yours: the script no longer touches it. */
  function forgetDevice() {
    try {
      if (localStorage.getItem('tm4-rd-cleared')) return;
      localStorage.setItem('tm4-rd-cleared', '1');
      localStorage.removeItem('tm4-autopush');
    } catch (_) { return; }
    try { document.cookie = '__Host-rememberDevice=; secure; samesite=none; path=/; max-age=0'; } catch (_) {}
  }

  /* "Log in via KU Leuven Authenticator" normally opens a second step with an "Open KU Leuven Authenticator app" button.
     iOS only lets a web page open another app from a real tap, so the script uses your tap on the first button for it:
     it fetches that second step itself (the same request the button would send), shows it, and in the same moment
     opens the app link from it (icts.kuleuven.be/apps/authenticator/…). You approve in the app and come back to a page
     that finishes the login by itself, as before. If anything is off (slow network, page changed), the normal second
     step simply appears, so you never end up worse off. Nothing is filled in: no username, no password. */
  const APP_LINK = /^https:\/\/icts\.kuleuven\.be\/apps\/authenticator\/[\w-]+$/;
  // ask KU Leuven for the second step (the same request the blue button sends) and pull the app link out of it
  function fetchStep2(form, b) {
    const body = new URLSearchParams(new FormData(form));
    body.append(b.name, b.value || '');
    return fetch(form.action, { method: 'POST', body, credentials: 'include', redirect: 'follow' })
      .then((r) => (r.ok ? r.text().then((html) => ({ html, url: r.url })) : Promise.reject(new Error('HTTP ' + r.status))))
      .then(({ html, url }) => {
        const doc2 = new DOMParser().parseFromString(html, 'text/html');
        const a = doc2.getElementById('btnMobileDevice');
        const app = a && a.getAttribute('href');
        const cont = doc2.getElementById('loginformnextauth');
        if (!app || !APP_LINK.test(app) || !cont) throw new Error('no app link');
        return { html, url, app, action: new URL(cont.getAttribute('action'), url || location.href).href };
      });
  }
  // show the second step (it waits for your approval and finishes by itself), and open the app if this is still your tap
  function showStep2(st, openApp) {
    ss.set('tm4-fa', JSON.stringify({ action: st.action, ts: Date.now() })); // see finishAfterApp
    if (st.url && new URL(st.url).origin === location.origin) history.replaceState(null, '', st.url);
    document.open();
    document.write(st.html);
    document.close();
    loginSkin(true);
    if (openApp) location.href = st.app;
    finishAfterApp();
  }
  const plainSubmit = (form, b) => {
    const h = document.createElement('input');
    h.type = 'hidden'; h.name = b.name; h.value = b.value || '';
    form.appendChild(h);
    HTMLFormElement.prototype.submit.call(form);
  };

  /* Opening Toledo from the home screen while signed out: the KU Leuven page becomes one big "tap to open the
     Authenticator" screen. The next step is already fetched in the background, so the moment you tap (anywhere),
     the app opens. A tap is needed because iOS never lets a page open another app on its own. "Andere manier" gives
     you the normal KU Leuven page (password, QR code). */
  function quickLogin() {
    const form = document.getElementById('nextauthLoginForm');
    const b = document.getElementById('btnnextauthlogin');
    if (!form || !b || ss.get('tm4-ql-off')) return false;
    const rd = form.querySelector('[name="__Host-rememberDevice"]');
    if (rd && rd.checked) return false;
    if (Array.from(document.querySelectorAll('.alert-danger, .alert-warning')).some((el) => el.offsetParent !== null && el.id !== 'rss-status')) return false; // a message from KU Leuven: let you read it
    const last = Number(ss.get('tm4-ql-at')) || 0;
    if (Date.now() - last < 20e3) return false; // just tried: don't loop
    ss.set('tm4-ql-at', String(Date.now()));
    const ov = document.createElement('div');
    ov.id = 'tm4-ql';
    ov.setAttribute('role', 'button');
    ov.innerHTML = '<img src="https://stijl.kuleuven.be/shibboleth/images/authenticator.svg" alt=""><b>Inloggen</b><span class="q">Even geduld…</span><button type="button" class="other">Andere manier</button>';
    const css = document.createElement('style');
    css.textContent = '#tm4-ql{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;background:var(--bg,#f2f2f7);color:var(--text,#000);font:17px -apple-system,system-ui,sans-serif;text-align:center;-webkit-tap-highlight-color:transparent}'
      + '#tm4-ql img{width:96px;height:96px;border-radius:22px;box-shadow:0 8px 24px rgba(0,0,0,.15)}#tm4-ql b{font-size:26px;margin-top:8px}'
      + '#tm4-ql .q{min-height:50px;display:flex;align-items:center;padding:0 22px;border-radius:14px;color:var(--sub,#6d6d72)}'
      + '#tm4-ql.ready .q{background:var(--accent,#0a6cd6);color:#fff;font-weight:600}'
      + '#tm4-ql .other{position:absolute;bottom:calc(28px + env(safe-area-inset-bottom));border:0;background:none;color:var(--accent,#0a6cd6);font:500 16px -apple-system,system-ui,sans-serif;padding:10px}';
    document.head.appendChild(css);
    document.body.appendChild(ov);
    let st = null, gone = false;
    const off = () => { gone = true; ov.remove(); };
    ov.querySelector('.other').addEventListener('click', (e) => {
      e.stopPropagation();
      ss.set('tm4-ql-off', '1');
      if (st) showStep2(st, false); else off(); // the second step has a "Go back" to the password login
    });
    ov.addEventListener('click', () => {
      if (gone) return;
      if (st) { gone = true; showStep2(st, true); return; }
      ov.querySelector('.q').textContent = 'Bezig…';
    });
    fetchStep2(form, b).then((v) => {
      if (gone) return;
      st = v;
      ov.classList.add('ready');
      ov.querySelector('.q').textContent = 'Tik om de Authenticator te openen';
    }, () => { if (!gone) plainSubmit(form, b); }); // fetching failed: take the normal route (the button you would press)
    return true;
  }

  /* Your own tap on "Log in via KU Leuven Authenticator": fetch the second step and open the app from that same tap
     (iOS only opens another app from a real tap). If anything is off, the normal second step simply appears. */
  function fastAuthenticator() {
    let busy = false;
    W.addEventListener('click', (e) => {
      const b = e.target && e.target.closest && e.target.closest('#btnnextauthlogin');
      const form = b && b.form;
      if (!form || busy || e.defaultPrevented) return;
      const rd = form.querySelector('[name="__Host-rememberDevice"]');
      if (rd && rd.checked) return; // you chose the notification route yourself: leave it alone
      e.preventDefault();
      e.stopImmediatePropagation();
      busy = true;
      const t0 = Date.now();
      fetchStep2(form, b).then((v) => showStep2(v, Date.now() - t0 < 900)).catch(() => { busy = false; plainSubmit(form, b); });
    }, true);
    const ql = () => { try { quickLogin(); } catch (_) {} };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ql, { once: true }); else ql();
  }

  /* Back from the Authenticator app: KU Leuven's page should notice the approval by itself, but iOS pauses it while
     you are in the app (and sometimes reloads it as an empty page). So once you are back, the script presses KU Leuven's
     own "Click this button after you signed in with the app" for you: the same request, sent to the same step. */
  function finishAfterApp() {
    const saved = () => { try { const v = JSON.parse(ss.get('tm4-fa') || 'null'); return v && Date.now() - v.ts < 10 * 60e3 ? v : null; } catch (_) { return null; } };
    const go = () => {
      const v = saved();
      if (!v || new URL(v.action).origin !== location.origin) return;
      ss.del('tm4-fa');
      const f = document.getElementById('loginformnextauth') || (() => {
        const n = document.createElement('form');
        n.method = 'post';
        n.innerHTML = '<input type="hidden" name="_eventId_proceed" value="">';
        (document.body || document.documentElement).appendChild(n);
        return n;
      })();
      f.setAttribute('action', f.id ? f.getAttribute('action') || v.action : v.action);
      HTMLFormElement.prototype.submit.call(f);
    };
    let away = document.visibilityState === 'hidden';
    const back = () => {
      if (document.visibilityState === 'hidden') { away = true; return; }
      if (away) setTimeout(() => { if (document.visibilityState === 'visible') go(); }, 1200); // KU Leuven's page gets a moment first
    };
    document.addEventListener('visibilitychange', back);
    W.addEventListener('pageshow', (e) => { if (e.persisted) { away = true; back(); } });
  }

  /* iOS reloaded the page while you were in the app (it then comes back empty, or as the waiting step again):
     finish the login from the saved step. The saved step only exists after the app was opened by fastAuthenticator. */
  function emptyAfterApp() {
    let v = null;
    try { v = JSON.parse(ss.get('tm4-fa') || 'null'); } catch (_) {}
    if (!v || Date.now() - v.ts > 10 * 60e3) return;
    const check = () => {
      if (document.getElementById('nextauthLoginForm') || document.querySelector('input[name="SAMLResponse"]')) { ss.del('tm4-fa'); return; }
      const wait = document.getElementById('loginformnextauth');
      if (!wait && document.body && document.body.innerText.trim().length > 40) return; // a real page (e.g. an error): leave it
      ss.del('tm4-fa');
      const n = wait || document.createElement('form');
      n.method = 'post';
      if (!wait) n.action = v.action;
      if (!wait) { n.innerHTML = '<input type="hidden" name="_eventId_proceed" value="">'; (document.body || document.documentElement).appendChild(n); }
      HTMLFormElement.prototype.submit.call(n);
    };
    if (document.readyState === 'complete') setTimeout(check, 600); else W.addEventListener('load', () => setTimeout(check, 600), { once: true });
  }

  /* The last step of a login is an empty-looking page that passes the result to Toledo / KU Loket by itself.
     If iOS paused it (you were in the app), it can stay white: send it on once you look at it again. */
  function nudgeSamlPost() {
    let sent = false;
    const nudge = () => {
      const i = document.querySelector('form input[name="SAMLResponse"]');
      if (sent || !i || document.visibilityState !== 'visible') return;
      sent = true;
      HTMLFormElement.prototype.submit.call(i.form);
    };
    W.addEventListener('beforeunload', () => { sent = true; }); // the page sent it itself: never twice
    const later = () => setTimeout(nudge, 1500);
    if (document.readyState === 'complete') later(); else W.addEventListener('load', later, { once: true });
    document.addEventListener('visibilitychange', later);
    W.addEventListener('pageshow', later);
  }

  /* KU Leuven sign-in page (idp.kuleuven.be): a new look, and the Authenticator app opened straight from your tap */
  /* "Stale Request": the KU Leuven login page you came back to (back button, or a tab reopened later) was already used.
     Nothing to do there: start again from where you were going, which signs you in afresh (usually without a password). */
  function staleLogin() {
    const check = () => {
      const b = document.body;
      if (!b || !/stale request|verouderd verzoek|verlopen aanvraag/i.test(b.innerText || '')) return;
      const ref = hostOf(document.referrer);
      const to = /^webwsp\./.test(ref) ? LOKET : /kuleuven\.cloud$/.test(ref) ? ULTRA + '/ultra/course' : PORTAL + '?tm=vandaag';
      cover('Opnieuw verbinden\u2026');
      setTimeout(() => location.replace(to), 150);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check, { once: true }); else check();
  }
  function loginSkin(again) {
    if (!again) { forgetDevice(); fastAuthenticator(); emptyAfterApp(); nudgeSamlPost(); staleLogin(); }
    const r = document.documentElement;
    r.classList.add('tm4-login');
    const st = document.createElement('style');
    st.textContent = LOGIN_CSS;
    (document.head || r).appendChild(st);
    const finish = () => {
      applyTheme(THEME);
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp && !/viewport-fit/.test(vp.content)) vp.content += ', viewport-fit=cover';
      if (document.head && st.parentNode !== document.head) document.head.appendChild(st);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', finish, { once: true }); else finish();
  }
