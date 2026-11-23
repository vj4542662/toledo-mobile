(async()=>{const CSS='',LOGIN_CSS='';
  /* ================================================================== environment */
  const W = window;
  const VERSION = '__VERSION__';
  const SITE = { 'toledo.kuleuven.be': 'portal', 'ultra.edu.kuleuven.cloud': 'ultra', 'webwsp.aps.kuleuven.be': 'loket', 'idp.kuleuven.be': 'idp', 'icts-p-toledo-journey.cloud.icts.kuleuven.be': 'journey' }[location.hostname];
  const TOP = W.top === W;
  const TEST = !!W.__TM_TEST__;
  const PATH = W.__TM_PATH__ || location.pathname;
  const PORTAL = 'https://toledo.kuleuven.be/portal/';
  const PORTAL_ORIGIN = 'https://toledo.kuleuven.be';
  const ULTRA = 'https://ultra.edu.kuleuven.cloud';
  const LOKET_ORIGIN = 'https://webwsp.aps.kuleuven.be';
  const LOKET = LOKET_ORIGIN + '/sap/bc/ui2/flp';
  const JOURNEY = 'https://icts-p-toledo-journey.cloud.icts.kuleuven.be/learningUnits/ultraLink?batchUid=';
  const MAIL = 'https://outlook.office.com/mail/';
  const PHONE = TEST || Math.min(screen.width, screen.height) < 600;
  const params = new URLSearchParams(location.search);

  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (_) {} },
  };
  const classicOn = (site) => { const v = Number(ss.get('tm4-classic-' + site)); return v > 0 && Date.now() - v < 30 * 60e3; };

  /* ================================================================== helpers */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fromYmd = (s, hm) => {
    const [y, m, d] = String(s).split('-').map(Number);
    const [h, mi] = String(hm || '0:0').split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0).getTime();
  };
  const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const DAYS_S = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const MONTHS_S = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (t, n) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes()).getTime(); };
  const dayDiff = (a, b) => Math.round((sod(a) - sod(b)) / 864e5);
  const mondayOf = (t) => { const d = new Date(sod(t)); return addDays(d.getTime(), -((d.getDay() + 6) % 7)); };
  const hhmm = (t) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dLong = (t) => { const d = new Date(t); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const dShort = (t) => { const d = new Date(t); return `${DAYS_S[d.getDay()]} ${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
  const relDay = (t, now = Date.now()) => {
    const n = dayDiff(t, now);
    if (n === 0) return 'Vandaag';
    if (n === 1) return 'Morgen';
    if (n === -1) return 'Gisteren';
    if (n > 1 && n < 7) return cap(DAYS[new Date(t).getDay()]);
    return cap(dShort(t));
  };
  const until = (t, now = Date.now()) => {
    const m = Math.round((t - now) / 60e3);
    if (m < 1) return 'nu';
    if (m < 60) return `over ${m} min`;
    const d = dayDiff(t, now);
    if (d === 0) { const h = Math.floor(m / 60), r = m % 60; return r && h < 3 ? `over ${h} u ${r} min` : `over ${Math.round(m / 60)} u`; }
    if (d === 1) return 'morgen';
    if (d < 14) return `over ${d} dagen`;
    return `over ${Math.round(d / 7)} weken`;
  };
  const shortWhen = (t, now = Date.now()) => {
    const n = dayDiff(t, now);
    if (n === 0) return hhmm(t);
    if (n === -1) return 'gisteren';
    if (n > -7 && n < 0) return DAYS_S[new Date(t).getDay()];
    return `${new Date(t).getDate()} ${MONTHS_S[new Date(t).getMonth()]}`;
  };
  const fsize = (b) => (!b ? '' : b >= 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' kB');
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cleanTitle = (t) => String(t || '').replace(/\s*\[[A-Za-z0-9]{4,9}\]/g, '').replace(/\s{2,}/g, ' ').trim();
  const codeOf = (t) => (/\[([A-Za-z0-9]{4,9})\]/.exec(String(t || '')) || [])[1] || '';
  const luCode = (lu) => (/^ULTRA-[A-Z]-KUL-([A-Za-z0-9]+)-\d{4}$/.exec(String(lu || '')) || [])[1] || '';
  const STOP = /^(and|of|the|in|on|for|to|a|an|en|van|de|het|voor|met|op|der|des|und|und|la|le|du|des|et)$/i;
  const initials = (t) => {
    const w = cleanTitle(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((x) => x && !STOP.test(x));
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '').slice(1, 2))).toUpperCase();
  };
  const textOf = (html) => {
    if (!html) return '';
    if (typeof html === 'object') html = html.displayText || html.rawText || '';
    return String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  };
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };
  const absU = (u, base = ULTRA + '/') => { try { const x = new URL(u, base); return /^(https?:|mailto:)$/.test(x.protocol) ? x.href : ''; } catch (_) { return ''; } };
  const put = (el, html) => { if (el && el.__h !== html) { el.innerHTML = html; el.__h = html; } };

  /* course colours (Toledo palette, 1-16) */
  const PAL = [null, [144, 81, 78], [198, 111, 72], [217, 45, 45], [242, 109, 80], [211, 148, 37], [255, 187, 108], [222, 197, 134], [242, 207, 59],
    [90, 155, 79], [122, 191, 30], [30, 112, 105], [50, 195, 181], [74, 109, 136], [87, 160, 209], [145, 94, 208], [210, 100, 157]];
  function colorVars(i) {
    const c = PAL[Number(i)] || [10, 108, 214];
    const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const dk = c.map((v) => Math.round(v * (lum > 150 ? 0.55 : 0.8)));
    const lt = c.map((v) => Math.round(v + (255 - v) * 0.3));
    return `--c:rgb(${c});--ct:${lum > 170 ? '#1c1c1e' : '#fff'};--cd-l:rgb(${dk});--cd-d:rgb(${lt})`;
  }

  /* ================================================================== updates */
  // Userscripts on iPhone never updates by itself. Check GitHub now and then and offer the new version in the app.
  const UPDATE_URL = 'https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/toledo-mobile.user.js';
  const newerThan = (a, b) => {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
    return false;
  };
  function checkUpdate(cb) {
    if (TEST) return;
    let st = null; try { st = JSON.parse(localStorage.getItem('tm4:upd') || 'null'); } catch (_) {}
    if (st && st.v && newerThan(st.v, VERSION)) cb(st.v);
    if (st && Date.now() - st.ts < 3 * 3600e3) return;
    fetch(UPDATE_URL + '?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => {
        const m = /@version\s+([\d.]+)/.exec(t);
        if (!m) return;
        try { localStorage.setItem('tm4:upd', JSON.stringify({ ts: Date.now(), v: m[1] })); } catch (_) {}
        if (newerThan(m[1], VERSION)) cb(m[1]);
      }, () => {});
  }

  /* ================================================================== storage + network */
  const NS = 'tm4:';
  const store = {
    get(k) { try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : null; } catch (_) { return null; } },
    set(k, v) {
      const s = JSON.stringify(v);
      try { localStorage.setItem(NS + k, s); } catch (_) { store.prune(); try { localStorage.setItem(NS + k, s); } catch (__) {} }
    },
    del(k) { try { localStorage.removeItem(NS + k); } catch (_) {} },
    prune() {
      // storage full: drop the oldest half of the cached course content
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && /^tm4:[cia]:/.test(k)) { let ts = 0; try { ts = JSON.parse(localStorage.getItem(k)).ts || 0; } catch (_) {} keys.push([ts, k]); }
        }
        keys.sort((a, b) => a[0] - b[0]).slice(0, Math.ceil(keys.length / 2)).forEach(([, k]) => localStorage.removeItem(k));
      } catch (_) {}
    },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k)); } catch (_) {} },
  };

  class AuthError extends Error { constructor(m) { super(m || 'session'); this.auth = true; } }
  async function api(url, opt = {}) {
    const r = await fetch(url, Object.assign({ credentials: 'include' }, opt, { headers: Object.assign({ Accept: 'application/json' }, opt.headers || {}) }));
    if (r.status === 401) throw new AuthError('401');
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    if (r.status === 204) return null;
    const ct = r.headers.get('content-type') || '';
    if (/text\/html/.test(ct)) throw new AuthError('html');
    return r.json();
  }
  /* Keep a session alive while the app is open: a small request every few minutes while you look at it, and
     one straight away when you come back to the page. It only refreshes a session that is still valid; it never
     signs you in. Each ping is a plain GET of something the app reads anyway. */
  function keepAlive(name, pings, every = 4 * 60e3) {
    if (TEST) return;
    const KEY = 'ka:' + name;
    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      const last = Number(ss.get(KEY)) || 0;
      if (Date.now() - last < every - 5e3) return;
      ss.set(KEY, String(Date.now()));
      pings.forEach(([url, mode]) => fetch(url, { credentials: 'include', mode: mode || 'cors', cache: 'no-store', headers: mode === 'no-cors' ? {} : { Accept: 'application/json' } }).catch(() => {}));
    };
    setInterval(ping, 60e3);
    document.addEventListener('visibilitychange', ping);
    W.addEventListener('pageshow', ping);
    setTimeout(ping, 20e3);
  }
  const inflight = new Map();
  const once = (key, fn) => {
    if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)));
    return inflight.get(key);
  };
  /* stale-while-revalidate: onData(value, fromCache) runs with the cached copy right away and again when
     the network copy differs. Resolves with the fresh value. */
  function swr(key, fetcher, onData, { maxAge = 0 } = {}) {
    const c = store.get(key);
    if (c && c.v != null) onData(c.v, true, c.ts);
    if (c && maxAge && Date.now() - c.ts < maxAge) return Promise.resolve(c.v);
    return once('swr:' + key, fetcher).then((v) => {
      const same = c && JSON.stringify(c.v) === JSON.stringify(v);
      store.set(key, { ts: Date.now(), v });
      if (!same) onData(v, false, Date.now());
      return v;
    });
  }

  /* ================================================================== icons */
  const ICONS = {
    house: '<path d="M3.8 10.4 12 3.8l8.2 6.6V19a1.6 1.6 0 0 1-1.6 1.6h-4v-5.8H9.4v5.8h-4A1.6 1.6 0 0 1 3.8 19z"/>',
    book: '<path d="M5 5.6A2.1 2.1 0 0 1 7.1 3.5H19v13.8H7.1A2.1 2.1 0 0 0 5 19.4z"/><path d="M5 19.4a2.1 2.1 0 0 0 2.1 2.1H19v-4.2"/><path d="M9 7.8h6"/>',
    calendar: '<rect x="3.6" y="4.8" width="16.8" height="15.8" rx="3"/><path d="M3.6 9.6h16.8M8 3v3.4M16 3v3.4"/><path d="M7.6 13.2h1.6M11.2 13.2h1.6M14.8 13.2h1.6M7.6 16.8h1.6M11.2 16.8h1.6" stroke-width="2.2"/>',
    bell: '<path d="M6 16.4V11a6 6 0 0 1 12 0v5.4l1.6 2.1H4.4z"/><path d="M10 20.6a2 2 0 0 0 4 0"/>',
    grid: '<rect x="4" y="4" width="6.6" height="6.6" rx="1.8"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.8"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.8"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.8"/>',
    ext: '<path d="M8 16 16.5 7.5M9.5 7.5h7v7"/>',
    folder: '<path d="M3.5 7.6a2 2 0 0 1 2-2h4.1l2 2.2h6.9a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    doc: '<path d="M7 3.6h6.6l4.9 4.9V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5.1A1.5 1.5 0 0 1 7 3.6z"/><path d="M13.4 3.8v4.9h4.9M8.6 12.6h6.8M8.6 16h4.6"/>',
    play: '<circle cx="12" cy="12" r="8.6"/><path d="M10.2 8.7v6.6l5.2-3.3z" fill="currentColor" stroke-width="1.2"/>',
    link: '<path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1"/>',
    pencil: '<path d="M14.6 5.4 18.6 9.4M4.6 19.4l1-4.3L15.7 5a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.9 18.4z"/>',
    bubble: '<path d="M4.6 18.6V7a2 2 0 0 1 2-2h10.8a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H8.5z"/>',
    megaphone: '<path d="M4 10v4a1 1 0 0 0 1 1h2l6.5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16.8 9.2a4 4 0 0 1 0 5.6M19.2 6.8a7.4 7.4 0 0 1 0 10.4"/>',
    chart: '<path d="M5 20v-7M10 20V5.5M15 20v-9.5M20 20V8.5"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.1 1.9"/>',
    pin: '<path d="M12 21s-6.4-5.5-6.4-10.9a6.4 6.4 0 0 1 12.8 0C18.4 15.5 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.6"/><path d="m4.6 7.6 7.4 5.4 7.4-5.4"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.4 4.4"/>',
    refresh: '<path d="M19.4 12.6a7.4 7.4 0 1 1-2.1-6"/><path d="M19.6 4.4v3.8h-3.8"/>',
    check: '<path d="m5 12.6 4.4 4.4L19 7.4"/>',
    checks: '<path d="m2.8 12.8 4.3 4.3 9-9.6M12.6 16.6l.5.5 9-9.6"/>',
    more: '<circle cx="12" cy="12" r="8.8"/><circle cx="7.9" cy="12" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="16.1" cy="12" r=".9" fill="currentColor"/>',
    cap: '<path d="M2.6 9.4 12 5l9.4 4.4L12 13.8z"/><path d="M6.4 11.4v4.5c1.6 1.4 3.6 2.1 5.6 2.1s4-.7 5.6-2.1v-4.5M21.4 9.4v5"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.6M12 7.7v.2"/>',
    warn: '<path d="M12 4.2 2.9 19.6h18.2z"/><path d="M12 10v4.4M12 17.2v.2"/>',
    lock: '<rect x="5" y="10.4" width="14" height="10" rx="2.2"/><path d="M8 10.4V8a4 4 0 0 1 8 0v2.4"/>',
    globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.3 2.4 3.4 5.3 3.4 8.6s-1.1 6.2-3.4 8.6c-2.3-2.4-3.4-5.3-3.4-8.6S9.7 5.8 12 3.4z"/>',
    library: '<path d="M4 20.2h16M5.6 17.2V9.6M9.6 17.2V9.6M14.4 17.2V9.6M18.4 17.2V9.6M3.6 9.4 12 4.4l8.4 5z"/>',
    inbox: '<path d="M4 13.6 6.4 5.6h11.2l2.4 8v4.6a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.2z"/><path d="M4 13.6h4.6l1 2h4.8l1-2H20"/>',
    video: '<rect x="3" y="6.4" width="12.6" height="11.2" rx="2.6"/><path d="m15.6 10.6 5.2-3v8.8l-5.2-3z"/>',
    swap: '<path d="M6.5 8h12l-3.2-3.2M17.5 16h-12l3.2 3.2"/>',
    cloud: '<path d="M7.2 18.6h10.3a3.6 3.6 0 0 0 .6-7.2 5.6 5.6 0 0 0-10.8-1.3 4.2 4.2 0 0 0-.1 8.5z"/>',
    idcard: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.6"/><circle cx="9" cy="11" r="2"/><path d="M6 15.6c.7-1.3 1.8-2 3-2s2.3.7 3 2M14 10.2h3.6M14 13.6h3.6"/>',
    trend: '<path d="m4 16.4 5.2-5.2 3.6 3.6L20 7.6"/><path d="M15 7.6h5v5"/>',
    sparkle: '<path d="M12 3.6c.6 4.3 2.1 5.8 6.4 6.4-4.3.6-5.8 2.1-6.4 6.4-.6-4.3-2.1-5.8-6.4-6.4 4.3-.6 5.8-2.1 6.4-6.4z"/>',
    help: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 17v.2"/>',
    person: '<circle cx="12" cy="8.6" r="3.6"/><path d="M5 20.2a7 7 0 0 1 14 0"/>',
    seat: '<path d="M6 11V6.6A2.6 2.6 0 0 1 8.6 4h6.8A2.6 2.6 0 0 1 18 6.6V11"/><path d="M4.5 11h15v4.4h-15zM6.4 15.4V20M17.6 15.4V20"/>',
  };
  const ico = (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const CHEV = '<svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 6.5 7l-5 5.5"/></svg>';
  const BACK = '<svg class="i" viewBox="0 0 12 22" aria-hidden="true"><path d="M10 2 2 11l8 9"/></svg>';
  const EXT = ico('ext', 'ext');

  /* ================================================================== light / dark */
  // 'auto' follows the phone. The choice is kept per site (localStorage), on *.kuleuven.be in a cookie
  // (so the login page knows it too) and handed to the course pages on ultra.edu.kuleuven.cloud in the link (th=).
  const THEME_KEY = 'tm4:theme';
  function readTheme() {
    const m = /[?&#]th=(light|dark|auto)\b/.exec(location.hash + '&' + location.search);
    if (m) return m[1];
    let t = '';
    try { t = localStorage.getItem(THEME_KEY) || ''; } catch (_) {}
    if (!t) { try { const c = /(?:^|;\s*)tm4theme=(light|dark|auto)/.exec(document.cookie || ''); if (c) t = c[1]; } catch (_) {} }
    return t || 'auto';
  }
  function saveTheme(t) {
    try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
    if (/(^|\.)kuleuven\.be$/.test(location.hostname)) {
      try { document.cookie = `tm4theme=${t}; domain=kuleuven.be; path=/; max-age=31536000; secure; samesite=lax`; } catch (_) {}
    }
  }
  let THEME = readTheme();
  const isDark = () => THEME === 'dark' || (THEME === 'auto' && W.matchMedia && W.matchMedia('(prefers-color-scheme: dark)').matches);
  function applyTheme(t) {
    THEME = t;
    const r = document.documentElement;
    if (!r) return;
    r.classList.toggle('light', t === 'light');
    r.classList.toggle('dark', t === 'dark');
    const head = document.head;
    if (!head) return;
    let m = head.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); head.appendChild(m); }
    m.setAttribute('content', isDark() ? '#000000' : '#f2f2f7');
  }
  try { W.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (THEME === 'auto') applyTheme('auto'); }); } catch (_) {}
  // links are drawn once and kept, so a link drawn before the choice changed still carries the old one:
  // put the current choice in at the moment the link is used
  const withTheme = (url) => String(url || '').replace(/([?&#]th=)(light|dark|auto)\b/, '$1' + THEME);
  function initThemeLinks() {
    if (W.__tm4themelinks) return;
    W.__tm4themelinks = true;
    const fix = (e) => {
      const a = e.target && e.target.closest && e.target.closest('a[href*="th="]');
      if (!a) return;
      const h = a.getAttribute('href'), n = withTheme(h);
      if (n !== h) a.setAttribute('href', n);
    };
    W.addEventListener('pointerdown', fix, true);
    W.addEventListener('click', fix, true);
  }

  /* Blackboard's and KU Loket's own pages (the ones the app leaves alone) have no dark look of their own. In dark
     mode they get a "smart invert": light becomes dark, colours keep their hue, and pictures, videos and embedded
     documents are turned back so they look exactly as they should. */
  function classicDark() {
    if (THEME === 'light') return;
    const css = 'html{filter:invert(1) hue-rotate(180deg)!important;background:#fff!important}'
      + 'html :is(img,video,iframe,canvas,picture,embed,object,[style*="background-image"]){filter:invert(1) hue-rotate(180deg)!important}'
      + 'html picture img,html :is(img,video,iframe,canvas,picture,embed,object,[style*="background-image"]) :is(img,video,iframe,canvas,picture,embed,object,[style*="background-image"]){filter:none!important}';
    const st = document.createElement('style');
    st.id = 'tm4-dark';
    st.textContent = THEME === 'dark' ? css : `@media (prefers-color-scheme:dark){${css}}`;
    const add = () => { const box = document.head || document.documentElement; if (box && !document.getElementById('tm4-dark')) box.appendChild(st); };
    if (document.documentElement) add();
    else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); add(); } }); mo.observe(document, { childList: true }); }
    // keep it last, so later stylesheets can't win
    const keep = () => { if (document.head && st.parentNode && st !== document.head.lastElementChild) document.head.appendChild(st); };
    W.addEventListener('DOMContentLoaded', keep);
    W.addEventListener('load', keep);
  }

  const TM_ICON = 'https://toledo.kuleuven.be/portal/images/favicon/apple-touch-icon.png'; // Toledo's own icon (public)

  /* ================================================================== shell */
  function takeover(title, preconnect) {
    try { W.stop(); } catch (_) {}
    // reuse the page's own <html> and let the parser create head + body (a detached, script-built body
    // can leave the browser without a first paint)
    let root = document.documentElement;
    if (!root) { root = document.createElement('html'); document.appendChild(root); }
    Array.from(root.attributes).forEach((a) => root.removeAttribute(a.name));
    root.innerHTML = '<head></head><body></body>';
    root.lang = 'nl';
    root.className = 'tm4';
    const head = document.head;
    const add = (tag, attrs) => { const m = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => m.setAttribute(k, v)); head.appendChild(m); return m; };
    add('meta', { charset: 'utf-8' });
    add('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' });
    add('meta', { name: 'format-detection', content: 'telephone=no' });
    (preconnect || []).forEach((h) => add('link', { rel: 'preconnect', href: h, crossorigin: 'use-credentials' }));
    add('title', {}).textContent = title;
    // home-screen icon (Safari's "Zet op beginscherm" reads it from the page; without one it draws a letter)
    add('link', { rel: 'apple-touch-icon', sizes: '180x180', href: TM_ICON });
    add('link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'https://toledo.kuleuven.be/portal/images/favicon/favicon-32x32.png' });
    add('style', { 'data-tm4': '' }).textContent = CSS;
    applyTheme(THEME);
    if (/[?&#]th=(light|dark|auto)\b/.test(location.hash + '&' + location.search)) saveTheme(THEME);
    try { history.scrollRestoration = 'manual'; } catch (_) {}
    initPress();
    initMotion();
    initThemeLinks();
    keepOut();
  }

  // Safari can keep handing the page's own markup and styles to the document after we took over (when the whole
  // page had already arrived, or when the extension started the script a moment late), and the site's own app may
  // still add things. None of that may show for even a moment or restyle the app: the CSS hides everything in
  // <body> that isn't ours, and stylesheets that aren't ours are taken out as soon as they appear.
  function keepOut() {
    const root = document.documentElement;
    if (!root || root.__tmKeep) return;
    root.__tmKeep = true;
    const foreignStyle = (n) => n.nodeType === 1 && !n.hasAttribute('data-tm4') && (n.tagName === 'STYLE' || (n.tagName === 'LINK' && /stylesheet/i.test(n.getAttribute('rel') || '')));
    const clean = () => {
      [root, document.head].forEach((box) => { if (box) Array.from(box.children).forEach((n) => { if (foreignStyle(n)) n.remove(); }); });
      if (document.head && headObs.__on !== document.head) { headObs.disconnect(); headObs.observe(document.head, { childList: true }); headObs.__on = document.head; }
    };
    const headObs = new MutationObserver(clean);
    new MutationObserver(clean).observe(root, { childList: true });
    clean();
  }

  // a page on the way somewhere else (a redirect, Toledo's link service): cover it in the app's colours instead of
  // showing it, without touching it (its own redirect has to keep running)
  function cover(text) {
    const dark = isDark();
    const st = document.createElement('style');
    st.textContent = `html{background:${dark ? '#000' : '#f2f2f7'}!important}body{visibility:hidden!important}html::after{content:"${text}";visibility:visible;position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:${dark ? '#000' : '#f2f2f7'};color:${dark ? '#98989f' : '#6d6d72'};font:600 17px -apple-system,system-ui,sans-serif}`;
    (document.head || document.documentElement).appendChild(st);
    // still here after a while: the page has something to say (an error, a question), so show it after all
    setTimeout(() => st.remove(), 7000);
  }

  /* ================================================================== page-to-page motion */
  // Going to another page (a course, back to the app's tabs, a file) is a real page load in Safari. Safari keeps
  // showing the current page until the next one can paint, so the tap gets an answer right away: the content
  // slides aside and dims and a loading bar runs under the navigation bar. The next page then slides in, like
  // a screen being pushed (or popped) in an app, instead of popping up after a white flash.
  let leaveT = 0;
  function leaving(dir) {
    const r = document.documentElement;
    if (!r || !r.classList.contains('tm4')) return;
    r.classList.remove('tm-arrive', 'tm-arrive-fwd', 'tm-arrive-back', 'tm-leave-fwd', 'tm-leave-back');
    void r.offsetWidth;
    r.classList.add('tm-leaving', dir === 'back' ? 'tm-leave-back' : 'tm-leave-fwd');
    clearTimeout(leaveT);
    leaveT = setTimeout(stay, 8000); // a download, or a link that opened elsewhere: give the page back
  }
  function stay() {
    clearTimeout(leaveT);
    const r = document.documentElement;
    if (r) r.classList.remove('tm-leaving', 'tm-leave-fwd', 'tm-leave-back');
  }
  function goTo(url, { replace, dir } = {}) {
    url = withTheme(url);
    if (!TEST) leaving(dir);
    if (replace) location.replace(url); else location.href = url;
  }
  // which way does a link go? back to the app's tabs (portal) is "back", everything else is "forward"
  const dirOf = (url) => (SITE !== 'portal' && /^https:\/\/toledo\.kuleuven\.be\/portal/.test(url) ? 'back' : 'fwd');
  function initMotion() {
    if (W.__tm4motion) return;
    W.__tm4motion = true;
    const r = document.documentElement;
    const ref = hostOf(document.referrer);
    const arrive = SITE === 'ultra' ? (/^toledo\.kuleuven\.be$|journey/.test(ref) ? 'fwd' : '')
      : (/kuleuven\.cloud$|journey|^webwsp\./.test(ref) ? 'back' : '');
    r.classList.add(arrive ? 'tm-arrive-' + arrive : 'tm-arrive');
    setTimeout(() => r.classList.remove('tm-arrive', 'tm-arrive-fwd', 'tm-arrive-back'), 600);
    // ordinary links that leave the page (the app's own handlers run first and cancel what they handle)
    W.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
      const u = absU(a.getAttribute('href'), location.href);
      if (!/^https:/.test(u) || u.split('#')[0] === location.href.split('#')[0]) return;
      if (!TEST) leaving(dirOf(u));
    });
    // back here from the next page (Safari's back/forward cache): slide the page back into place
    W.addEventListener('pageshow', (e) => { if (e.persisted) stay(); });
    // a link that opened another app (Outlook, Teams…): give the page back when you return
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') stay(); });
  }

  function buildShell(tabs, active) {
    document.body.innerHTML = '<header class="nav" id="tm-nav" data-tm4><div class="nav-l"></div><div class="nav-t"></div><div class="nav-r"></div></header><main id="tm-main" data-tm4></main>'
      + (tabs ? `<nav class="tabbar" id="tm-tabs" data-tm4 aria-label="Navigatie">${tabs.map((t) => `<a href="${esc(t.href)}" data-tab="${t.id}"${t.id === active ? ' class="on" aria-current="page"' : ''}>${ico(t.icon)}<span>${t.label}</span><b class="badge" hidden></b></a>`).join('')}</nav>` : '');
    if (!tabs) document.body.classList.add('no-tabs');
    const nav = $('#tm-nav');
    let ticking = false;
    const upd = () => { ticking = false; nav.classList.toggle('scrolled', W.scrollY > 3); };
    W.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  }
  const setTabOn = (id) => $$('#tm-tabs a').forEach((a) => {
    const on = a.dataset.tab === id;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  function setBadge(id, n) {
    const b = $(`#tm-tabs a[data-tab="${id}"] .badge`);
    if (!b) return;
    b.hidden = !n;
    b.textContent = n > 99 ? '99+' : String(n || '');
  }
  function setNav({ back, title, right, always } = {}) {
    const nav = $('#tm-nav');
    if (!nav) return;
    put(nav.querySelector('.nav-l'), back ? `<a class="nb back" href="${esc(back.href || '#')}"${back.act ? ` data-act="${back.act}"` : ''}>${BACK}<span>${esc(back.label || 'Terug')}</span></a>` : '');
    nav.querySelector('.nav-t').textContent = title || '';
    put(nav.querySelector('.nav-r'), right || '');
    nav.classList.toggle('always', !!always);
    nav.classList.toggle('scrolled', W.scrollY > 3);
  }
  let navIO = null;
  function watchTitle(scope) {
    const nav = $('#tm-nav');
    if (!nav) return;
    if (navIO) navIO.disconnect();
    nav.classList.remove('titled');
    const h = scope && scope.querySelector('.lt h1');
    if (!h || !('IntersectionObserver' in W)) { nav.classList.add('titled'); return; }
    const top = Math.round(nav.getBoundingClientRect().height);
    navIO = new IntersectionObserver(([e]) => nav.classList.toggle('titled', !e.isIntersecting && e.boundingClientRect.top < top), { rootMargin: `-${top}px 0px 0px 0px` });
    navIO.observe(h);
  }

  /* if the site's own app got to run before we took over, it may still rewrite the address: keep ours */
  function guardPath() {
    const path = location.pathname;
    setInterval(() => {
      if (location.pathname !== path) { try { history.replaceState(history.state, '', path + location.hash); } catch (_) {} }
    }, 700);
  }

  /* touch feedback that waits a moment, so rows don't flash while you scroll */
  function initPress() {
    if (W.__tm4press) return;
    W.__tm4press = true;
    const SEL = '.row, .tile, .chip, .btn, .hero, .lesson[data-href], .exam[data-href], .ann, .teaser, .wd, .nb, .tabbar a, .sheet .sa, .frow, .more-row';
    let el = null, t = 0, x = 0, y = 0;
    const clear = () => { clearTimeout(t); if (el) { const e = el; setTimeout(() => e.classList.remove('pressed'), 110); } el = null; };
    document.addEventListener('touchstart', (ev) => {
      const target = ev.target.closest && ev.target.closest(SEL);
      clearTimeout(t);
      if (el) el.classList.remove('pressed');
      el = target || null;
      if (!el) return;
      x = ev.touches[0].clientX; y = ev.touches[0].clientY;
      t = setTimeout(() => el && el.classList.add('pressed'), 65);
    }, { passive: true });
    document.addEventListener('touchmove', (ev) => {
      if (!el) return;
      const p = ev.touches[0];
      if (Math.abs(p.clientX - x) > 9 || Math.abs(p.clientY - y) > 9) { clearTimeout(t); el.classList.remove('pressed'); el = null; }
    }, { passive: true });
    document.addEventListener('touchend', () => { if (el) el.classList.add('pressed'); clear(); }, { passive: true });
    document.addEventListener('touchcancel', clear, { passive: true });
  }

  function sheet({ title, msg, actions }) {
    const layer = document.createElement('div');
    layer.setAttribute('data-tm4', '');
    layer.innerHTML = `<div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true"><div class="sg">${title || msg ? `<div class="sh-t">${title ? `<b>${esc(title)}</b>` : ''}${msg ? esc(msg) : ''}</div>` : ''}${actions.map((a, i) => (a.href ? `<a class="sa${a.red ? ' red' : ''}" href="${esc(a.href)}" data-i="${i}">${esc(a.label)}</a>` : `<button type="button" class="sa${a.red ? ' red' : ''}" data-i="${i}">${esc(a.label)}</button>`)).join('')}</div><div class="sg"><button type="button" class="sa bold" data-i="-1">Annuleer</button></div></div>`;
    document.body.appendChild(layer);
    const scrim = layer.querySelector('.scrim');
    const sh = layer.querySelector('.sheet');
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); }));
    const close = () => { scrim.classList.remove('on'); sh.classList.remove('on'); setTimeout(() => layer.remove(), 340); };
    scrim.addEventListener('click', close);
    sh.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const a = actions[Number(b.dataset.i)];
      close();
      if (a && a.run) { e.preventDefault(); try { a.run(); } catch (err) { console.error(err); } }
    });
  }

  let toastT = 0;
  function toast(msg) {
    let t = $('#tm-toast');
    if (!t) { t = document.createElement('div'); t.id = 'tm-toast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('data-tm4', ''); document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2300);
  }

  /* pull down at the top of the page to refresh, like in an app. run() returns a promise (or nothing). */
  function pullRefresh(run) {
    if (W.__tm4ptr || !('ontouchstart' in W)) return;
    W.__tm4ptr = true;
    const ind = document.createElement('div');
    ind.className = 'ptr';
    ind.setAttribute('data-tm4', '');
    ind.setAttribute('aria-hidden', 'true');
    ind.innerHTML = '<span class="spin"></span>';
    document.body.appendChild(ind);
    const spin = ind.firstChild;
    const GO = 72;
    let y0 = 0, x0 = 0, pull = 0, on = false, busy = false;
    const reset = () => { ind.classList.remove('drag', 'busy'); ind.style.transform = ''; ind.style.opacity = ''; spin.style.transform = ''; };
    document.addEventListener('touchstart', (e) => {
      on = false;
      if (busy || W.scrollY > 0 || e.touches.length !== 1 || document.querySelector('.sheet') || (e.target.closest && e.target.closest('input, textarea, .tiles, .chips, .week'))) return;
      on = true; pull = 0; y0 = e.touches[0].clientY; x0 = e.touches[0].clientX;
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!on) return;
      const dy = e.touches[0].clientY - y0, dx = Math.abs(e.touches[0].clientX - x0);
      if (W.scrollY > 2 || (pull < 10 && dx > Math.max(dy, 8))) { on = false; pull = 0; reset(); return; }
      pull = Math.max(0, dy);
      const d = Math.min(GO * 1.5, pull * 0.6);
      ind.classList.add('drag');
      ind.style.opacity = String(Math.min(1, pull / GO));
      ind.style.transform = `translate3d(0,${d}px,0)`;
      spin.style.transform = `rotate(${Math.round(pull * 3)}deg)`;
    }, { passive: true });
    const end = () => {
      if (!on) return;
      on = false;
      if (pull * 0.6 < GO * 0.75) { reset(); pull = 0; return; }
      pull = 0;
      busy = true;
      ind.classList.remove('drag');
      ind.classList.add('busy');
      ind.style.opacity = '1';
      ind.style.transform = 'translate3d(0,52px,0)';
      const t0 = Date.now();
      let p; try { p = Promise.resolve(run()); } catch (_) { p = Promise.resolve(); }
      const done = () => setTimeout(() => { busy = false; ind.style.opacity = '0'; ind.style.transform = ''; setTimeout(reset, 300); }, Math.max(0, 650 - (Date.now() - t0)));
      Promise.race([p, new Promise((r) => setTimeout(r, 12000))]).then(done, done);
    };
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', () => { if (on) { on = false; pull = 0; reset(); } }, { passive: true });
  }

  /* ================================================================== building blocks */
  function row(o) {
    const isLink = !!o.href;
    const tag = isLink ? 'a' : (o.act ? 'button' : 'div');
    const attrs = (isLink ? ` href="${esc(o.href)}"` : o.act ? ` type="button" data-act="${o.act}"` : '') + (o.attrs || '') + (o.style ? ` style="${o.style}"` : '');
    const lead = o.iconHtml || (o.icon ? `<span class="ic${o.soft ? ' soft' : ''}">${ico(o.icon)}</span>` : '');
    const tail = (o.end || '') + (o.external ? EXT : (o.chevron === false || (!isLink && !o.act) ? '' : CHEV));
    return `<${tag} class="row${o.cls ? ' ' + o.cls : ''}"${attrs}>${o.dot ? '<i class="dot lead"></i>' : ''}${lead}<span class="main"><span class="t${o.bold ? ' b' : ''}${o.clamp ? ' clamp2' : ''}">${o.titleHtml || esc(o.title)}</span>${o.sub || o.subHtml ? `<span class="s${o.subOne ? ' one' : ''}">${o.subHtml || esc(o.sub)}</span>` : ''}</span>${tail ? `<span class="end">${tail}</span>` : ''}</${tag}>`;
  }
  const skRows = (n) => Array.from({ length: n }, (_, i) => `<div class="sk-row"><span class="sk ic"></span><span class="lines"><span class="sk" style="display:block;width:${70 + ((i * 37) % 25)}%"></span><span class="sk" style="display:block"></span></span></div>`).join('');
  const skGroup = (n) => `<div class="group">${skRows(n)}</div>`;
  const empty = (icon, title, text, extra) => `<div class="empty">${ico(icon)}<b>${esc(title)}</b>${text ? esc(text) : ''}${extra || ''}</div>`;
  function segHtml(items, active, act) {
    const i = Math.max(0, items.findIndex((x) => x.id === active));
    return `<div class="seg" role="tablist"><span class="thumb" style="width:calc((100% - 4px) / ${items.length});transform:translateX(${i * 100}%)"></span>${items.map((x) => `<button type="button" role="tab" data-act="${act}" data-id="${x.id}"${x.id === active ? ' class="on" aria-selected="true"' : ' aria-selected="false"'}>${esc(x.label)}</button>`).join('')}</div>`;
  }
  function segSet(scope, id) {
    const seg = scope.querySelector('.seg');
    if (!seg) return;
    const btns = $$('button', seg);
    const i = Math.max(0, btns.findIndex((b) => b.dataset.id === id));
    btns.forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', String(j === i)); });
    seg.querySelector('.thumb').style.transform = `translateX(${i * 100}%)`;
  }

  function ftype(name, mime) {
    const s = `${name || ''} ${mime || ''}`.toLowerCase();
    if (/pdf/.test(s)) return ['PDF', '#e5484d'];
    if (/powerpoint|presentation|\.pptx?\b|\.key\b/.test(s)) return ['PPT', '#ef6c2a'];
    if (/msword|wordprocessing|\.docx?\b|\.rtf\b|\.pages\b/.test(s)) return ['DOC', '#2f6fde'];
    if (/excel|spreadsheet|\.xlsx?\b|\.csv\b|\.numbers\b/.test(s)) return ['XLS', '#1f9d55'];
    if (/video|\.(mp4|mov|m4v|avi|webm)\b/.test(s)) return ['VID', '#8e5bd8'];
    if (/audio|\.(mp3|m4a|wav|aac)\b/.test(s)) return ['AUD', '#0fa5a5'];
    if (/image|\.(png|jpe?g|gif|heic|webp|svg)\b/.test(s)) return ['IMG', '#d6409f'];
    if (/zip|compressed|\.(zip|rar|7z)\b/.test(s)) return ['ZIP', '#8e8e93'];
    return ['FILE', '#8e8e93'];
  }

  /* allow-list HTML cleaner: rebuilds the markup from scratch, so no scripts, styles or handlers survive */
  const KEEP = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, A: 1, UL: 1, OL: 1, LI: 1, H1: 'H3', H2: 'H3', H3: 1, H4: 1, H5: 1, H6: 1, BLOCKQUOTE: 1, PRE: 1, CODE: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TD: 1, TH: 1, IMG: 1, SPAN: 1, DIV: 1, HR: 1, SUP: 1, SUB: 1, FIGURE: 1, FIGCAPTION: 1, SMALL: 1, MARK: 1 };
  const DROP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OBJECT|EMBED|FORM|INPUT|BUTTON|SELECT|TEXTAREA|LINK|META|SVG|MATH|HEAD|TITLE|BASE|CANVAS|AUDIO|SOURCE|TRACK)$/;
  function sanitize(html, onAnchor) {
    const src = new DOMParser().parseFromString(String(html || ''), 'text/html').body;
    const out = document.createElement('div');
    const walk = (from, to) => {
      for (const n of Array.from(from.childNodes)) {
        if (n.nodeType === 3) { to.appendChild(document.createTextNode(n.nodeValue)); continue; }
        if (n.nodeType !== 1) continue;
        const tag = n.tagName;
        if (DROP.test(tag)) continue;
        if (tag === 'A' && onAnchor) { const rep = onAnchor(n); if (rep) { to.insertAdjacentHTML('beforeend', rep); continue; } }
        if (tag === 'IFRAME' || tag === 'VIDEO') {
          const srcEl = n.getAttribute('src') ? n : n.querySelector('source');
          const s = absU(srcEl ? srcEl.getAttribute('src') || '' : '');
          if (s.startsWith('https:')) to.insertAdjacentHTML('beforeend', `<a class="embed" href="${esc(s)}">${ico('play')}Video openen</a>`);
          continue;
        }
        const k = KEEP[tag];
        if (!k) { walk(n, to); continue; }
        const el = document.createElement(k === 1 ? tag : k);
        if (tag === 'A') { const h = absU(n.getAttribute('href') || ''); if (h) el.setAttribute('href', h); }
        else if (tag === 'IMG') {
          const s = absU(n.getAttribute('src') || '');
          if (!s.startsWith('https:')) continue;
          el.setAttribute('src', s); el.setAttribute('loading', 'lazy'); el.setAttribute('alt', n.getAttribute('alt') || '');
        } else if (tag === 'TD' || tag === 'TH') ['colspan', 'rowspan'].forEach((a) => { if (n.hasAttribute(a)) el.setAttribute(a, n.getAttribute(a)); });
        to.appendChild(el);
        if (tag !== 'IMG') walk(n, el);
      }
    };
    walk(src, out);
    $$('p, div, span', out).reverse().forEach((e) => { if (!e.textContent.trim() && !e.querySelector('img, a, br, hr, table')) e.remove(); });
    return out.innerHTML;
  }
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
              sc: String(r.resultTotalScale || '').trim(), st: String(r.awStatus || '').trim(), d: sapDate(r.releaseDate), n: Number(r.numberOfBookings) || 1, sit: String(r.situeringsCode || '').trim(),
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
const [a,b]=await Promise.allSettled([studyData(),ispData()]); return {a,b};})()
