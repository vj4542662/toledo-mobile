  /* ================================================================== environment */
  const W = window;
  const VERSION = '__VERSION__';
  const SITE = { 'toledo.kuleuven.be': 'portal', 'ultra.edu.kuleuven.cloud': 'ultra', 'webwsp.aps.kuleuven.be': 'loket', 'idp.kuleuven.be': 'idp', 'icts-p-toledo-journey.cloud.icts.kuleuven.be': 'journey', 'kurt3.ghum.kuleuven.be': 'kurt', 'raw.githubusercontent.com': 'install' }[location.hostname];
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

  // run fn once the parser has created <html> (before any of the page's own scripts can run)
  const whenRoot = (fn) => {
    if (document.documentElement) { fn(); return; }
    const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); fn(); } });
    mo.observe(document, { childList: true });
  };

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
  // room links (www.kuleuven.be/lokalen/<id>.htm) open the app's own room page on KU Loket
  const roomHref = (u) => { const m = /^https?:\/\/www\.kuleuven\.be\/lokalen\/(\d{6,10})\.htm/.exec(String(u || '')); return m ? `${LOKET}?tm=room&id=${m[1]}` : u || ''; };
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
  // Userscripts on iPhone never updates by itself. The app checks GitHub (a tiny version.json) when it opens and
  // whenever you come back to it, shows a notification at the top as soon as there is a new version, and walks you
  // through installing it in plain language. After the update it says what is new.
  const UPDATE_URL = 'https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/toledo-mobile.user.js';
  const VERSION_URL = 'https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/version.json';
  const TM_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAACQCAIAAABoJHXvAAAinUlEQVR42u2deZgkV3HgI+K9zLqruvq+5h7NCSMhobVASCDACGO8IAkQCAG2vDaLYLExXi/I2GB7YX3Ahw1rLGyEsQ0rQFg2Zg1rm09ghBCgC3TMKfXM9Mz0WVXddVdlvhexf2T3qK85q2q6R6745o+Zb6qrM/OXES9eXA/hDb8Bbbl4hNqPoA2sLW1gbWkDawNrSxtYW9rA2sDa0gbWljawNrC2tIG1pQ2sDawtbWBtaQNrA2vLWhH93LgNXPQXWfg/J/8hbWCriAdBEAEBBIAFBRAEAFBkOUkJ/oIghBL8iAjIApZtYK0y34QiAFZQWIEQCAIKEIeUSZJxSBxkZx4EA9SZPCGPqcrkWW1P/ggyECsUBOCLCp6+GDgJIVhBZmJWgKKVvyFS2hkt7YqWdkTK69xqr+t1KKORFYqat48iYAR9wbpQxaoJP3SsHjlUjT1ZjR+sxkbrEc84IAjEQFajsAA/a1zbwM7d7gX6xFYxK1B2c6R8dXLmmmTuilhhXajaoX2NwoIG0AgaQQEQwYVf4SBHEQiAXNkRLWsUAjGCeeMc98JPVeIPFNMPFNJPVBLGd4EYyRIKy9pVOFyDZW4BKisERgPxtmjxtempn0tP74kVuh1PBGtCHlNACIN1CuX0qnGSZfAjGsUlDiETStHqvZX4N3O9X8/1PVFOAivQRiGvTWxrC9gcKiawOurUfz49fUvviZckc13a95gqrHxBBEAUhIaMl8wjFACNEiEbJs5b/cNC+u+mh/4p11fyQqCMojWHbQ0BU/OoukLVt/We+KXeY7uiJQYoW+0L0jynVggDsoBGiSmrUfZXYn87NfyFqeGpWjTAZgXbwBa4FSgiKMZJubV39o/+Sv/olnClwqpiVQDygl1JACZCNqbskVrkrsl1n5nYMFOPoPYRhdcANgW7XrS6NlChsNEA+Pa+Y399yeNv6RlzUApWW0CFQHiBXx0gBANYsjqp7avT06/vmqwIPVbuEKuUYlhtN3I1gRGKAIpxr0zlPr/tp78xdDhKNm8dAVC4mg8GAQjBApas7tL+Td0TL0nO7K/FjlcSQBxc9n84YBrFWu2g/M76g3dufWJrpJozTqBVa2S5CLD5gGWrd0TLt/SMucr8oNBlWWni1dqxrQ4wjWJ8d1cs/9Udj76j90SJdY2VXsmnEAABDIJPJ/8EgaZGvURBhjN/bYCtykoAXpOevjaV/VGxY6oWU8quip5daGAIQoDWuLf0j355x2NbwtWscZavVXPxJ0BNEiEbVTZKHCGOEIeIXRQEMIBWEADxrJ8bC1pARAghh4mjykbmvzZMQUwLjVDwGVy8tgFA0eqtkcpbesaO+aEnCp1EPL+ve45GOgiFmUTwo5uf+q2hkbJVBaOdxU4gA7BgmDitfSs45Yf21iPTvjNrHF8QERJku7Q/6NaGQrVO7deZyqxY8PTOpBUklIQyLnHJqmNeZMpzZ60uWx3sySLE3drbEK4OuHUHuWx1lYlQaIGqOSh5o0PIX9r2kz2xwm8f2QnIRHwhvUd9YWmpCPJd2x97S/f4tO8SysKnHGhVlGxU2yO1yJemh7410/NoKXnCDwErePahCJDElL8tXLk2lfvPnZM/k5gNIeetXhGbFVQondqvCn2/kP7nmd77C537q7GS1XPh42e/lnvd+mXR4mvSU6/pnNoSrlRZla1SC2y1RjGAOePcMfzMulD1Vw5dWmdFZC8Yswu0DyMUtiqt/Xt2PvLyVHbKd5coVvBY09rfV41/dnz93ZnB6Vo0iMQDMoGctHtzEQpBEAImUPbqRO6d/aM3dE04KHmr9YJvNoIpbepM92T6Pze5/oeFNLAKvhNQlnwtC4IgsAKBdKh2c/f47QNHdkdLs8axy14FX7DP8b412/2W/Vfkrb5gzC4EsIBWl+N9fddDVyXyGd9ZQssIJpSpC33yxKY/G9uU98JBfAHmcl0ru3CIQsFSZxUAvjiV/f0NB16eyuaMc/Jjndr/19nuDx3Z8XAxDSCorELh+aDUqWJjABDEXBJO/b2Dh//78IiLUrRKL2PW4/gPFlOv23tl1ndJXQhmLXc6AkuY0ubrux56USKfMSvQ6tT+U9XEzfsvv3tyfR1AayMAPOe5ncbTw8C3JsVEPFqNfXF62Ad8ZSprhAggTPZ3R7fd/vSesXpEaYPEwY+c8WsFEBG0sjVR98/03lfovCqZ2xiqlVktdI4UQtGqS8KVa1LZe7MDVdZE3GrXsbXAEASFQij/sOuha5MzK9Lq1v43Znpu2HflSDWuHT9AdY4+OgqgUiwA38v17atFb+qaRIS3HbrsrhObSRtUPJeVPscAIwJoZY9V41/JDOyJFy6NlkrLmJVYbQtXrkzOfm160Aq12mdsITAEIEAW9YXtP3l959S0cVeg5Xj35vpu3v/CqiilTCMxVpl/vk8VOn9cSXwlM/CtzJB26xawkbeeAZWyVdZfmx58XrzwglixvBKzPdHSxnD57zNDrY58thCYRrHG/f1Ne98zMDq5kpfRoc39hfQb9l3pAzbLOWZA0makkjhci5H2mxJlF0AitoLfyPZf15HdHKnWljErWP2ixCygfCfXr5VtXRykVWVuCsX47s39o3cMPzPtucs3WyHiE17o1oOX1ZiwqVsZFiRlSJnmfqcirrJ+68HLpn03RLxEjxyUaT/0oeFnbuw7Zny3dXrWEmCEYq3emZj935v2Fo2mZVcvghGy7x3ZNVaN6xY4VyzY9O+0glqZ0Uri1w7vjK7kxBNKmdWdm5/aHp+1doW7XqPAEAAFQ2T/ausTCWV8WZohsYJp7d+T7f+/mUHteEbWet3LwkVXO969U8P3ZPvTy+wtAtSZUtp8duuTDjIK4kUBjFCscT647tDViZlZq5cbB4VSZvWx41twWRXh2hcGQJQPH7sk2KHLsmV7xuiXJnO/ue5pa5xWKFmTgSkUa/QVHZnfHDqcXebEB+qVUubebN9TxTQ15hauDjBBUuZQMfWNXG9ypWVSo+SM88GhkUuT2VYYxmYCQwAR1MR/smG/PkVCnVDqQndOrseLuXQaEe7ODPIpHoIVDBF/fON+QoZmv5HNBEYobJxb+469LJXLmxWMIQNEiPdXY4+VUqLsRadeJ5VMyN5f6NxfjUfIykpmZtboV3Rk39p7nI3TXI+RmqhezNQRqn5waKS00tIFc3kT++Nih+87Ci9WDRMARVz13O8X0tFTvHaEUrbqg8MjCbfG3MzCFGqieonVv9o/ui1Srp76EhHgp5UEACJcxIIAAPjTcgJP/VgrrHZGSr/SPyqneH1XE1igXp3hyjv7Rgunvj4C8IWeqUXhIvQPlygZoByqxTwmOrX/VbD69v7RdKhqm6dkzQGmUMTqX+w9vjlcrZ1GvVDqTNO++9wANmscTxBP8XYiQI1pc7jy9t7jTVQyaop6WaGoW/+l3uMlq05zZQTgC1asAhC46IlBXcjK6VQn2HHe1nc84tRtk/bR1Bz1Mvrn05M7o6UKqzM3JcBzRIwgn+lVrli1O1J6TeeUNMldbAIwBgTit/WMnf51m/OvUEJ0uvpZhDVUl3imDwiejfkBvK33ODSphoAa/nlhS1tjhauTM6e3hwHaEHKHNkHyCgEIRKFoFIVCIAtVMMjW62f/t4VCAGr+d9F8yc2zl7H4InEeZlxZB1nOZH5KVl2dmNkVzzMrati+NFo1RQjM6tWpTFr7076rTwtMBFySYbemADVKfUnnKwqQJQAAYUAREosckEIBYkQOKjKa8qoGLwQGlk0I7HwF1YISHQYUQREFQX3OfK+ti2IFNoaqYeKqOcNragTTjv+y5MzeQicpYFlVYIHYs+sRFgAC2R4pWd+1II42m6PF50VLO6OlYbc24Na6HN9FRoC6UNmqWeOc8ELP1KJ7q/GD1fiJetgYB5AhqKU5386toAPDCFqjQQiUGQ5VLwmXd0ZL2yLlYbea0iZG1kXxBatMBaun/NBILfpUJb6/Gj9Sj9R9B/zQ86JFfXburgA0KynRKDABAORHSskaqzMGOgmgxnRdKndgcORlHdkrE7MbQ9WkMgqFAa3MVfsGywMhqPm+f48pa5wD1fj9hfQ3Z3p/VOywxjmPhruTDYPGOKT9F3VkX52eviaZ2xYup7UfpCWtIM9Vcc+NKwgMMqEYwYLVR+uRHxU7Hsh3vbojU2F1RlutUCpWPVxKATI3wTA0VuYWBHw7HO/hPT/ocTz/TM6rADgoMWURpMqqzmTnO19hSfxDnl3PCEEjh5FDxBVWj5aSX54e/Gp2IHMuDXcnGwb7wuU394zf3D12aawYIVtnqgkZmcsiz/fgLroMWNBrGyIOk5X5TsMz3q+LMu6Frnj8xSXjNJ5RaoKGKeLZeuSBYvqt3WO5MzmvCOAL5nxHAIJC6FN+fvGTsIIl1gULCuWF8fxLkjPvHzr8hanhOyfWT9eip2+4C/rMre/2h8u3rz/49t4T60PVGlOZVckqmitxPIWPu6zov8KqbBXML4FnjBRHlflRKVXywqoZNSZNKMIhBLHKoNzcPb6kOuXUdgnoHNtPEADnf8oTVbYqqc316embuibqAA+X0sKkVioLVChsNQG8Z2jk85c88QudU4hQsNoAEQAh4LlfydlfvwCGiD98bNvBSqIpVYvN2IcJgrb35bsPVGMrphta4IWLRvEFp323x/H+YsuT39r94x3RkvXdhXXwgXNhfff5scK/Pe9Hf7Z5b+DKGkE9v4todTwkQnZ/Nf7t2W5Qa2MfFlyWRq54oa9mB2IXMMsVrCgBtlekMv/+/Aff2n/U+i7Or0MIYH3ntoEj33n+gy9Jzkz7ri+o8cJl4axgTNl7Mv1VL6SRm/KCNKsuEQVgxAu/tWcshHIhO4EDA1Vh5RLf3DMe0f63Z/oCT0CY/mTzU/9r4wGPVeUUDYMtVS8HJW+cd43sLloNTUqxNyeAwABK2WPl5N9OD6WaVL55br4TihXM+e4Hhp758o5HNAgJ3r3j0d8cGsn4LgPoC54vtYIpbb4wNXSiklDKcrPutGkvlCAq+8kTm27pHosra+RCpyiDFWvSD93cPR4hywCv75ya8kN6NVLbAhAiPlaPfHJ8Eza18LJppdqBf1+oR3yUGzqnilar1QjiKoSS1buipa3hyoxx9CoVIljBLu3/1tHt38v1KW2aWLndzJgqCyrt/8XYpvvynWltVqtCVKGUrC41NTF/TmIE09r/1mz3XRMblfabW4PcEDC9eNsuAIJihN4z8rySVc7qpZUJhVaJVtA2kDPOe555nhWUZQ9ByWoAIwBQ9IJy/epiFRSRLFAyZfYVO957eFfHangfqy4iGCd7+8jukXJSLag0VQKg6NpC5QXlGhDRamnYHSeyIIscDCuoHe9LExs+dnxLr1v3/yMx8wV7nPqHj229d3Kddjy7eHgjiPyPsZxubI4ONfIuZRz10kLl5um81aQWqL4VVMr/0OGdd46v73O8/yDMfME+t37nxPqPHt2uF1sXJWK1umUq/7JCJecoaGCtaEjDBKCg1EeOZXtrPi9QcwFgAFL2XU9f+leT6/qcuhGU5y6qIN3V59Q/P7nu3U/vIWXtgtIVAmBFg9X67x3P5JVqcEPWEDCLWCEc8s0fHZ0SRJLFDggIkf3VQ5f+6dimXscDuAgm6p6Xl4Ei2Ot4nx7f+MsHLxViWaBBCEAAAvDxI1O9vq0S2sY2qI2YRPAQEWBG0U250rvGssZRC/3GYFQ1kX3fM8//jcM7Y2RDyOa5ZR6NYAg5pf0PHN3+3qf3EHFw4wuNodHq3WO5186WZxUBgIfYSJEfnbcRCH63QdACM4r+4Hj2ldmCcfRiZiAASvufPHbJDfuvyBqnS/tG8DmgaixoBbscb8boN+2//I+OblfKX1LEp0WMo1+ZLfze8eyMIi1gELxV0zCAOmGNKFhDPcS7npm4PF8xeomezfmN/y/bf83jL/5atr/L8aJkLl5sLGgEY8qktP9/poaufvzF/5gZVI63pLBFixhHXZ6v3PXMhIcY1LPUibzGYhUNeYkVwhIRARCARxAW+fKhE3uK1SXMAtOhtH/cC795/xU37XvhT8rJHseLkWHAi8UfkfnK0bgyXdp7rJy6cd8Vbz9w+XEvsjyVrEWM1pcXql8+dCIs4hEET6mGWENaBS8xKHAwRFmHtIggKIEqYcryvQdOXJ0vB7YRF4fXEC2R+Xpm8LonXnTboT2PllIxMt2O56JYQSO41kZYy7w+MaCL3O14UeIfFNO3HnzBtY9f9c/ZAdI+4qIUIM5bwutmivceOJ6yXCVUAgKgRbKOqivCBsqfzz9aTwJW4bij1fwSGjCLM99zYOx9G3u/0tcBxiqRk35R4IYo7XmCXxjf+DdTw9cmc2/oHn9VR2ZDuOoge0x1IZ+J5ys+VsvxC5L5LnFYWRe5znSkHv3Xme6vZgceKHSCVaD95YoV3KzR6q0TM584OiWAAS0AEAQtcCTkACEZsXjBgSEIIBwOuySBXyQBszqiAvjsyMQLyrWPrO+paaWM5QU9HkFbADmeFfz32e5/n+1JubWrErOvSmUuT+S3his9jucgV1lVWYmcVa1Ls/TJChJClGyYrBGc8kM/LMZ/WEx/L9/5UClV9EKAgsqSYwOnY6FikYjVKmz59w9PvnNytqjILogcCiCJPBNygmN7zjvFqxu5PRA4GHYYF2VTCYAB8prePTH7M6XqHRt6H0zFwLJiPolN5geOK20AIG+cf8n2/0tmAJQZcOt7YoWfTWWuS2V3RUsOSdEqj0m1EpvMNyantV9j9WQ58b1C53fynY+Vk+P1CLAKqpJVMAprRVREVqkX5csfG51+YamWdYhk0XqDIIx4IOI22Lhz/nWJBMCEu0q1b+87vqKCG8SEZYvw1z2pTw52ToYdsKKYAZAX58ufHXp3cgqiYMjxrkrMvqlr/PVdEwNuvWB1nakV+S0jGCJOKjNaD/9Trv+eTP+DxbQxzsL6cFk2CBABSABALBEo6q957xvL/eJ0XgkUFemV3AoEeMXOdQdiIWLhCw8sMIIhlu89NbrR8+srjd5lBBTosHzc1Z/vTf1dT2oy5AAAWA5ij7ysHW4RPKtBcH209Mt9x27rOzbo1nLGBYBmFTyxIKKktX+sHvnLifV/PTk8XoudLAWHlaY10vwZZRYRFAHAYM1723ThHdP5Yc/MKhIEkhU0OCRyJORcu2t9nbARp6OhjLMS8B31n4rVyyr1qlohZRCULpUVJSy/Kl++MVe6pOp5AJOO9hwlRMFnlAjBs3W/cxMLAZSypOyscb+b6/1ati9M9srErINSY2q8BdUIxpRVKHeOb7jt6Uu/mRkoCSltiBgWj1U8eYWCKISiSIjCzFcXqr8+lvvoaObnZ0oEUFRKnWJpYoS4le+mov/QkyKWRox7QzUdgd9xfyL6lmzxNK+MFvERM1qnDN82lX/bdH4k5D6QiHw3FX0oHj7hOlYrEAEWYkEAi4vWOURWjj3mRd596LJ7swMf37R3T6yYWVyCeB7Oerfj/bScfO/I7u/P9ICyQTZk2eIEAGAJbVBCb3lj1buyXLumUL2yVL2k5rkCJaKMo5WIPvXuSgCVwA/iEUAImmJWYQ07uYxtqXjf2TuKZ/mkEFEkLBJhYYBpR+2LuI/EIo/GQg/HI+PhZw3mkiApzg9FSjnen25+8h29J4JRsed66wxIIB3av2ty3fsP7yr6bpAKWZYXlpNGr6fuX1uovLRQ3V2pb6r7XcYiQJWwhiiIdHYKgwAv37nuYGMLWKMaxgDIMhJx9kVCV5RrZUI600UHS1cdsaoJQKIsVxer1+WrFmHK0d9PRO7uTn67I2qVAsskwLjIkVPaz1v1Swcuf6KS+Oj6g1VWFvDslzQG1Mgu8n8b2f2Z45tBW6V9s3QvBRbBaqUtXztTemO2+LJCZdAzCFBHrBPOaAUAGJjxs4hZMECM5ZFY6FDUxcZoQeNVU1qEtRque9flq2V1tpnvIOkQbAA8wrKiOmGY5dJK/Q3Z4ivy1SLh/mhI1NJy9GAar1L2B7m+p73IDd0TIGDP7kgdFnSIEeDWg5d9cXyjdr0l42oxoKWJQG6eLnzqyNR7JmYurdRJpKyoSmRwzq7QuWi2RUxa/lxf6sGOmLbMjQV/Gy9zQ0EsEL05WziP3SAuhIdQVVgn3FA3N+aKLy1Ujrv6SDQUvPWyGJujzeOFziersTd2TwjgGX91UEtKCG/af/k3M4OO6y1XLCYQRdfNlO4cmbx9crbT2LKiKqEAnoSE57VweIQfWteTdRQ03JPfKDBBQJEp13lpvrKlvrJzD+eodh5iTeHmuv+mbGGobh5ORMqOUswLS0cY0FF2XyF9oB55c8+4J3Sa9UwACCBMfMvBy76VGXSWVS0EKfy0sX98ZPJ/HssM+GZWK4PnrEwrqRckmL+fiHxmsJMatodN0TBQIqzIgtwwU64oajwAGJCrEfqELy5WXztT2hdxj8RCyi5a3xnQ0fapYmde8MauybLVp7KMLNjp+O8Z2X33xMaVaIF11FX5yt0Hx342X8lr8gh1k8aZM2Kc5WNDnXvjkSDWs/rAABFFDofd186Ueow12LQJIghQUqrT2jdniiXEH6eiJLLUiVD2hzM9vaHatalcaSVmRrDH8T49vuFjR3YuGYCKAArAanrHxOxdI+Npw3mtlDStulYAIiIjIeeO9b0+QFOq15tTqq1F6q4KW/652UqpGUq2EJtPaBBfN1NymL/bEael1atIJPfNdl+fnl4XqtUXdxRawaQyj5RSbztwuSw+9CvQY6voA6PTfziaqag5xWqiWMQOw58c7Px+OqZsE9QLmlWqbRHRype6k0dCOszc3HhfsHvNOPq3xnJ/dHiSFdGiFmRA5Kpxbh/ZHRxhtOh9RPEFbx/ZXbN6yYCrgNbvHp36nRPZrEPScE3ucvUKMx8N6S92J9EKN6k5pGnNEEqkEnJcyz83Wy4p1dxUVqANRaVeXqi4lu/rjGuWBVs01MoerySijn99R+akYTSCXY7/x2Ob757YoJ1FuSstYDV9YHT6jrHclKNVCw7gsIhpYz8x2PmdrqSyds0BA0QU2BdxXzdTSltrsfntRgRQVPTKfGVS0yOL9zQCSCiPlDtu6ppIaxOUV0SID9ejtx261AfgxQbcOPoXJ2b+cDSTcVQraAlAWGQ05Pzapj4Pm5lioCZeIjHnQ/rjA50xK7Y17WFKIKfVH45mrp4pGa1OrmcCgMT5evgTY5viygSzNqLKfnxsU8EL44JzAYK6s6tmS398dHpGE7XmcBuLGLPy8YHOfEhTU9eIprYbIZLhu3tT9ycjSWttC54EAggCI/z54ckuzyzsKmBB1OaL00NPVeJh4gjxk5XEl6aGUD/bkUAAQtTpmb8YmQQEiy2iBSlrv5eM3N2bIsOMa6bdaLmSgYAl/NC6bgtIramnIYEK0Zaa/5HRaaZnzY0AKOSKF/q76aEI2TDZL0wN1/yQWtANjgJM+NGj01vrfplItewKfcAPreu2jdWMthwYADCCMvbRZPTT/R2dxprWGEYtknXo1kzhZTOlhX0YLABk784MzBonZ5yvZPoXDlsI4oTXZ4tvyRayywrxmiU+YpexfzaQfiwVVdZysx9A8wuTGJEs/8lQ90PxcKI1hjFQKIv4u8ezjmWZd3AYkJQ9Vkk8XEr9tJwcq8aJ5rrBEYARIsZ++HjGw1adSREYwwcTkU8MdalmG8NWAQsMY03Rezf2eUi6NcNiFUBR0ZWl2hsyBVZ00vsgABT8x1zfvdk+lGfTPSQiWr15urCnUi83dWu/8MYdgTLRuzf11QmlVTfegvPDBEExT0TdaUU35Yql1jygQLbU/S91JU/aXgYElH3V2OOV5CJvHjFk+VNHJhMstjVjRBixw/Ltm/ru74y3SL2gdeeHWUTt89/2p/+8L93rW781xqGs6PmV+qtmS6IWdBSiVFhXWJ+sdVciougVs+VdVa9CLXl7fMQe3/xpf/prvSnts8WL7cC3wKAry3ds7P3njniPaQkzBGGAWzMFkEVNPgiysJBOAEHglmzhpM1uPi1j/74z8eENPcqybWXdawuBBX2YDPBftg78KBZuhdOoBEqKXlysbqnUWOHCFtDFDZC4sVq/plAtqea78j5ip7EPxMPv2tIPAtziseGtLV8XAGQpaLpl2+DeiNthm8/MIHYYvn62DIS0ku9HIkD0CzOlTsN+C3572tqnIu6t24bKRMgtn3TR8n4DRlCWp1z9xu3D+8JuR7NtI4IYhJcXKsArR8QtIll+zUzZOwXRRnQrbey+sPvGHcMZR9GCePRFDCx4ZMryiZBzw47hn0RD3U1lRgI1wt1Vr9MzvCzijACC2OP5W+tejZr5pviI3cY+GgvdsGN4zNXKMl+Qlo0L1NFjEZW1k66+Yefwfclon29Mk2LYCOAh9vh2Z9UDWhoPIwEg3Frz04ZNk7x5ATCIvb75t1T0hh3rJl2tbAvdwtUBNm+aZFapN20f+qvejm7fnizybXwDFGLZXakDLp1KGNQm76rWQ9ycFGIQL+7xzed6O27eNpRXRC1LTawysGA9QxYP4Ne39L9vY68WiVlpjhuCsKXuL4+0BmGXS6p+U5TLIMasaJH3b+z99S39FgAvyLq1asCCIAgCKMOfG+z8hR3DB8NOt28YoZHbRhALMOgZkKWFLoIIAv2+sdDQSNCgP6rHNwfDzut2DH92oIsMB7dzgWUVulIl2FP75uFE9NW71v9lX0fczqnaeZ/0YBE6LIPIShomKct8vqkvmVesCMun+9PX717/42RUGcOrdOrqarURz3nbRUXv39z/xm2DT0bcbmO0wPlgExBAh2V5qXsALMLM565gASpHoMc3T0bdG7cPfXBTf4mQjLWrdyLkqgGbW9JElOH70vHrd6//7XU9RUXdvlFwPtjUqXOF6hwD5wEqLdDtm5ymO9b3XL9z/f0dMWUMCvCqnt+pYVVlzjwariN8aqjrnq7kf52cuXW60OubkqIaEcnZzhI4TYJbztoeMgIDhpnTxo67+jP9XX/Z1zEVdsAwGbZr4KhVDWtAAl+ZjB139Yc39n2+t+Pt0/k3Zoubal6dqEJoEc9Izpz6YFtzpkNtGYARlUjcsiNyOOR+aiD5Nz3JsXAImJVvGZHXxtieNQFsXtUQRcg3R0POH2zo/fP+9I254s2ZwqWVesTaKlKN0CIiyNJSJwQCqREFReOyLNJRUYjBGXOL580xzk1jiLBExFaIfhiPfLU7+U/p+EzIAcvKGEa0a+kMYw1rSRZiy2n1uf7Oz/WkrizXXjtTenm+sq3mRY01iHXCOmKwliAIA5LApKOWzywhAYs4oxQKWAiSLggAJBISCVnRIjWiAxH326noN9KJR+JhIAQW5a85VGsR2FJsxljEhxLRh1KxPzD2BeXaNYXqC8vVHVVvXd2EhUHEINaIIizH3BVmlgSAjoV0RKTGEGEO0is1whOu3h9xH4pHHkhEHomFfUcBCzAHyWK7Vk8G17BWJcAGAGQZrZh5csASN+b5lfr2qrfeM9urXr9vNtb8p8POyr6gwN5IaFKrp8PuuKuOhNynw87+SGhvxC04OtAnYFa+EUBGsGv7EPdGD3y7gBcKKEAgc+t/kOhHBBZkjln2CE81ilCLxJnzSgnRXBulADCTAInIskEva1n0RXKdwVD8uZZkFKD5UAMjMkBJn27ysUGc1RpEiDlIiQWQAucQLirRcBGKzIX5F6xVcobUZPCBi5HQGop0NBdhgx9oA2tLG1hb2sDawNrSBtaWNrA2sLa0gbWlDawNrC1tYG1pA2sDa0sbWFvawNrA2tIG1pZzlP8Pkr3tyqLFayIAAAAASUVORK5CYII='; // Toledo Mobile's own icon, inline (other sites' images don't load on GitHub)
  // the same logo as inline SVG: GitHub's pages forbid every image (also data: ones), but not SVG in the page itself
  const TM_LOGO_SVG = '<svg class="upd-logo ip-logo" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#005472"/><g transform="translate(73.96,73.96) scale(0.71111)"><g transform="translate(0,512) scale(0.1,-0.1)"><path fill="#ED8A2E" d="M2305 5109 c-887 -91 -1668 -638 -2053 -1439 -66 -137 -125 -295 -118 -317 3 -10 8 -30 11 -45 3 -16 7 -39 10 -53 11 -51 69 -204 111 -290 108 -224 282 -432 484 -580 69 -51 137 -95 146 -95 4 0 15 -6 23 -13 49 -41 326 -144 432 -161 54 -8 200 -52 284 -86 404 -161 756 -536 892 -952 15 -48 30 -87 33 -87 3 0 18 39 34 87 103 313 333 615 613 802 177 119 323 179 577 240 209 50 370 119 532 226 61 40 74 50 158 123 186 160 349 392 433 616 8 22 19 49 23 60 13 30 30 90 36 122 3 15 7 36 10 45 15 50 12 74 -22 160 -238 616 -699 1115 -1288 1398 -154 74 -345 143 -484 175 -110 26 -234 48 -326 59 -119 14 -436 17 -551 5z m-280 -595 c114 -23 216 -61 308 -114 87 -50 106 -64 184 -134 l44 -39 27 25 c67 61 80 72 132 108 108 74 229 123 375 154 70 15 292 16 360 2 197 -41 379 -140 519 -282 66 -67 154 -191 190 -269 18 -38 68 -177 66 -183 -1 -1 4 -28 11 -60 13 -61 17 -253 6 -312 -22 -127 -28 -142 -51 -135 -194 57 -368 83 -532 79 -383 -9 -737 -148 -1021 -401 l-83 -74 -85 76 c-286 254 -644 393 -1030 399 -94 2 -127 -1 -265 -19 -46 -6 -174 -36 -256 -60 -20 -6 -23 -1 -34 47 -39 177 -30 379 24 543 2 6 4 12 4 15 1 3 21 46 45 95 140 283 396 479 707 540 88 17 271 17 355 -1z"/><path fill="#E3224F" d="M4 2510 c4 -186 12 -272 41 -440 12 -74 77 -307 111 -399 19 -53 69 -164 110 -248 296 -601 809 -1056 1448 -1283 76 -27 167 -55 215 -65 11 -3 30 -7 42 -10 11 -2 28 -6 37 -9 22 -7 67 -15 117 -22 22 -3 46 -7 54 -10 8 -2 44 -7 81 -10 l67 -6 7 53 c4 30 10 72 13 94 8 53 8 244 0 326 -45 448 -302 882 -674 1136 -129 89 -328 184 -433 208 -247 57 -434 118 -540 177 -299 166 -508 374 -668 663 l-33 60 5 -215z"/><path fill="#E3224F" d="M5092 2674 c-32 -65 -126 -205 -186 -278 -167 -200 -391 -365 -624 -457 -66 -27 -254 -80 -326 -93 -63 -11 -225 -70 -311 -112 -304 -151 -560 -407 -714 -713 -33 -65 -121 -298 -120 -316 0 -3 -5 -29 -11 -58 -19 -92 -21 -110 -29 -202 -9 -111 -3 -290 13 -370 3 -11 5 -30 5 -42 1 -19 7 -23 34 -23 18 0 58 4 88 10 30 5 70 11 89 14 53 8 93 16 112 22 9 3 25 6 35 8 203 40 499 160 733 299 640 380 1099 1061 1209 1792 6 39 13 86 16 105 7 39 18 460 13 460 -2 0 -14 -21 -26 -46z"/></g></g></svg>';
  const NEWS = __NEWS__; // { version: ['what changed, in plain words', …] } for the last versions
  const newerThan = (a, b) => {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
    return false;
  };
  // what changed between version `from` (exclusive) and `to` (inclusive), newest first
  const newsBetween = (news, from, to) => Object.keys(news || {})
    .filter((v) => newerThan(v, from) && !newerThan(v, to))
    .sort((a, b) => (newerThan(a, b) ? -1 : 1))
    .reduce((all, v) => all.concat(news[v] || []), []).slice(0, 6);
  const lsJson = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  // ?th= so the install page has the app's light/dark setting (GitHub's site can't read it)
  const installUrl = (v) => UPDATE_URL + '?v=' + encodeURIComponent(v || Date.now()) + '&th=' + THEME;
  // raw.githubusercontent.com keeps a file for 5 minutes and ignores ?query, so right after a push it still hands out
  // the old version. GitHub's API is always fresh, but allows 60 calls an hour per network: use it first and fall
  // back to raw (at most 5 minutes behind) when it says to wait.
  const GH_API = 'https://api.github.com/repos/vj4542662/toledo-mobile';
  function ghApi(path, accept) {
    if (Date.now() < (Number(lsJson('tm4:apiwait')) || 0)) return Promise.reject('wait');
    return fetch(GH_API + path, { cache: 'no-store', credentials: 'omit', headers: { Accept: accept } }).then((r) => {
      if (r.ok) return r.text();
      if (r.status === 403 || r.status === 429) lsSet('tm4:apiwait', Number(r.headers.get('x-ratelimit-reset')) * 1e3 || Date.now() + 30 * 60e3);
      return Promise.reject(r.status);
    });
  }
  // the newest file, by commit (an address no cache has seen yet), so Userscripts gets the new version right away
  function openInstall(v) {
    let done = false;
    const go = (u) => { if (!done) { done = true; location.href = u; } };
    setTimeout(() => go(installUrl(v)), 2500);
    ghApi('/commits/main', 'application/vnd.github.sha')
      .then((sha) => { sha = String(sha).trim(); go(/^[0-9a-f]{40}$/.test(sha) ? `https://raw.githubusercontent.com/vj4542662/toledo-mobile/${sha}/toledo-mobile.user.js?th=${THEME}` : installUrl(v)); }, () => go(installUrl(v)));
  }
  function checkUpdate(cb, force) {
    if (TEST && !W.__TM_UPD_TEST__) return;
    const st = lsJson('tm4:upd');
    if (st && st.v && newerThan(st.v, VERSION)) cb(st);
    if (!force && st && Date.now() - st.ts < 2 * 60e3) return; // version.json is tiny: look (almost) every time the app opens
    const get = (u) => fetch(u + '?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' }).then((r) => (r.ok ? r.text() : Promise.reject(r.status)));
    ghApi('/contents/version.json', 'application/vnd.github.raw')
      .catch(() => get(VERSION_URL))
      .then((t) => { const j = JSON.parse(t); if (!j || !j.version) throw 0; return { v: String(j.version), news: j.news || {} }; })
      .catch(() => get(UPDATE_URL).then((t) => { const m = /@version\s+([\d.]+)/.exec(t); return m ? { v: m[1], news: {} } : null; }))
      .then((info) => {
        if (!info) return;
        info.ts = Date.now();
        lsSet('tm4:upd', info);
        if (newerThan(info.v, VERSION) && (!st || st.v !== info.v)) cb(info);
      }, () => {});
  }

  // a bottom sheet over a dimmed page: slides in, and close() slides it out again
  function openLayer(inner, cls, label) {
    const layer = document.createElement('div');
    if (cls) layer.className = cls;
    layer.setAttribute('data-tm4', '');
    layer.innerHTML = `<div class="scrim"></div><div class="sheet${cls ? ' upd' : ''}" role="dialog" aria-modal="true"${label ? ` aria-label="${esc(label)}"` : ''}>${inner}</div>`;
    document.body.appendChild(layer);
    const scrim = layer.querySelector('.scrim'), sh = layer.querySelector('.sheet');
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); }));
    const close = () => { scrim.classList.remove('on'); sh.classList.remove('on'); setTimeout(() => layer.remove(), 340); };
    scrim.addEventListener('click', close);
    return { layer, sh, close };
  }

  // the notification at the top of the app
  function updateNotice(info) {
    if (!document.body || !info || !newerThan(info.v, VERSION)) return;
    const later = lsJson('tm4:upd-later');
    if (later && later.v === info.v && Date.now() - later.ts < 20 * 3600e3) return;
    let n = $('#tm-upn');
    if (!n) {
      n = document.createElement('div');
      n.id = 'tm-upn'; n.className = 'upn'; n.setAttribute('data-tm4', ''); n.setAttribute('role', 'alert');
      document.body.appendChild(n);
      n.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const cur = lsJson('tm4:upd') || info;
        if (e.target.closest('.upn-x')) { lsSet('tm4:upd-later', { v: cur.v, ts: Date.now() }); hideNotice(); return; }
        hideNotice();
        updateSheet(cur);
      });
      requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('on')));
    }
    put(n, `<img class="upn-ic" src="${TM_LOGO}" alt=""><span class="upn-m"><b>Update beschikbaar</b><span>Tik om versie ${esc(info.v)} te installeren</span></span><button type="button" class="upn-x" aria-label="Later">${ico('close')}</button>`);
  }
  function hideNotice() { const n = $('#tm-upn'); if (n) { n.classList.remove('on'); setTimeout(() => n.remove(), 400); } }

  // the update screen: what is new, three simple steps and one big button
  function updateSheet(info) {
    if (!info || $('.upd-layer')) return;
    const news = newsBetween(info.news, VERSION, info.v);
    const { layer, close } = openLayer(`
      <div class="sg upd-c">
        <img class="upd-logo" src="${TM_LOGO}" alt="">
        <h2>Nieuwe versie van Toledo Mobile</h2>
        <p class="upd-v">Versie ${esc(info.v)} <span>· je hebt nu ${esc(VERSION)}</span></p>
        ${news.length ? `<div class="upd-news"><b>Wat is er nieuw</b><ul>${news.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <div class="upd-how"><b>Zo werkt het (ongeveer 10 seconden)</b>
          <ol><li>Tik hieronder op <b>Installeren</b>.</li><li>Open <b>Userscripts</b> en tik op de <b>groene balk</b>.</li><li>Schuif naar beneden en tik op <b>Install</b> (niet op het vinkje bovenaan).</li></ol>
          <p>Op de volgende pagina leggen we het stap voor stap uit, met plaatjes.</p></div>
        <a class="btn upd-go" href="${esc(installUrl(info.v))}">Installeren</a>
        <button type="button" class="upd-later">Later</button>
      </div>`, 'upd-layer', 'Update');
    layer.querySelector('.upd-later').addEventListener('click', () => { lsSet('tm4:upd-later', { v: info.v, ts: Date.now() }); close(); });
    layer.querySelector('.upd-go').addEventListener('click', (e) => { e.preventDefault(); lsSet('tm4:upd-go', { v: info.v, from: VERSION, ts: Date.now() }); e.currentTarget.textContent = 'Even geduld…'; openInstall(info.v); });
  }

  // after an update: say so once, with what is new
  function justUpdated() {
    const was = lsJson('tm4:ver');
    lsSet('tm4:ver', VERSION);
    if (!was || !newerThan(VERSION, was)) return;
    try { localStorage.removeItem('tm4:upd-later'); } catch (_) {}
    const news = newsBetween(NEWS, was, VERSION);
    setTimeout(() => {
      if (!news.length) { toast(`Bijgewerkt naar versie ${VERSION}`); return; }
      const { layer, close } = openLayer(`<div class="sg upd-c">
        <span class="upd-ok">${ico('check')}</span>
        <h2>Toledo Mobile is bijgewerkt</h2>
        <p class="upd-v">Je hebt nu versie ${esc(VERSION)}</p>
        <div class="upd-news"><b>Wat is er nieuw</b><ul>${news.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <button type="button" class="btn upd-go">Top!</button></div>`, 'upd-layer', 'Bijgewerkt');
      layer.querySelector('.upd-go').addEventListener('click', close);
    }, 900);
  }

  function notYet(v) {
    if ($('.upd-layer')) return;
    const layer = document.createElement('div');
    layer.className = 'upd-layer'; layer.setAttribute('data-tm4', '');
    layer.innerHTML = `<div class="scrim"></div><div class="sheet upd" role="dialog" aria-modal="true" aria-label="Update"><div class="sg upd-c">
      <span class="upd-ok warn">${ico('refresh')}</span>
      <h2>De update is nog niet gelukt</h2>
      <p class="upd-v">Je hebt nog versie ${esc(VERSION)}</p>
      <div class="upd-how"><b>Wat vaak misgaat</b><ol><li>Na de <b>groene balk</b> komt nog een scherm. Schuif dat helemaal naar beneden en tik op de knop <b>Install</b>.</li><li>Tik <b>niet</b> op het blauwe vinkje bovenaan: dat sluit het venster zonder te installeren.</li></ol></div>
      <button type="button" class="btn upd-go">Opnieuw proberen</button>
      <button type="button" class="upd-later">Later</button></div></div>`;
    document.body.appendChild(layer);
    const scrim = layer.querySelector('.scrim'), sh = layer.querySelector('.sheet');
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); }));
    const close = () => { scrim.classList.remove('on'); sh.classList.remove('on'); setTimeout(() => layer.remove(), 340); };
    scrim.addEventListener('click', close);
    layer.querySelector('.upd-later').addEventListener('click', close);
    layer.querySelector('.upd-go').addEventListener('click', (e) => { lsSet('tm4:upd-go', { v, from: VERSION, ts: Date.now() }); e.currentTarget.textContent = 'Even geduld…'; openInstall(v); });
  }

  // every app page: check now and each time you come back to the app; onNew(info) lets the page add its own row
  function updateWatch(onNew) {
    if (TEST && !W.__TM_UPD_TEST__) return;
    const got = (info) => { updateNotice(info); if (onNew) onNew(info); };
    // you tapped Installeren a moment ago but this is still the old version: say so, with the step people miss
    const tried = lsJson('tm4:upd-go');
    if (tried && !newerThan(tried.v, VERSION)) { try { localStorage.removeItem('tm4:upd-go'); } catch (_) {} }
    else if (tried && Date.now() - tried.ts < 30 * 60e3) {
      try { localStorage.removeItem('tm4:upd-go'); } catch (_) {}
      setTimeout(() => notYet(tried.v), 900);
    }
    setTimeout(() => checkUpdate(got), 1200);
    let lastCheck = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 30e3) return;
      lastCheck = Date.now();
      checkUpdate(got, true);
    });
  }

  // the install page itself (raw.githubusercontent.com/…/toledo-mobile.user.js): instead of a wall of code, a
  // friendly page that shows where to tap. Userscripts downloads the file again itself, so the page's text
  // doesn't need to stay.
  function installPage() {
    const go = () => {
      const txt = (document.body && document.body.textContent) || '';
      const m = /@version\s+([\d.]+)/.exec(txt);
      const v = m ? m[1] : '';
      const fresh = v && newerThan(v, VERSION);
      takeover('Toledo Mobile installeren');
      document.body.className = 'no-tabs';
      const step = (n, title, mock) => `<li class="ip-step"><span class="ip-n">${n}</span><div><b>${title}</b>${mock || ''}</div></li>`;
      // pictures of what you really see: Safari's address bar, the Userscripts window (it follows the iPhone's own dark/light setting)
      const bar = `<div class="ip-mock ip-bar"><span class="ip-hl">${ico('pagemenu')}</span><span class="ip-url">raw.githubusercontent.com</span><span class="ip-dim">${ico('refresh')}</span></div>`;
      const pop = (inner, check) => `<div class="ip-mock ip-us-pop"><div class="ip-us-h">Userscripts${check ? `<span class="ip-us-chk">${ico('check')}<i></i></span>` : ''}</div>${inner}</div>`;
      document.body.innerHTML = `<main class="ip" data-tm4>
        ${TM_LOGO_SVG}
        <h1>${fresh || !v ? 'Nog even installeren' : 'Je bent helemaal mee'}</h1>
        <p class="ip-sub">${fresh ? `Versie ${esc(v)} staat klaar. Je hebt nu ${esc(VERSION)}.` : v ? `Je hebt de nieuwste versie (${esc(VERSION)}). Je hoeft niets meer te doen.` : 'Volg deze stappen om Toledo Mobile bij te werken.'}</p>
        ${fresh || !v ? `<ol class="ip-steps">
          ${step(1, `Tik in de adresbalk links op <span class="ip-k">${ico('pagemenu')}</span> <span class="ip-or">(op oudere iPhones: <span class="ip-k">aA</span>)</span>`, bar)}
          ${step(2, 'Tik op <b>Userscripts</b>', '<div class="ip-mock ip-list"><div class="ip-li ip-hl2"><span class="ip-us">&lt;/&gt;</span>Userscripts</div></div>')}
          ${step(3, 'Tik op de <b>groene balk</b>', pop('<div class="ip-us-green">Userscript Installed: <u>Tap to re-install</u></div><div class="ip-us-row">Toledo Mobile<span>JS</span></div>'))}
          ${step(4, 'Schuif naar beneden en tik op de knop <b>Install</b>', pop('<div class="ip-us-name">Toledo Mobile</div><div class="ip-us-lines"><i></i><i></i><i></i></div><div class="ip-us-scroll">↓ helemaal naar beneden schuiven ↓</div><div class="ip-us-btns"><span>Cancel</span><span class="ip-us-inst">Install</span></div>', true) + '<p class="ip-warn2"><b>Let op:</b> tik <b>niet</b> op het blauwe vinkje bovenaan. Dat sluit het venster zonder te installeren.</p>')}
          ${step(5, 'Klaar! Tik hieronder op <b>Terug naar Toledo</b>', '')}
        </ol>
        <p class="ip-tip">Gaat Userscripts vanzelf open? Begin dan bij stap 3.</p>` : ''}
        <a class="btn ip-back" href="${PORTAL}?tm=vandaag&th=${THEME}">Terug naar Toledo</a>
      </main>`;
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  /* Anonymous user count: at most once a day, a random install id (made once on this phone, never the
     r-number, name or login) and the script version go to the Google Form below. Nothing else is sent.
     Responses land in Jeremy's Google Sheet "Toledo Mobile teller (antwoorden)". */
  const COUNT_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLScZnz2fJF-pcGFdCVv62XxfteYcr3z4qYNWW-S8uYggqJ1Vhg/formResponse';
  const COUNT_FIELDS = ['entry.262291636', 'entry.1600337097']; // id, versie
  function countUser() {
    if (TEST || !COUNT_FORM) return;
    try {
      const today = ymd(Date.now());
      if (localStorage.getItem('tm4:cnt') === today) return;
      let id = localStorage.getItem('tm4:anon');
      if (!id) {
        const a = new Uint8Array(9); crypto.getRandomValues(a);
        id = Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14);
        localStorage.setItem('tm4:anon', id);
      }
      const body = new URLSearchParams([[COUNT_FIELDS[0], id], [COUNT_FIELDS[1], VERSION]]);
      fetch(COUNT_FORM, { method: 'POST', mode: 'no-cors', credentials: 'omit', body })
        .then(() => { try { localStorage.setItem('tm4:cnt', today); } catch (_) {} }, () => {});
    } catch (_) {}
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
    close: '<path d="M7 7l10 10M17 7 7 17"/>',
    pagemenu: '<rect x="4" y="4.5" width="16" height="15" rx="3"/><path d="M8 9.5h8M8 12.5h8M8 15.5h5"/>',
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
    star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
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
    m.setAttribute('content', isDark() ? '#0e1519' : '#eef3f5');
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
    whenRoot(add);
    // keep it last, so later stylesheets can't win
    const keep = () => { if (document.head && st.parentNode && st !== document.head.lastElementChild) document.head.appendChild(st); };
    W.addEventListener('DOMContentLoaded', keep);
    W.addEventListener('load', keep);
  }

  const TM_ICON = 'https://toledo.kuleuven.be/portal/images/favicon/apple-touch-icon.png'; // Toledo's own icon (public)

  /* ================================================================== shell */
  /* The site's own app must not start next to ours: Toledo's portal app, Blackboard's app or the KU Loket launchpad
     running hidden in the background costs a lot of memory, and on an iPhone that makes Safari kill the tab ("A
     problem repeatedly occurred", a black screen). Scripts the parser still adds are switched off before they run
     (the parser hands new nodes to observers before it runs a script). */
  function blockScripts(match) {
    const off = (n) => {
      if (n.nodeType !== 1 || n.tagName !== 'SCRIPT' || n.hasAttribute('data-tm4')) return;
      if (match && !match(n)) return;
      n.type = 'text/tm4-blocked';
      n.removeAttribute('src');
      n.remove();
    };
    const mo = new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => {
      off(n);
      if (n.nodeType === 1 && n.firstElementChild && n.getElementsByTagName('script').length) Array.from(n.getElementsByTagName('script')).forEach(off);
    })));
    mo.observe(document, { childList: true, subtree: true });
    document.querySelectorAll('script').forEach(off);
    return mo;
  }
  function takeover(title, preconnect) {
    try { W.stop(); } catch (_) {}
    blockScripts();
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
    const SEL = '.row, .tile, .chip, .kz, .kf, .btn, .hero, .lesson[data-href], .exam[data-href], .ann, .teaser, .wd, .nb, .tabbar a, .sheet .sa, .frow, .more-row';
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
    const { sh, close } = openLayer(`<div class="sg">${title || msg ? `<div class="sh-t">${title ? `<b>${esc(title)}</b>` : ''}${msg ? esc(msg) : ''}</div>` : ''}${actions.map((a, i) => (a.href ? `<a class="sa${a.red ? ' red' : ''}" href="${esc(a.href)}" data-i="${i}">${esc(a.label)}</a>` : `<button type="button" class="sa${a.red ? ' red' : ''}" data-i="${i}">${esc(a.label)}</button>`)).join('')}</div><div class="sg"><button type="button" class="sa bold" data-i="-1">Annuleer</button></div>`);
    sh.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const a = actions[Number(b.dataset.i)];
      close();
      if (a && a.run) { e.preventDefault(); try { a.run(); } catch (err) { console.error(err); } }
    });
    return close;
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
    return `<div class="seg" role="tablist"><span class="thumb" style="width:calc((100% - 8px) / ${items.length});transform:translateX(${i * 100}%)"></span>${items.map((x) => `<button type="button" role="tab" data-act="${act}" data-id="${x.id}"${x.id === active ? ' class="on" aria-selected="true"' : ' aria-selected="false"'}>${esc(x.label)}</button>`).join('')}</div>`;
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
