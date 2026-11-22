  /* ================================================================== environment */
  const W = window;
  const VERSION = '__VERSION__';
  const SITE = { 'toledo.kuleuven.be': 'portal', 'ultra.edu.kuleuven.cloud': 'ultra', 'webwsp.aps.kuleuven.be': 'loket', 'idp.kuleuven.be': 'idp' }[location.hostname];
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

  const TM_ICON = 'data:image/png;base64,__ICON__';

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
    add('link', { rel: 'icon', type: 'image/png', href: TM_ICON });
    add('style', {}).textContent = CSS;
    applyTheme(THEME);
    if (/[?&#]th=(light|dark|auto)\b/.test(location.hash + '&' + location.search)) saveTheme(THEME);
    try { history.scrollRestoration = 'manual'; } catch (_) {}
    initPress();
    initMotion();
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
