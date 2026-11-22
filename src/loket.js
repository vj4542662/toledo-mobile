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
        r: [[loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), loc.roomName].filter(Boolean).join(' · '), u: https(loc.url_location),
        p: res(e.EventTeacherSet).map((x) => x.name || x.fullName || '').filter(Boolean).join(', '),
      };
    }).filter((x) => x.d && x.s).sort((a, b) => (a.d + a.s).localeCompare(b.d + b.s)) : null;
    const exams = ex.status === 'fulfilled' ? res(ex.value && ex.value.d).map((x) => {
      const loc = res(x.toLocation)[0] || {};
      return {
        d: sapDay(x.examDate), s: hm(x.examBegtime), e: hm(x.examEndtime), t: String(x.moduleTitle || '').trim(), c: String(x.moduleCode || '').trim(),
        r: [[loc.mnemonic, loc.roomNumber].filter(Boolean).join(' '), loc.roomName].filter(Boolean).join(' · '), u: https(loc.urlLocation), x: String(x.evaluationText || '').trim(),
      };
    }).filter((x) => x.d).sort((a, b) => (a.d + a.s).localeCompare(b.d + b.s)) : null;
    return { lessons, exams, range: [ymd(from), ymd(to)] }; // null = could not be read this time (keep the old copy)
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
      loketData().then((data) => { try { W.stop(); } catch (_) {} post({ ok: true, data }); }, (e) => {
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
    let prev = {};
    try { prev = JSON.parse(ss.get('tm4-sync') || '{}'); } catch (_) {}
    const reloads = prev.ts && Date.now() - prev.ts < 10 * 60e3 ? prev.reloads || 0 : 0;
    ss.set('tm4-sync', JSON.stringify({ back, ts: Date.now(), reloads }));
    // cover whatever KU Loket shows meanwhile, without touching it (its sign-in step has to keep running)
    const dark = isDark();
    const cover = document.createElement('style');
    cover.textContent = `html{background:${dark ? '#000' : '#f2f2f7'}!important}html::after{content:"Rooster bijwerken\\2026";position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:${dark ? '#000' : '#f2f2f7'};color:${dark ? '#98989f' : '#6d6d72'};font:600 17px -apple-system,system-ui,sans-serif}`;
    (document.head || document.documentElement).appendChild(cover);
    let gone = false;
    W.addEventListener('pagehide', () => { gone = true; });
    W.addEventListener('beforeunload', () => { gone = true; });
    // came back here with the back button (e.g. from the KU Leuven login): return to the app instead of waiting
    W.addEventListener('pageshow', (ev) => { if (ev.persisted) { ss.del('tm4-sync'); location.replace(`${PORTAL}?tm=${back.split('/')[0]}`); } });
    const again = () => location.replace(`${LOKET}?tm=sync&back=${encodeURIComponent(back)}`);
    const fail = (title, text, detail) => {
      ss.del('tm4-sync');
      takeover('Rooster bijwerken', [PORTAL_ORIGIN]);
      document.body.classList.add('no-tabs');
      document.body.innerHTML = `<div class="sync" data-tm4>${ico('warn')}<b style="color:var(--text);font-size:19px">${esc(title)}</b><span>${esc(text)}</span><button type="button" class="btn" id="tm4-retry">Opnieuw proberen</button><a class="btn ghost" href="${PORTAL}?tm=${back.split('/')[0]}">Terug naar Toledo</a>${detail ? `<small>${esc(detail)}</small>` : ''}</div>`;
      document.getElementById('tm4-retry').addEventListener('click', again);
    };
    let tries = 0;
    const attempt = () => {
      tries++;
      loketData().then((data) => {
        ss.del('tm4-sync');
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
      b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom));z-index:2147483000;padding:11px 18px;border:0;border-radius:22px;background:#0a6cd6;color:#fff;font:600 15px -apple-system,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)';
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
  function fastAuthenticator() {
    const APP = /^https:\/\/icts\.kuleuven\.be\/apps\/authenticator\/[\w-]+$/;
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
      const body = new URLSearchParams(new FormData(form));
      body.append(b.name, b.value || '');
      const plain = () => {
        const h = document.createElement('input');
        h.type = 'hidden'; h.name = b.name; h.value = b.value || '';
        form.appendChild(h);
        HTMLFormElement.prototype.submit.call(form);
      };
      fetch(form.action, { method: 'POST', body, credentials: 'include', redirect: 'follow' })
        .then((r) => (r.ok ? r.text().then((html) => ({ html, url: r.url })) : Promise.reject(new Error('HTTP ' + r.status))))
        .then(({ html, url }) => {
          const a = new DOMParser().parseFromString(html, 'text/html').getElementById('btnMobileDevice');
          const app = a && a.getAttribute('href');
          if (!app || !APP.test(app)) throw new Error('no app link');
          if (url && new URL(url).origin === location.origin) history.replaceState(null, '', url);
          document.open();
          document.write(html);
          document.close();
          loginSkin(true);
          if (Date.now() - t0 < 900) location.href = app; // still part of your tap: iOS opens the app
        })
        .catch(() => { busy = false; plain(); });
    }, true);
  }

  /* KU Leuven sign-in page (idp.kuleuven.be): a new look, and the Authenticator app opened straight from your tap */
  function loginSkin(again) {
    if (!again) { forgetDevice(); fastAuthenticator(); }
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
