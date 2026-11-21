  /* ================================================================== what does this page become? */
  if (!SITE) return;
  let mode = 'classic', target = '';
  if (SITE === 'idp') mode = TOP && PHONE ? 'login-skin' : 'none';
  else if (SITE === 'loket') {
    if (!TOP && params.get('tm') === 'bridge') mode = 'bridge';
    else if (!TOP) mode = 'none';
    else if (params.get('tm') === 'sync') mode = 'sync';
    else if ((() => { try { return Date.now() - (JSON.parse(ss.get('tm4-sync') || '{}').ts || 0) < 3 * 60e3; } catch (_) { return false; } })()) mode = 'sync'; // back from signing in
    else if (PHONE && params.get('tm') === 'agenda') { mode = 'redirect'; target = PORTAL + '?tm=rooster'; } // link from v3
  } else if (!TOP && !TEST) mode = 'none';
  else if (!PHONE) mode = 'classic';
  else if (SITE === 'portal') {
    if (!/^\/portal\/?(index\.html)?$/.test(PATH)) mode = 'none';
    else if (ss.get('tm4-classic') === '1') mode = 'classic';
    else if (ss.get('tm4-login')) mode = 'login';
    else mode = 'app';
  } else if (SITE === 'ultra') {
    const outline = /^\/ultra\/courses\/(_\d+_\d+)\/outline\/?$/.exec(PATH);
    const tmq = params.get('tm');
    if (!PATH.startsWith('/ultra/')) mode = 'none';
    else if (/^\/ultra\/app\/?$/.test(PATH)) mode = 'app';
    else if (outline && tmq === 'classic') { ss.set('tm4-classic-ultra', String(Date.now())); mode = 'classic'; }
    else if (outline && tmq !== 'app' && !location.search && Date.now() - (Number(ss.get('tm4-noapp')) || 0) < 5 * 60e3) mode = 'classic';
    else if (outline && (!location.search || tmq === 'app')) { mode = 'app'; W.__TM_PK__ = outline[1]; ss.del('tm4-noapp'); }
    else if (!classicOn('ultra') && /^\/ultra\/?$|^\/ultra\/(course|stream|institution-page)\/?$/.test(PATH)) {
      mode = 'redirect';
      target = PORTAL + (/stream/.test(PATH) ? '?tm=updates' : /\/course\/?$/.test(PATH) ? '?tm=vakken' : '?tm=vandaag');
    }
  }
  W.__TM_MODE__ = mode;

  if (mode === 'redirect') { try { W.stop(); } catch (_) {} location.replace(target); return; }
  if (mode === 'bridge') { bridge(); return; }
  // build our page once the parser has created <html> (before any of the page's own scripts can run)
  const whenRoot = (fn) => {
    if (document.documentElement) { fn(); return; }
    const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); fn(); } });
    mo.observe(document, { childList: true });
  };
  if (mode === 'sync') { whenRoot(syncPage); return; }
  if (mode === 'login-skin') { whenRoot(loginSkin); return; }
  if (mode === 'login') { loginWatch(); return; }
  if (mode === 'classic') { if (SITE === 'portal' && PHONE && TOP) classicPill(); return; }
  if (mode !== 'app') return;
  whenRoot(SITE === 'portal' ? portalApp : ultraApp);
