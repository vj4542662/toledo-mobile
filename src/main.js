  /* ================================================================== what does this page become? */
  if (!SITE) return;
  let mode = 'classic', target = '';
  if (SITE === 'install') mode = 'none'; // GitHub: only the update page below
  else if (SITE === 'idp') mode = TOP && PHONE ? 'login-skin' : 'none';
  else if (SITE === 'kurt') mode = TOP && PHONE && params.get('tm') !== 'orig' && !/^\/(check-in|login|logout|signin|saml|api)\b/i.test(PATH) ? 'kurt' : 'none'; // study places
  else if (SITE === 'print') {
    // KU Leuven Print (PaperCut): its own pages become the Print app; /topup is the payment page
    const svc = params.get('service') || '';
    if (params.get('tm') === 'orig') ss.set('tm4-classic-print', String(Date.now()));
    if (!TOP || !PHONE) mode = 'none';
    else if (/^\/topup(\/|$)/.test(PATH)) mode = 'topup';
    else if (Date.now() - (Number(ss.get('tm4-print-pass')) || 0) < 30e3) { ss.del('tm4-print-pass'); mode = 'none'; } // signing in again: let the server's login page through once
    else if (!classicOn('print') && /^\/app(;|$)/.test(PATH) && (!svc || /^page\/User/.test(svc))) mode = 'print';
    else mode = 'none';
  } else if (SITE === 'journey') mode = TOP && PHONE ? 'cover' : 'none'; // Toledo's link service, on its way to the course
  else if (SITE === 'loket') {
    if (!TOP && params.get('tm') === 'bridge') mode = 'bridge';
    else if (!TOP) mode = 'none';
    else if (params.get('tm') === 'sync') mode = 'sync';
    else if (PHONE && params.get('tm') !== 'orig' && (params.get('tm') === 'room' || /zr_1011-display.*\/room\/\d+/.test(decodeURIComponent(location.hash)))) mode = 'room'; // lokaalfiche
    else if ((() => { try { return Date.now() - (JSON.parse(ss.get('tm4-sync') || '{}').ts || 0) < 10 * 60e3; } catch (_) { return false; } })()) mode = 'sync'; // back from signing in (approving in the Authenticator can take a while)
    else if (PHONE && params.get('tm') === 'agenda') { mode = 'redirect'; target = PORTAL + '?tm=rooster'; } // link from v3
  } else if (!TOP && !TEST) mode = 'none';
  else if (!PHONE) mode = SITE === 'portal' ? 'none' : 'classic'; // a computer or iPad: Toledo's own site as it is
  else if (SITE === 'portal') {
    if (!/^\/portal\/?(index\.html)?$/.test(PATH)) mode = 'none';
    else if (ss.get('tm4-classic') === '1') mode = 'plain'; // "Klassieke Toledo" in Meer: the real Toledo, untouched (no v3 layer)
    else if (ss.get('tm4-login')) mode = 'login';
    else mode = 'app';
  } else if (SITE === 'ultra') {
    const outline = /^\/ultra\/courses\/(_\d+_\d+)\/outline\/?$/.exec(PATH);
    const tmq = params.get('tm');
    if (!PATH.startsWith('/ultra/')) mode = 'none';
    else if (/^\/ultra\/app\/?$/.test(PATH)) mode = 'app';
    else if (/^\/ultra\/calendar\/?$/.test(PATH) && tmq === 'agenda') { mode = 'app'; W.__TM_ROUTE__ = 'agenda'; } // Meer > Toledo-agenda
    else if (/^\/ultra\/calendar\/?$/.test(PATH) && tmq === 'groepen') { mode = 'app'; W.__TM_ROUTE__ = 'groepen'; } // Meer > Groepswerken (no course address: its hash got lost on the way)
    else if (outline && tmq === 'classic') { ss.set('tm4-classic-ultra', String(Date.now())); mode = 'classic'; }
    else if (outline && tmq !== 'app' && !location.search && Date.now() - (Number(ss.get('tm4-noapp')) || 0) < 5 * 60e3) mode = 'classic';
    else if (outline && (!location.search || tmq === 'app')) { mode = 'app'; W.__TM_PK__ = outline[1]; ss.del('tm4-noapp'); }
    else if (!classicOn('ultra') && /^\/ultra\/?$|^\/ultra\/(course|stream|institution-page)\/?$/.test(PATH)) {
      mode = 'redirect';
      target = PORTAL + (/stream/.test(PATH) ? '?tm=updates' : /\/course\/?$/.test(PATH) ? '?tm=vakken' : '?tm=vandaag');
    }
  }
  W.__TM_MODE__ = mode;

  if (SITE === 'install') {
    // the update page on GitHub: a friendly how-to instead of the script's code
    if (TOP && PHONE && /^\/vj4542662\/toledo-mobile\/[^?#]*\.user\.js$/.test(location.pathname)) {
      whenRoot(() => { const st = document.createElement('style'); st.textContent = 'body{visibility:hidden!important}'; document.documentElement.appendChild(st); });
      installPage();
    }
    return;
  }
  if (mode === 'redirect') { try { W.stop(); } catch (_) {} whenRoot(() => cover('')); location.replace(target); return; }
  if (mode === 'bridge') {
    // the hidden frame only reads data: don't let the KU Loket launchpad (SAPUI5) boot in it as well
    if (/^\/sap\/bc\/ui2\/flp/.test(PATH)) blockScripts((n) => /ui5_ui5|sap-ui-core|ushell|\/resources\//.test(n.getAttribute('src') || '') || n.id === 'sap-ui-bootstrap');
    bridge();
    return;
  }
  if (mode === 'cover') {
    // came back here with the back button: this page would only send you forward again, so step over it
    const back = () => { try { return (performance.getEntriesByType('navigation')[0] || {}).type === 'back_forward'; } catch (_) { return false; } };
    if (back() && history.length > 1) { try { W.stop(); } catch (_) {} whenRoot(() => cover('')); history.back(); return; }
    W.addEventListener('pageshow', (e) => { if (e.persisted && history.length > 1) history.back(); });
    whenRoot(() => cover('Openen\u2026'));
    return;
  }
  if (mode === 'classic' && PHONE && TOP && (SITE === 'ultra' || SITE === 'loket')) classicDark();
  if (mode === 'sync') { whenRoot(syncPage); return; }
  if (mode === 'room') { whenRoot(roomPage); return; }
  if (mode === 'kurt') { whenRoot(kurtApp); return; }
  if (mode === 'print') {
    // signed out, the server sends a small page that forwards to the KU Leuven login: let it (or send it on ourselves)
    if (document.querySelector('form[action*="idp.kuleuven.be"]') || /Shibboleth Authentication/i.test(document.title || '')) return;
    whenRoot(printApp);
    return;
  }
  if (mode === 'topup') { topupPage(); return; }
  if (mode === 'login-skin') { whenRoot(loginSkin); return; }
  if (mode === 'login') { loginWatch(); return; }
  if (mode === 'plain') { classicPill(); return; }
  if (mode === 'classic') return;
  if (mode !== 'app') return;
  whenRoot(SITE === 'portal' ? portalApp : ultraApp);
